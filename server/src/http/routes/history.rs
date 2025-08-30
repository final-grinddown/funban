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
use chrono::Utc;
use serde::Serialize;
use utoipa::ToSchema;

use crate::http::ApiContext;

#[derive(Debug, Serialize, Clone, Default, ToSchema)]
pub struct HistoryDto {
    pub id: i64,
    pub label: Option<String>,
    pub snapshot: String,
    pub created_at: chrono::DateTime<Utc>,
}

impl From<HistoryEntity> for HistoryDto {
    fn from(user: HistoryEntity) -> Self {
        HistoryDto {
            id: user.id,
            label: user.label,
            snapshot: user.snapshot,
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
    let result = sql::history::create(&ctx.db, payload.label, &payload.snapshot).await?;

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
            created_at: user.created_at,
        }
    }
}
