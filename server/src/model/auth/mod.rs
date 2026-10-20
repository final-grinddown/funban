use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::SaltString;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use axum::extract::Query;
use axum::http::{header, HeaderMap};
use axum_extra::extract::CookieJar;
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};

use serde::{Deserialize, Serialize};
use sqlx::{MySql, Pool};
use tracing::error;

use crate::http::errors::Error;
use crate::http::routes::auth::COOKIE_NAME;
use crate::http::Result;
use crate::sql;

#[cfg(test)]
mod tests;

// Define a structure for holding claims data used in JWT tokens
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub exp: usize,       // Expiry time of the token
    pub iat: usize,       // Issued at time of the token
    pub email: String,    // Email associated with the token
    pub username: String, // Username associated with the token
}

#[derive(Debug, Deserialize)]
pub struct Token {
    token: Option<String>,
}

pub fn get_token_from_header_or_cookie<'a>(
    headers: &'a HeaderMap,
    cookies: &'a CookieJar,
) -> Option<&'a str> {
    let header_val = get_token_from_header(headers);
    let cookie_val = cookies.get(COOKIE_NAME).map(|cookie| cookie.value());
    header_val.or(cookie_val)
}

pub fn get_token_from_header_or_cookie_or_query<'a>(
    headers: &'a HeaderMap,
    cookies: &'a CookieJar,
    request: &'a Query<Token>,
) -> Option<&'a str> {
    let other = get_token_from_header_or_cookie(headers, cookies);
    let query_val = request.token.as_deref();
    other.or(query_val)
}

pub fn get_token_from_header(headers: &HeaderMap) -> Option<&str> {
    headers.get(header::AUTHORIZATION).and_then(|value| {
        value
            .to_str()
            .ok()
            .and_then(|value| value.strip_prefix("Bearer "))
    })
}

pub fn parse_claims(token: &str, key: &str) -> anyhow::Result<Claims> {
    // check if the token is valid
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(key.as_ref()),
        &Validation::default(),
    );

    match data {
        Ok(data) => Ok(data.claims),
        Err(e) => {
            error!("Error: {:?}", e);
            Err(Error::Jwt(e).into())
        }
    }
}

pub fn create_token(username: String, email: String, api_secret: String) -> Result<String> {
    let now = Utc::now();
    let expire = Duration::days(14);
    let exp: usize = (now + expire).timestamp() as usize;
    let iat: usize = now.timestamp() as usize;
    let claim = Claims {
        iat,
        exp,
        email,
        username,
    };

    encode(
        &Header::default(),
        &claim,
        &EncodingKey::from_secret(api_secret.as_ref()),
    )
    .map_err(Error::Jwt)
}

pub async fn check_password(db: &Pool<MySql>, email: &str, password: &str) -> Result<bool> {
    let hashed_password = sql::user::get_password(db, email).await?;

    if let Some(hashed_password) = hashed_password {
        Ok(PasswordHash::new(&hashed_password)
            .map(|hash| {
                Argon2::default()
                    .verify_password(password.as_bytes(), &hash)
                    .is_ok()
            })
            .unwrap_or(false))
    } else {
        Ok(false)
    }
}

pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    // Generate a random salt
    let salt = SaltString::generate(&mut OsRng);

    // Create a new Argon2 instance with default parameters
    let argon2 = Argon2::default();

    // Hash the password
    // This will use the default parameters:
    // - Memory: 19MB (1 << 14 KiB)
    // - Iterations: 3
    // - Parallelism degree: 1
    // - Output hash length: 32 bytes
    let password_hash = argon2.hash_password(password.as_bytes(), &salt)?;

    // Convert to string for storage
    Ok(password_hash.to_string())
}
