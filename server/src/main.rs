use std::{net::SocketAddr, sync::Arc, time::Duration};

use anyhow::Context;
use axum::{
    http::{header, Method},
    Router,
};
use config::Configuration;
use http::{api_router, ApiContext};
use sqlx::{
    mysql::{MySqlConnectOptions, MySqlPoolOptions},
    MySqlPool,
};

use metrics::gauge;
use metrics_exporter_prometheus::PrometheusBuilder;
use tower::ServiceBuilder;
use tower_http::{add_extension::AddExtensionLayer, cors::CorsLayer, trace::TraceLayer};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use ws::{ws_router, WsContext};

use helpers::parse_origins;

mod config;
mod constants;

mod http;
mod sql;
mod state;
mod ws;

mod openapi;

mod helpers;

mod model;

#[cfg(test)]
mod contracts_test;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                // axum logs rejections from built-in extractors with the `axum::rejection`
                // target, at `TRACE` level. `axum::rejection=trace` enables showing those events
                "websocket_jsonpatch=debug,tower_http=debug,axum::rejection=trace,funban_server=debug".into()
            }),
        )
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    let config = config::Configuration::setup_config().expect("Failed to load configuration");

    let opts = MySqlConnectOptions::new()
        .host(&config.database_url)
        .username(&config.database_user)
        .password(&config.database_password)
        .database(&config.database_name)
        .ssl_mode(sqlx::mysql::MySqlSslMode::Disabled);

    let db = MySqlPoolOptions::new().connect_with(opts).await?;
    info!("Connected to database");

    sqlx::migrate!().run(&db).await?;

    serve(config, db).await
}

pub async fn serve(config: Configuration, db: MySqlPool) -> anyhow::Result<()> {
    let metrics_handle = PrometheusBuilder::new()
        .install_recorder()
        .context("Failed to install Prometheus recorder")?;

    let origins = parse_origins(&config.cors_origin)?;
    let cors = CorsLayer::new()
        .allow_headers([
            header::AUTHORIZATION,
            header::CONTENT_TYPE,
            header::ACCESS_CONTROL_ALLOW_ORIGIN,
            header::ACCESS_CONTROL_ALLOW_CREDENTIALS,
            header::SET_COOKIE,
            header::COOKIE,
        ])
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_origin(origins)
        .allow_credentials(true)
        .expose_headers([
            header::AUTHORIZATION,
            header::CONTENT_TYPE,
            header::ACCESS_CONTROL_ALLOW_ORIGIN,
            header::ACCESS_CONTROL_ALLOW_CREDENTIALS,
            header::SET_COOKIE,
            header::COOKIE,
        ]);

    let pool_for_metrics = db.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(15));
        loop {
            interval.tick().await;
            gauge!("db_pool_connections_total").set(pool_for_metrics.size() as f64);
            gauge!("db_pool_connections_idle").set(pool_for_metrics.num_idle() as f64);
        }
    });

    // Create shared WebSocket context
    let ws_context = Arc::new(WsContext::new(db.clone(), config.clone()));

    // Create router for HTTP routes with WsContext for broadcasting
    let api_router = api_router().layer(
        ServiceBuilder::new()
            .layer(AddExtensionLayer::new(
                ApiContext::new(config.clone(), db.clone()).with_ws_context(ws_context.clone()),
            ))
            .layer(TraceLayer::new_for_http()),
    );

    // Create router for WebSocket routes
    let ws_router = ws_router().layer(
        ServiceBuilder::new()
            .layer(AddExtensionLayer::new(ws_context))
            .layer(TraceLayer::new_for_http()),
    );

    let app = Router::new()
        .nest("/ws", ws_router)
        .nest("/api", api_router)
        .route(
            "/metrics",
            axum::routing::get(move || async move { metrics_handle.render() }),
        )
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", config.port))
        .await
        .context("Failed to bind to port")?;

    info!("Server starting on port {}", config.port);

    // Create server with graceful shutdown support
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await
    .context("Failed to serve the application")
}

/// Graceful shutdown signal handler
/// Listens for SIGTERM, SIGINT, or SIGQUIT and initiates shutdown
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            info!("Received Ctrl+C, initiating graceful shutdown...");
        },
        _ = terminate => {
            info!("Received SIGTERM, initiating graceful shutdown...");
        }
    }

    info!("Shutdown signal received, waiting for connections to close...");

    // Give connections time to close gracefully
    tokio::time::sleep(Duration::from_secs(5)).await;

    info!("Graceful shutdown completed");
}
