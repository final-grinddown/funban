use serde::Serialize;
use sqlx::MySqlPool;

use super::common;
use crate::model::user_mark::{UserMark, UserMarkInsert};

#[cfg(test)]
pub mod tests;

#[derive(Debug, Serialize, Clone)]
pub struct UserMarkDto {
    pub id: i32,
    pub user_id: i32,
    pub mark_type: String,
    pub custom_text: Option<String>,
    pub expires_after_status_ends: i32,
}

impl From<UserMarkDto> for UserMark {
    fn from(user_mark: UserMarkDto) -> Self {
        Self {
            id: user_mark.id,
            user_id: user_mark.user_id,
            mark_type: user_mark.mark_type,
            custom_text: user_mark.custom_text,
            expires_after_status_ends: user_mark.expires_after_status_ends,
        }
    }
}

impl From<UserMark> for UserMarkDto {
    fn from(user_mark: UserMark) -> Self {
        Self {
            id: user_mark.id,
            user_id: user_mark.user_id,
            mark_type: user_mark.mark_type,
            custom_text: user_mark.custom_text,
            expires_after_status_ends: user_mark.expires_after_status_ends,
        }
    }
}

pub async fn read_all(db: &MySqlPool) -> sqlx::Result<Vec<UserMarkDto>> {
    let user_marks = sqlx::query_as!(
        UserMarkDto,
        r#"
        SELECT id, user_id, mark_type, custom_text, expires_after_status_ends
        FROM user_marks
        WHERE expires_after_status_ends > 0
        ORDER BY id DESC
        "#,
    )
    .fetch_all(db)
    .await?;

    Ok(user_marks)
}

pub async fn read_by_id(db: &MySqlPool, id: i32) -> sqlx::Result<Option<UserMarkDto>> {
    let user_mark = sqlx::query_as!(
        UserMarkDto,
        r#"
        SELECT id, user_id, mark_type, custom_text, expires_after_status_ends
        FROM user_marks
        WHERE id = ?
        "#,
        id
    )
    .fetch_optional(db)
    .await?;

    Ok(user_mark)
}

pub async fn read_by_user_id(db: &MySqlPool, user_id: i32) -> sqlx::Result<Vec<UserMarkDto>> {
    let user_marks = sqlx::query_as!(
        UserMarkDto,
        r#"
        SELECT id, user_id, mark_type, custom_text, expires_after_status_ends
        FROM user_marks
        WHERE user_id = ? AND expires_after_status_ends > 0
        ORDER BY id DESC
        "#,
        user_id
    )
    .fetch_all(db)
    .await?;

    Ok(user_marks)
}

pub async fn read_expired_by_user_id(
    db: &MySqlPool,
    user_id: i32,
) -> sqlx::Result<Vec<UserMarkDto>> {
    let user_marks = sqlx::query_as!(
        UserMarkDto,
        r#"
        SELECT id, user_id, mark_type, custom_text, expires_after_status_ends
        FROM user_marks
        WHERE user_id = ? AND expires_after_status_ends <= 0
        ORDER BY id DESC
        "#,
        user_id
    )
    .fetch_all(db)
    .await?;

    Ok(user_marks)
}

pub async fn add(db: &MySqlPool, user_mark: &UserMarkInsert) -> sqlx::Result<UserMarkDto> {
    let expires_after = user_mark.expires_after_status_ends.unwrap_or(1);

    let result = sqlx::query!(
        r#"
        INSERT INTO user_marks (user_id, mark_type, custom_text, expires_after_status_ends)
        VALUES (?, ?, ?, ?)
        "#,
        user_mark.user_id,
        user_mark.mark_type,
        user_mark.custom_text,
        expires_after,
    )
    .execute(db)
    .await?;

    let inserted_id = result.last_insert_id() as i32;

    let inserted_mark = sqlx::query_as!(
        UserMarkDto,
        r#"
        SELECT id, user_id, mark_type, custom_text, expires_after_status_ends
        FROM user_marks
        WHERE id = ?
        "#,
        inserted_id
    )
    .fetch_one(db)
    .await?;

    Ok(inserted_mark)
}

pub async fn update(
    db: &MySqlPool,
    id: i32,
    user_mark: &UserMarkInsert,
) -> sqlx::Result<Option<UserMarkDto>> {
    let expires_after = user_mark.expires_after_status_ends.unwrap_or(0);

    let result = sqlx::query!(
        r#"
        UPDATE user_marks
        SET mark_type = ?, custom_text = ?, expires_after_status_ends = ?
        WHERE id = ?
        "#,
        user_mark.mark_type,
        user_mark.custom_text,
        expires_after,
        id
    )
    .execute(db)
    .await?;

    if result.rows_affected() == 0 {
        return Ok(None);
    }

    let updated_mark = sqlx::query_as!(
        UserMarkDto,
        r#"
        SELECT id, user_id, mark_type, custom_text, expires_after_status_ends
        FROM user_marks
        WHERE id = ?
        "#,
        id
    )
    .fetch_one(db)
    .await?;

    Ok(Some(updated_mark))
}

pub async fn remove(db: &MySqlPool, id: i32) -> sqlx::Result<bool> {
    common::execute_delete(db, "user_marks", "id", id as u32).await
}

pub async fn expire_all_by_user_id(db: &MySqlPool, user_id: i32) -> sqlx::Result<Vec<UserMarkDto>> {
    // First, fetch the marks that will be expired
    let marks_to_expire = sqlx::query_as!(
        UserMarkDto,
        r#"
        SELECT id, user_id, mark_type, custom_text, expires_after_status_ends
        FROM user_marks
        WHERE user_id = ? AND expires_after_status_ends > 0
        "#,
        user_id
    )
    .fetch_all(db)
    .await?;

    // Expire all active marks for this user
    sqlx::query!(
        r#"
        UPDATE user_marks
        SET expires_after_status_ends = 0
        WHERE user_id = ? AND expires_after_status_ends > 0
        "#,
        user_id
    )
    .execute(db)
    .await?;

    Ok(marks_to_expire)
}

pub async fn delete_expired_by_user_id(db: &MySqlPool, user_id: i32) -> sqlx::Result<u64> {
    let result = sqlx::query!(
        r#"
        DELETE FROM user_marks
        WHERE user_id = ? AND expires_after_status_ends <= 0
        "#,
        user_id
    )
    .execute(db)
    .await?;

    Ok(result.rows_affected())
}

pub async fn decrement_expires_and_cleanup(db: &MySqlPool) -> sqlx::Result<Vec<UserMarkDto>> {
    // First, fetch the marks that will be deleted
    let marks_to_delete = sqlx::query_as!(
        UserMarkDto,
        r#"
        SELECT id, user_id, mark_type, custom_text, expires_after_status_ends
        FROM user_marks
        WHERE expires_after_status_ends <= 1
        "#,
    )
    .fetch_all(db)
    .await?;

    // Decrement expires_after_status_ends for all marks
    sqlx::query!(
        r#"
        UPDATE user_marks
        SET expires_after_status_ends = expires_after_status_ends - 1
        "#,
    )
    .execute(db)
    .await?;

    // Remove marks that have expired
    sqlx::query!(
        r#"
        DELETE FROM user_marks
        WHERE expires_after_status_ends <= 0
        "#,
    )
    .execute(db)
    .await?;

    Ok(marks_to_delete)
}
