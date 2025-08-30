use std::env;

use axum::http::StatusCode;
use axum::routing::get;
use axum::Router;

pub fn router() -> Router {
    // By having each module responsible for setting up its own routing,
    // it makes the root module a lot cleaner.
    Router::new()
        .route("/health/ping", get(ping))
        .route("/health/version", get(version))
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
