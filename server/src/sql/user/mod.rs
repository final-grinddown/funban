use serde::Serialize;
use sqlx::MySqlPool;

use super::common;
use crate::model::user::User;

#[cfg(test)]
pub mod tests;

#[derive(Debug, Serialize, Clone)]
pub struct UserDto {
    pub id: i64,
    pub index: i64,
    pub name: String,
    pub color: String,
    pub email: String,
}

impl From<UserDto> for User {
    fn from(user: UserDto) -> Self {
        Self {
            id: user.id,
            index: user.index,
            name: user.name,
            color: user.color,
            email: user.email,
        }
    }
}

impl From<User> for UserDto {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            index: user.index,
            name: user.name,
            color: user.color,
            email: user.email,
        }
    }
}

pub async fn read_all(db: &MySqlPool) -> sqlx::Result<Vec<UserDto>> {
    let users = sqlx::query_as!(
        UserDto,
        r#"
				SELECT id, `index`, name, color, email
				FROM users
				"#,
    )
    .fetch_all(db)
    .await?;

    Ok(users)
}

pub async fn read_by_email(db: &MySqlPool, email: &str) -> sqlx::Result<Option<UserDto>> {
    let user = sqlx::query_as!(
        UserDto,
        r#"
			SELECT id, `index`, name, color, email
			FROM users
			WHERE email = ?
			"#,
        email
    )
    .fetch_optional(db)
    .await?;

    Ok(user)
}

pub async fn add(db: &MySqlPool, user: &UserDto) -> sqlx::Result<UserDto> {
    let new_user = sqlx::query_as!(
        UserDto,
        r#"
				INSERT INTO users (name, `index`, color, email)
				VALUES (?, ?, ?, ?)
				"#,
        user.name,
        user.index,
        user.color,
        user.email,
    )
    .execute(db)
    .await?;

    let id = new_user.last_insert_id() as i64;

    Ok(UserDto {
        id,
        index: user.index,
        name: user.name.clone(),
        color: user.color.clone(),
        email: user.email.clone(),
    })
}

pub async fn update_name(db: &MySqlPool, id: u32, name: &str) -> sqlx::Result<()> {
    sqlx::query!(
        r#"
			UPDATE users
			SET name = ?
			WHERE id = ?
			"#,
        name,
        id
    )
    .execute(db)
    .await?;

    Ok(())
}

pub async fn update_color(db: &MySqlPool, id: u32, color: &str) -> sqlx::Result<()> {
    sqlx::query!(
        r#"
			UPDATE users
			SET color = ?
			WHERE id = ?
			"#,
        color,
        id
    )
    .execute(db)
    .await?;

    Ok(())
}

pub async fn remove(db: &MySqlPool, id: u32) -> sqlx::Result<bool> {
    common::execute_delete(db, "users", "id", id).await
}

pub async fn get_password(db: &MySqlPool, email: &str) -> sqlx::Result<Option<String>> {
    let request = sqlx::query!(
        r#"
		SELECT password FROM users
		WHERE email = ?		
		"#,
        email
    )
    .fetch_optional(db)
    .await?;

    Ok(request.map(|r| r.password))
}

pub async fn update_password(
    db: &MySqlPool,
    email: &str,
    new_password_hashed: &str,
) -> sqlx::Result<()> {
    sqlx::query!(
        r#"
	UPDATE users SET password = ?
		WHERE email = ?
	"#,
        new_password_hashed,
        email
    )
    .fetch_optional(db)
    .await?;

    Ok(())
}

pub async fn update_email(db: &MySqlPool, email: &str, new_email: &str) -> sqlx::Result<()> {
    sqlx::query!(
        r#"
UPDATE users SET email = ? WHERE email = ?"#,
        new_email,
        email
    )
    .fetch_optional(db)
    .await?;

    Ok(())
}
