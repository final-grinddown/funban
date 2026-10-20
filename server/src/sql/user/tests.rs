use sqlx::MySqlPool;

use crate::{model, sql::user};

#[sqlx::test(fixtures("users"))]
async fn get_all_users(db: MySqlPool) -> sqlx::Result<()> {
    let notes = user::read_all(&db).await?;

    assert_eq!(notes.len(), 1);

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn add_user(db: MySqlPool) -> sqlx::Result<()> {
    let users = user::read_all(&db).await?;

    assert_eq!(1, users.len(), "There should be 1 user");

    let user = user::UserDto {
        id: 0,
        index: 99,
        name: "Alice".into(),
        color: "red".into(),
        email: "alice@email.com".into(),
    };

    let done = user::add(&db, &user).await?;

    assert_ne!(0, done.id, "User should have new ID");
    assert_eq!(user.name, done.name, "Name is correct");
    assert_eq!(user.color, done.color, "Color is correct");
    assert_eq!(user.email, done.email, "Email is correct");

    let users = user::read_all(&db).await?;

    assert_eq!(2, users.len(), "There should be 2 users now");

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn update_user_name(db: MySqlPool) -> sqlx::Result<()> {
    let user = user::read_all(&db)
        .await?
        .into_iter()
        .find(|u| u.id == 1)
        .unwrap()
        .clone();

    let name = "Bob".to_string();
    user::update_name(&db, 1, &name).await?;

    let user_after = user::read_all(&db)
        .await?
        .into_iter()
        .find(|u| u.id == 1)
        .unwrap()
        .clone();

    assert_ne!(user.name, user_after.name, "Name is changed");
    assert_eq!(user_after.name, name, "Name is correct");

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn update_user_color(db: MySqlPool) -> sqlx::Result<()> {
    let user = user::read_all(&db)
        .await?
        .into_iter()
        .find(|u| u.id == 1)
        .unwrap()
        .clone();

    let color = "blue".to_string();
    user::update_color(&db, 1, &color).await?;

    let user_after = user::read_all(&db)
        .await?
        .into_iter()
        .find(|u| u.id == 1)
        .unwrap()
        .clone();

    assert_ne!(user.color, user_after.color, "Color is changed");
    assert_eq!(user_after.color, color, "Color is correct");

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn remove_user(db: MySqlPool) -> sqlx::Result<()> {
    let users = user::read_all(&db).await?;

    assert_eq!(1, users.len(), "There should be 1 user");

    let done = user::remove(&db, 1).await?;

    assert!(done, "User should be removed");

    let users = user::read_all(&db).await?;

    assert_eq!(0, users.len(), "There should be 0 users now");

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn remove_user_neg(db: MySqlPool) -> sqlx::Result<()> {
    let done = user::remove(&db, 69).await?;

    assert!(!done, "User should not be removed");

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn change_password(db: MySqlPool) -> sqlx::Result<()> {
    let email = "alice@email.com";
    let new_password = "new_password";

    user::update_password(&db, email, new_password).await?;
    let password = user::get_password(&db, email).await?;

    assert!(password.is_some(), "Password should be set");

    let pr = model::auth::check_password(&db, email, new_password).await;

    assert!(pr.is_ok(), "Password should be correct");

    Ok(())
}
