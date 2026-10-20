use crate::{
    http::{errors::Error, middleware::auth, Result},
    model::release_settings::{ReleaseSettings, ReleaseStep},
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
const MAX_STEPS: usize = 100;
const STEP_TITLE_MAX_LEN: usize = 2000;
const STEP_TIMING_MAX_LEN: usize = 100;

pub fn protected_router() -> Router {
    Router::new()
        .route("/release-settings", get(get_settings))
        .route("/release-settings", put(update_settings))
        .route("/release-settings/steps", get(get_steps))
        .route("/release-settings/steps", put(update_steps))
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

/// Trims step titles and timings, drops blank steps and validates lengths. A blank timing is cleared.
fn validated_steps(steps: Vec<ReleaseStep>) -> Result<Vec<ReleaseStep>> {
    let result: Vec<ReleaseStep> = steps
        .into_iter()
        .map(|step| ReleaseStep {
            title: step.title.trim().to_string(),
            timing: step
                .timing
                .map(|timing| timing.trim().to_string())
                .filter(|timing| !timing.is_empty()),
            release_type: step.release_type,
        })
        .filter(|step| !step.title.is_empty())
        .collect();

    if let Some(step) = result
        .iter()
        .find(|step| step.title.chars().count() > STEP_TITLE_MAX_LEN)
    {
        return Err(Error::BadRequest(format!(
            "Step title must be {} characters or less: {}",
            STEP_TITLE_MAX_LEN, step.title
        )));
    }

    if let Some(timing) = result
        .iter()
        .filter_map(|step| step.timing.as_deref())
        .find(|timing| timing.chars().count() > STEP_TIMING_MAX_LEN)
    {
        return Err(Error::BadRequest(format!(
            "Step timing must be {} characters or less: {}",
            STEP_TIMING_MAX_LEN, timing
        )));
    }

    if result.len() > MAX_STEPS {
        return Err(Error::BadRequest(format!(
            "There can be at most {} steps",
            MAX_STEPS
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

/// Get the release step template, copied into each new release.
#[utoipa::path(get,
	path = "/release-settings/steps",
	responses((status = 200, body = Vec<ReleaseStep>, description = "Success")),
	security(("jwt" = []))
)]
pub async fn get_steps(ctx: Extension<ApiContext>) -> Result<Json<Vec<ReleaseStep>>> {
    Ok(Json(sql::release_settings::read_steps(&ctx.db).await?))
}

/// Replace the release step template. Existing releases keep their tasks.
#[utoipa::path(put,
	path = "/release-settings/steps",
	request_body = Vec<ReleaseStep>,
	responses(
		(status = 200, body = Vec<ReleaseStep>, description = "Success"),
		(status = 400, description = "Step title or timing too long, or too many steps")
	),
	security(("jwt" = []))
)]
pub async fn update_steps(
    ctx: Extension<ApiContext>,
    Json(payload): Json<Vec<ReleaseStep>>,
) -> Result<Json<Vec<ReleaseStep>>> {
    let steps = validated_steps(payload)?;

    let updated = sql::release_settings::replace_steps(&ctx.db, &steps).await?;

    info!(steps = updated.len(), "Release steps updated");
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

    fn step(title: &str) -> ReleaseStep {
        ReleaseStep {
            title: title.to_string(),
            timing: None,
            release_type: None,
        }
    }

    fn timed_step(title: &str, timing: &str) -> ReleaseStep {
        ReleaseStep {
            timing: Some(timing.to_string()),
            ..step(title)
        }
    }

    #[test]
    fn steps_are_trimmed_and_blank_dropped() {
        let result = validated_steps(vec![
            step("  Deploy  "),
            step("   "),
            timed_step(
                "Verify
- logs
- metrics
",
                "  1 day after  ",
            ),
            timed_step("Announce", "   "),
        ])
        .unwrap();

        assert_eq!(
            result,
            vec![
                step("Deploy"),
                timed_step(
                    "Verify
- logs
- metrics",
                    "1 day after"
                ),
                step("Announce"),
            ]
        );
    }

    #[test]
    fn rejects_invalid_steps() {
        assert!(validated_steps(vec![step(&"x".repeat(STEP_TITLE_MAX_LEN + 1))]).is_err());
        assert!(validated_steps(vec![timed_step(
            "Deploy",
            &"x".repeat(STEP_TIMING_MAX_LEN + 1)
        )])
        .is_err());
        assert!(validated_steps(
            (0..=MAX_STEPS)
                .map(|i| step(&format!("Step {}", i)))
                .collect()
        )
        .is_err());
    }

    #[test]
    fn rejects_too_many_recipients() {
        let many: Vec<String> = (0..=MAX_RECIPIENTS)
            .map(|i| format!("user{}@example.com", i))
            .collect();

        assert!(validated_emails("cc", &many).is_err());
    }
}
