use sqlx::MySqlPool;

use crate::model::release_settings::ReleaseSettings;
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
