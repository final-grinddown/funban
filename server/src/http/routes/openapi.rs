use crate::http::{errors::Error, Result};
use axum::{routing::get, Router};
use tower_http::services::ServeFile;
use utoipa::OpenApi;

use crate::openapi::ApiDoc;

pub fn router() -> Router {
    Router::new()
        .route("/api-docs/openapi.json", get(openapi_schema))
        .route_service("/api-docs/asyncapi.yaml", ServeFile::new("websocket.yaml"))
    // .route("/api/room/:code", method_routing::get(get))
}

async fn openapi_schema() -> Result<String> {
    ApiDoc::openapi().to_json().map_err(|_| Error::OpenApi)
}
