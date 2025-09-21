use std::vec;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::{MySql, MySqlPool, Transaction};
use tracing::warn;

use crate::model::note::{Note, NoteInsert, NoteTag};

#[cfg(test)]
pub mod tests;

#[derive(Debug, Serialize, Clone)]
pub struct NoteDto {
    pub id: i32,
    pub text: String,
    pub name: String,
    pub color: String,
    pub state: String,
    pub owner_id: i32,
    pub predecessor_id: Option<i32>,
    pub updated: chrono::DateTime<Utc>,
    pub created: chrono::DateTime<Utc>,
    pub tag: Option<String>,
}

impl From<Note> for NoteDto {
    fn from(note: Note) -> Self {
        Self {
            id: note.id,
            text: note.text,
            name: note.name,
            color: note.color,
            state: note.state,
            predecessor_id: note.predecessor_id,
            owner_id: note.owner_id as i32,
            updated: note.updated,
            created: note.created,
            tag: note.tag.map(|tag| tag.into()),
        }
    }
}

impl From<NoteDto> for Note {
    fn from(note: NoteDto) -> Self {
        Self {
            id: note.id,
            text: note.text,
            name: note.name,
            color: note.color,
            state: note.state,
            predecessor_id: note.predecessor_id,
            owner_id: note.owner_id as i64,
            updated: note.updated,
            created: note.created,
            tag: note.tag.map(|tag| {
                // Convert the string tag back to NoteTag enum
                NoteTag::from(tag)
            }),
        }
    }
}

#[derive(Debug, Serialize, Clone)]
pub struct MoveTargetDto {
    pub id: i32,
    pub predecessor_id: Option<i32>,
    pub state: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(tag = "type")]
pub enum MoveTarget {
    Before { id: i64 },
    Last { state: String },
}

pub async fn read_all(db: &MySqlPool) -> sqlx::Result<Vec<NoteDto>> {
    let users = sqlx::query_as!(
        NoteDto,
        r#"
				SELECT n.id, n.text, n.owner as owner_id, u.color, u.name, n.state, n.predecessor_id, n.updated, n.created, n.tag
				FROM notes as n
				JOIN users as u ON owner = u.id
				"#,
    )
    .fetch_all(db)
    .await?;

    Ok(users)
}

pub async fn read_by_id<'c, E>(executor: E, id: u32) -> sqlx::Result<NoteDto>
where
    E: sqlx::Executor<'c, Database = MySql>,
{
    let users = sqlx::query_as!(
        NoteDto,
        r#"
		SELECT n.id, n.text, n.owner as owner_id, u.color, u.name, n.state, n.predecessor_id, n.updated, n.created, n.tag
		FROM notes as n
		JOIN users as u ON owner = u.id
		WHERE n.id = ?
		"#,
        id
    )
    .fetch_one(executor)
    .await?;

    Ok(users)
}

pub async fn add(db: &MySqlPool, note: &NoteInsert) -> sqlx::Result<NoteDto> {
    let mut transaction = db.begin().await?;

    // Insert the new note with the computed index
    let result = sqlx::query!(
        r#"
INSERT INTO notes (text, owner, state, predecessor_id)
VALUES (
    COALESCE(?, ""),
    ?,
    ?,
    (SELECT id FROM (
        SELECT id, state FROM notes
    ) AS n1
    WHERE state = ?
    AND NOT EXISTS (
        SELECT 1 FROM (
            SELECT predecessor_id, state FROM notes
        ) AS n2
        WHERE n2.predecessor_id = n1.id
        AND n2.state = n1.state
    ))
)
			"#,
        note.text,
        note.owner,
        note.state,
        note.state
    )
    .execute(&mut *transaction)
    .await?;

    // Retrieve the inserted note within the same transaction
    let note = read_by_id(&mut *transaction, result.last_insert_id() as u32).await?;

    transaction.commit().await?;

    Ok(note)
}

pub async fn update_text(db: &MySqlPool, id: u32, text: &str) -> sqlx::Result<()> {
    sqlx::query!(
        r#"
		UPDATE notes SET text = ? WHERE id = ?
		"#,
        text,
        id
    )
    .execute(db)
    .await?;

    Ok(())
}

pub async fn set_tag(db: &MySqlPool, id: u32, tag: NoteTag) -> sqlx::Result<()> {
    let tag_string = String::from(tag);
    sqlx::query!(
        r#"
		UPDATE notes SET tag = ? WHERE id = ?
		"#,
        tag_string,
        id
    )
    .execute(db)
    .await?;

    Ok(())
}

pub async fn clear_tag(db: &MySqlPool, id: u32) -> sqlx::Result<()> {
    sqlx::query!(
        r#"
		UPDATE notes SET tag = NULL WHERE id = ?
		"#,
        id
    )
    .execute(db)
    .await?;

    Ok(())
}

pub async fn get_last_id<'c, E>(executor: E, state: &str) -> sqlx::Result<Option<u32>>
where
    E: sqlx::Executor<'c, Database = MySql>,
{
    let id = sqlx::query!(
        r#"
					SELECT n1.id as id FROM notes as n1
					LEFT JOIN notes as n2 ON n1.id = n2.predecessor_id
					WHERE n1.state = ? AND n2.id IS NULL
					"#,
        state
    )
    .fetch_optional(executor)
    .await?;

    Ok(id.map(|i| i.id as u32))
}

pub async fn remove(db: &MySqlPool, id: u32) -> sqlx::Result<Vec<MoveTargetDto>> {
    let mut transaction = db.begin().await?;
    let change_set = uuid::Uuid::new_v4().to_string();

    // Fix the chain before deleting
    remove_from_chain(&mut transaction, id, &change_set).await?;

    // Then delete the note
    sqlx::query!(r#"DELETE FROM notes WHERE id = ?"#, id)
        .execute(&mut *transaction)
        .await?;

    transaction.commit().await?;

    let changes = get_changeset(db, &change_set).await?;

    Ok(changes)
}

pub async fn transfer(
    db: &MySqlPool,
    moved_item_id: u32,
    over_id: MoveTarget,
) -> sqlx::Result<Vec<MoveTargetDto>> {
    match over_id {
        MoveTarget::Before { id } => transfer_before(db, moved_item_id, id as u32).await,
        MoveTarget::Last { state } => transfer_last(db, moved_item_id, &state).await,
    }
}

pub async fn transfer_last(
    db: &MySqlPool,
    moved_item_id: u32,
    target_state: &str,
) -> sqlx::Result<Vec<MoveTargetDto>> {
    let mut transaction = db.begin().await?;
    let change_set = uuid::Uuid::new_v4().to_string();

    let last_id = get_last_id(&mut *transaction, target_state).await?;

    if let Some(last_id) = last_id {
        if last_id == moved_item_id {
            warn!("Attempted to move last note to last position");
            return Ok(vec![]); // This is still a "safe" validation
        }
    }

    // Fix any broken chains from where we're moving
    remove_from_chain(&mut transaction, moved_item_id, &change_set).await?;

    // Update our note to point to the last note
    sqlx::query!(
        r#"
			UPDATE notes 
			SET predecessor_id = ?,
					state = ?,
					change_set = ?
			WHERE id = ?
			"#,
        last_id,
        target_state,
        change_set,
        moved_item_id,
    )
    .execute(&mut *transaction)
    .await?;

    transaction.commit().await?;
    get_changeset(db, &change_set).await
}

pub async fn get_changeset(db: &MySqlPool, change_set: &str) -> sqlx::Result<Vec<MoveTargetDto>> {
    let updated_notes = sqlx::query_as!(
        MoveTargetDto,
        r#"
SELECT n.id, n.predecessor_id, n.state FROM notes as n WHERE change_set = ?
"#,
        change_set
    )
    .fetch_all(db)
    .await?;

    Ok(updated_notes)
}

async fn remove_from_chain(
    transaction: &mut Transaction<'_, MySql>,
    removed_id: u32,
    change_set: &str,
) -> sqlx::Result<()> {
    // Update notes that were pointing to the removed note
    // to point to whatever the removed note was pointing to
    sqlx::query!(
        r#"
			UPDATE notes 
			SET predecessor_id = (
					SELECT predecessor_id 
					FROM (SELECT * FROM notes) AS n2 
					WHERE n2.id = ?
			),
			change_set = ?
			WHERE predecessor_id = ?
			"#,
        removed_id,
        change_set,
        removed_id
    )
    .execute(&mut **transaction)
    .await?;

    Ok(())
}

async fn remove_from_chain_bulk(
    transaction: &mut Transaction<'_, MySql>,
    removed_ids: &[i32],
    change_set: &str,
) -> sqlx::Result<()> {
    if removed_ids.is_empty() {
        return Ok(());
    }

    // Create placeholders for the removed IDs
    let placeholders = std::iter::repeat_n("?", removed_ids.len())
        .collect::<Vec<_>>()
        .join(",");

    // Use CASE statement to handle multiple removed notes in one query
    // This is more direct translation of the original logic
    let query = format!(
        r#"
        UPDATE notes n1
        INNER JOIN (
            SELECT n2.id, n2.predecessor_id
            FROM notes n2
            WHERE n2.id IN ({})
        ) AS removed_notes ON n1.predecessor_id = removed_notes.id
        SET n1.predecessor_id = removed_notes.predecessor_id,
            n1.change_set = ?
        "#,
        placeholders
    );

    // Build and execute the query with dynamic parameters
    let mut query_builder = sqlx::query(&query);

    // Bind the change_set first
    query_builder = query_builder.bind(change_set);

    // Bind all removed_ids for the IN clause
    for id in removed_ids {
        query_builder = query_builder.bind(id);
    }

    query_builder.execute(&mut **transaction).await?;

    Ok(())
}

pub async fn transfer_before(
    db: &MySqlPool,
    moved_item_id: u32,
    over_id: u32,
) -> sqlx::Result<Vec<MoveTargetDto>> {
    if moved_item_id == over_id {
        warn!("Attempted to move note before itself");
        return Ok(vec![]);
    }

    let mut transaction = db.begin().await?;
    let change_set = uuid::Uuid::new_v4().to_string();

    let target = sqlx::query!(
        r#"SELECT state, predecessor_id FROM notes WHERE id = ?"#,
        over_id
    )
    .fetch_one(&mut *transaction)
    .await?;

    if target.predecessor_id == Some(moved_item_id as i32) {
        warn!("Attempted to move note to its current position");
        return Ok(vec![]);
    }

    remove_from_chain(&mut transaction, moved_item_id, &change_set).await?;

    // Make moved note point to what target was pointing to and update its state
    sqlx::query!(
        r#"
			UPDATE notes 
			SET predecessor_id = ?,
					state = ?,
					change_set = ?
			WHERE id = ?
			"#,
        target.predecessor_id,
        target.state,
        change_set,
        moved_item_id,
    )
    .execute(&mut *transaction)
    .await?;

    // Make target point to moved note
    sqlx::query!(
        r#"
			UPDATE notes 
			SET predecessor_id = ?,
					change_set = ?
			WHERE id = ?
			"#,
        moved_item_id,
        change_set,
        over_id,
    )
    .execute(&mut *transaction)
    .await?;

    transaction.commit().await?;
    get_changeset(db, &change_set).await
}

pub async fn delete_by(
    db: &MySqlPool,
    owner_id_option: Option<u32>,
    status_option: Option<String>,
) -> sqlx::Result<(Vec<i32>, Vec<MoveTargetDto>)> {
    let mut transaction = db.begin().await?;
    let change_set = uuid::Uuid::new_v4().to_string();

    let note_ids = match (owner_id_option, status_option) {
        (Some(owner_id), Some(status)) => {
            read_by_status_and_owner(&mut transaction, owner_id, status).await
        }
        (Some(owner_id), None) => read_by_owner(&mut transaction, owner_id).await,
        (None, Some(status)) => read_by_status(&mut transaction, Some(status)).await,
        (None, None) => read_all_notes_ids(&mut transaction).await,
    }?;

    // Fix chains for each deleted note (revert to working implementation)
    for &id in &note_ids {
        remove_from_chain(&mut transaction, id as u32, &change_set).await?;
    }

    // After fixing all chains, delete all notes at once
    delete_bulk(&mut transaction, &note_ids).await?;

    transaction.commit().await?;

    let move_changes = get_changeset(db, &change_set).await?;

    Ok((note_ids, move_changes))
}

pub async fn read_by_owner(
    transaction: &mut Transaction<'_, MySql>,
    owner_id: u32,
) -> sqlx::Result<Vec<i32>> {
    let notes = sqlx::query!(
        r#"
			SELECT id FROM notes
			WHERE owner = ?
			ORDER BY id
			"#,
        owner_id
    )
    .fetch_all(&mut **transaction)
    .await?;

    Ok(notes.into_iter().map(|n| n.id).collect())
}

pub async fn read_by_status(
    transaction: &mut Transaction<'_, MySql>,
    status: Option<String>,
) -> sqlx::Result<Vec<i32>> {
    let notes = sqlx::query!(
        r#"
			SELECT id FROM notes
			WHERE state = ?
			ORDER BY id
			"#,
        status
    )
    .fetch_all(&mut **transaction)
    .await?;

    Ok(notes.into_iter().map(|n| n.id).collect())
}

pub async fn read_by_status_and_owner(
    transaction: &mut Transaction<'_, MySql>,
    owner_id: u32,
    status: String,
) -> sqlx::Result<Vec<i32>> {
    let notes = sqlx::query!(
        r#"
			SELECT id FROM notes
			WHERE state = ? AND owner = ?
			ORDER BY id
			"#,
        status,
        owner_id
    )
    .fetch_all(&mut **transaction)
    .await?;

    Ok(notes.into_iter().map(|n| n.id).collect())
}

pub async fn read_all_notes_ids(
    transaction: &mut Transaction<'_, MySql>,
) -> sqlx::Result<Vec<i32>> {
    let notes = sqlx::query!(
        r#"
			SELECT id FROM notes
			ORDER BY id
			"#
    )
    .fetch_all(&mut **transaction)
    .await?;

    Ok(notes.into_iter().map(|n| n.id).collect())
}

pub async fn delete_bulk(
    transaction: &mut Transaction<'_, MySql>,
    ids: &[i32],
) -> sqlx::Result<()> {
    if ids.is_empty() {
        return Ok(());
    }

    // Create a parameterized query with the right number of placeholders
    let placeholders = std::iter::repeat_n("?", ids.len())
        .collect::<Vec<_>>()
        .join(",");
    let query = format!("DELETE FROM notes WHERE id IN ({})", placeholders);

    // Build and execute the query with dynamic parameters
    let mut query_builder = sqlx::query(&query);
    for id in ids {
        query_builder = query_builder.bind(id);
    }

    query_builder.execute(&mut **transaction).await?;

    Ok(())
}

pub async fn split_note(
    db: &MySqlPool,
    original_id: u32,
    original_text: &str,
    new_text: &str,
    new_state: Option<&str>,
    new_owner: Option<u32>,
) -> sqlx::Result<(NoteDto, NoteDto)> {
    let mut transaction = db.begin().await?;

    // First, read the original note to get its current state and owner
    let original_note = sqlx::query!(
        r#"
        SELECT id, text, owner, state, predecessor_id, tag, updated, created
        FROM notes 
        WHERE id = ?
        "#,
        original_id
    )
    .fetch_one(&mut *transaction)
    .await?;

    // Update the original note with new text
    sqlx::query!(
        r#"
        UPDATE notes SET text = ? WHERE id = ?
        "#,
        original_text,
        original_id
    )
    .execute(&mut *transaction)
    .await?;

    // Use provided new_state and new_owner, or fall back to original values
    let target_state = new_state.unwrap_or(&original_note.state);
    let target_owner = new_owner.unwrap_or(original_note.owner as u32);

    // Find the last note in the target state for proper ordering
    let last_id = sqlx::query!(
        r#"
        SELECT n1.id as id FROM notes as n1
        LEFT JOIN notes as n2 ON n1.id = n2.predecessor_id
        WHERE n1.state = ? AND n2.id IS NULL
        "#,
        target_state
    )
    .fetch_optional(&mut *transaction)
    .await?;

    // Create the new note
    let new_note_result = sqlx::query!(
        r#"
        INSERT INTO notes (text, owner, state, predecessor_id, tag)
        VALUES (?, ?, ?, ?, ?)
        "#,
        new_text,
        target_owner,
        target_state,
        last_id.map(|row| row.id),
        original_note.tag
    )
    .execute(&mut *transaction)
    .await?;

    // Read back both notes within the same transaction
    let updated_original = read_by_id(&mut *transaction, original_id).await?;
    let new_note = read_by_id(&mut *transaction, new_note_result.last_insert_id() as u32).await?;

    // Commit the transaction
    transaction.commit().await?;

    Ok((updated_original, new_note))
}
