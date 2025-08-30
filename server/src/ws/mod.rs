use futures::{stream::SplitSink, SinkExt};
use serde::Serialize;
use sqlx::MySqlPool;
use std::{collections::HashMap, sync::Arc};
use tokio::sync::Mutex;
use tracing::warn;

use axum::{
    extract::ws::{Message, Utf8Bytes, WebSocket},
    middleware::from_fn,
    routing::get,
    Router,
};

mod middleware;

mod handler;
use handler::websocket_handler;

use crate::{
    config::Configuration,
    model::{note::Note, user::User},
    state::{AppState, WsOperation},
};

pub enum OperationResult {
    Broadcast(Vec<WsOperation>),
    ClientOnly(Vec<WsOperation>),
    #[allow(dead_code)]
    Mixed(Vec<WsOperation>, Vec<WsOperation>), // (broadcast, client_only)
}

#[derive(Debug, Clone)]
pub struct WsContext {
    // We require unique usernames. This tracks which usernames have been taken.
    pub notes: Arc<Mutex<AppState>>,
    // A list of sessions we will send changes to
    txs: Arc<Mutex<HashMap<String, SplitSink<WebSocket, Message>>>>,
    pub config: Arc<Configuration>,
    //
    db: MySqlPool,
}

impl WsContext {
    pub fn new(db: MySqlPool, config: Configuration) -> Self {
        Self {
            notes: Arc::new(Mutex::new(AppState::new())),
            txs: Arc::new(Mutex::new(HashMap::default())),
            config: Arc::new(config),
            db,
        }
    }

    pub async fn add_session(
        &self,
        client_id: String,
        mut tx: SplitSink<WebSocket, Message>,
    ) -> anyhow::Result<()> {
        let mut txs = self.txs.lock().await;
        let state = &*self.notes.lock().await;

        if let Err(err) = tx
            .send(Message::Text(
                // This method will not fail in "normal" operations so an `expect()` is OK here
                Utf8Bytes::from(
                    serde_json::to_string(&ServerMessage::Users {
                        items: state.get_users(&self.db).await?,
                    })
                    .expect("Serialize Error"),
                ),
            ))
            .await
        {
            warn!("Could not send initial users update: {}", err);
            return Ok(());
        }

        if let Err(err) = tx
            .send(Message::Text(
                // This method will not fail in "normal" operations so an `expect()` is OK here
                Utf8Bytes::from(
                    serde_json::to_string(&ServerMessage::Notes {
                        items: state.get_notes(&self.db).await?,
                    })
                    .expect("Serialize Error"),
                ),
            ))
            .await
        {
            warn!("Could not send initial notes update: {}", err);
            return Ok(());
        }

        // Add session to our list of sessions
        txs.insert(client_id, tx);

        Ok(())
    }

    async fn broadcast(&self, ops: Vec<WsOperation>) -> anyhow::Result<()> {
        if ops.is_empty() {
            return Ok(());
        }

        let message = serde_json::to_string(&ServerMessage::Patch { ops })?;
        let mut txs = self.txs.lock().await;

        // Collect disconnected clients
        let mut to_remove = Vec::new();

        for (client_id, tx) in txs.iter_mut() {
            if let Err(err) = tx
                .send(Message::Text(Utf8Bytes::from(message.clone())))
                .await
            {
                warn!("Client {} disconnected: {}", client_id, err);
                to_remove.push(client_id.clone());
            }
        }

        // Remove disconnected clients
        for client_id in to_remove {
            txs.remove(&client_id);
        }

        Ok(())
    }

    async fn send_to_client(&self, client_id: String, ops: Vec<WsOperation>) -> anyhow::Result<()> {
        if ops.is_empty() {
            return Ok(());
        }

        let message = serde_json::to_string(&ServerMessage::Patch { ops })?;
        let mut txs = self.txs.lock().await;

        if let Some(tx) = txs.get_mut(&client_id) {
            if let Err(err) = tx.send(Message::Text(Utf8Bytes::from(message))).await {
                warn!("Failed to send to client {}: {}", client_id, err);
                txs.remove(&client_id);
            }
        }

        Ok(())
    }
}

pub fn ws_router() -> Router {
    Router::new()
        .route("/", get(websocket_handler))
        .route_layer(from_fn(middleware::auth))
}

#[derive(Serialize, Debug)]
#[serde(tag = "type")]
enum ServerMessage {
    Patch { ops: Vec<WsOperation> },
    Users { items: Vec<User> },
    Notes { items: Vec<Note> },
}
