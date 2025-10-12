use sqlx::MySqlPool;
#[cfg(test)]
use sqlx::Row;

/// Common error handling for database operations
pub type SqlResult<T> = sqlx::Result<T>;

/// Helper function for delete operations that returns whether a row was deleted
pub async fn execute_delete(
    db: &MySqlPool,
    table: &str,
    id_column: &str,
    id: u32,
) -> SqlResult<bool> {
    let query = format!("DELETE FROM {} WHERE {} = ?", table, id_column);
    let result = sqlx::query(&query).bind(id).execute(db).await?;
    Ok(result.rows_affected() > 0)
}

/// Helper function for checking existence by ID
#[cfg(test)]
pub async fn exists_by_id(
    db: &MySqlPool,
    table: &str,
    id_column: &str,
    id: u32,
) -> SqlResult<bool> {
    let query = format!(
        "SELECT COUNT(*) as count FROM {} WHERE {} = ?",
        table, id_column
    );
    let row = sqlx::query(&query).bind(id).fetch_one(db).await?;
    let count: i64 = row.get("count");
    Ok(count > 0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::MySqlPool;

    #[sqlx::test(fixtures("users"))]
    async fn test_execute_delete_existing(db: MySqlPool) -> sqlx::Result<()> {
        // Test deleting an existing user (ID 1 exists in fixture)
        let result = execute_delete(&db, "users", "id", 1).await?;
        assert!(result, "Should return true when deleting existing record");
        Ok(())
    }

    #[sqlx::test(fixtures("users"))]
    async fn test_execute_delete_nonexistent(db: MySqlPool) -> sqlx::Result<()> {
        // Test deleting a non-existent user
        let result = execute_delete(&db, "users", "id", 999).await?;
        assert!(
            !result,
            "Should return false when deleting non-existent record"
        );
        Ok(())
    }

    #[sqlx::test(fixtures("users"))]
    async fn test_exists_by_id_existing(db: MySqlPool) -> sqlx::Result<()> {
        // Test checking existence of existing user (ID 1 exists in fixture)
        let result = exists_by_id(&db, "users", "id", 1).await?;
        assert!(result, "Should return true for existing record");
        Ok(())
    }

    #[sqlx::test(fixtures("users"))]
    async fn test_exists_by_id_nonexistent(db: MySqlPool) -> sqlx::Result<()> {
        // Test checking existence of non-existent user
        let result = exists_by_id(&db, "users", "id", 999).await?;
        assert!(!result, "Should return false for non-existent record");
        Ok(())
    }
}
