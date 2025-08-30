use std::sync::Arc;

use axum::{
    extract::{Query, Request},
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::Response,
    Extension,
};
use axum_extra::extract::CookieJar;

use crate::model::auth::{get_token_from_header_or_cookie_or_query, parse_claims, Token};

use super::WsContext;

pub async fn auth(
    // run the `HeaderMap` extractor
    Extension(ctx): Extension<Arc<WsContext>>,
    headers: HeaderMap,
    cookies: CookieJar,
    query: Query<Token>,
    // you can also add more extractors here but the last
    // extractor must implement `FromRequest` which
    // `Request` does
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    match get_token_from_header_or_cookie_or_query(&headers, &cookies, &query) {
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
