use chrono::NaiveDateTime;
use sqlx::MySqlPool;

use crate::model::release::{ReleaseInsert, ReleaseType};
use crate::model::release_settings::ReleaseStep;
use crate::sql::{release, release_settings, user};

fn step(title: &str, release_type: Option<ReleaseType>) -> ReleaseStep {
    ReleaseStep {
        title: title.to_string(),
        release_type,
    }
}

async fn set_up_template(db: &MySqlPool) -> sqlx::Result<()> {
    release_settings::replace_steps(
        db,
        &[
            step("Announce", None),
            step("Build application", Some(ReleaseType::Application)),
            step("Run maintenance script", Some(ReleaseType::Maintenance)),
            step("Verify", None),
        ],
    )
    .await?;
    Ok(())
}

async fn task_titles(db: &MySqlPool, release_id: i32) -> sqlx::Result<Vec<String>> {
    Ok(release::read_tasks(db, release_id)
        .await?
        .into_iter()
        .map(|t| t.title)
        .collect())
}

fn release_insert(code: &str, assignee_id: impl Into<Option<i32>>) -> ReleaseInsert {
    ReleaseInsert {
        release_code: code.to_string(),
        release_type: ReleaseType::Application,
        release_at: NaiveDateTime::parse_from_str("2026-10-20 14:00:00", "%Y-%m-%d %H:%M:%S")
            .unwrap(),
        assignee_id: assignee_id.into(),
    }
}

#[sqlx::test(fixtures("users"))]
async fn add_and_read_release(db: MySqlPool) -> sqlx::Result<()> {
    let added = release::add(&db, &release_insert("20261020", 1)).await?;

    assert_eq!(added.release_code, "20261020");
    assert_eq!(added.release_type, "application");
    assert_eq!(added.assignee_id, Some(1));
    assert_eq!(added.assignee_name.as_deref(), Some("Alice"));

    let by_id = release::read_by_id(&db, added.id).await?;
    assert_eq!(by_id.map(|r| r.release_code), Some("20261020".to_string()));

    let all = release::read_all(&db).await?;
    assert_eq!(all.len(), 1);

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn read_all_orders_by_date_desc(db: MySqlPool) -> sqlx::Result<()> {
    let mut older = release_insert("20261001", 1);
    older.release_at =
        NaiveDateTime::parse_from_str("2026-10-01 10:00:00", "%Y-%m-%d %H:%M:%S").unwrap();
    release::add(&db, &older).await?;
    release::add(&db, &release_insert("20261020", 1)).await?;

    let all = release::read_all(&db).await?;
    let codes: Vec<_> = all.iter().map(|r| r.release_code.as_str()).collect();
    assert_eq!(codes, vec!["20261020", "20261001"]);

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn add_with_unknown_assignee_fails(db: MySqlPool) -> sqlx::Result<()> {
    let result = release::add(&db, &release_insert("20261020", 999)).await;
    assert!(matches!(result, Err(sqlx::Error::RowNotFound)));

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn duplicate_release_code_is_unique_violation(db: MySqlPool) -> sqlx::Result<()> {
    release::add(&db, &release_insert("20261020", 1)).await?;
    let result = release::add(&db, &release_insert("20261020", 2)).await;

    match result {
        Err(sqlx::Error::Database(e)) => assert!(e.is_unique_violation()),
        other => panic!("expected unique violation, got {:?}", other),
    }

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn update_release_reassigns(db: MySqlPool) -> sqlx::Result<()> {
    let added = release::add(&db, &release_insert("20261020", 1)).await?;

    let mut changes = release_insert("20261021", 2);
    changes.release_type = ReleaseType::Maintenance;
    let updated = release::update(&db, added.id, &changes).await?.unwrap();

    assert_eq!(updated.release_code, "20261021");
    assert_eq!(updated.release_type, "maintenance");
    assert_eq!(updated.assignee_id, Some(2));
    assert_eq!(updated.assignee_name.as_deref(), Some("Bob"));

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn update_missing_release_returns_none(db: MySqlPool) -> sqlx::Result<()> {
    let result = release::update(&db, 999, &release_insert("20261020", 1)).await?;
    assert!(result.is_none());

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn renamed_assignee_shows_current_name(db: MySqlPool) -> sqlx::Result<()> {
    let added = release::add(&db, &release_insert("20261020", 1)).await?;
    sqlx::query("UPDATE users SET name = 'Alicia' WHERE id = 1")
        .execute(&db)
        .await?;

    let release = release::read_by_id(&db, added.id).await?.unwrap();
    assert_eq!(release.assignee_name.as_deref(), Some("Alicia"));

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn deleted_assignee_keeps_name_snapshot(db: MySqlPool) -> sqlx::Result<()> {
    let added = release::add(&db, &release_insert("20261020", 1)).await?;
    user::remove(&db, 1).await?;

    let release = release::read_by_id(&db, added.id).await?.unwrap();
    assert_eq!(release.assignee_id, None);
    assert_eq!(release.assignee_name.as_deref(), Some("Alice"));

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn remove_release(db: MySqlPool) -> sqlx::Result<()> {
    let added = release::add(&db, &release_insert("20261020", 1)).await?;

    assert!(release::remove(&db, added.id).await?);
    assert!(release::read_by_id(&db, added.id).await?.is_none());
    assert!(!release::remove(&db, added.id).await?);

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn close_and_reopen_release(db: MySqlPool) -> sqlx::Result<()> {
    let added = release::add(&db, &release_insert("20261020", 1)).await?;
    assert_eq!(added.closed_at, None);

    assert!(release::close(&db, added.id, "All good.").await?);
    let closed = release::read_by_id(&db, added.id).await?.unwrap();
    assert!(closed.closed_at.is_some());
    assert_eq!(closed.close_summary.as_deref(), Some("All good."));

    // Closing twice is rejected
    assert!(!release::close(&db, added.id, "Again").await?);

    assert!(release::reopen(&db, added.id).await?);
    let reopened = release::read_by_id(&db, added.id).await?.unwrap();
    assert_eq!(reopened.closed_at, None);
    assert_eq!(reopened.close_summary.as_deref(), Some("All good."));

    // Reopening an open release is rejected
    assert!(!release::reopen(&db, added.id).await?);

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn closed_release_is_read_only(db: MySqlPool) -> sqlx::Result<()> {
    let added = release::add(&db, &release_insert("20261020", 1)).await?;
    release::close(&db, added.id, "Done.").await?;

    let unchanged = release::update(&db, added.id, &release_insert("CHANGED", 2))
        .await?
        .unwrap();
    assert_eq!(unchanged.release_code, "20261020");
    assert_eq!(unchanged.assignee_id, Some(1));

    assert!(!release::remove(&db, added.id).await?);
    assert!(release::read_by_id(&db, added.id).await?.is_some());

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn update_and_clear_notes(db: MySqlPool) -> sqlx::Result<()> {
    let added = release::add(&db, &release_insert("20261020", 1)).await?;
    assert_eq!(added.notes, None);

    assert!(release::update_notes(&db, added.id, Some("- step one")).await?);
    let updated = release::read_by_id(&db, added.id).await?.unwrap();
    assert_eq!(updated.notes.as_deref(), Some("- step one"));

    assert!(release::update_notes(&db, added.id, None).await?);
    let cleared = release::read_by_id(&db, added.id).await?.unwrap();
    assert_eq!(cleared.notes, None);

    assert!(!release::update_notes(&db, 999, Some("x")).await?);

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn closed_release_notes_are_read_only(db: MySqlPool) -> sqlx::Result<()> {
    let added = release::add(&db, &release_insert("20261020", 1)).await?;
    release::update_notes(&db, added.id, Some("Before close")).await?;
    release::close(&db, added.id, "Done.").await?;

    assert!(!release::update_notes(&db, added.id, Some("After close")).await?);
    let closed = release::read_by_id(&db, added.id).await?.unwrap();
    assert_eq!(closed.notes.as_deref(), Some("Before close"));

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn closed_release_keeps_name_of_deleted_assignee(db: MySqlPool) -> sqlx::Result<()> {
    let added = release::add(&db, &release_insert("20261020", 1)).await?;
    release::close(&db, added.id, "Done.").await?;
    user::remove(&db, 1).await?;

    let release = release::read_by_id(&db, added.id).await?.unwrap();
    assert_eq!(release.assignee_id, None);
    assert_eq!(release.assignee_name.as_deref(), Some("Alice"));
    assert!(release.closed_at.is_some());

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn assignee_name_keeps_emoji(db: MySqlPool) -> sqlx::Result<()> {
    sqlx::query("UPDATE users SET name = '\u{1F977} Alice' WHERE id = 1")
        .execute(&db)
        .await?;
    let added = release::add(&db, &release_insert("20261020", 1)).await?;
    user::remove(&db, 1).await?;

    // The snapshot has to keep 4-byte characters too, not just the live name
    let release = release::read_by_id(&db, added.id).await?.unwrap();
    assert_eq!(release.assignee_name.as_deref(), Some("\u{1F977} Alice"));

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn add_unassigned_release(db: MySqlPool) -> sqlx::Result<()> {
    let added = release::add(&db, &release_insert("20261020", None)).await?;

    assert_eq!(added.assignee_id, None);
    assert_eq!(added.assignee_name, None);

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn assign_and_unassign_release(db: MySqlPool) -> sqlx::Result<()> {
    let added = release::add(&db, &release_insert("20261020", None)).await?;

    let assigned = release::update(&db, added.id, &release_insert("20261020", 2))
        .await?
        .unwrap();
    assert_eq!(assigned.assignee_id, Some(2));
    assert_eq!(assigned.assignee_name.as_deref(), Some("Bob"));

    let unassigned = release::update(&db, added.id, &release_insert("20261020", None))
        .await?
        .unwrap();
    assert_eq!(unassigned.assignee_id, None);
    assert_eq!(unassigned.assignee_name, None);

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn add_copies_template_steps_for_release_type(db: MySqlPool) -> sqlx::Result<()> {
    set_up_template(&db).await?;

    let application = release::add(&db, &release_insert("20261020", 1)).await?;
    assert_eq!(
        task_titles(&db, application.id).await?,
        vec!["Announce", "Build application", "Verify"]
    );

    let mut maintenance_insert = release_insert("20261021", 1);
    maintenance_insert.release_type = ReleaseType::Maintenance;
    let maintenance = release::add(&db, &maintenance_insert).await?;
    assert_eq!(
        task_titles(&db, maintenance.id).await?,
        vec!["Announce", "Run maintenance script", "Verify"]
    );

    let all = release::read_all_tasks(&db).await?;
    assert_eq!(all.len(), 6);
    assert!(all[..3].iter().all(|t| t.release_id == application.id));

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn template_changes_do_not_affect_existing_releases(db: MySqlPool) -> sqlx::Result<()> {
    set_up_template(&db).await?;
    let added = release::add(&db, &release_insert("20261020", 1)).await?;

    release_settings::replace_steps(&db, &[step("Something else", None)]).await?;

    assert_eq!(
        task_titles(&db, added.id).await?,
        vec!["Announce", "Build application", "Verify"]
    );

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn tick_and_untick_task(db: MySqlPool) -> sqlx::Result<()> {
    set_up_template(&db).await?;
    let added = release::add(&db, &release_insert("20261020", 1)).await?;
    let task_id = release::read_tasks(&db, added.id).await?[0].id;

    assert!(release::set_task_done(&db, added.id, task_id, true).await?);
    let done_at = release::read_tasks(&db, added.id).await?[0].done_at;
    assert!(done_at.is_some());

    // Ticking again keeps the original time and still reports the task as found
    assert!(release::set_task_done(&db, added.id, task_id, true).await?);
    assert_eq!(
        release::read_tasks(&db, added.id).await?[0].done_at,
        done_at
    );

    assert!(release::set_task_done(&db, added.id, task_id, false).await?);
    assert_eq!(release::read_tasks(&db, added.id).await?[0].done_at, None);

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn task_of_other_or_closed_release_is_not_updated(db: MySqlPool) -> sqlx::Result<()> {
    set_up_template(&db).await?;
    let first = release::add(&db, &release_insert("20261020", 1)).await?;
    let second = release::add(&db, &release_insert("20261021", 1)).await?;
    let task_id = release::read_tasks(&db, first.id).await?[0].id;

    assert!(!release::set_task_done(&db, second.id, task_id, true).await?);

    release::close(&db, first.id, "Done.").await?;
    assert!(!release::set_task_done(&db, first.id, task_id, true).await?);
    assert_eq!(release::read_tasks(&db, first.id).await?[0].done_at, None);

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn add_tasks_from_template_fills_only_empty_open_release(db: MySqlPool) -> sqlx::Result<()> {
    // Created before the template was set up
    let added = release::add(&db, &release_insert("20261020", 1)).await?;
    assert!(task_titles(&db, added.id).await?.is_empty());

    set_up_template(&db).await?;
    assert_eq!(
        release::add_tasks_from_template(&db, added.id, ReleaseType::Application).await?,
        3
    );
    assert_eq!(task_titles(&db, added.id).await?.len(), 3);

    // Already has tasks
    assert_eq!(
        release::add_tasks_from_template(&db, added.id, ReleaseType::Application).await?,
        0
    );
    assert_eq!(task_titles(&db, added.id).await?.len(), 3);

    let closed = release::add(&db, &release_insert("20261021", 1)).await?;
    sqlx::query("DELETE FROM release_tasks WHERE release_id = ?")
        .bind(closed.id)
        .execute(&db)
        .await?;
    release::close(&db, closed.id, "Done.").await?;
    assert_eq!(
        release::add_tasks_from_template(&db, closed.id, ReleaseType::Application).await?,
        0
    );

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn removing_release_removes_its_tasks(db: MySqlPool) -> sqlx::Result<()> {
    set_up_template(&db).await?;
    let added = release::add(&db, &release_insert("20261020", 1)).await?;

    release::remove(&db, added.id).await?;

    assert!(release::read_all_tasks(&db).await?.is_empty());

    Ok(())
}
