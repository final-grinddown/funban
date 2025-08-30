use sqlx::MySqlPool;

use crate::sql::history::{read_browser, read_by_id};

#[sqlx::test(fixtures("history"))]
fn test_read_browser_first(db: MySqlPool) -> sqlx::Result<()> {
    // les gooooo
    let result = read_browser(&db, Some("1")).await?;

    assert_eq!(result.id, "1");
    assert_eq!(result.previous_id, None);
    assert_eq!(result.next_id, Some(3));

    Ok(())
}

#[sqlx::test(fixtures("history"))]
fn test_read_browser_second(db: MySqlPool) -> sqlx::Result<()> {
    // les gooooo
    let result = read_browser(&db, Some("3")).await?;

    assert_eq!(result.id, "3");
    assert_eq!(result.previous_id, Some(1));
    assert_eq!(result.next_id, Some(4));

    Ok(())
}

#[sqlx::test(fixtures("history"))]
fn test_read_browser_empty(db: MySqlPool) -> sqlx::Result<()> {
    // les gooooo
    let result = read_browser(&db, None).await?;

    assert_eq!(result.id, "10");
    assert_eq!(result.previous_id, Some(7));
    assert_eq!(result.next_id, None);

    Ok(())
}

#[sqlx::test(fixtures("history"))]
fn test_read_by_id_exists(db: MySqlPool) -> sqlx::Result<()> {
    let result = read_by_id(&db, 1).await?;

    assert!(result.is_some());

    assert_eq!(1, result.unwrap().id);

    Ok(())
}

#[sqlx::test(fixtures("history"))]
fn test_read_by_id_doesnt_exists(db: MySqlPool) -> sqlx::Result<()> {
    let result = read_by_id(&db, 2).await?;

    assert!(result.is_none());

    Ok(())
}

#[sqlx::test(fixtures("history"))]
fn test_delete_exists(db: MySqlPool) -> sqlx::Result<()> {
    let result = super::delete(&db, 1).await?;

    assert!(result.is_some());

    assert_eq!(1, result.unwrap());

    Ok(())
}

#[sqlx::test(fixtures("history"))]
fn test_delete_doesnt_exists(db: MySqlPool) -> sqlx::Result<()> {
    let result = super::delete(&db, 2).await?;

    assert!(result.is_none());

    Ok(())
}

#[sqlx::test(fixtures("history"))]
fn test_rename_exists(db: MySqlPool) -> sqlx::Result<()> {
    let result = super::rename(&db, 1, "new_name").await?;

    assert!(result.is_some());

    assert_eq!(1, result.unwrap());

    Ok(())
}

#[sqlx::test(fixtures("history"))]
fn test_rename_doesnt_exists(db: MySqlPool) -> sqlx::Result<()> {
    let result = super::rename(&db, 2, "new_name").await?;

    assert!(result.is_none());

    Ok(())
}

#[sqlx::test(fixtures("history"))]
#[should_panic(expected = "RowNotFound")]
fn test_read_browser_doesnt_exist(db: MySqlPool) -> () {
    // les gooooo
    let _ = read_browser(&db, Some("69")).await.unwrap();
}

#[sqlx::test(fixtures("history"))]
#[should_panic(expected = "RowNotFound")]
fn test_read_browser_not_a_number(db: MySqlPool) -> () {
    // les gooooo
    let _ = read_browser(&db, Some("d")).await.unwrap();
}

#[sqlx::test(fixtures("history"))]
#[should_panic(expected = "RowNotFound")]
fn test_read_browser_empty_string(db: MySqlPool) -> () {
    // les gooooo
    let _ = read_browser(&db, Some("")).await.unwrap();
}
