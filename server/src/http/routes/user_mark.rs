use crate::http::Result;
use crate::model::user_mark::{UserMarkInsert, UserMarkType};
use crate::sql::{self, user_mark::UserMarkDto};
use axum::{
    extract::Path,
    routing::{delete, get, post},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::http::ApiContext;

#[derive(Debug, Serialize, Clone)]
pub struct UserMark {
    id: i32,
    user_id: i32,
    mark_type: String,
    custom_text: Option<String>,
    expires_after_status_ends: i32,
}

impl From<UserMarkDto> for UserMark {
    fn from(user_mark: UserMarkDto) -> Self {
        UserMark {
            id: user_mark.id,
            user_id: user_mark.user_id,
            mark_type: user_mark.mark_type,
            custom_text: user_mark.custom_text,
            expires_after_status_ends: user_mark.expires_after_status_ends,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateUserMarkRequest {
    user_id: i32,
    mark_type: String,
    custom_text: Option<String>,
    expires_after_status_ends: Option<i32>,
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
            if expires < 1 {
                return Err(crate::http::Error::BadRequest(
                    "expires_after_status_ends must be at least 1".to_string(),
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
        .route("/user-marks/{id}", delete(delete_mark))
        .route("/user-marks/user/{user_id}", get(get_by_user_id))
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

    let user_mark_insert = UserMarkInsert {
        user_id: payload.user_id,
        mark_type: payload.mark_type,
        custom_text: payload.custom_text,
        expires_after_status_ends: payload.expires_after_status_ends,
    };

    match sql::user_mark::add(&ctx.db, &user_mark_insert).await {
        Ok(user_mark) => Ok(Json(UserMark::from(user_mark))),
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
    match sql::user_mark::remove(&ctx.db, id).await {
        Ok(deleted) => {
            if deleted {
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
