use std::fs;

fn main() {
    generate_ws_contracts();

    // Tell Cargo to rerun this build script if the source files change
    println!("cargo:rerun-if-changed=src/state/mod.rs");
    println!("cargo:rerun-if-changed=src/model/note.rs");
    println!("cargo:rerun-if-changed=src/sql/note.rs");
}

fn generate_ws_contracts() {
    // Import the types we need (this is a bit tricky in build.rs)
    // For now, we'll generate example JSON manually based on the types
    // Later we can make this more sophisticated

    let contracts_dir = "../contracts/generated";
    let absolute_path = std::path::Path::new(&contracts_dir).canonicalize()
        .unwrap_or_else(|_| std::path::PathBuf::from(&contracts_dir));
    println!("cargo:warning=Generating contracts to: {} (abs: {:?})", contracts_dir, absolute_path);

    // Create the directory if it doesn't exist
    if let Err(e) = fs::create_dir_all(contracts_dir) {
        eprintln!("Warning: Could not create contracts directory: {}", e);
        return;
    }

    // Generate WsAction examples
    let ws_actions = generate_ws_action_examples();
    let ws_actions_json = serde_json::to_string_pretty(&ws_actions)
        .expect("Failed to serialize WsAction examples");

    fs::write(
        format!("{}/ws_actions.json", contracts_dir),
        ws_actions_json
    ).expect("Failed to write ws_actions.json");

    // Generate WsOperation examples
    let ws_operations = generate_ws_operation_examples();
    let ws_operations_json = serde_json::to_string_pretty(&ws_operations)
        .expect("Failed to serialize WsOperation examples");

    fs::write(
        format!("{}/ws_operations.json", contracts_dir),
        ws_operations_json
    ).expect("Failed to write ws_operations.json");

    println!("Generated WebSocket contracts in {}", contracts_dir);
}

fn generate_ws_action_examples() -> serde_json::Value {
    serde_json::json!({
        // Base contracts for test compatibility
        "AddNote": {
            "type": "AddNote",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "owner": 1,
            "state": "todo",
            "text": "Example note text"
        },
        "UpdateNoteTag": {
            "type": "UpdateNoteTag",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "id": 1,
            "tag": "Important"
        },
        "UpdateNoteTag_none": {
            "type": "UpdateNoteTag",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "id": 1,
            "tag": null
        },
        "DeleteNotes": {
            "type": "DeleteNotes",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "owner": 1,
            "status": "done"
        },
        "DeleteNotes_all": {
            "type": "DeleteNotes",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "owner": null,
            "status": null
        },
        // AddNote variants - covers all Option combinations
        "AddNote_full": {
            "type": "AddNote",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "owner": 1,
            "state": "todo",
            "text": "Example note text"
        },
        "AddNote_no_text": {
            "type": "AddNote",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "owner": 1,
            "state": "todo",
            "text": null
        },
        "AddNote_no_uuid": {
            "type": "AddNote",
            "uuid": null,
            "owner": 1,
            "state": "todo",
            "text": "Example note text"
        },
        "AddNote_minimal": {
            "type": "AddNote",
            "uuid": null,
            "owner": 1,
            "state": "todo",
            "text": null
        },
        "UpdateNoteText": {
            "type": "UpdateNoteText",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "id": 1,
            "text": "Updated note text"
        },
        // UpdateNoteTag variants - covers uuid and tag Options
        "UpdateNoteTag_full": {
            "type": "UpdateNoteTag",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "id": 1,
            "tag": "Important"
        },
        "UpdateNoteTag_no_uuid": {
            "type": "UpdateNoteTag",
            "uuid": null,
            "id": 1,
            "tag": "Important"
        },
        "UpdateNoteTag_no_tag": {
            "type": "UpdateNoteTag",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "id": 1,
            "tag": null
        },
        "UpdateNoteTag_minimal": {
            "type": "UpdateNoteTag",
            "uuid": null,
            "id": 1,
            "tag": null
        },
        "Reorder": {
            "type": "Reorder",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "moved_item_id": 1,
            "over_id": {
                "type": "Before",
                "id": 2
            }
        },
        "Reorder_last": {
            "type": "Reorder",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "moved_item_id": 1,
            "over_id": {
                "type": "Last",
                "state": "done"
            }
        },
        "RemoveNote": {
            "type": "RemoveNote",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "id": 1
        },
        "AddUser": {
            "type": "AddUser",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "name": "John Doe",
            "color": "#FF5733"
        },
        "UpdateUserName": {
            "type": "UpdateUserName",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "id": 1,
            "name": "Jane Doe"
        },
        "UpdateUserColor": {
            "type": "UpdateUserColor",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "id": 1,
            "color": "#33FF57"
        },
        "RemoveUser": {
            "type": "RemoveUser",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "id": 1
        },
        // DeleteNotes variants - covers uuid, owner, and status Options (8 combinations)
        "DeleteNotes_full": {
            "type": "DeleteNotes",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "owner": 1,
            "status": "done"
        },
        "DeleteNotes_no_uuid": {
            "type": "DeleteNotes",
            "uuid": null,
            "owner": 1,
            "status": "done"
        },
        "DeleteNotes_no_owner": {
            "type": "DeleteNotes",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "owner": null,
            "status": "done"
        },
        "DeleteNotes_no_status": {
            "type": "DeleteNotes",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "owner": 1,
            "status": null
        },
        "DeleteNotes_uuid_only": {
            "type": "DeleteNotes",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "owner": null,
            "status": null
        },
        "DeleteNotes_owner_only": {
            "type": "DeleteNotes",
            "uuid": null,
            "owner": 1,
            "status": null
        },
        "DeleteNotes_status_only": {
            "type": "DeleteNotes",
            "uuid": null,
            "owner": null,
            "status": "done"
        },
        "DeleteNotes_minimal": {
            "type": "DeleteNotes",
            "uuid": null,
            "owner": null,
            "status": null
        },
        "NoteUpdate": {
            "type": "NoteUpdate",
            "uuid": "095be615-a8ad-4c33-8e9c-c7612fbf6c9f",
            "id": 1,
            "updates": [
                {
                    "target": "Text",
                    "text": "Updated text"
                },
                {
                    "target": "Order",
                    "over_id": {
                        "type": "Before",
                        "id": 2
                    }
                }
            ]
        },
        "UserUpdate": {
            "type": "UserUpdate",
            "uuid": "095be615-a8ad-4c33-8e9c-c7612fbf6c9f",
            "id": 1,
            "updates": [
                {
                    "target": "Name",
                    "name": "Updated Name"
                },
                {
                    "target": "Color",
                    "color": "#FF33AA"
                }
            ]
        },
        "NotifySnapshot": {
            "type": "NotifySnapshot"
        },
        "SplitNote": {
            "type": "SplitNote",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "original_id": 1,
            "original_text": "First part of note",
            "new_text": "Second part of note",
            "new_state": "todo",
            "new_owner": 2
        }
    })
}

fn generate_ws_operation_examples() -> serde_json::Value {
    serde_json::json!({
        "NoteAdded": {
            "type": "NoteAdded",
            "note": {
                "id": 1,
                "owner": 1,
                "state": "todo",
                "text": "New note",
                "tag": null,
                "predecessor_id": null,
                "created_at": "2024-01-01T12:00:00Z",
                "updated_at": "2024-01-01T12:00:00Z"
            }
        },
        "NoteTextUpdated": {
            "type": "NoteTextUpdated",
            "id": 1,
            "text": "Updated text"
        },
        "NoteOrderChanged": {
            "type": "NoteOrderChanged",
            "id": 1,
            "state": "in_progress",
            "predecessor_id": 2
        },
        "NoteOrderChanged_first": {
            "type": "NoteOrderChanged",
            "id": 1,
            "state": "todo",
            "predecessor_id": null
        },
        "NoteTagChanged": {
            "type": "NoteTagChanged",
            "id": 1,
            "tag": "Important"
        },
        "NoteTagChanged_none": {
            "type": "NoteTagChanged",
            "id": 1,
            "tag": null
        },
        "NoteRemoved": {
            "type": "NoteRemoved",
            "id": 1
        },
        "UserAdded": {
            "type": "UserAdded",
            "user": {
                "id": 1,
                "name": "John Doe",
                "color": "#FF5733",
                "index": 0
            }
        },
        "UserNameUpdated": {
            "type": "UserNameUpdated",
            "id": 1,
            "name": "Jane Doe"
        },
        "UserColorUpdated": {
            "type": "UserColorUpdated",
            "id": 1,
            "color": "#33FF57"
        },
        "UserRemoved": {
            "type": "UserRemoved",
            "id": 1
        },
        "ActionFinished": {
            "type": "ActionFinished",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e"
        },
        "SnapshotCreated": {
            "type": "SnapshotCreated"
        },
        "Error": {
            "type": "Error",
            "uuid": "0191a379-246e-702a-af56-b9d6e10b246e",
            "message": "Example error message"
        },
        "Error_global": {
            "type": "Error",
            "uuid": null,
            "message": "Global error message"
        }
    })
}