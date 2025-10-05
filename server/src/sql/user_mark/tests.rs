use sqlx::MySqlPool;

use crate::model::user_mark::UserMarkInsert;
use crate::sql::user_mark;

#[sqlx::test(fixtures("users"))]
async fn add_user_mark(db: MySqlPool) -> sqlx::Result<()> {
    let user_mark_insert = UserMarkInsert {
        user_id: 1,
        mark_type: "gold_star".to_string(),
        custom_text: Some("Great work!".to_string()),
        expires_after_status_ends: Some(2),
    };

    let added_mark = user_mark::add(&db, &user_mark_insert).await?;

    assert_eq!(added_mark.user_id, 1);
    assert_eq!(added_mark.mark_type, "gold_star");
    assert_eq!(added_mark.custom_text, Some("Great work!".to_string()));
    assert_eq!(added_mark.expires_after_status_ends, 2);

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn read_user_marks(db: MySqlPool) -> sqlx::Result<()> {
    // Add a mark first
    let user_mark_insert = UserMarkInsert {
        user_id: 1,
        mark_type: "black_mark".to_string(),
        custom_text: None,
        expires_after_status_ends: Some(1),
    };

    let added_mark = user_mark::add(&db, &user_mark_insert).await?;

    // Test reading marks by user ID
    let user_marks = user_mark::read_by_user_id(&db, 1).await?;
    assert_eq!(user_marks.len(), 1);
    assert_eq!(user_marks[0].id, added_mark.id);

    // Test reading all marks
    let all_marks = user_mark::read_all(&db).await?;
    assert!(!all_marks.is_empty());

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn decrement_and_cleanup(db: MySqlPool) -> sqlx::Result<()> {
    // Add a mark with expires_after = 2
    let user_mark_insert = UserMarkInsert {
        user_id: 1,
        mark_type: "clock".to_string(),
        custom_text: None,
        expires_after_status_ends: Some(2),
    };

    user_mark::add(&db, &user_mark_insert).await?;

    // Decrement
    user_mark::decrement_expires_and_cleanup(&db).await?;

    let marks = user_mark::read_by_user_id(&db, 1).await?;
    assert_eq!(marks.len(), 1);
    assert_eq!(marks[0].expires_after_status_ends, 1);

    // Decrement again - should be removed
    user_mark::decrement_expires_and_cleanup(&db).await?;

    let marks_after = user_mark::read_by_user_id(&db, 1).await?;
    assert_eq!(marks_after.len(), 0);

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn remove_user_mark(db: MySqlPool) -> sqlx::Result<()> {
    let user_mark_insert = UserMarkInsert {
        user_id: 1,
        mark_type: "gold_star".to_string(),
        custom_text: None,
        expires_after_status_ends: Some(1),
    };

    let added_mark = user_mark::add(&db, &user_mark_insert).await?;

    // Remove the mark
    let removed = user_mark::remove(&db, added_mark.id).await?;
    assert!(removed);

    // Verify it's gone
    let marks = user_mark::read_by_user_id(&db, 1).await?;
    assert!(marks.is_empty());

    Ok(())
}
