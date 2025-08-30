use crate::{
    model::note::NoteTag,
    sql::note::MoveTarget,
    state::{NoteUpdate, UserUpdate, WsAction},
};

#[test]
fn action_add_note() {
    let json = r#"{"type":"AddNote","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","owner":1,"state":"todo", "text":"Text"}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::AddNote {
            owner: 1,
            state: "todo".into(),
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into()),
            text: Some("Text".into())
        }
    );

    let json = r#"{"type":"AddNote","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","owner":1,"state":"todo"}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::AddNote {
            owner: 1,
            state: "todo".into(),
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into()),
            text: None
        }
    );
}

#[test]
fn action_update_note_text() {
    let json = r#"{"type":"UpdateNoteText","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","id":1,"text":"Hello, world!"}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::UpdateNoteText {
            id: 1,
            text: "Hello, world!".into(),
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into())
        }
    );
}

#[test]
fn action_remove_note() {
    let json = r#"{"type":"RemoveNote","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","id":1}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::RemoveNote {
            id: 1,
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into())
        }
    );
}

#[test]
fn action_reorder_note() {
    let json = r#"{"type":"Reorder","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","moved_item_id":1,"over_id":{"type":"Before","id":2}}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::Reorder {
            moved_item_id: 1,
            over_id: MoveTarget::Before { id: 2 },
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into())
        }
    );
}

#[test]
fn action_reorder_note_last() {
    let json = r#"{"type":"Reorder","moved_item_id":146,"over_id":{"type":"Last","state":"DONE"}}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::Reorder {
            moved_item_id: 146,
            over_id: MoveTarget::Last {
                state: "DONE".into()
            },
            uuid: None
        }
    );
}

#[test]
fn action_reorder_note_no_index() {
    let json = r#"{"type":"Reorder","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","moved_item_id": 1, "over_id":{"type":"Last", "state": "done"}}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::Reorder {
            moved_item_id: 1,
            over_id: MoveTarget::Last {
                state: "done".to_string()
            },
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into())
        }
    );
}

#[test]
fn action_add_user() {
    let json = r#"{"type":"AddUser","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","name":"Alice","color":"red"}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::AddUser {
            name: "Alice".into(),
            color: "red".into(),
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into())
        }
    );
}

#[test]
fn action_update_user_name() {
    let json = r#"{"type":"UpdateUserName","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","id":1,"name":"Alice"}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::UpdateUserName {
            id: 1,
            name: "Alice".into(),
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into())
        }
    );
}

#[test]
fn action_update_note_tag() {
    let json = r#"{"type":"UpdateNoteTag","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","id":1,"tag":"Important"}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::UpdateNoteTag {
            id: 1,
            tag: Some(NoteTag::Important),
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into())
        }
    );
}

#[test]
fn action_update_note_tag_none() {
    let json = r#"{"type":"UpdateNoteTag","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","id":1,"tag":null}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::UpdateNoteTag {
            id: 1,
            tag: None,
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into())
        }
    );
}

#[test]
fn action_update_user_color() {
    let json = r#"{"type":"UpdateUserColor","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","id":1,"color":"red"}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::UpdateUserColor {
            id: 1,
            color: "red".into(),
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into())
        }
    );
}

#[test]
fn action_remove_user() {
    let json = r#"{"type":"RemoveUser","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","id":1}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::RemoveUser {
            id: 1,
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into())
        }
    );
}

#[test]
fn action_delete_all_notes() {
    let json = r#"{"type":"DeleteNotes","uuid": "0191a379-246e-702a-af56-b9d6e10b246e"}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::DeleteNotes {
            owner: None,
            status: None,
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into())
        }
    );
}

#[test]
fn action_delete_notes_by_status() {
    let json = r#"{"type":"DeleteNotes","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","owner":1,"status":"done"}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::DeleteNotes {
            owner: Some(1),
            status: Some("done".into()),
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into())
        }
    );
}

#[test]
fn action_delete_notes_by_status_no_owner() {
    let json =
        r#"{"type":"DeleteNotes","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","status":"done"}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::DeleteNotes {
            owner: None,
            status: Some("done".into()),
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into())
        }
    );
}

#[test]
fn action_delete_notes_by_status_no_status() {
    let json = r#"{"type":"DeleteNotes","uuid": "0191a379-246e-702a-af56-b9d6e10b246e","owner":1}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::DeleteNotes {
            owner: Some(1),
            status: None,
            uuid: Some("0191a379-246e-702a-af56-b9d6e10b246e".into())
        }
    );
}

#[test]
fn action_note_update() {
    let json = r#"{"type": "NoteUpdate","uuid": "095be615-a8ad-4c33-8e9c-c7612fbf6c9f","id": 1,"updates": [{"target": "Text","text": "Hello, world!"},{"target": "Order","over_id":{"type":"Before","id":0}},{"target": "Order","over_id":{"type":"Last","state":"Hello, world!"}}]}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(
        action,
        WsAction::NoteUpdate {
            id: 1,
            uuid: Some("095be615-a8ad-4c33-8e9c-c7612fbf6c9f".into()),
            updates: vec![
                NoteUpdate::Text {
                    text: "Hello, world!".into()
                },
                NoteUpdate::Order {
                    over_id: MoveTarget::Before { id: 0 }
                },
                NoteUpdate::Order {
                    over_id: MoveTarget::Last {
                        state: "Hello, world!".into()
                    }
                }
            ]
        }
    );
}

#[test]
fn action_user_update() {
    let json = r#"{"type": "UserUpdate","uuid": "095be615-a8ad-4c33-8e9c-c7612fbf6c9f","id": 1,"updates": [{"target": "Name","name": "Johny Walker"},{"target": "Color","color": "Cyan"}]}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();

    assert_eq!(
        action,
        WsAction::UserUpdate {
            id: 1,
            uuid: Some("095be615-a8ad-4c33-8e9c-c7612fbf6c9f".into()),
            updates: vec![
                UserUpdate::Name {
                    name: "Johny Walker".into()
                },
                UserUpdate::Color {
                    color: "Cyan".into()
                }
            ]
        }
    );
}

#[test]
fn action_notify_snapshot() {
    let json = r#"{"type":"NotifySnapshot"}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(action, WsAction::NotifySnapshot {});
}

#[test]
fn action_empty_uuid_smokes() {
    let json = r#"{"type": "UserUpdate","id": 1,"updates": [{"target": "Name","name": "Johny Walker"},{"target": "Color","color": "Cyan"}]}"#;
    serde_json::from_str::<WsAction>(json).unwrap();

    let json = r#"{"type": "NoteUpdate","id": 1,"updates": [{"target": "Text","text": "Hello, world!"},{"target": "Order","over_id":{"type":"Before","id":0}},{"target": "Order","over_id":{"type":"Last","state":"Hello, world!"}}]}"#;
    serde_json::from_str::<WsAction>(json).unwrap();

    let json = r#"{"type":"DeleteNotes"}"#;
    serde_json::from_str::<WsAction>(json).unwrap();

    let json = r#"{"type":"RemoveNote","id":1}"#;
    serde_json::from_str::<WsAction>(json).unwrap();

    let json = r#"{"type":"Reorder","moved_item_id":1,"over_id":{"type":"Before","id":2}}"#;
    serde_json::from_str::<WsAction>(json).unwrap();
}
