use crate::http::errors::Error;
use crate::http::middleware::auth;
use crate::http::Result;
use crate::model::auth::{self, check_password, create_token, Claims};
use crate::sql;

use axum::middleware::from_fn;
use axum::routing::{get, post};
use axum::{Extension, Json, Router};

use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};

use cookie::time::Duration;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;
use crate::http::validation::validate_input;

use crate::http::ApiContext;

pub const COOKIE_NAME: &str = "funban_token";
pub const COOKIE_NAME_MARKER: &str = "funban_marker";

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SignIn {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PasswordChange {
    pub old_password: String,
    pub new_password: String,
}

#[derive(Debug, Serialize, Deserialize, Validate, ToSchema)]
pub struct EmailChange {
    #[validate(email)]
    pub new_email: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TokenResponse {
    pub token: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct MeResponse {
    pub email: String,
    pub username: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct EmptyResponse {
    pub message: &'static str,
}

pub fn router() -> Router {
    Router::new().route("/auth/signin", post(signin))
}

pub fn protected_router() -> Router {
    Router::new()
        .route("/auth/signout", get(signout))
        .route("/auth/me", get(me))
        .route("/auth/password", post(change_password))
        .route("/auth/email", post(change_email))
        .route_layer(from_fn(auth))
}

/// This endpoint is used to login to the API.
#[utoipa::path(post, path = "/auth/signin", request_body = SignIn, responses((status = 200, body = TokenResponse, description = "Successfull login."), (status = UNAUTHORIZED, description = "Wrong username or password.")))]
pub async fn signin(
    Extension(ctx): Extension<ApiContext>,
    cookies: CookieJar,
    Json(payload): Json<SignIn>,
) -> Result<(CookieJar, Json<TokenResponse>)> {
    let valid_password = check_password(&ctx.db, &payload.email, &payload.password).await?;

    if !valid_password {
        return Err(Error::Unauthorized(json_error_message(
            "Bad username or password",
        )));
    }

    let user = sql::user::read_by_email(&ctx.db, &payload.email).await?;

    let user = match user {
        Some(user) => user,
        None => {
            return Err(Error::Unauthorized(json_error_message(
                "Bad username or password",
            )))
        }
    };

    let token = create_token(user.name, user.email, ctx.config.api_secret.clone())?;
    let duration = Duration::days(14);

    let secure = ctx.config.cookie_secure;
    let domain = ctx.config.cookie_domain.clone();

    let token_cookie = Cookie::build((COOKIE_NAME, token.clone()))
        .http_only(true)
        .secure(secure)
        .path("/")
        .domain(domain.clone())
        .max_age(duration)
        .same_site(if secure {
            SameSite::None
        } else {
            SameSite::Strict
        });
    let marker_cookie = Cookie::build((COOKIE_NAME_MARKER, ""))
        .http_only(false)
        .secure(secure)
        .path("/")
        .domain(domain)
        .max_age(duration)
        .same_site(if secure {
            SameSite::None
        } else {
            SameSite::Strict
        });

    let changed_cookies = cookies.add(token_cookie).add(marker_cookie);
    Ok((changed_cookies, Json(TokenResponse { token })))
}

#[utoipa::path(post, path = "/auth/signout", responses((status = 200, body = EmptyResponse, description = "Successfull logout.")), security(("jwt" = [])))]
pub async fn signout(cookies: CookieJar) -> Result<(CookieJar, Json<EmptyResponse>)> {
    let changed_cookies = cookies
        .remove(Cookie::build((COOKIE_NAME, "")).path("/").build())
        .remove(Cookie::build((COOKIE_NAME_MARKER, "")).path("/").build());
    Ok((
        changed_cookies,
        Json(EmptyResponse {
            message: "Successfully logged out.",
        }),
    ))
}

/// This endpoint is used to get details about the logged in user.
#[utoipa::path(get,
	path = "/auth/me", 
	responses((status = 200, body = MeResponse, description = "Details about logged in user."), (status = UNAUTHORIZED, description = "Not logged in")),
	security(("jwt" = []))
)]
pub async fn me(Extension(claims): Extension<Claims>) -> Result<Json<MeResponse>> {
    Ok(Json(MeResponse {
        email: claims.email,
        username: claims.username,
    }))
}

#[utoipa::path(post, path = "/auth/email", responses((status = 200, body = EmptyResponse, description = "Email successfully changed."), (status = UNAUTHORIZED, description = "Not logged in")), security(("jwt" = [])))]
pub async fn change_email(
    Extension(ctx): Extension<ApiContext>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<EmailChange>,
) -> Result<Json<EmptyResponse>> {
    validate_input(&payload).map_err(|e| Error::BadRequest(e.message))?;

    sql::user::update_email(&ctx.db, &claims.email, &payload.new_email).await?;

    Ok(Json(EmptyResponse {
        message: "Email successfully changed.",
    }))
}

#[utoipa::path(post, path = "/auth/password", responses((status = 200, body = EmptyResponse, description = "Password successfully changed."), (status = UNAUTHORIZED, description = "Not logged in")), security(("jwt" = [])))]
pub async fn change_password(
    Extension(ctx): Extension<ApiContext>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<PasswordChange>,
) -> Result<(CookieJar, Json<EmptyResponse>)> {
    let valid_password =
        auth::check_password(&ctx.db, &claims.email, &payload.old_password).await?;

    if !valid_password {
        return Err(Error::BadRequest(
            serde_json::json!({"message": "The given existing password is not valid", "code": "INVALID_PASSWORD"})
                .to_string(),
        ));
    }
    let hashed_password = auth::hash_password(&payload.new_password);

    match hashed_password {
        Ok(hashed_password) => {
            sql::user::update_password(&ctx.db, &claims.email, &hashed_password).await?;
            Ok((
                CookieJar::new(),
                Json(EmptyResponse {
                    message: "Password successfully changed.",
                }),
            ))
        }
        Err(e) => Err(Error::Internal(e.to_string())),
    }
}

fn json_error_message(message: &str) -> String {
    serde_json::json!({"message": message}).to_string()
}
