use axum::{
    extract::Request,
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::Response,
    Extension,
};
use axum_extra::extract::CookieJar;

use crate::model::auth::{get_token_from_header_or_cookie, parse_claims};

use super::ApiContext;

pub async fn auth(
    // run the `HeaderMap` extractor
    Extension(ctx): Extension<ApiContext>,
    cookies: CookieJar,
    headers: HeaderMap,
    // you can also add more extractors here but the last
    // extractor must implement `FromRequest` which
    // `Request` does
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    match get_token_from_header_or_cookie(&headers, &cookies) {
        Some(token) => {
            if let Ok(claims) = parse_claims(token, &ctx.config.api_secret) {
                request.extensions_mut().insert(claims);
                let response = next.run(request).await;
                Ok(response)
            } else {
                Err(StatusCode::UNAUTHORIZED)
            }
        }
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}
