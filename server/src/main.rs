use std::{net::SocketAddr, sync::Arc};

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
        .with(tracing_subscriber::fmt::layer())
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
        .allow_methods([Method::GET, Method::POST])
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

    // Create router for HTTP routes.
    let api_router = api_router().layer(
        ServiceBuilder::new()
            .layer(AddExtensionLayer::new(ApiContext::new(
                config.clone(),
                db.clone(),
            )))
            .layer(TraceLayer::new_for_http()),
    );

    // Create router for WebSocket routes.
    let ws_router = ws_router().layer(
        ServiceBuilder::new()
            .layer(AddExtensionLayer::new(Arc::new(WsContext::new(
                db,
                config.clone(),
            ))))
            .layer(TraceLayer::new_for_http()),
    );

    let app = Router::new()
        .nest("/ws", ws_router)
        .nest("/api", api_router)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", config.port))
        .await
        .context("Failed to bind to port")?;

    info!("Server starting on port {}", config.port);

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .context("Failed to serve the application")
}
