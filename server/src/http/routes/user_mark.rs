use crate::http::Result;
use crate::model::user_mark::{UserMarkInsert, UserMarkType};
use crate::sql::{self, user_mark::UserMarkDto};
use axum::{
    extract::Path,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

use crate::http::ApiContext;

#[derive(Debug, Serialize, Clone)]
pub struct UserMark {
    id: i32,
    user_id: i32,
    mark_type: String,
    custom_text: Option<String>,
    expires_after_status_ends: Option<i32>,
    expires_at: Option<NaiveDateTime>,
}

impl From<UserMarkDto> for UserMark {
    fn from(user_mark: UserMarkDto) -> Self {
        UserMark {
            id: user_mark.id,
            user_id: user_mark.user_id,
            mark_type: user_mark.mark_type,
            custom_text: user_mark.custom_text,
            expires_after_status_ends: user_mark.expires_after_status_ends,
            expires_at: user_mark.expires_at,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateUserMarkRequest {
    user_id: i32,
    mark_type: String,
    custom_text: Option<String>,
    expires_after_status_ends: Option<i32>,
    expires_at: Option<String>,
}

impl CreateUserMarkRequest {
    fn validate(&self) -> Result<()> {
        if !UserMarkType::is_valid_mark_type(&self.mark_type) {
            return Err(crate::http::Error::BadRequest(format!(
                "Invalid mark type: {}. Must be one of: ⚫, ⭐, 🕐",
                self.mark_type
            )));
        }

        if let Some(expires) = self.expires_after_status_ends {
            if expires < 0 {
                return Err(crate::http::Error::BadRequest(
                    "expires_after_status_ends must be at least 0".to_string(),
                ));
            }
        }

        if let Some(ref text) = self.custom_text {
            if text.len() > 255 {
                return Err(crate::http::Error::BadRequest(
                    "custom_text must be 255 characters or less".to_string(),
                ));
            }
        }

        Ok(())
    }
}

pub fn router() -> Router {
    Router::new()
        .route("/user-marks", get(get_all))
        .route("/user-marks", post(create))
        .route(
            "/user-marks/user/{user_id}/expired",
            get(get_expired_by_user_id),
        )
        .route(
            "/user-marks/user/{user_id}/expired",
            delete(delete_expired_marks),
        )
        .route(
            "/user-marks/user/{user_id}/expire-all",
            put(expire_all_marks),
        )
        .route("/user-marks/user/{user_id}", get(get_by_user_id))
        .route("/user-marks/{id}", put(update_mark))
        .route("/user-marks/{id}", delete(delete_mark))
}

async fn get_all(ctx: Extension<ApiContext>) -> Result<Json<Vec<UserMark>>> {
    let from_db = sql::user_mark::read_all(&ctx.db).await;

    match from_db {
        Ok(user_marks) => {
            let result = user_marks.into_iter().map(UserMark::from).collect();
            Ok(Json(result))
        }
        Err(e) => {
            tracing::error!("Failed to fetch user marks: {}", e);
            Ok(Json(vec![]))
        }
    }
}

async fn get_by_user_id(
    ctx: Extension<ApiContext>,
    Path(user_id): Path<i32>,
) -> Result<Json<Vec<UserMark>>> {
    let from_db = sql::user_mark::read_by_user_id(&ctx.db, user_id).await;

    match from_db {
        Ok(user_marks) => {
            let result = user_marks.into_iter().map(UserMark::from).collect();
            Ok(Json(result))
        }
        Err(e) => {
            tracing::error!("Failed to fetch user marks for user {}: {}", user_id, e);
            Ok(Json(vec![]))
        }
    }
}

async fn create(
    ctx: Extension<ApiContext>,
    Json(payload): Json<CreateUserMarkRequest>,
) -> Result<Json<UserMark>> {
    payload.validate()?;

    // Parse expires_at if provided
    let expires_at_datetime = payload.expires_at.as_ref().and_then(|s| {
        NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.fZ")
            .or_else(|_| NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S"))
            .or_else(|_| NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S"))
            .ok()
    });

    let user_mark_insert = UserMarkInsert {
        user_id: payload.user_id,
        mark_type: payload.mark_type.clone(),
        custom_text: payload.custom_text.clone(),
        expires_after_status_ends: payload.expires_after_status_ends,
        expires_at: expires_at_datetime,
    };

    match sql::user_mark::add(&ctx.db, &user_mark_insert).await {
        Ok(user_mark) => {
            // Broadcast WebSocket message to all clients
            if let Some(ws_ctx) = &ctx.ws_context {
                use crate::state::WsOperation;

                let ws_op = WsOperation::UserMarkAdded {
                    mark_id: user_mark.id as u32,
                    user_id: user_mark.user_id as u32,
                    mark_type: user_mark.mark_type.clone(),
                    custom_text: user_mark.custom_text.clone(),
                    expires_after_status_ends: user_mark.expires_after_status_ends.unwrap_or(0)
                        as u32,
                    expires_at: user_mark
                        .expires_at
                        .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S").to_string()),
                };

                tracing::info!(
                    "Broadcasting UserMarkAdded: user_id={}, mark_id={}",
                    user_mark.user_id,
                    user_mark.id
                );
                if let Err(e) = ws_ctx.broadcast(vec![ws_op]).await {
                    tracing::error!("Failed to broadcast user mark creation: {}", e);
                }
            } else {
                tracing::warn!("WebSocket context not available for broadcasting UserMarkAdded");
            }

            Ok(Json(UserMark::from(user_mark)))
        }
        Err(e) => {
            tracing::error!("Failed to create user mark: {}", e);
            Err(crate::http::Error::Internal(
                "Failed to create user mark".to_string(),
            ))
        }
    }
}

async fn delete_mark(
    ctx: Extension<ApiContext>,
    Path(id): Path<i32>,
) -> Result<Json<serde_json::Value>> {
    // Fetch the mark before deleting to get user_id for WebSocket broadcast
    let mark = match sql::user_mark::read_by_id(&ctx.db, id).await {
        Ok(Some(m)) => m,
        Ok(None) => return Err(crate::http::Error::NotFound),
        Err(e) => {
            tracing::error!("Failed to fetch user mark {}: {}", id, e);
            return Err(crate::http::Error::Internal(
                "Failed to fetch user mark".to_string(),
            ));
        }
    };

    match sql::user_mark::remove(&ctx.db, id).await {
        Ok(deleted) => {
            if deleted {
                // Broadcast WebSocket message to all clients (only if mark was active)
                if mark.expires_after_status_ends.is_none()
                    || mark.expires_after_status_ends.unwrap_or(0) > 0
                {
                    if let Some(ws_ctx) = &ctx.ws_context {
                        use crate::state::WsOperation;

                        let ws_op = WsOperation::UserMarkRemoved {
                            user_id: mark.user_id as u32,
                            mark_id: mark.id as u32,
                        };

                        tracing::info!(
                            "Broadcasting UserMarkRemoved: user_id={}, mark_id={}",
                            mark.user_id,
                            mark.id
                        );
                        if let Err(e) = ws_ctx.broadcast(vec![ws_op]).await {
                            tracing::error!("Failed to broadcast user mark deletion: {}", e);
                        }
                    } else {
                        tracing::warn!(
                            "WebSocket context not available for broadcasting UserMarkRemoved"
                        );
                    }
                } else {
                    tracing::info!(
                        "Skipping WebSocket broadcast for expired mark deletion: mark_id={}",
                        mark.id
                    );
                }

                Ok(Json(serde_json::json!({ "success": true })))
            } else {
                Err(crate::http::Error::NotFound)
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete user mark {}: {}", id, e);
            Err(crate::http::Error::Internal(
                "Failed to delete user mark".to_string(),
            ))
        }
    }
}

async fn update_mark(
    ctx: Extension<ApiContext>,
    Path(id): Path<i32>,
    Json(payload): Json<CreateUserMarkRequest>,
) -> Result<Json<UserMark>> {
    payload.validate()?;

    // Fetch the old mark to compare status changes
    let old_mark = match sql::user_mark::read_by_id(&ctx.db, id).await {
        Ok(Some(mark)) => mark,
        Ok(None) => return Err(crate::http::Error::NotFound),
        Err(e) => {
            tracing::error!("Failed to fetch user mark {}: {}", id, e);
            return Err(crate::http::Error::Internal(
                "Failed to fetch user mark".to_string(),
            ));
        }
    };

    // Parse expires_at if provided
    let expires_at_datetime = payload.expires_at.as_ref().and_then(|s| {
        NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.fZ")
            .or_else(|_| NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S"))
            .or_else(|_| NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S"))
            .ok()
    });

    let user_mark_update = UserMarkInsert {
        user_id: payload.user_id,
        mark_type: payload.mark_type.clone(),
        custom_text: payload.custom_text.clone(),
        expires_after_status_ends: payload.expires_after_status_ends,
        expires_at: expires_at_datetime,
    };

    match sql::user_mark::update(&ctx.db, id, &user_mark_update).await {
        Ok(Some(updated_mark)) => {
            // Broadcast WebSocket message based on the type of change
            if let Some(ws_ctx) = &ctx.ws_context {
                use crate::state::WsOperation;

                let was_active = old_mark.expires_after_status_ends.is_none()
                    || old_mark.expires_after_status_ends.unwrap_or(0) > 0;
                let is_active = updated_mark.expires_after_status_ends.is_none()
                    || updated_mark.expires_after_status_ends.unwrap_or(0) > 0;

                let ws_op = match (was_active, is_active) {
                    (true, false) => {
                        // Mark was expired (active -> inactive)
                        WsOperation::UserMarkRemoved {
                            user_id: updated_mark.user_id as u32,
                            mark_id: updated_mark.id as u32,
                        }
                    }
                    (false, true) => {
                        // Mark was restored (inactive -> active)
                        WsOperation::UserMarkAdded {
                            mark_id: updated_mark.id as u32,
                            user_id: updated_mark.user_id as u32,
                            mark_type: updated_mark.mark_type.clone(),
                            custom_text: updated_mark.custom_text.clone(),
                            expires_after_status_ends: updated_mark
                                .expires_after_status_ends
                                .unwrap_or(0)
                                as u32,
                            expires_at: updated_mark
                                .expires_at
                                .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S").to_string()),
                        }
                    }
                    (true, true) | (false, false) => {
                        // Mark was updated but status didn't change
                        WsOperation::UserMarkUpdated {
                            mark_id: updated_mark.id as u32,
                            user_id: updated_mark.user_id as u32,
                            mark_type: updated_mark.mark_type.clone(),
                            custom_text: updated_mark.custom_text.clone(),
                            expires_after_status_ends: updated_mark
                                .expires_after_status_ends
                                .unwrap_or(0)
                                as u32,
                            expires_at: updated_mark
                                .expires_at
                                .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S").to_string()),
                        }
                    }
                };

                if let Err(e) = ws_ctx.broadcast(vec![ws_op]).await {
                    tracing::error!("Failed to broadcast user mark update: {}", e);
                }
            }

            Ok(Json(UserMark::from(updated_mark)))
        }
        Ok(None) => Err(crate::http::Error::NotFound),
        Err(e) => {
            tracing::error!("Failed to update user mark {}: {}", id, e);
            Err(crate::http::Error::Internal(
                "Failed to update user mark".to_string(),
            ))
        }
    }
}

async fn get_expired_by_user_id(
    ctx: Extension<ApiContext>,
    Path(user_id): Path<i32>,
) -> Result<Json<Vec<UserMark>>> {
    let from_db = sql::user_mark::read_expired_by_user_id(&ctx.db, user_id).await;

    match from_db {
        Ok(user_marks) => {
            let result = user_marks.into_iter().map(UserMark::from).collect();
            Ok(Json(result))
        }
        Err(e) => {
            tracing::error!(
                "Failed to fetch expired user marks for user {}: {}",
                user_id,
                e
            );
            Ok(Json(vec![]))
        }
    }
}

async fn expire_all_marks(
    ctx: Extension<ApiContext>,
    Path(user_id): Path<i32>,
) -> Result<Json<serde_json::Value>> {
    match sql::user_mark::expire_all_by_user_id(&ctx.db, user_id).await {
        Ok(expired_marks) => {
            let count = expired_marks.len();

            // Broadcast WebSocket messages for each expired mark
            if let Some(ws_ctx) = &ctx.ws_context {
                use crate::state::WsOperation;

                let ws_ops: Vec<WsOperation> = expired_marks
                    .iter()
                    .map(|mark| WsOperation::UserMarkRemoved {
                        user_id: mark.user_id as u32,
                        mark_id: mark.id as u32,
                    })
                    .collect();

                if let Err(e) = ws_ctx.broadcast(ws_ops).await {
                    tracing::error!("Failed to broadcast user mark expirations: {}", e);
                }
            }

            Ok(Json(serde_json::json!({
                "success": true,
                "expired_count": count
            })))
        }
        Err(e) => {
            tracing::error!("Failed to expire all marks for user {}: {}", user_id, e);
            Err(crate::http::Error::Internal(
                "Failed to expire marks".to_string(),
            ))
        }
    }
}

async fn delete_expired_marks(
    ctx: Extension<ApiContext>,
    Path(user_id): Path<i32>,
) -> Result<Json<serde_json::Value>> {
    match sql::user_mark::delete_expired_by_user_id(&ctx.db, user_id).await {
        Ok(deleted_count) => Ok(Json(serde_json::json!({
            "success": true,
            "deleted_count": deleted_count
        }))),
        Err(e) => {
            tracing::error!("Failed to delete expired marks for user {}: {}", user_id, e);
            Err(crate::http::Error::Internal(
                "Failed to delete expired marks".to_string(),
            ))
        }
    }
}
