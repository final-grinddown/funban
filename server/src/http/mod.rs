use crate::config::Configuration;
use crate::ws::WsContext;

use axum::Router;
use errors::Error;
use sqlx::MySqlPool;
use std::sync::Arc;

pub mod errors;
pub mod middleware;
pub mod routes;
pub mod validation;

pub type Result<T, E = Error> = std::result::Result<T, E>;

#[derive(Debug, Clone)]
pub struct ApiContext {
    pub config: Arc<Configuration>,
    pub db: MySqlPool,
    pub ws_context: Option<Arc<WsContext>>,
}

impl ApiContext {
    pub fn new(config: Configuration, db: MySqlPool) -> Self {
        Self {
            config: Arc::new(config),
            db,
            ws_context: None,
        }
    }

    pub fn with_ws_context(mut self, ws_context: Arc<WsContext>) -> Self {
        self.ws_context = Some(ws_context);
        self
    }
}

pub fn api_router() -> Router {
    // This is the order that the modules were authored in.
    Router::new()
        .merge(routes::health::router())
        .merge(routes::note::router())
        .merge(routes::user::router())
        .merge(routes::user_mark::router())
        .merge(routes::history::protected_router())
        .merge(routes::release::protected_router())
        .merge(routes::release_settings::protected_router())
        .merge(routes::openapi::router())
        .merge(routes::auth::router())
        .merge(routes::auth::protected_router())
}
