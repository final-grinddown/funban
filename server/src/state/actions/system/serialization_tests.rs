use crate::state::WsAction;

#[test]
fn action_notify_snapshot() {
    let json = r#"{"type":"NotifySnapshot"}"#;
    let action = serde_json::from_str::<WsAction>(json).unwrap();
    assert_eq!(action, WsAction::NotifySnapshot {});
}

#[test]
fn action_empty_uuid_smokes() {
    let json = r#"{"type":"NotifySnapshot"}"#;
    serde_json::from_str::<WsAction>(json).unwrap();
}
