use crate::state::WsAction;
use super::models::UserUpdate;

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