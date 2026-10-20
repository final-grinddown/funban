use crate::{
    http::{errors::Error, middleware::auth, Result},
    model::release_settings::ReleaseSettings,
    sql,
};

use axum::{
    middleware,
    routing::{get, put},
    Extension, Json, Router,
};
use tracing::info;

use crate::http::ApiContext;

const MAX_RECIPIENTS: usize = 50;
const EMAIL_MAX_LEN: usize = 254;

pub fn protected_router() -> Router {
    Router::new()
        .route("/release-settings", get(get_settings))
        .route("/release-settings", put(update_settings))
        .route_layer(middleware::from_fn(auth))
}

/// Trims, de-duplicates and validates a recipient list.
fn validated_emails(field: &str, emails: &[String]) -> Result<Vec<String>> {
    let mut result: Vec<String> = Vec::new();

    for email in emails.iter().map(|e| e.trim()).filter(|e| !e.is_empty()) {
        if !is_valid_email(email) {
            return Err(Error::BadRequest(format!(
                "{} contains an invalid email: {}",
                field, email
            )));
        }
        if !result.iter().any(|e| e.eq_ignore_ascii_case(email)) {
            result.push(email.to_string());
        }
    }

    if result.len() > MAX_RECIPIENTS {
        return Err(Error::BadRequest(format!(
            "{} can have at most {} recipients",
            field, MAX_RECIPIENTS
        )));
    }

    Ok(result)
}

/// Loose check that rejects obvious typos; the mail client does the real validation.
fn is_valid_email(email: &str) -> bool {
    if email.len() > EMAIL_MAX_LEN || email.contains(|c: char| c.is_whitespace() || c == ',') {
        return false;
    }

    match email.split_once('@') {
        Some((local, domain)) => {
            !local.is_empty()
                && !domain.contains('@')
                && domain.contains('.')
                && !domain.starts_with('.')
                && !domain.ends_with('.')
        }
        None => false,
    }
}

/// Get the release notification settings.
#[utoipa::path(get,
	path = "/release-settings",
	responses((status = 200, body = ReleaseSettings, description = "Success")),
	security(("jwt" = []))
)]
pub async fn get_settings(ctx: Extension<ApiContext>) -> Result<Json<ReleaseSettings>> {
    Ok(Json(sql::release_settings::read(&ctx.db).await?))
}

/// Update the release notification settings.
#[utoipa::path(put,
	path = "/release-settings",
	request_body = ReleaseSettings,
	responses(
		(status = 200, body = ReleaseSettings, description = "Success"),
		(status = 400, description = "Invalid email or too many recipients")
	),
	security(("jwt" = []))
)]
pub async fn update_settings(
    ctx: Extension<ApiContext>,
    Json(payload): Json<ReleaseSettings>,
) -> Result<Json<ReleaseSettings>> {
    let settings = ReleaseSettings {
        notification_to: validated_emails("notification_to", &payload.notification_to)?,
        notification_cc: validated_emails("notification_cc", &payload.notification_cc)?,
    };

    let updated = sql::release_settings::update(&ctx.db, &settings).await?;

    info!("Release settings updated");
    Ok(Json(updated))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn emails(values: &[&str]) -> Vec<String> {
        values.iter().map(|v| v.to_string()).collect()
    }

    #[test]
    fn emails_are_trimmed_and_deduplicated() {
        let result = validated_emails(
            "cc",
            &emails(&[" a@example.com ", "", "A@example.com", "b@x.cz"]),
        )
        .unwrap();

        assert_eq!(result, emails(&["a@example.com", "b@x.cz"]));
    }

    #[test]
    fn rejects_invalid_emails() {
        for invalid in [
            "plain",
            "@example.com",
            "a@b",
            "a@.com",
            "a@b.",
            "a b@example.com",
            "a@b@c.com",
            "a@b.com,c@d.com",
        ] {
            assert!(
                validated_emails("cc", &emails(&[invalid])).is_err(),
                "{} should be rejected",
                invalid
            );
        }
    }

    #[test]
    fn rejects_too_many_recipients() {
        let many: Vec<String> = (0..=MAX_RECIPIENTS)
            .map(|i| format!("user{}@example.com", i))
            .collect();

        assert!(validated_emails("cc", &many).is_err());
    }
}
