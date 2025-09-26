use sqlx::MySqlPool;

use crate::model::auth::{check_password, create_token, parse_claims};

#[test]
fn test_auth_utils() {
    let email = "email@test.tst";
    let username = "username";
    let secret = "secret";

    let token = create_token(username.to_string(), email.to_string(), secret.to_string()).unwrap();
    let claims = parse_claims(&token, secret).unwrap();

    assert_eq!(claims.email, email);
    assert_eq!(claims.username, username);
}

#[test]
fn test_auth_utils_neg() {
    let token = "invalid_token";

    let claims = parse_claims(token, "secret");

    assert!(claims.is_err());
}

#[sqlx::test(fixtures("users"))]
async fn test_check_password(db: MySqlPool) -> sqlx::Result<()> {
    let email = "alice@email.com";
    let password = "pass";
    let result = check_password(&db, email, password).await;

    assert!(result.is_ok());

    assert!(result.unwrap());

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn test_check_password_neg(db: MySqlPool) -> sqlx::Result<()> {
    let email = "alice@email.com";
    let password = "wrong_password";
    let result = check_password(&db, email, password).await;

    assert!(result.is_ok());

    assert!(!result.unwrap());

    Ok(())
}
