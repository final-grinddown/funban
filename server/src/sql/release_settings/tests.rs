use sqlx::MySqlPool;

use crate::model::{
    release::ReleaseType,
    release_settings::{ReleaseSettings, ReleaseStep},
};
use crate::sql::release_settings;

#[sqlx::test]
async fn read_returns_migration_defaults(db: MySqlPool) -> sqlx::Result<()> {
    let settings = release_settings::read(&db).await?;

    assert_eq!(
        settings.notification_to,
        vec!["dl-reamontax-all@eurowag.com"]
    );
    assert_eq!(settings.notification_cc, vec!["marcel.haspl@eurowag.com"]);

    Ok(())
}

#[sqlx::test]
async fn update_replaces_recipients(db: MySqlPool) -> sqlx::Result<()> {
    let changes = ReleaseSettings {
        notification_to: vec!["team@example.com".to_string()],
        notification_cc: vec!["a@example.com".to_string(), "b@example.com".to_string()],
    };

    let updated = release_settings::update(&db, &changes).await?;
    assert_eq!(updated, changes);

    let cleared = release_settings::update(
        &db,
        &ReleaseSettings {
            notification_to: vec!["team@example.com".to_string()],
            notification_cc: Vec::new(),
        },
    )
    .await?;
    assert!(cleared.notification_cc.is_empty());

    Ok(())
}

#[sqlx::test]
async fn update_recreates_missing_row(db: MySqlPool) -> sqlx::Result<()> {
    sqlx::query("DELETE FROM release_settings")
        .execute(&db)
        .await?;
    assert!(release_settings::read(&db)
        .await?
        .notification_to
        .is_empty());

    let changes = ReleaseSettings {
        notification_to: vec!["team@example.com".to_string()],
        notification_cc: Vec::new(),
    };
    assert_eq!(release_settings::update(&db, &changes).await?, changes);

    Ok(())
}

#[sqlx::test]
async fn replace_and_read_steps_in_order(db: MySqlPool) -> sqlx::Result<()> {
    assert!(release_settings::read_steps(&db).await?.is_empty());

    let steps = vec![
        ReleaseStep {
            title: "Announce".to_string(),
            timing: Some("3 days before release".to_string()),
            release_type: None,
        },
        ReleaseStep {
            title: "Build application".to_string(),
            timing: None,
            release_type: Some(ReleaseType::Application),
        },
        ReleaseStep {
            title: "Verify

- check logs
- check metrics"
                .to_string(),
            timing: None,
            release_type: None,
        },
    ];
    assert_eq!(release_settings::replace_steps(&db, &steps).await?, steps);

    let reordered: Vec<ReleaseStep> = steps.iter().rev().cloned().collect();
    assert_eq!(
        release_settings::replace_steps(&db, &reordered).await?,
        reordered
    );

    assert!(release_settings::replace_steps(&db, &[]).await?.is_empty());

    Ok(())
}
