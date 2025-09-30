use std::env;

use axum::http::StatusCode;
use axum::routing::get;
use axum::{Extension, Router};
use serde_json::json;

use crate::http::ApiContext;

pub fn router() -> Router {
    // By having each module responsible for setting up its own routing,
    // it makes the root module a lot cleaner.
    Router::new()
        .route("/health/ping", get(ping))
        .route("/health/version", get(version))
        .route("/health/ready", get(readiness))
        .route("/health/live", get(liveness))
}

/// Simple api contact endpint.
#[utoipa::path(get,
	path = "/health/ping",
	responses((status = 200, body = String, description = "Success"))
)]
pub async fn ping() -> (StatusCode, String) {
    let time = chrono::Utc::now();
    (StatusCode::OK, time.to_rfc3339())
}

/// Gets current backend version.
#[utoipa::path(get,
	path = "/health/version",
	responses((status = 200, body = String, description = "Success")),
)]
pub async fn version() -> (StatusCode, String) {
    (StatusCode::OK, env!("CARGO_PKG_VERSION").to_string())
}

/// Readiness probe - checks if the service is ready to accept requests
/// Includes database connectivity check
#[utoipa::path(get,
	path = "/health/ready",
	responses(
		(status = 200, description = "Service is ready"),
		(status = 503, description = "Service is not ready")
	),
)]
pub async fn readiness(
    Extension(ctx): Extension<ApiContext>,
) -> (StatusCode, axum::Json<serde_json::Value>) {
    // Check database connectivity
    match sqlx::query("SELECT 1").fetch_one(&ctx.db).await {
        Ok(_) => (
            StatusCode::OK,
            axum::Json(json!({
                "status": "ready",
                "database": "connected",
                "timestamp": chrono::Utc::now().to_rfc3339(),
                "version": env!("CARGO_PKG_VERSION")
            })),
        ),
        Err(err) => (
            StatusCode::SERVICE_UNAVAILABLE,
            axum::Json(json!({
                "status": "not_ready",
                "database": "disconnected",
                "error": err.to_string(),
                "timestamp": chrono::Utc::now().to_rfc3339()
            })),
        ),
    }
}

/// Liveness probe - checks if the service is alive
/// Used to determine if the container should be restarted
#[utoipa::path(get,
	path = "/health/live",
	responses((status = 200, description = "Service is alive")),
)]
pub async fn liveness() -> (StatusCode, axum::Json<serde_json::Value>) {
    (
        StatusCode::OK,
        axum::Json(json!({
            "status": "alive",
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "uptime": std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs()
        })),
    )
}
