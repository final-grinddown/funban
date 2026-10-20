use chrono::NaiveDateTime;
use serde::Serialize;
use sqlx::MySqlPool;

use crate::model::release::{Release, ReleaseInsert, ReleaseType};

#[cfg(test)]
pub mod tests;

#[derive(Debug, Serialize, Clone)]
pub struct ReleaseDto {
    pub id: i32,
    pub release_code: String,
    pub release_type: String,
    pub release_at: NaiveDateTime,
    pub assignee_id: Option<i32>,
    /// Live user name when the assignee exists, otherwise the stored snapshot
    pub assignee_name: String,
    pub closed_at: Option<NaiveDateTime>,
    pub close_summary: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

impl TryFrom<ReleaseDto> for Release {
    type Error = String;

    fn try_from(release: ReleaseDto) -> Result<Self, Self::Error> {
        Ok(Self {
            id: release.id,
            release_code: release.release_code,
            release_type: ReleaseType::try_from(release.release_type.as_str())?,
            release_at: release.release_at,
            assignee_id: release.assignee_id,
            assignee_name: release.assignee_name,
            closed_at: release.closed_at,
            close_summary: release.close_summary,
            created_at: release.created_at,
            updated_at: release.updated_at,
        })
    }
}

pub async fn read_all(db: &MySqlPool) -> sqlx::Result<Vec<ReleaseDto>> {
    let releases = sqlx::query_as!(
        ReleaseDto,
        r#"
        SELECT r.id, r.release_code, r.release_type, r.release_at, r.assignee_id,
            COALESCE(u.name, r.assignee_name) AS "assignee_name!: String",
            r.closed_at, r.close_summary, r.created_at, r.updated_at
        FROM releases r
        LEFT JOIN users u ON u.id = r.assignee_id
        ORDER BY r.release_at DESC, r.id DESC
        "#,
    )
    .fetch_all(db)
    .await?;

    Ok(releases)
}

pub async fn read_by_id(db: &MySqlPool, id: i32) -> sqlx::Result<Option<ReleaseDto>> {
    let release = sqlx::query_as!(
        ReleaseDto,
        r#"
        SELECT r.id, r.release_code, r.release_type, r.release_at, r.assignee_id,
            COALESCE(u.name, r.assignee_name) AS "assignee_name!: String",
            r.closed_at, r.close_summary, r.created_at, r.updated_at
        FROM releases r
        LEFT JOIN users u ON u.id = r.assignee_id
        WHERE r.id = ?
        "#,
        id
    )
    .fetch_optional(db)
    .await?;

    Ok(release)
}

/// Looks up the current name of the assignee, used as the history snapshot.
/// Returns `RowNotFound` when the user does not exist.
async fn read_assignee_name(db: &MySqlPool, user_id: i32) -> sqlx::Result<String> {
    let row = sqlx::query!(
        r#"
        SELECT name FROM users WHERE id = ?
        "#,
        user_id
    )
    .fetch_optional(db)
    .await?;

    row.map(|r| r.name).ok_or(sqlx::Error::RowNotFound)
}

/// Inserts a new release. Fails with `RowNotFound` when the assignee does not exist.
pub async fn add(db: &MySqlPool, release: &ReleaseInsert) -> sqlx::Result<ReleaseDto> {
    let assignee_name = read_assignee_name(db, release.assignee_id).await?;

    let result = sqlx::query!(
        r#"
        INSERT INTO releases (release_code, release_type, release_at, assignee_id, assignee_name)
        VALUES (?, ?, ?, ?, ?)
        "#,
        release.release_code,
        release.release_type.as_str(),
        release.release_at,
        release.assignee_id,
        assignee_name,
    )
    .execute(db)
    .await?;

    let inserted_id = result.last_insert_id() as i32;

    read_by_id(db, inserted_id)
        .await?
        .ok_or(sqlx::Error::RowNotFound)
}

/// Updates an open release and refreshes the assignee name snapshot; closed releases are left untouched.
/// Returns `None` when the release does not exist and `RowNotFound` when the assignee does not.
pub async fn update(
    db: &MySqlPool,
    id: i32,
    release: &ReleaseInsert,
) -> sqlx::Result<Option<ReleaseDto>> {
    if read_by_id(db, id).await?.is_none() {
        return Ok(None);
    }

    let assignee_name = read_assignee_name(db, release.assignee_id).await?;

    sqlx::query!(
        r#"
        UPDATE releases
        SET release_code = ?, release_type = ?, release_at = ?, assignee_id = ?, assignee_name = ?
        WHERE id = ? AND closed_at IS NULL
        "#,
        release.release_code,
        release.release_type.as_str(),
        release.release_at,
        release.assignee_id,
        assignee_name,
        id
    )
    .execute(db)
    .await?;

    read_by_id(db, id).await
}

/// Deletes an open release. Returns `false` when it does not exist or is closed.
pub async fn remove(db: &MySqlPool, id: i32) -> sqlx::Result<bool> {
    let result = sqlx::query!(
        r#"
        DELETE FROM releases WHERE id = ? AND closed_at IS NULL
        "#,
        id
    )
    .execute(db)
    .await?;

    Ok(result.rows_affected() > 0)
}

/// Closes an open release with a summary. Returns `false` when it does not exist or is already closed.
pub async fn close(db: &MySqlPool, id: i32, summary: &str) -> sqlx::Result<bool> {
    let result = sqlx::query!(
        r#"
        UPDATE releases
        SET closed_at = NOW(), close_summary = ?
        WHERE id = ? AND closed_at IS NULL
        "#,
        summary,
        id
    )
    .execute(db)
    .await?;

    Ok(result.rows_affected() > 0)
}

/// Reopens a closed release, keeping its summary. Returns `false` when it does not exist or is open.
pub async fn reopen(db: &MySqlPool, id: i32) -> sqlx::Result<bool> {
    let result = sqlx::query!(
        r#"
        UPDATE releases
        SET closed_at = NULL
        WHERE id = ? AND closed_at IS NOT NULL
        "#,
        id
    )
    .execute(db)
    .await?;

    Ok(result.rows_affected() > 0)
}
