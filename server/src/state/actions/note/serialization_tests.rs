use super::models::NoteUpdate;
use crate::{model::note::NoteTag, sql::note::MoveTarget, state::WsAction};

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
