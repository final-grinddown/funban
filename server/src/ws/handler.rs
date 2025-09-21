use std::{net::SocketAddr, sync::Arc};

use axum::{
    extract::{
        ws::{Message, WebSocket},
        ConnectInfo, WebSocketUpgrade,
    },
    response::IntoResponse,
    Extension,
};
use futures::StreamExt;
use tracing::{error, info, instrument, warn};

use crate::{
    model::auth::Claims,
    state::{WsAction, WsOperation},
};

use super::{OperationResult, WsContext};

#[instrument(skip(ws, state, claims))]
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    Extension(state): Extension<Arc<WsContext>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let client_id = claims.username;
    let client_email = claims.email;
    info!(client_id, client_email, "Client connected");
    ws.on_upgrade(move |socket| handle_client(socket, state, client_id))
}

#[instrument(skip(socket, context))]
async fn handle_client(socket: WebSocket, context: Arc<WsContext>, client_id: String) {
    let (tx, mut rx) = socket.split();

    if let Err(e) = context.add_session(client_id.clone(), tx).await {
        error!(error = %e, "Failed to add session");
        return;
    }

    while let Some(Ok(msg)) = rx.next().await {
        if let Message::Text(text) = msg {
            if let Ok(action) = serde_json::from_str::<WsAction>(&text) {
                let uuid = extract_uuid(&action);
                info!(action = ?action, "Received action");
                let mut app_state = context.notes.lock().await;
                match app_state.apply(&context.db, action).await {
                    Ok(OperationResult::Broadcast(ops)) => {
                        drop(app_state);
                        info!(op_count = ops.len(), "Broadcasting operations");
                        if let Err(e) = context.broadcast(ops).await {
                            error!(error = %e, "Broadcast failed");
                        }
                    }
                    Ok(OperationResult::ClientOnly(ops)) => {
                        drop(app_state);
                        info!(op_count = ops.len(), "Sending client-only operations");
                        if let Err(e) = context.send_to_client(client_id.clone(), ops).await {
                            warn!(error = %e, "Client send failed");
                        }
                    }
                    Ok(OperationResult::Mixed(bops, cops)) => {
                        drop(app_state);
                        info!(
                            broadcast_ops = bops.len(),
                            client_ops = cops.len(),
                            "Sending mixed operations"
                        );

                        if let Err(e) = context.broadcast(bops).await {
                            error!(error = %e, "Broadcast portion failed");
                        }
                        if let Err(e) = context.send_to_client(client_id.clone(), cops).await {
                            warn!(error = %e, "Client-only portion failed");
                        }
                    }
                    Err(err) => {
                        drop(app_state);

                        if let Err(e) = context
                            .send_to_client(
                                client_id.clone(),
                                vec![WsOperation::Error {
                                    uuid,
                                    message: format!("Error applying action: {}", err),
                                }],
                            )
                            .await
                        {
                            error!(error = %e, "Failed to send error to client");
                        }
                    }
                }
            } else {
                warn!(message = %text, "Failed to parse WebSocket message");
            }
        }
    }

    info!("Client disconnected");
}
fn extract_uuid(action: &WsAction) -> Option<String> {
    match action {
        WsAction::AddNote { uuid, .. } => uuid.clone(),
        WsAction::UpdateNoteText { uuid, .. } => uuid.clone(),
        WsAction::UpdateNoteTag { uuid, .. } => uuid.clone(),
        WsAction::Reorder { uuid, .. } => uuid.clone(),
        WsAction::RemoveNote { uuid, .. } => uuid.clone(),
        WsAction::AddUser { uuid, .. } => uuid.clone(),
        WsAction::UpdateUserName { uuid, .. } => uuid.clone(),
        WsAction::UpdateUserColor { uuid, .. } => uuid.clone(),
        WsAction::RemoveUser { uuid, .. } => uuid.clone(),
        WsAction::DeleteNotes { uuid, .. } => uuid.clone(),
        WsAction::NoteUpdate { uuid, .. } => uuid.clone(),
        WsAction::UserUpdate { uuid, .. } => uuid.clone(),
        WsAction::NotifySnapshot {} => None,
        WsAction::SplitNote { uuid, .. } => uuid.clone(),
    }
}
