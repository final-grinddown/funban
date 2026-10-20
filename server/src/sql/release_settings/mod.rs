use sqlx::MySqlPool;

use crate::model::release_settings::ReleaseSettings;

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
