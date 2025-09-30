use crate::{sql::note::MoveTarget, state::WsAction};

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
