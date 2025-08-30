use crate::state::{AppState, WsAction, WsOperation};
use crate::ws::OperationResult;
use sqlx::MySqlPool;

// Helper function to extract operations from OperationResult for testing
fn extract_operations(result: OperationResult) -> Vec<WsOperation> {
    match result {
        OperationResult::Broadcast(ops) => ops,
        OperationResult::ClientOnly(ops) => ops,
        OperationResult::Mixed(broadcast_ops, client_ops) => {
            let mut all_ops = broadcast_ops;
            all_ops.extend(client_ops);
            all_ops
        }
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

#[sqlx::test(fixtures("users"))]
async fn add_user(db: MySqlPool) -> sqlx::Result<()> {
    let mut app_state = AppState::new();
    let uuid = String::from("0191a379-246e-702a-af56-b9d6e10b246e");
    let name = String::from("Test user");
    let color = String::from("red");

    let result = app_state
        .apply(
            &db,
            WsAction::AddUser {
                uuid: Some(uuid.clone()),
                name: name.clone(),
                color: color.clone(),
            },
        )
        .await
        .unwrap();

    let operations = extract_operations(result);

    // Should have UserAdded + ActionFinished operations
    assert_eq!(operations.len(), 2);

    // Verify we got the expected operations
    match operations.as_slice() {
        [WsOperation::UserAdded { user }, WsOperation::ActionFinished {
            uuid: finished_uuid,
        }] => {
            assert_eq!(user.id, 2); // Should be user ID 2 since fixture has user 1
            assert_eq!(user.name, name);
            assert_eq!(user.color, color);
            assert_eq!(finished_uuid, &uuid);
        }
        _ => panic!("Unexpected operations: {:?}", operations),
    }

    Ok(())
}

#[sqlx::test(fixtures("users"))]
async fn add_user_without_transaction(db: MySqlPool) -> sqlx::Result<()> {
    let mut app_state = AppState::new();
    let name = String::from("Test user");
    let color = String::from("red");

    let result = app_state
        .apply(
            &db,
            WsAction::AddUser {
                uuid: None, // No UUID provided
                name: name.clone(),
                color: color.clone(),
            },
        )
        .await
        .unwrap();

    let operations = extract_operations(result);

    // Should have only UserAdded operation (no ActionFinished since no UUID)
    assert_eq!(operations.len(), 1);

    match operations.as_slice() {
        [WsOperation::UserAdded { user }] => {
            assert_eq!(user.id, 2);
            assert_eq!(user.name, name);
            assert_eq!(user.color, color);
        }
        _ => panic!("Unexpected operations: {:?}", operations),
    }

    Ok(())
}
