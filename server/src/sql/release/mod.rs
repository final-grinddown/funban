use chrono::NaiveDateTime;
use serde::Serialize;
use sqlx::MySqlPool;

use crate::model::release::{Release, ReleaseInsert, ReleaseTask, ReleaseType};

#[cfg(test)]
pub mod tests;

#[derive(Debug, Serialize, Clone)]
pub struct ReleaseDto {
    pub id: i32,
    pub release_code: String,
    pub release_type: String,
    pub release_at: NaiveDateTime,
    pub deployed_by_us: bool,
    pub assignee_id: Option<i32>,
    /// Live user name when the assignee exists, otherwise the stored snapshot; `None` when unassigned
    pub assignee_name: Option<String>,
    pub closed_at: Option<NaiveDateTime>,
    pub close_summary: Option<String>,
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Clone)]
pub struct ReleaseTaskDto {
    pub id: i32,
    pub release_id: i32,
    pub title: String,
    pub timing: Option<String>,
    pub done_at: Option<NaiveDateTime>,
}

impl From<ReleaseTaskDto> for ReleaseTask {
    fn from(task: ReleaseTaskDto) -> Self {
        Self {
            id: task.id,
            title: task.title,
            timing: task.timing,
            done_at: task.done_at,
        }
    }
}

impl ReleaseDto {
    /// Converts into the API model; `tasks` must belong to this release and be in step order.
    pub fn into_release(self, tasks: Vec<ReleaseTaskDto>) -> Result<Release, String> {
        Ok(Release {
            id: self.id,
            release_code: self.release_code,
            release_type: ReleaseType::try_from(self.release_type.as_str())?,
            release_at: self.release_at,
            deployed_by_us: self.deployed_by_us,
            assignee_id: self.assignee_id,
            assignee_name: self.assignee_name,
            closed_at: self.closed_at,
            close_summary: self.close_summary,
            notes: self.notes,
            tasks: tasks.into_iter().map(ReleaseTask::from).collect(),
            created_at: self.created_at,
            updated_at: self.updated_at,
        })
    }
}

pub async fn read_all(db: &MySqlPool) -> sqlx::Result<Vec<ReleaseDto>> {
    let releases = sqlx::query_as!(
        ReleaseDto,
        r#"
        SELECT r.id, r.release_code, r.release_type, r.release_at,
            r.deployed_by_us AS "deployed_by_us: bool", r.assignee_id,
            COALESCE(u.name, r.assignee_name) AS "assignee_name?: String",
            r.closed_at, r.close_summary, r.notes, r.created_at, r.updated_at
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
        SELECT r.id, r.release_code, r.release_type, r.release_at,
            r.deployed_by_us AS "deployed_by_us: bool", r.assignee_id,
            COALESCE(u.name, r.assignee_name) AS "assignee_name?: String",
            r.closed_at, r.close_summary, r.notes, r.created_at, r.updated_at
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
/// Returns `None` for an unassigned release and `RowNotFound` when the user does not exist.
async fn read_assignee_name(db: &MySqlPool, user_id: Option<i32>) -> sqlx::Result<Option<String>> {
    let Some(user_id) = user_id else {
        return Ok(None);
    };

    let row = sqlx::query!(
        r#"
        SELECT name FROM users WHERE id = ?
        "#,
        user_id
    )
    .fetch_optional(db)
    .await?;

    row.map(|r| Some(r.name)).ok_or(sqlx::Error::RowNotFound)
}

/// Inserts a new release, optionally unassigned, with its tasks copied from the step template.
/// Fails with `RowNotFound` when the assignee does not exist.
pub async fn add(db: &MySqlPool, release: &ReleaseInsert) -> sqlx::Result<ReleaseDto> {
    let assignee_name = read_assignee_name(db, release.assignee_id).await?;

    let mut tx = db.begin().await?;

    let result = sqlx::query!(
        r#"
        INSERT INTO releases (release_code, release_type, release_at, deployed_by_us, assignee_id, assignee_name)
        VALUES (?, ?, ?, ?, ?, ?)
        "#,
        release.release_code,
        release.release_type.as_str(),
        release.release_at,
        release.deployed_by_us,
        release.assignee_id,
        assignee_name,
    )
    .execute(&mut *tx)
    .await?;

    let inserted_id = result.last_insert_id() as i32;
    copy_template_tasks(&mut *tx, inserted_id, release.release_type).await?;

    tx.commit().await?;

    read_by_id(db, inserted_id)
        .await?
        .ok_or(sqlx::Error::RowNotFound)
}

/// Copies the template steps that apply to the release type into the release's tasks.
/// Returns the number of tasks created.
async fn copy_template_tasks<'e, E: sqlx::MySqlExecutor<'e>>(
    executor: E,
    release_id: i32,
    release_type: ReleaseType,
) -> sqlx::Result<u64> {
    let result = sqlx::query!(
        r#"
        INSERT INTO release_tasks (release_id, title, timing, position)
        SELECT ?, title, timing, position
        FROM release_step_templates
        WHERE release_type IS NULL OR release_type = ?
        "#,
        release_id,
        release_type.as_str(),
    )
    .execute(executor)
    .await?;

    Ok(result.rows_affected())
}

/// Updates an open release and refreshes the assignee name snapshot (cleared when unassigned); closed releases are left untouched.
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
        SET release_code = ?, release_type = ?, release_at = ?, deployed_by_us = ?, assignee_id = ?, assignee_name = ?
        WHERE id = ? AND closed_at IS NULL
        "#,
        release.release_code,
        release.release_type.as_str(),
        release.release_at,
        release.deployed_by_us,
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

/// Replaces the notes of an open release, `None` clears them. Returns `false` when it does not exist or is closed.
pub async fn update_notes(db: &MySqlPool, id: i32, notes: Option<&str>) -> sqlx::Result<bool> {
    let result = sqlx::query!(
        r#"
        UPDATE releases
        SET notes = ?
        WHERE id = ? AND closed_at IS NULL
        "#,
        notes,
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

pub async fn read_tasks(db: &MySqlPool, release_id: i32) -> sqlx::Result<Vec<ReleaseTaskDto>> {
    sqlx::query_as!(
        ReleaseTaskDto,
        r#"
        SELECT id, release_id, title, timing, done_at
        FROM release_tasks
        WHERE release_id = ?
        ORDER BY position, id
        "#,
        release_id
    )
    .fetch_all(db)
    .await
}

/// Tasks of all releases, grouped by release and in step order.
pub async fn read_all_tasks(db: &MySqlPool) -> sqlx::Result<Vec<ReleaseTaskDto>> {
    sqlx::query_as!(
        ReleaseTaskDto,
        r#"
        SELECT id, release_id, title, timing, done_at
        FROM release_tasks
        ORDER BY release_id, position, id
        "#,
    )
    .fetch_all(db)
    .await
}

/// Fills an open release that has no tasks yet from the step template, e.g. a release created before
/// the template was set up. Returns the number of tasks created; `0` when it already has tasks or is closed.
pub async fn add_tasks_from_template(
    db: &MySqlPool,
    id: i32,
    release_type: ReleaseType,
) -> sqlx::Result<u64> {
    let mut tx = db.begin().await?;

    // Locks the release row so concurrent requests cannot both copy the template
    let is_open_without_tasks = sqlx::query!(
        r#"
        SELECT r.id FROM releases r
        WHERE r.id = ? AND r.closed_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM release_tasks t WHERE t.release_id = r.id)
        FOR UPDATE
        "#,
        id
    )
    .fetch_optional(&mut *tx)
    .await?
    .is_some();

    if !is_open_without_tasks {
        return Ok(0);
    }

    let created = copy_template_tasks(&mut *tx, id, release_type).await?;
    tx.commit().await?;

    Ok(created)
}

/// Ticks a task off or back on; ticking keeps the original time when it is already done.
/// Returns `false` when the task does not belong to the release or the release is closed.
pub async fn set_task_done(
    db: &MySqlPool,
    release_id: i32,
    task_id: i32,
    done: bool,
) -> sqlx::Result<bool> {
    let result = sqlx::query!(
        r#"
        UPDATE release_tasks t
        JOIN releases r ON r.id = t.release_id
        SET t.done_at = IF(?, COALESCE(t.done_at, NOW()), NULL)
        WHERE t.id = ? AND t.release_id = ? AND r.closed_at IS NULL
        "#,
        done,
        task_id,
        release_id
    )
    .execute(db)
    .await?;

    Ok(result.rows_affected() > 0)
}
