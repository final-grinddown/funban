use sqlx::MySqlPool;

use crate::model::{
    release::ReleaseType,
    release_settings::{ReleaseSettings, ReleaseStep},
};

#[cfg(test)]
pub mod tests;

const SETTINGS_ID: i8 = 1;

fn split_emails(value: &str) -> Vec<String> {
    value
        .split(',')
        .map(str::trim)
        .filter(|email| !email.is_empty())
        .map(str::to_string)
        .collect()
}

pub async fn read(db: &MySqlPool) -> sqlx::Result<ReleaseSettings> {
    let row = sqlx::query!(
        r#"
        SELECT notification_to, notification_cc FROM release_settings WHERE id = ?
        "#,
        SETTINGS_ID
    )
    .fetch_optional(db)
    .await?;

    Ok(row
        .map(|r| ReleaseSettings {
            notification_to: split_emails(&r.notification_to),
            notification_cc: split_emails(&r.notification_cc),
        })
        .unwrap_or(ReleaseSettings {
            notification_to: Vec::new(),
            notification_cc: Vec::new(),
        }))
}

/// Stores the settings, creating the row when it is missing.
pub async fn update(db: &MySqlPool, settings: &ReleaseSettings) -> sqlx::Result<ReleaseSettings> {
    let notification_to = settings.notification_to.join(",");
    let notification_cc = settings.notification_cc.join(",");

    sqlx::query!(
        r#"
        INSERT INTO release_settings (id, notification_to, notification_cc)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE notification_to = VALUES(notification_to), notification_cc = VALUES(notification_cc)
        "#,
        SETTINGS_ID,
        notification_to,
        notification_cc,
    )
    .execute(db)
    .await?;

    read(db).await
}

/// Reads the release step template in step order.
pub async fn read_steps(db: &MySqlPool) -> sqlx::Result<Vec<ReleaseStep>> {
    let rows = sqlx::query!(
        r#"
        SELECT title, release_type FROM release_step_templates ORDER BY position, id
        "#,
    )
    .fetch_all(db)
    .await?;

    rows.into_iter()
        .map(|r| {
            let release_type = r
                .release_type
                .as_deref()
                .map(ReleaseType::try_from)
                .transpose()
                .map_err(|e| sqlx::Error::Decode(e.into()))?;
            Ok(ReleaseStep {
                title: r.title,
                release_type,
            })
        })
        .collect()
}

/// Replaces the whole step template; tasks of existing releases are not affected.
pub async fn replace_steps(
    db: &MySqlPool,
    steps: &[ReleaseStep],
) -> sqlx::Result<Vec<ReleaseStep>> {
    let mut tx = db.begin().await?;

    sqlx::query!(
        r#"
        DELETE FROM release_step_templates
        "#,
    )
    .execute(&mut *tx)
    .await?;

    for (position, step) in steps.iter().enumerate() {
        sqlx::query!(
            r#"
            INSERT INTO release_step_templates (title, release_type, position)
            VALUES (?, ?, ?)
            "#,
            step.title,
            step.release_type.map(|t| t.as_str()),
            position as i32,
        )
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    read_steps(db).await
}
