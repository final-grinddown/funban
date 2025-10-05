use crate::{
    http::{errors::Error, middleware::auth, Result},
    model::history::{HistoryInsert, HistoryRename},
    sql::{
        self,
        history::{BrowserInfoEntity, HistoryEntity},
    },
};

use axum::{
    extract::Path,
    middleware,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use serde::Serialize;
use utoipa::ToSchema;

use crate::http::ApiContext;

#[derive(Debug, Serialize, Clone, Default, ToSchema)]
pub struct HistoryDto {
    pub id: i32,
    pub label: Option<String>,
    pub snapshot: String,
    pub version: i32,
    pub created_at: chrono::DateTime<Utc>,
}

impl From<HistoryEntity> for HistoryDto {
    fn from(user: HistoryEntity) -> Self {
        HistoryDto {
            id: user.id,
            label: user.label,
            snapshot: user.snapshot,
            version: user.version,
            created_at: user.created_at,
        }
    }
}

#[derive(Debug, Serialize, Clone, Default, ToSchema)]
pub struct BrowserInfoBitDto {
    pub id: u32,
    pub label: Option<String>,
}
#[derive(Debug, Serialize, Clone, Default, ToSchema)]
pub struct BrowserInfoDto {
    pub previous: Option<BrowserInfoBitDto>,
    pub next: Option<BrowserInfoBitDto>,
    pub label: Option<String>,
    pub snapshot: String,
    pub version: i32,
    pub created_at: chrono::DateTime<Utc>,
}

pub fn protected_router() -> Router {
    Router::new()
        .route("/history", get(get_all))
        .route("/history/{id}", get(get_by_id))
        .route("/history/{id}", delete(remove))
        .route("/history/{id}", put(rename))
        .route("/history", post(create))
        .route("/history/last", get(get_last))
        .route("/history/browser", get(get_latest_browser))
        .route("/history/browser/{id}", get(get_browser))
        .route_layer(middleware::from_fn(auth))
}

/// Get all history snapshots.
#[utoipa::path(get,
	path = "/history",
	responses((status = 200, body = Vec<HistoryDto>, description = "Success")),
	security(("jwt" = []))
)]
pub async fn get_all(ctx: Extension<ApiContext>) -> Result<Json<Vec<HistoryDto>>> {
    let result = sql::history::read_all(&ctx.db).await?;

    let mapped = result.into_iter().map(HistoryDto::from).collect();

    Ok(Json(mapped))
}

/// Get a specific snapshot.
#[utoipa::path(get,
	path = "/history/{id}",
	params(("id" = u32, Path, description = "Id of the history snapshot we want to retrieve.")),
 	responses((status = 200, body = HistoryDto, description = "Success"), (status = 404, description = "History with specified id not found")),
	security(("jwt" = []))
)]
pub async fn get_by_id(
    Path(id): Path<u32>,
    ctx: Extension<ApiContext>,
) -> Result<Json<HistoryDto>> {
    let db_result = sql::history::read_by_id(&ctx.db, id).await?;

    if let Some(result) = db_result {
        Ok(Json(result.into()))
    } else {
        Err(Error::NotFound)
    }
}

/// Delete a snapshot.
#[utoipa::path(delete,
	path = "/history/{id}",
	params(("id" = u32, Path, description = "Id of the history snapshot we want to delete.")),
 	responses((status = 200, description = "Success"), (status = 404, description = "History with specified id not found")),
	security(("jwt" = []))
)]
pub async fn remove(Path(id): Path<u32>, ctx: Extension<ApiContext>) -> Result<()> {
    let db_result = sql::history::delete(&ctx.db, id).await?;

    if db_result.is_some() {
        Ok(())
    } else {
        Err(Error::NotFound)
    }
}

/// Rename a snapshot.
#[utoipa::path(put,
	path = "/history/{id}",
	request_body = HistoryRename,
 	responses((status = 200, description = "Success"), (status = 404, description = "History with specified id not found")),
	security(("jwt" = []))
)]
pub async fn rename(ctx: Extension<ApiContext>, Json(payload): Json<HistoryRename>) -> Result<()> {
    let db_result = sql::history::rename(&ctx.db, payload.id, &payload.label).await?;

    if db_result.is_some() {
        Ok(())
    } else {
        Err(Error::NotFound)
    }
}

/// Create a new history snapshot.
#[utoipa::path(post,
	path = "/history",
	request_body = HistoryInsert,
	responses((status = 200, body = HistoryDto, description = "Success.")),
	security(("jwt" = []))
)]
pub async fn create(
    Extension(ctx): Extension<ApiContext>,
    Json(payload): Json<HistoryInsert>,
) -> Result<Json<HistoryDto>> {
    // Build V2 snapshot from database

    // Fetch all notes
    let notes = sql::note::read_all(&ctx.db)
        .await
        .map_err(|e| Error::Internal(format!("Failed to fetch notes: {}", e)))?;

    // Fetch all users
    let users = sql::user::read_all(&ctx.db)
        .await
        .map_err(|e| Error::Internal(format!("Failed to fetch users: {}", e)))?;

    // Fetch all user marks
    let user_marks_all = sql::user_mark::read_all(&ctx.db)
        .await
        .map_err(|e| Error::Internal(format!("Failed to fetch user marks: {}", e)))?;

    // Build users array with marks
    let users_with_marks: Vec<serde_json::Value> = users
        .iter()
        .map(|user| {
            let marks: Vec<serde_json::Value> = user_marks_all
                .iter()
                .filter(|mark| mark.user_id == user.id)
                .map(|mark| {
                    serde_json::json!({
                        "mark_type": mark.mark_type,
                        "custom_text": mark.custom_text,
                        "expires_in": mark.expires_after_status_ends
                    })
                })
                .collect();

            serde_json::json!({
                "id": user.id,
                "name": user.name,
                "color": user.color,
                "email": user.email,
                "marks": marks
            })
        })
        .collect();

    // Build notes array with owner_id references
    let notes_v2: Vec<serde_json::Value> = notes
        .iter()
        .map(|note| {
            serde_json::json!({
                "id": note.id,
                "text": note.text,
                "name": note.name,
                "color": note.color,
                "owner_id": note.owner_id,
                "state": note.state,
                "predecessor_id": note.predecessor_id,
                "updated": note.updated,
                "created": note.created,
                "tag": note.tag
            })
        })
        .collect();

    // Create V2 snapshot structure
    let v2_snapshot = serde_json::json!({
        "version": 2,
        "users": users_with_marks,
        "notes": notes_v2
    });

    // Serialize to JSON string
    let snapshot_str = serde_json::to_string(&v2_snapshot)
        .map_err(|e| Error::Internal(format!("Failed to serialize snapshot: {}", e)))?;

    // Encode as base64
    let snapshot_base64 = BASE64.encode(&snapshot_str);

    // Insert history record
    let result = sql::history::create(&ctx.db, payload.label, &snapshot_base64, 2)
        .await
        .map_err(|e| Error::Internal(format!("Failed to create history: {}", e)))?;

    // Decrement user marks expiration and cleanup
    let removed_marks = sql::user_mark::decrement_expires_and_cleanup(&ctx.db)
        .await
        .map_err(|e| Error::Internal(format!("Failed to update user marks: {}", e)))?;

    // Broadcast mark removals via WebSocket
    if !removed_marks.is_empty() {
        use crate::state::WsOperation;

        let ops: Vec<WsOperation> = removed_marks
            .iter()
            .map(|mark| WsOperation::UserMarkRemoved {
                user_id: mark.user_id as u32,
                mark_id: mark.id as u32,
            })
            .collect();

        if let Some(ws_ctx) = &ctx.ws_context {
            let _ = ws_ctx.broadcast(ops).await;
        }
    }

    Ok(Json(HistoryDto::from(result)))
}

/// Get the last history snapshot.
#[utoipa::path(get,
	path = "/history/last",
	responses((status = 200, body = Option<HistoryDto>, description = "Success")),
	security(("jwt" = []))
)]
pub async fn get_last(ctx: Extension<ApiContext>) -> Result<Json<Option<HistoryDto>>> {
    let result = sql::history::read_last(&ctx.db).await?;

    Ok(Json(result.map(HistoryDto::from)))
}

/// Get a browser view of a specific snapshot.
#[utoipa::path(get,
	path = "/history/browser/{id}",
	params(("id" = u32, Path, description = "Id of the history snapshot we want to retrieve.")),
 	responses((status = 200, body = BrowserInfoDto, description = "Success")),
	security(("jwt" = []))
)]
pub async fn get_browser(
    Path(id): Path<String>,
    ctx: Extension<ApiContext>,
) -> Result<Json<BrowserInfoDto>> {
    let result = sql::history::read_browser(&ctx.db, Some(&id)).await?;

    Ok(Json(BrowserInfoDto::from(result)))
}

/// Get a browser view of a latest snapshot.
#[utoipa::path(get,
	path = "/history/browser",
	responses((status = 200, body = BrowserInfoDto, description = "Success")),
	security(("jwt" = []))
)]
pub async fn get_latest_browser(ctx: Extension<ApiContext>) -> Result<Json<BrowserInfoDto>> {
    let result = sql::history::read_browser(&ctx.db, None).await?;

    Ok(Json(BrowserInfoDto::from(result)))
}

impl From<BrowserInfoEntity> for BrowserInfoDto {
    fn from(user: BrowserInfoEntity) -> Self {
        BrowserInfoDto {
            previous: user.previous_id.map(|x| BrowserInfoBitDto {
                id: x,
                label: user.previous_label,
            }),
            next: user.next_id.map(|x| BrowserInfoBitDto {
                id: x,
                label: user.next_label,
            }),
            label: user.label,
            snapshot: user.snapshot,
            version: user.version,
            created_at: user.created_at,
        }
    }
}
