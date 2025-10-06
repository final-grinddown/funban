use chrono::Utc;
use serde::Serialize;
use sqlx::FromRow;
use sqlx::MySqlPool;

use super::common;
use crate::model::history::History;

#[cfg(test)]
pub mod tests;

pub struct HistoryEntity {
    pub id: i32,
    pub label: Option<String>,
    pub snapshot: String,
    pub version: i32,
    pub created_at: chrono::DateTime<Utc>,
}

impl From<History> for HistoryEntity {
    fn from(history: History) -> Self {
        Self {
            id: history.id,
            label: history.label,
            snapshot: history.snapshot,
            version: history.version,
            created_at: history.created_at,
        }
    }
}

impl From<HistoryEntity> for History {
    fn from(history: HistoryEntity) -> Self {
        Self {
            id: history.id,
            label: history.label,
            snapshot: history.snapshot,
            version: history.version,
            created_at: history.created_at,
        }
    }
}

pub async fn read_all(db: &MySqlPool) -> sqlx::Result<Vec<HistoryEntity>> {
    let users = sqlx::query_as!(
        HistoryEntity,
        r#"
				SELECT id, label, snapshot, version, created_at
				FROM history
				ORDER BY created_at DESC
				"#,
    )
    .fetch_all(db)
    .await?;

    Ok(users)
}

pub async fn read_by_id(db: &MySqlPool, id: u32) -> sqlx::Result<Option<HistoryEntity>> {
    let users = sqlx::query_as!(
        HistoryEntity,
        r#"
			SELECT id, label, snapshot, version, created_at
			FROM history
			WHERE id = ?
			"#,
        id
    )
    .fetch_optional(db)
    .await?;

    Ok(users)
}

pub async fn rename(db: &MySqlPool, id: u32, new_name: &str) -> sqlx::Result<Option<i32>> {
    let result = sqlx::query_as!(
        HistoryEntity,
        r#"
				UPDATE history SET label = ?		
				WHERE id = ?
				"#,
        new_name,
        id
    )
    .execute(db)
    .await?;

    match result.rows_affected() {
        1 => Ok(Some(id.try_into().map_err(|_| {
            sqlx::Error::Protocol("ID conversion failed".into())
        })?)),
        _ => Ok(None),
    }
}

pub async fn delete(db: &MySqlPool, id: u32) -> sqlx::Result<Option<i32>> {
    let deleted = common::execute_delete(db, "history", "id", id).await?;

    match deleted {
        true => Ok(Some(id.try_into().map_err(|_| {
            sqlx::Error::Protocol("ID conversion failed".into())
        })?)),
        false => Ok(None),
    }
}

pub async fn read_last(db: &MySqlPool) -> sqlx::Result<Option<HistoryEntity>> {
    let user = sqlx::query_as!(
        HistoryEntity,
        r#"
					SELECT id, label, snapshot, version, created_at
					FROM history
					WHERE created_at = (SELECT MAX(created_at) FROM history)
				"#,
    )
    .fetch_optional(db)
    .await?;

    Ok(user)
}

pub async fn create(
    db: &MySqlPool,
    label: Option<String>,
    snapshot: &str,
    version: i32,
) -> sqlx::Result<HistoryEntity> {
    let mut transaction = db.begin().await?;

    let insert = sqlx::query!(
        r#"
					INSERT INTO history (label, snapshot, version)
					VALUES (?, ?, ?)
				"#,
        label,
        snapshot,
        version
    )
    .execute(&mut *transaction)
    .await?
    .last_insert_id() as i32;

    let history = sqlx::query_as!(
        HistoryEntity,
        r#"
				SELECT id, label, snapshot, version, created_at
				FROM history
				WHERE id = ?
				"#,
        insert
    )
    .fetch_one(&mut *transaction)
    .await?;

    transaction.commit().await?;

    Ok(history)
}

#[derive(Debug, Serialize, FromRow)]
pub struct BrowserInfoEntity {
    pub id: String,
    pub label: Option<String>,
    pub snapshot: String,
    pub version: i32,
    pub created_at: chrono::DateTime<Utc>,
    pub previous_id: Option<u32>,
    pub previous_label: Option<String>,
    pub next_id: Option<u32>,
    pub next_label: Option<String>,
}

pub async fn read_browser(db: &MySqlPool, id: Option<&str>) -> sqlx::Result<BrowserInfoEntity> {
    let mut transaction = db.begin().await?;

    let result = if let Some(current_id) = id {
        let row = sqlx::query!(
            r#"
						  SELECT snapshot, label, created_at, id, version
    					FROM history
    					WHERE id = ?;
						"#,
            current_id
        )
        .fetch_one(&mut *transaction)
        .await?;

        (row.snapshot, row.label, row.created_at, row.id, row.version)
    } else {
        // Fetch the most recent entry when no ID is provided
        let row = sqlx::query!(
            r#"
						  SELECT snapshot, label, created_at, id, version
    					FROM history
    					WHERE created_at = (SELECT MAX(created_at) FROM history);
				"#,
        )
        .fetch_optional(&mut *transaction)
        .await?;

        if let Some(row) = row {
            (row.snapshot, row.label, row.created_at, row.id, row.version)
        } else {
            return Err(sqlx::Error::RowNotFound);
        }
    };

    let previous = sqlx::query!(
        r#"
						SELECT id, label
						FROM history
						WHERE created_at < ?
						ORDER BY created_at DESC
						LIMIT 1;
						"#,
        result.2
    )
    .fetch_optional(&mut *transaction)
    .await?;

    let next = sqlx::query!(
        r#"
					SELECT id, label
					FROM history
					WHERE created_at > ?
					ORDER BY created_at ASC
					LIMIT 1;
					"#,
        result.2
    )
    .fetch_optional(&mut *transaction)
    .await?;

    transaction.commit().await?;

    Ok(BrowserInfoEntity {
        id: result.3.to_string(),
        label: result.1,
        snapshot: result.0,
        version: result.4,
        created_at: result.2,
        previous_id: previous.as_ref().map(|s| s.id as u32),
        previous_label: previous.and_then(|s| s.label),
        next_id: next.as_ref().map(|s| s.id as u32),
        next_label: next.and_then(|s| s.label),
    })
}
