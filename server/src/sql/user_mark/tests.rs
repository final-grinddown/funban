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
        expires_at: None,
    };

    let added_mark = user_mark::add(&db, &user_mark_insert).await?;

    assert_eq!(added_mark.user_id, 1);
    assert_eq!(added_mark.mark_type, "gold_star");
    assert_eq!(added_mark.custom_text, Some("Great work!".to_string()));
    assert_eq!(added_mark.expires_after_status_ends, Some(2));

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
        expires_at: None,
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
        expires_at: None,
    };

    user_mark::add(&db, &user_mark_insert).await?;

    // Decrement
    user_mark::decrement_expires_and_cleanup(&db).await?;

    let marks = user_mark::read_by_user_id(&db, 1).await?;
    assert_eq!(marks.len(), 1);
    assert_eq!(marks[0].expires_after_status_ends, Some(1));

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
        expires_at: None,
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

#[sqlx::test(fixtures("users"))]
async fn read_user_mark_by_id(db: MySqlPool) -> sqlx::Result<()> {
    let user_mark_insert = UserMarkInsert {
        user_id: 1,
        mark_type: "gold_star".to_string(),
        custom_text: Some("Great work!".to_string()),
        expires_after_status_ends: Some(2),
        expires_at: None,
    };

    let added_mark = user_mark::add(&db, &user_mark_insert).await?;

    // Read by ID
    let mark = user_mark::read_by_id(&db, added_mark.id).await?;
    assert!(mark.is_some());
    let mark = mark.unwrap();
    assert_eq!(mark.id, added_mark.id);
    assert_eq!(mark.user_id, 1);
    assert_eq!(mark.mark_type, "gold_star");

    // Try reading non-existent mark
    let non_existent = user_mark::read_by_id(&db, 99999).await?;
    assert!(non_existent.is_none());

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn update_user_mark(db: MySqlPool) -> sqlx::Result<()> {
    let user_mark_insert = UserMarkInsert {
        user_id: 1,
        mark_type: "gold_star".to_string(),
        custom_text: Some("Original".to_string()),
        expires_after_status_ends: Some(2),
        expires_at: None,
    };

    let added_mark = user_mark::add(&db, &user_mark_insert).await?;

    // Update the mark
    let update_data = UserMarkInsert {
        user_id: 1,
        mark_type: "black_mark".to_string(),
        custom_text: Some("Updated".to_string()),
        expires_after_status_ends: Some(5),
        expires_at: None,
    };

    let updated = user_mark::update(&db, added_mark.id, &update_data).await?;
    assert!(updated.is_some());
    let updated = updated.unwrap();
    assert_eq!(updated.mark_type, "black_mark");
    assert_eq!(updated.custom_text, Some("Updated".to_string()));
    assert_eq!(updated.expires_after_status_ends, Some(5));

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn read_expired_user_marks(db: MySqlPool) -> sqlx::Result<()> {
    // Add an active mark
    let active_mark = UserMarkInsert {
        user_id: 1,
        mark_type: "gold_star".to_string(),
        custom_text: None,
        expires_after_status_ends: Some(2),
        expires_at: None,
    };
    user_mark::add(&db, &active_mark).await?;

    // Add an expired mark (expires_after = 0)
    let expired_mark = UserMarkInsert {
        user_id: 1,
        mark_type: "black_mark".to_string(),
        custom_text: None,
        expires_after_status_ends: Some(0),
        expires_at: None,
    };
    user_mark::add(&db, &expired_mark).await?;

    // Read expired marks
    let expired = user_mark::read_expired_by_user_id(&db, 1).await?;
    assert_eq!(expired.len(), 1);
    assert_eq!(expired[0].mark_type, "black_mark");
    assert_eq!(expired[0].expires_after_status_ends, Some(0));

    // Read active marks
    let active = user_mark::read_by_user_id(&db, 1).await?;
    assert_eq!(active.len(), 1);
    assert_eq!(active[0].mark_type, "gold_star");

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn expire_all_user_marks(db: MySqlPool) -> sqlx::Result<()> {
    // Add multiple marks for user
    let mark1 = UserMarkInsert {
        user_id: 1,
        mark_type: "gold_star".to_string(),
        custom_text: None,
        expires_after_status_ends: Some(3),
        expires_at: None,
    };
    user_mark::add(&db, &mark1).await?;

    let mark2 = UserMarkInsert {
        user_id: 1,
        mark_type: "clock".to_string(),
        custom_text: None,
        expires_after_status_ends: Some(5),
        expires_at: None,
    };
    user_mark::add(&db, &mark2).await?;

    // Verify they're active
    let active = user_mark::read_by_user_id(&db, 1).await?;
    assert_eq!(active.len(), 2);

    // Expire all marks for user 1
    let expired = user_mark::expire_all_by_user_id(&db, 1).await?;
    assert_eq!(expired.len(), 2);

    // Verify no active marks remain
    let active_after = user_mark::read_by_user_id(&db, 1).await?;
    assert_eq!(active_after.len(), 0);

    // Verify they're now expired
    let expired_marks = user_mark::read_expired_by_user_id(&db, 1).await?;
    assert_eq!(expired_marks.len(), 2);

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn delete_expired_user_marks(db: MySqlPool) -> sqlx::Result<()> {
    // Add active and expired marks
    let active_mark = UserMarkInsert {
        user_id: 1,
        mark_type: "gold_star".to_string(),
        custom_text: None,
        expires_after_status_ends: Some(2),
        expires_at: None,
    };
    user_mark::add(&db, &active_mark).await?;

    let expired_mark1 = UserMarkInsert {
        user_id: 1,
        mark_type: "black_mark".to_string(),
        custom_text: None,
        expires_after_status_ends: Some(0),
        expires_at: None,
    };
    user_mark::add(&db, &expired_mark1).await?;

    let expired_mark2 = UserMarkInsert {
        user_id: 1,
        mark_type: "clock".to_string(),
        custom_text: None,
        expires_after_status_ends: Some(0),
        expires_at: None,
    };
    user_mark::add(&db, &expired_mark2).await?;

    // Delete expired marks
    let deleted_count = user_mark::delete_expired_by_user_id(&db, 1).await?;
    assert_eq!(deleted_count, 2);

    // Verify active mark still exists
    let active = user_mark::read_by_user_id(&db, 1).await?;
    assert_eq!(active.len(), 1);
    assert_eq!(active[0].mark_type, "gold_star");

    // Verify expired marks are gone
    let expired = user_mark::read_expired_by_user_id(&db, 1).await?;
    assert_eq!(expired.len(), 0);

    Ok(())
}
