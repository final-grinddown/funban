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

/// Enhanced error handling for WebSocket operations
#[derive(Debug)]
enum WsErrorType {
    ParseError {
        #[allow(dead_code)]
        raw_message: String,
    },
    ConnectionError {
        reason: String,
    },
    ApplicationError {
        #[allow(dead_code)]
        action: String,
        error: String,
    },
    SendError {
        #[allow(dead_code)]
        target: SendTarget,
        #[allow(dead_code)]
        error: String,
    },
    SyncLoss {
        operation: String,
    },
}

// Error message constants to avoid repeated allocations
const PARSE_ERROR_MSG: &str = "Invalid message format. Please check your request structure.";
const SEND_ERROR_MSG: &str = "Failed to deliver message. Please try again.";

#[derive(Debug)]
enum SendTarget {
    Client,
}

impl WsErrorType {
    fn log_level(&self) -> &'static str {
        match self {
            WsErrorType::ParseError { .. } => "warn",
            WsErrorType::ConnectionError { .. } => "error",
            WsErrorType::ApplicationError { .. } => "error",
            WsErrorType::SendError { .. } => "warn",
            WsErrorType::SyncLoss { .. } => "error",
        }
    }

    fn client_message(&self) -> String {
        match self {
            WsErrorType::ParseError { .. } => PARSE_ERROR_MSG.to_owned(),
            WsErrorType::ConnectionError { reason } => {
                format!("Connection failed: {}", reason)
            }
            WsErrorType::ApplicationError { error, .. } => {
                format!("Operation failed: {}", error)
            }
            WsErrorType::SendError { .. } => SEND_ERROR_MSG.to_owned(),
            WsErrorType::SyncLoss { operation } => {
                format!(
                    "Sync issue detected after {}. Please refresh to see latest changes.",
                    operation
                )
            }
        }
    }
}

/// Handle sync loss by broadcasting error to all clients
async fn handle_sync_loss_broadcast(
    context: &WsContext,
    error_type: &WsErrorType,
    uuid: &Option<String>,
) {
    error!(
        error_type = ?error_type,
        uuid = ?uuid,
        "Sync loss detected - broadcasting to all clients"
    );

    let sync_error = vec![WsOperation::Error {
        uuid: uuid.clone(),
        message: error_type.client_message(),
    }];

    if let Err(e) = context.broadcast(sync_error).await {
        error!(
            error = %e,
            "Failed to broadcast sync loss error - critical sync failure"
        );
    }
}

/// Send structured error response to client with proper logging
async fn handle_ws_error(
    context: &WsContext,
    client_id: &str,
    error_type: WsErrorType,
    uuid: &Option<String>,
) {
    // Special case: SyncLoss affects everyone, so broadcast it
    if matches!(error_type, WsErrorType::SyncLoss { .. }) {
        handle_sync_loss_broadcast(context, &error_type, uuid).await;
        return;
    }
    // Log with appropriate level and structured data
    match error_type.log_level() {
        "error" => error!(
            client_id = %client_id,
            error_type = ?error_type,
            uuid = ?uuid,
            "WebSocket error occurred"
        ),
        "warn" => warn!(
            client_id = %client_id,
            error_type = ?error_type,
            uuid = ?uuid,
            "WebSocket warning"
        ),
        _ => info!(
            client_id = %client_id,
            error_type = ?error_type,
            uuid = ?uuid,
            "WebSocket info"
        ),
    }

    // Send user-friendly error to client
    let error_response = vec![WsOperation::Error {
        uuid: uuid.clone(),
        message: error_type.client_message(),
    }];

    if let Err(e) = context
        .send_to_client(client_id.to_string(), error_response)
        .await
    {
        error!(
            client_id = %client_id,
            error = %e,
            "Failed to send error response to client - connection may be broken"
        );
    }
}

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
        handle_ws_error(
            &context,
            &client_id,
            WsErrorType::ConnectionError {
                reason: format!("Session creation failed: {}", e),
            },
            &None,
        )
        .await;
        return;
    }

    while let Some(Ok(msg)) = rx.next().await {
        if let Message::Text(text) = msg {
            if let Ok(action) = serde_json::from_str::<WsAction>(&text) {
                let uuid = extract_uuid(&action);
                let action_debug = format!("{:?}", action); // Capture debug string before move
                info!(action = ?action, "Received action");

                // Validate action content before processing
                if let Err(validation_error) =
                    crate::http::validation::validators::validate_ws_action_content(&action)
                {
                    let error_message = validation_error.message();
                    let validation_response = vec![crate::state::WsOperation::Error {
                        uuid: uuid.clone(),
                        message: error_message,
                    }];
                    if let Err(e) = context
                        .send_to_client(client_id.clone(), validation_response)
                        .await
                    {
                        handle_ws_error(
                            &context,
                            &client_id,
                            WsErrorType::SendError {
                                target: SendTarget::Client,
                                error: e.to_string(),
                            },
                            &uuid,
                        )
                        .await;
                    }
                    continue;
                }

                let mut app_state = context.notes.lock().await;
                match app_state.apply(&context.db, action).await {
                    Ok(OperationResult::Broadcast(ops)) => {
                        drop(app_state);
                        info!(op_count = ops.len(), "Broadcasting operations");
                        if let Err(_e) = context.broadcast(ops).await {
                            // Operation succeeded but broadcast failed = sync loss
                            handle_ws_error(
                                &context,
                                &client_id,
                                WsErrorType::SyncLoss {
                                    operation: action_debug.clone(),
                                },
                                &uuid,
                            )
                            .await;
                        }
                    }
                    Ok(OperationResult::ClientOnly(ops)) => {
                        drop(app_state);
                        info!(op_count = ops.len(), "Sending client-only operations");
                        if let Err(e) = context.send_to_client(client_id.clone(), ops).await {
                            handle_ws_error(
                                &context,
                                &client_id,
                                WsErrorType::SendError {
                                    target: SendTarget::Client,
                                    error: e.to_string(),
                                },
                                &uuid,
                            )
                            .await;
                        }
                    }
                    Err(err) => {
                        drop(app_state);
                        handle_ws_error(
                            &context,
                            &client_id,
                            WsErrorType::ApplicationError {
                                action: action_debug,
                                error: err.to_string(),
                            },
                            &uuid,
                        )
                        .await;
                    }
                }
            } else {
                handle_ws_error(
                    &context,
                    &client_id,
                    WsErrorType::ParseError {
                        raw_message: text.to_string(),
                    },
                    &None,
                )
                .await;
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
        WsAction::AddUserMark { uuid, .. } => uuid.clone(),
        WsAction::SplitNote { uuid, .. } => uuid.clone(),
    }
}
