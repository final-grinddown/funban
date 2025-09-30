use crate::state::{AppState, WsAction, WsOperation};
use crate::ws::OperationResult;
use sqlx::MySqlPool;

// Helper function to extract operations from OperationResult for testing
fn extract_operations(result: OperationResult) -> Vec<WsOperation> {
    match result {
        OperationResult::Broadcast(ops) => ops,
        OperationResult::ClientOnly(ops) => ops,
    }
}

#[sqlx::test(fixtures("users", "notes"))]
async fn add_note(db: MySqlPool) -> sqlx::Result<()> {
    let mut app_state = AppState::new();
    let uuid = String::from("0191a379-246e-702a-af56-b9d6e10b246e");
    let owner = 1;
    let state = String::from("todo");
    let text = Some(String::from("Text"));

    let result = app_state
        .apply(
            &db,
            WsAction::AddNote {
                uuid: Some(uuid.clone()),
                owner,
                state,
                text,
            },
        )
        .await
        .unwrap();

    let operations = extract_operations(result);

    // Should have NoteAdded + ActionFinished operations
    assert_eq!(operations.len(), 2);

    // Verify we got the expected operations
    match operations.as_slice() {
        [WsOperation::NoteAdded { note }, WsOperation::ActionFinished {
            uuid: finished_uuid,
        }] => {
            assert_eq!(note.owner_id, owner as i64);
            assert_eq!(finished_uuid, &uuid);
        }
        _ => panic!("Unexpected operations: {:?}", operations),
    }

    Ok(())
}

#[sqlx::test(fixtures("users", "notes"))]
async fn test_tag_conversion_integration(db: MySqlPool) -> sqlx::Result<()> {
    use crate::model::note::NoteTag;

    // Test the complete integration flow that WebSocket clients actually experience
    // The fixture has note id=3 with tag='IMPORTANT' (uppercase) in the database

    let app_state = AppState::new();

    // Get notes using the same path as WebSocket initial connection
    let notes = app_state.get_notes(&db).await.unwrap();

    // Find the note with the uppercase tag from the fixture
    let tagged_note = notes.iter().find(|n| n.id == 3).unwrap();

    // The backend should properly handle 'IMPORTANT' from database and convert it to NoteTag::Important
    // This test will FAIL until we fix the backend to handle both uppercase and title case
    assert_eq!(
        tagged_note.tag,
        Some(NoteTag::Important),
        "Backend should convert 'IMPORTANT' from database to NoteTag::Important, not Error"
    );

    Ok(())
}
