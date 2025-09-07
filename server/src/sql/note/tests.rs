use sqlx::MySqlPool;

use crate::{
    constants::note_states,
    model::note::NoteInsert,
    sql::note::{self, get_last_id, read_by_id, MoveTarget},
};

#[sqlx::test(fixtures("users", "notes"))]
async fn test_get_next_id(db: MySqlPool) -> sqlx::Result<()> {
    let id = note::get_last_id(&db, note_states::TODO).await?;

    assert_eq!(id, Some(2));

    let id = note::get_last_id(&db, note_states::IN_PROGRESS).await?;

    assert_eq!(id, Some(3));

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn test_get_next_id_neg(db: MySqlPool) -> sqlx::Result<()> {
    let id = note::get_last_id(&db, "info").await?;

    assert_eq!(id, None);

    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_transfer_last_no_change(db: MySqlPool) -> sqlx::Result<()> {
    let id = 4;
    let state = note_states::TODO;
    let done = note::transfer_last(&db, id, state).await?;

    assert_eq!(0, done.len(), "No notes should be updated");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_transfer_last_from_first(db: MySqlPool) -> sqlx::Result<()> {
    let id = 5;
    let state = note_states::TODO;
    let done = note::transfer_last(&db, id, state).await?;

    assert_eq!(2, done.len(), "Both notes in the state should be updated");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_transfer_last_from_middle(db: MySqlPool) -> sqlx::Result<()> {
    let id = 2;
    let state = note_states::TODO;
    let done = note::transfer_last(&db, id, state).await?;

    assert_eq!(2, done.len(), "Both notes in the state should be updated");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_transfer_last_empty_target(db: MySqlPool) -> sqlx::Result<()> {
    let id = 1;
    let state = "info";
    let done = note::transfer_last(&db, id, state).await?;

    assert_eq!(2, done.len(), "Only transfered note should be updated");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_transfer_before_same_chain(db: MySqlPool) -> sqlx::Result<()> {
    let id = 3; // Third todo
    let over_id = 2; // Second todo
    let done = note::transfer_before(&db, id, over_id).await?;

    assert_eq!(
        3,
        done.len(),
        "Should update moved item, target, and item after moved"
    );
    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_transfer_before_different_chains(db: MySqlPool) -> sqlx::Result<()> {
    let id = 5; // First done
    let over_id = 2; // Second todo
    let done = note::transfer_before(&db, id, over_id).await?;

    assert_eq!(
        3,
        done.len(),
        "Should update moved item, target, and first item in done chain"
    );
    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_transfer_before_first(db: MySqlPool) -> sqlx::Result<()> {
    let id = 7; // Last done
    let over_id = 1; // First todo
    let done = note::transfer_before(&db, id, over_id).await?;

    assert_eq!(2, done.len(), "Should update moved item and target");
    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_transfer_before_previous(db: MySqlPool) -> sqlx::Result<()> {
    let id = 2; // Random note
    let over_id = 3; // Note directly after
    let done = note::transfer_before(&db, id, over_id).await?;

    // This should not create any updates, as it means moving from position 2 to position 2
    assert_eq!(0, done.len(), "Should not create any updates");
    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_transfer_before_itself(db: MySqlPool) -> sqlx::Result<()> {
    let id = 2; // Random note
    let over_id = 2; // The note itself
    let done = note::transfer_before(&db, id, over_id).await?;

    // This should not create any updates, as it means moving from position 2 to position 2
    assert_eq!(0, done.len(), "Should not create any updates");
    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_transfer_before_same_id(db: MySqlPool) -> sqlx::Result<()> {
    let id = 2;
    let done = note::transfer_before(&db, id, id).await?;

    assert_eq!(0, done.len(), "No changes should occur");
    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn get_all_notes(db: MySqlPool) -> sqlx::Result<()> {
    let notes = note::read_all(&db).await?;

    assert_eq!(notes.len(), 3);

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn remove_note(db: MySqlPool) -> sqlx::Result<()> {
    let notes = note::read_all(&db).await?;

    assert_eq!(3, notes.len(), "There should be 3 notes");

    let done = note::remove(&db, 3).await;

    assert!(done.is_ok(), "Note should be removed");

    let notes = note::read_all(&db).await?;

    assert_eq!(2, notes.len(), "There should be 2 notes left");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn remove_note_neg(db: MySqlPool) -> sqlx::Result<()> {
    let done = note::remove(&db, 69).await;

    assert!(done.is_ok(), "Note should not be removed");
    assert_eq!(0, done.unwrap().len(), "Note should not be removed");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn add_note(db: MySqlPool) -> sqlx::Result<()> {
    let notes = note::read_all(&db).await?;

    assert_eq!(3, notes.len(), "There should be 3 notes");

    let note = NoteInsert {
        owner: 1,
        state: note_states::TODO.into(),
        text: None,
    };

    let done = note::add(&db, &note).await?;

    assert_ne!(0, done.id, "Note should have new ID");
    assert!(done.predecessor_id.is_some(), "Predecessor is given");
    assert_eq!(2, done.predecessor_id.unwrap(), "Predecessor is correct");
    assert_eq!("", done.text, "Text is correct");
    assert_eq!("red", done.color, "Color is correct");
    assert_eq!("Alice", done.name, "Name is correct");
    assert_eq!(note.state, done.state, "Todo is correct");

    let notes = note::read_all(&db).await?;

    assert_eq!(4, notes.len(), "There should be 4 notes now");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn add_note_with_text(db: MySqlPool) -> sqlx::Result<()> {
    let notes = note::read_all(&db).await?;

    assert_eq!(3, notes.len(), "There should be 3 notes");

    let note = NoteInsert {
        owner: 1,
        state: note_states::TODO.into(),
        text: Some("Text".to_string()),
    };

    let done = note::add(&db, &note).await?;

    assert_ne!(0, done.id, "Note should have new ID");
    assert!(done.predecessor_id.is_some(), "Predecessor is given");
    assert_eq!(2, done.predecessor_id.unwrap(), "Predecessor is correct");
    assert_eq!("Text", done.text, "Text is correct");
    assert_eq!("red", done.color, "Color is correct");
    assert_eq!("Alice", done.name, "Name is correct");
    assert_eq!(note.state, done.state, "Todo is correct");

    let notes = note::read_all(&db).await?;

    assert_eq!(4, notes.len(), "There should be 4 notes now");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn get_by_id(db: MySqlPool) -> sqlx::Result<()> {
    let notes = note::read_all(&db).await?;

    assert_eq!(3, notes.len(), "There should be 3 notes");

    let note = notes.into_iter().find(|n| n.id == 2).unwrap().clone();

    let done = read_by_id(&db, 2).await?;

    assert_eq!(note.id, done.id, "Note is correct");
    assert!(done.predecessor_id.is_some(), "Predecessor is given");
    assert_eq!(1, done.predecessor_id.unwrap(), "Predecessor is correct");
    assert_eq!(note.color, done.color, "Color is correct");
    assert_eq!(note.name, done.name, "Name is correct");
    assert_eq!(note.state, done.state, "Todo is correct");
    assert_eq!(note.text, done.text, "Text is correct");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
#[should_panic(expected = "RowNotFound")]
async fn get_id_neg(db: MySqlPool) -> () {
    let _ = note::read_by_id(&db, 69).await.unwrap();
}

#[sqlx::test(fixtures("users", "notes"))]
async fn update_text(db: MySqlPool) -> sqlx::Result<()> {
    let note = read_by_id(&db, 2).await?;

    let text = "Hello, world!".to_string();
    note::update_text(&db, 2, &text).await?;

    let note_after = read_by_id(&db, 2).await?;

    assert_ne!(note.text, note_after.text, "Text is changed");
    assert_eq!(note_after.text, text, "Text is correct");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_get_last_id_detailed(db: MySqlPool) -> sqlx::Result<()> {
    // Check initial state
    let done_last = get_last_id(&db, "done").await?;
    assert_eq!(Some(7), done_last, "Last note in done should be 7");

    let todo_last = get_last_id(&db, "todo").await?;
    assert_eq!(Some(4), todo_last, "Last note in todo should be 4");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn delete_by_owner(db: MySqlPool) -> sqlx::Result<()> {
    let (deleted_ids, _move_changes) = note::delete_by(&db, Some(1), None).await?;

    assert_eq!(3, deleted_ids.len(), "All owner 1 notes should be removed");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn delete_by_status(db: MySqlPool) -> sqlx::Result<()> {
    let (deleted_ids, _move_changes) = note::delete_by(&db, None, Some("todo".to_string())).await?;

    assert_eq!(2, deleted_ids.len(), "All todo notes should be removed");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn delete_by_status_and_owner(db: MySqlPool) -> sqlx::Result<()> {
    let (deleted_ids, _move_changes) =
        note::delete_by(&db, Some(1), Some("todo".to_string())).await?;

    assert_eq!(
        2,
        deleted_ids.len(),
        "All owner 1 todo notes should be removed"
    );

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn delete_all(db: MySqlPool) -> sqlx::Result<()> {
    let (deleted_ids, _move_changes) = note::delete_by(&db, None, None).await?;

    assert_eq!(3, deleted_ids.len(), "All notes should be removed");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_chain_integrity_after_add(db: MySqlPool) -> sqlx::Result<()> {
    // Initial chain in 'todo': 1->2->3->4
    let note = NoteInsert {
        owner: 1,
        state: note_states::TODO.into(),
        text: Some("New note".to_string()),
    };

    let added = note::add(&db, &note).await?;

    // Verify chain state after addition
    let todo_notes =
        sqlx::query!("SELECT id, predecessor_id FROM notes WHERE state = 'todo' ORDER BY id")
            .fetch_all(&db)
            .await?;

    assert_eq!(5, todo_notes.len(), "Should have 5 notes in todo");
    assert_eq!(
        Some(4),
        added.predecessor_id as Option<i32>,
        "New note should point to previous last note"
    );
    assert!(
        todo_notes
            .iter()
            .all(|n| n.id != added.id || n.predecessor_id == Some(4)),
        "New note should point to 4"
    );
    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_chain_integrity_after_moves(db: MySqlPool) -> sqlx::Result<()> {
    // Move note 3 before note 2: 1->2->3->4 becomes 1->3->2->4
    note::transfer(&db, 3, MoveTarget::Before { id: 2 }).await?;

    let chain_after_first =
        sqlx::query!("SELECT id, predecessor_id FROM notes WHERE state = 'todo' ORDER BY id")
            .fetch_all(&db)
            .await?;

    // Verify first move
    assert_eq!(
        None, chain_after_first[0].predecessor_id,
        "Note 1 should have no predecessor"
    );
    assert_eq!(
        Some(3),
        chain_after_first[1].predecessor_id,
        "Note 2 should point to 3"
    );
    assert_eq!(
        Some(1),
        chain_after_first[2].predecessor_id,
        "Note 3 should point to 1"
    );
    assert_eq!(
        Some(2),
        chain_after_first[3].predecessor_id,
        "Note 4 should point to 2"
    );

    // Move note 4 to last in done: 1->3->2->4 and 5->6->7 becomes 1->3->2 and 5->6->7->4
    note::transfer(
        &db,
        4,
        MoveTarget::Last {
            state: "done".to_string(),
        },
    )
    .await?;

    let todo_after =
        sqlx::query!("SELECT id, predecessor_id FROM notes WHERE state = 'todo' ORDER BY id")
            .fetch_all(&db)
            .await?;

    let done_after =
        sqlx::query!("SELECT id, predecessor_id FROM notes WHERE state = 'done' ORDER BY id")
            .fetch_all(&db)
            .await?;

    // Verify second move
    assert_eq!(3, todo_after.len(), "Should have 3 notes in todo");
    assert_eq!(4, done_after.len(), "Should have 4 notes in done");

    let moved_note = read_by_id(&db, 4).await?;
    assert_eq!(
        Some(7),
        moved_note.predecessor_id,
        "Note 4 should point to 7 in done state"
    );

    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_chain_integrity_after_delete(db: MySqlPool) -> sqlx::Result<()> {
    // Delete all todo notes
    let (changes, _move_changes) = note::delete_by(&db, None, Some("todo".to_string())).await?;

    // Verify changes
    assert_eq!(
        4,
        changes.len(),
        "Should record changes for each affected note"
    );

    // Verify done chain remains intact
    let done_notes =
        sqlx::query!("SELECT id, predecessor_id FROM notes WHERE state = 'done' ORDER BY id")
            .fetch_all(&db)
            .await?;

    assert_eq!(3, done_notes.len(), "Should still have 3 notes in done");
    assert_eq!(
        None, done_notes[0].predecessor_id,
        "First done note should have no predecessor"
    );
    assert_eq!(
        Some(5),
        done_notes[1].predecessor_id,
        "Second done note should point to first"
    );
    assert_eq!(
        Some(6),
        done_notes[2].predecessor_id,
        "Third done note should point to second"
    );

    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_chain_integrity_mixed_operations(db: MySqlPool) -> sqlx::Result<()> {
    // Add a note
    let new_note = NoteInsert {
        owner: 1,
        state: note_states::TODO.into(),
        text: Some("New note".to_string()),
    };
    let added = note::add(&db, &new_note).await?;

    // Move it before another note
    note::transfer(&db, added.id as u32, MoveTarget::Before { id: 2 }).await?;

    // Delete some notes
    let (deleted_ids, _) = note::delete_by(&db, None, Some("done".to_string())).await?;

    // Assert that we deleted the right number of notes
    assert_eq!(
        3,
        deleted_ids.len(),
        "Should have deleted 3 notes from done state"
    );

    // Verify final chain state
    let final_notes = sqlx::query!("SELECT id, predecessor_id, state FROM notes ORDER BY id")
        .fetch_all(&db)
        .await?;

    assert!(
        final_notes.iter().filter(|n| n.state == "todo").count() == 5,
        "Should have 5 notes in todo state"
    );
    assert!(
        final_notes.iter().filter(|n| n.state == "done").count() == 0,
        "Should have no notes in done state"
    );

    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_remove_chain_integrity(db: MySqlPool) -> sqlx::Result<()> {
    // Initial state: 1->2->3->4 in todo
    // Remove note 2 from middle of chain
    let _ = note::remove(&db, 2).await?;

    // Check that note 3 now points to 1
    let note3 = read_by_id(&db, 3).await?;
    assert_eq!(
        Some(1),
        note3.predecessor_id,
        "After removing note 2, note 3 should point to note 1"
    );

    // Check that note 4 still points to 3
    let note4 = read_by_id(&db, 4).await?;
    assert_eq!(
        Some(3),
        note4.predecessor_id,
        "Note 4 should still point to note 3"
    );

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn test_read_by_owner(db: MySqlPool) -> sqlx::Result<()> {
    let mut transaction = db.begin().await?;

    let note_ids = note::read_by_owner(&mut transaction, 1).await?;

    // All 3 notes in the fixture belong to owner 1
    assert_eq!(3, note_ids.len(), "Should find all 3 notes for owner 1");
    assert!(note_ids.contains(&1), "Should include note with ID 1");
    assert!(note_ids.contains(&2), "Should include note with ID 2");
    assert!(note_ids.contains(&3), "Should include note with ID 3");

    // Test for non-existent owner
    let non_existent_ids = note::read_by_owner(&mut transaction, 999).await?;
    assert_eq!(
        0,
        non_existent_ids.len(),
        "Should find no notes for non-existent owner"
    );

    transaction.commit().await?;
    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn test_read_by_status(db: MySqlPool) -> sqlx::Result<()> {
    let mut transaction = db.begin().await?;

    let todo_ids = note::read_by_status(&mut transaction, Some("todo".to_string())).await?;

    // Two notes in the fixture have "todo" status
    assert_eq!(2, todo_ids.len(), "Should find 2 notes with 'todo' status");
    assert!(todo_ids.contains(&1), "Should include note with ID 1");
    assert!(todo_ids.contains(&2), "Should include note with ID 2");

    // One note has "in_progress" status
    let in_progress_ids =
        note::read_by_status(&mut transaction, Some("in_progress".to_string())).await?;
    assert_eq!(
        1,
        in_progress_ids.len(),
        "Should find 1 note with 'in_progress' status"
    );
    assert!(
        in_progress_ids.contains(&3),
        "Should include note with ID 3"
    );

    // Test for non-existent status
    let non_existent_ids =
        note::read_by_status(&mut transaction, Some("non_existent".to_string())).await?;
    assert_eq!(
        0,
        non_existent_ids.len(),
        "Should find no notes for non-existent status"
    );

    transaction.commit().await?;
    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn test_read_by_status_and_owner(db: MySqlPool) -> sqlx::Result<()> {
    let mut transaction = db.begin().await?;

    let todo_owner1_ids =
        note::read_by_status_and_owner(&mut transaction, 1, "todo".to_string()).await?;

    // Two notes in the fixture have "todo" status and owner 1
    assert_eq!(
        2,
        todo_owner1_ids.len(),
        "Should find 2 notes with 'todo' status and owner 1"
    );
    assert!(
        todo_owner1_ids.contains(&1),
        "Should include note with ID 1"
    );
    assert!(
        todo_owner1_ids.contains(&2),
        "Should include note with ID 2"
    );

    // One note has "in_progress" status and owner 1
    let in_progress_owner1_ids =
        note::read_by_status_and_owner(&mut transaction, 1, "in_progress".to_string()).await?;
    assert_eq!(
        1,
        in_progress_owner1_ids.len(),
        "Should find 1 note with 'in_progress' status and owner 1"
    );
    assert!(
        in_progress_owner1_ids.contains(&3),
        "Should include note with ID 3"
    );

    // Test for non-existent combination
    let non_existent_ids =
        note::read_by_status_and_owner(&mut transaction, 999, "todo".to_string()).await?;
    assert_eq!(
        0,
        non_existent_ids.len(),
        "Should find no notes for non-existent combination"
    );

    transaction.commit().await?;
    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn test_read_all_notes_ids(db: MySqlPool) -> sqlx::Result<()> {
    let mut transaction = db.begin().await?;

    let all_ids = note::read_all_notes_ids(&mut transaction).await?;

    // There are 3 notes in the fixture
    assert_eq!(3, all_ids.len(), "Should find all 3 notes");
    assert!(all_ids.contains(&1), "Should include note with ID 1");
    assert!(all_ids.contains(&2), "Should include note with ID 2");
    assert!(all_ids.contains(&3), "Should include note with ID 3");

    transaction.commit().await?;
    Ok(())
}

#[sqlx::test(fixtures("users", "notes_transfer"))]
async fn test_read_by_functions_with_more_data(db: MySqlPool) -> sqlx::Result<()> {
    let mut transaction = db.begin().await?;

    // In notes_transfer.sql, we have 7 notes
    let all_ids = note::read_all_notes_ids(&mut transaction).await?;
    assert_eq!(
        7,
        all_ids.len(),
        "Should find all 7 notes in notes_transfer fixture"
    );

    // 4 notes have "todo" status
    let todo_ids = note::read_by_status(&mut transaction, Some("todo".to_string())).await?;
    assert_eq!(4, todo_ids.len(), "Should find 4 notes with 'todo' status");

    // 3 notes have "done" status
    let done_ids = note::read_by_status(&mut transaction, Some("done".to_string())).await?;
    assert_eq!(3, done_ids.len(), "Should find 3 notes with 'done' status");

    // All 7 notes belong to owner 1
    let owner1_ids = note::read_by_owner(&mut transaction, 1).await?;
    assert_eq!(7, owner1_ids.len(), "Should find all 7 notes for owner 1");

    transaction.commit().await?;
    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn test_delete_bulk(db: MySqlPool) -> sqlx::Result<()> {
    let mut transaction = db.begin().await?;

    // Get initial count of notes
    let initial_ids = note::read_all_notes_ids(&mut transaction).await?;
    assert_eq!(3, initial_ids.len(), "Should start with 3 notes");

    // Delete notes with IDs 1 and 3
    let ids_to_delete = vec![1, 3];
    note::delete_bulk(&mut transaction, &ids_to_delete).await?;

    // Verify notes were deleted
    let remaining_ids = note::read_all_notes_ids(&mut transaction).await?;
    assert_eq!(1, remaining_ids.len(), "Should have 1 note remaining");
    assert!(remaining_ids.contains(&2), "Note with ID 2 should remain");
    assert!(
        !remaining_ids.contains(&1),
        "Note with ID 1 should be deleted"
    );
    assert!(
        !remaining_ids.contains(&3),
        "Note with ID 3 should be deleted"
    );

    // Test with empty array
    note::delete_bulk(&mut transaction, &[]).await?;
    let still_remaining_ids = note::read_all_notes_ids(&mut transaction).await?;
    assert_eq!(
        1,
        still_remaining_ids.len(),
        "No notes should be deleted with empty array"
    );

    transaction.rollback().await?; // Rollback to not affect other tests
    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn test_set_tag(db: MySqlPool) -> sqlx::Result<()> {
    // Set tag for note 1
    note::set_tag(&db, 1, crate::model::note::NoteTag::Important).await?;

    // Verify tag was set correctly
    let note = read_by_id(&db, 1).await?;
    assert_eq!(
        Some("IMPORTANT".to_string()),
        note.tag.map(|t| t.to_string())
    );

    // Set another tag for note 2
    note::set_tag(&db, 2, crate::model::note::NoteTag::Deadline).await?;

    // Verify second tag
    let note2 = read_by_id(&db, 2).await?;
    assert_eq!(
        Some("DEADLINE".to_string()),
        note2.tag.map(|t| t.to_string())
    );

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn test_clear_tag(db: MySqlPool) -> sqlx::Result<()> {
    // Clear tag for note 2
    note::clear_tag(&db, 2).await?;

    // Verify tag was cleared
    let note = read_by_id(&db, 2).await?;
    assert!(note.tag.is_none(), "Tag should be cleared");

    // Clear tag for note 3
    note::clear_tag(&db, 3).await?;

    // Verify second tag is also cleared
    let note2 = read_by_id(&db, 3).await?;
    assert!(note2.tag.is_none(), "Tag should be cleared");

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn test_split_note(db: MySqlPool) -> sqlx::Result<()> {
    // Split note 1 with same state and owner
    let (_updated_original, new_note) = note::split_note(
        &db,
        1,
        "Updated original text",
        "New split note text",
        None, // Keep same state
        None, // Keep same owner
    )
    .await?;

    // Verify original note was updated
    let original = read_by_id(&db, 1).await?;
    assert_eq!(original.text, "Updated original text");
    assert_eq!(original.state, "todo"); // Should remain same
    assert_eq!(original.owner_id, 1); // Should remain same

    // Verify new note was created with correct content
    assert_eq!(new_note.text, "New split note text");
    assert_eq!(new_note.state, "todo"); // Should inherit from original
    assert_eq!(new_note.owner_id, 1); // Should inherit from original
    assert!(new_note.id != 1); // Should have different ID

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn test_split_note_different_state_and_owner(db: MySqlPool) -> sqlx::Result<()> {
    // Split note 1 with different state and owner
    let (_updated_original, new_note) = note::split_note(
        &db,
        1,
        "Original updated",
        "New note in progress",
        Some("in_progress"), // Different state
        Some(2),             // Different owner
    )
    .await?;

    // Verify original note was updated
    let original = read_by_id(&db, 1).await?;
    assert_eq!(original.text, "Original updated");
    assert_eq!(original.state, "todo"); // Original state unchanged
    assert_eq!(original.owner_id, 1); // Original owner unchanged

    // Verify new note has the specified state and owner
    assert_eq!(new_note.text, "New note in progress");
    assert_eq!(new_note.state, "in_progress"); // New state applied
    assert_eq!(new_note.owner_id, 2); // New owner applied

    Ok(())
}
