use crate::{
    http::{errors::Error, middleware::auth, Result},
    model::release::{Release, ReleaseInsert, ReleaseType},
    sql::{self, release::ReleaseDto},
};

use axum::{
    extract::Path,
    middleware,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use chrono::NaiveDateTime;
use serde::Deserialize;
use tracing::info;
use utoipa::ToSchema;

use crate::http::ApiContext;

const RELEASE_CODE_MAX_LEN: usize = 32;
const CLOSE_SUMMARY_MAX_LEN: usize = 2000;

#[derive(Debug, Deserialize, ToSchema)]
pub struct ReleaseRequest {
    release_code: String,
    /// `application` or `maintenance`
    release_type: String,
    /// ISO-like local datetime, e.g. `2026-10-20T14:00` or `2026-10-20T14:00:00`
    release_at: String,
    assignee_id: i32,
}

impl ReleaseRequest {
    fn into_insert(self) -> Result<ReleaseInsert> {
        let release_code = self.release_code.trim().to_string();
        if release_code.is_empty() {
            return Err(Error::BadRequest(
                "release_code cannot be empty".to_string(),
            ));
        }
        if release_code.chars().count() > RELEASE_CODE_MAX_LEN {
            return Err(Error::BadRequest(format!(
                "release_code must be {} characters or less",
                RELEASE_CODE_MAX_LEN
            )));
        }

        let release_type =
            ReleaseType::try_from(self.release_type.as_str()).map_err(Error::BadRequest)?;

        let release_at = parse_release_at(&self.release_at)
            .ok_or_else(|| Error::BadRequest(format!("Invalid release_at: {}", self.release_at)))?;

        Ok(ReleaseInsert {
            release_code,
            release_type,
            release_at,
            assignee_id: self.assignee_id,
        })
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CloseReleaseRequest {
    summary: String,
}

impl CloseReleaseRequest {
    fn validated_summary(&self) -> Result<String> {
        let summary = self.summary.trim().to_string();
        if summary.is_empty() {
            return Err(Error::BadRequest("summary cannot be empty".to_string()));
        }
        if summary.chars().count() > CLOSE_SUMMARY_MAX_LEN {
            return Err(Error::BadRequest(format!(
                "summary must be {} characters or less",
                CLOSE_SUMMARY_MAX_LEN
            )));
        }
        Ok(summary)
    }
}

fn parse_release_at(value: &str) -> Option<NaiveDateTime> {
    NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M:%S%.fZ")
        .or_else(|_| NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M:%S%.f"))
        .or_else(|_| NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M"))
        .or_else(|_| NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S"))
        .ok()
}

/// Maps database errors from create/update into client errors where possible.
fn map_write_error(e: sqlx::Error) -> Error {
    match e {
        sqlx::Error::RowNotFound => Error::BadRequest("Assignee not found".to_string()),
        sqlx::Error::Database(ref db_err) if db_err.is_unique_violation() => {
            Error::Conflict("Release code already exists".to_string())
        }
        other => Error::Sqlx(other),
    }
}

fn to_release(dto: ReleaseDto) -> Result<Release> {
    Release::try_from(dto).map_err(Error::Internal)
}

fn closed_error() -> Error {
    Error::Conflict("Release is closed. Reopen it to make changes.".to_string())
}

/// Loads a release and rejects closed ones, which are read-only.
async fn read_open_release(ctx: &ApiContext, id: i32) -> Result<ReleaseDto> {
    match sql::release::read_by_id(&ctx.db, id).await? {
        Some(release) if release.closed_at.is_some() => Err(closed_error()),
        Some(release) => Ok(release),
        None => Err(Error::NotFound),
    }
}

/// Re-reads a release after a state change.
async fn read_release(ctx: &ApiContext, id: i32) -> Result<Json<Release>> {
    match sql::release::read_by_id(&ctx.db, id).await? {
        Some(release) => Ok(Json(to_release(release)?)),
        None => Err(Error::NotFound),
    }
}

pub fn protected_router() -> Router {
    Router::new()
        .route("/releases", get(get_all))
        .route("/releases", post(create))
        .route("/releases/{id}", get(get_by_id))
        .route("/releases/{id}", put(update))
        .route("/releases/{id}", delete(remove))
        .route("/releases/{id}/close", post(close))
        .route("/releases/{id}/reopen", post(reopen))
        .route_layer(middleware::from_fn(auth))
}

/// Get all releases, newest first.
#[utoipa::path(get,
	path = "/releases",
	responses((status = 200, body = Vec<Release>, description = "Success")),
	security(("jwt" = []))
)]
pub async fn get_all(ctx: Extension<ApiContext>) -> Result<Json<Vec<Release>>> {
    let result = sql::release::read_all(&ctx.db).await?;

    let mapped = result
        .into_iter()
        .map(to_release)
        .collect::<Result<Vec<_>>>()?;

    Ok(Json(mapped))
}

/// Get a specific release.
#[utoipa::path(get,
	path = "/releases/{id}",
	params(("id" = i32, Path, description = "Id of the release.")),
	responses((status = 200, body = Release, description = "Success"), (status = 404, description = "Release not found")),
	security(("jwt" = []))
)]
pub async fn get_by_id(Path(id): Path<i32>, ctx: Extension<ApiContext>) -> Result<Json<Release>> {
    read_release(&ctx, id).await
}

/// Create a new release.
#[utoipa::path(post,
	path = "/releases",
	request_body = ReleaseRequest,
	responses(
		(status = 200, body = Release, description = "Success"),
		(status = 400, description = "Invalid input or assignee not found"),
		(status = 409, description = "Release code already exists")
	),
	security(("jwt" = []))
)]
pub async fn create(
    ctx: Extension<ApiContext>,
    Json(payload): Json<ReleaseRequest>,
) -> Result<Json<Release>> {
    let insert = payload.into_insert()?;

    let release = sql::release::add(&ctx.db, &insert)
        .await
        .map_err(map_write_error)?;

    info!(release_id = release.id, release_code = %release.release_code, "Release created");
    Ok(Json(to_release(release)?))
}

/// Update an open release.
#[utoipa::path(put,
	path = "/releases/{id}",
	params(("id" = i32, Path, description = "Id of the release.")),
	request_body = ReleaseRequest,
	responses(
		(status = 200, body = Release, description = "Success"),
		(status = 400, description = "Invalid input or assignee not found"),
		(status = 404, description = "Release not found"),
		(status = 409, description = "Release code already exists or release is closed")
	),
	security(("jwt" = []))
)]
pub async fn update(
    Path(id): Path<i32>,
    ctx: Extension<ApiContext>,
    Json(payload): Json<ReleaseRequest>,
) -> Result<Json<Release>> {
    let insert = payload.into_insert()?;
    read_open_release(&ctx, id).await?;

    match sql::release::update(&ctx.db, id, &insert)
        .await
        .map_err(map_write_error)?
    {
        Some(release) => {
            info!(release_id = id, "Release updated");
            Ok(Json(to_release(release)?))
        }
        None => Err(Error::NotFound),
    }
}

/// Delete an open release.
#[utoipa::path(delete,
	path = "/releases/{id}",
	params(("id" = i32, Path, description = "Id of the release.")),
	responses(
		(status = 200, description = "Success"),
		(status = 404, description = "Release not found"),
		(status = 409, description = "Release is closed")
	),
	security(("jwt" = []))
)]
pub async fn remove(Path(id): Path<i32>, ctx: Extension<ApiContext>) -> Result<()> {
    read_open_release(&ctx, id).await?;

    if sql::release::remove(&ctx.db, id).await? {
        info!(release_id = id, "Release deleted");
        Ok(())
    } else {
        // Closed concurrently between the check and the delete
        Err(closed_error())
    }
}

/// Close an open release with a summary, making it read-only.
#[utoipa::path(post,
	path = "/releases/{id}/close",
	params(("id" = i32, Path, description = "Id of the release.")),
	request_body = CloseReleaseRequest,
	responses(
		(status = 200, body = Release, description = "Success"),
		(status = 400, description = "Invalid summary"),
		(status = 404, description = "Release not found"),
		(status = 409, description = "Release is already closed")
	),
	security(("jwt" = []))
)]
pub async fn close(
    Path(id): Path<i32>,
    ctx: Extension<ApiContext>,
    Json(payload): Json<CloseReleaseRequest>,
) -> Result<Json<Release>> {
    let summary = payload.validated_summary()?;
    read_open_release(&ctx, id).await?;

    if !sql::release::close(&ctx.db, id, &summary).await? {
        return Err(closed_error());
    }

    info!(release_id = id, "Release closed");
    read_release(&ctx, id).await
}

/// Reopen a closed release so it can be edited again. The summary is kept.
#[utoipa::path(post,
	path = "/releases/{id}/reopen",
	params(("id" = i32, Path, description = "Id of the release.")),
	responses(
		(status = 200, body = Release, description = "Success"),
		(status = 404, description = "Release not found"),
		(status = 409, description = "Release is not closed")
	),
	security(("jwt" = []))
)]
pub async fn reopen(Path(id): Path<i32>, ctx: Extension<ApiContext>) -> Result<Json<Release>> {
    if !sql::release::reopen(&ctx.db, id).await? {
        return match sql::release::read_by_id(&ctx.db, id).await? {
            Some(_) => Err(Error::Conflict("Release is not closed".to_string())),
            None => Err(Error::NotFound),
        };
    }

    info!(release_id = id, "Release reopened");
    read_release(&ctx, id).await
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(code: &str, release_type: &str, release_at: &str) -> ReleaseRequest {
        ReleaseRequest {
            release_code: code.to_string(),
            release_type: release_type.to_string(),
            release_at: release_at.to_string(),
            assignee_id: 1,
        }
    }

    #[test]
    fn valid_request_is_trimmed_and_parsed() {
        let insert = request(" 20261020 ", "maintenance", "2026-10-20T14:30")
            .into_insert()
            .unwrap();

        assert_eq!(insert.release_code, "20261020");
        assert_eq!(insert.release_type, ReleaseType::Maintenance);
        assert_eq!(insert.release_at.to_string(), "2026-10-20 14:30:00");
    }

    #[test]
    fn accepts_datetime_with_seconds() {
        assert!(parse_release_at("2026-10-20T14:30:00").is_some());
        assert!(parse_release_at("2026-10-20T14:30:00.000Z").is_some());
        assert!(parse_release_at("2026-10-20 14:30:00").is_some());
    }

    #[test]
    fn close_summary_is_trimmed_and_validated() {
        let request = |summary: &str| CloseReleaseRequest {
            summary: summary.to_string(),
        };

        assert_eq!(request("  Done.  ").validated_summary().unwrap(), "Done.");
        assert!(request("   ").validated_summary().is_err());
        assert!(request(&"x".repeat(2001)).validated_summary().is_err());
    }

    #[test]
    fn rejects_invalid_input() {
        assert!(request("  ", "application", "2026-10-20T14:30")
            .into_insert()
            .is_err());
        assert!(request(&"x".repeat(33), "application", "2026-10-20T14:30")
            .into_insert()
            .is_err());
        assert!(request("20261020", "hotfix", "2026-10-20T14:30")
            .into_insert()
            .is_err());
        assert!(request("20261020", "application", "not-a-date")
            .into_insert()
            .is_err());
    }
}
