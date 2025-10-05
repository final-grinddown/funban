use crate::model::user_mark::UserMarkInsert;
use crate::sql::user_mark;
use crate::test_utils::database::tests::create_test_pool;

#[tokio::test]
async fn test_user_mark_crud() {
    let pool = create_test_pool().await;

    // Test adding a user mark
    let user_mark_insert = UserMarkInsert {
        user_id: 1,
        mark_type: "⭐".to_string(),
        custom_text: Some("Great work!".to_string()),
        expires_after_status_ends: Some(2),
    };

    let added_mark = user_mark::add(&pool, &user_mark_insert).await.unwrap();
    assert_eq!(added_mark.user_id, 1);
    assert_eq!(added_mark.mark_type, "⭐");
    assert_eq!(added_mark.custom_text, Some("Great work!".to_string()));
    assert_eq!(added_mark.expires_after_status_ends, 2);

    // Test reading marks by user ID
    let user_marks = user_mark::read_by_user_id(&pool, 1).await.unwrap();
    assert_eq!(user_marks.len(), 1);
    assert_eq!(user_marks[0].id, added_mark.id);

    // Test reading all marks
    let all_marks = user_mark::read_all(&pool).await.unwrap();
    assert!(!all_marks.is_empty());

    // Test decrement and cleanup
    user_mark::decrement_expires_and_cleanup(&pool).await.unwrap();
    let updated_marks = user_mark::read_by_user_id(&pool, 1).await.unwrap();
    assert_eq!(updated_marks[0].expires_after_status_ends, 1);

    // Test removal
    let removed = user_mark::remove(&pool, added_mark.id).await.unwrap();
    assert!(removed);

    let marks_after_removal = user_mark::read_by_user_id(&pool, 1).await.unwrap();
    assert!(marks_after_removal.is_empty());
}