use anyhow::{Ok, Result};
use serde::{Deserialize, Serialize};
use sqlx::MySqlPool;
use tracing::error;

use crate::model::note::{Note, NoteInsert, NoteTag};
use crate::model::user::User;
use crate::sql::note;
use crate::sql::note::MoveTarget;
use crate::sql::user;
use crate::ws::OperationResult;

#[cfg(test)]
mod action_tests;

#[cfg(test)]
mod serialization_tests;

#[derive(Serialize, Deserialize, Default, Debug, Clone)]
pub struct AppState {
    pub notes: Vec<Note>,
    pub users: Vec<User>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            notes: Vec::new(),
            users: Vec::new(),
        }
    }

    pub async fn get_users(&self, db: &MySqlPool) -> Result<Vec<User>> {
        let mut users = user::read_all(db).await?;
        users.sort_by(|a, b| a.index.cmp(&b.index));
        Ok(users.into_iter().map(|u| u.into()).collect())
    }

    pub async fn get_notes(&self, db: &MySqlPool) -> Result<Vec<Note>> {
        let notes = note::read_all(db).await?;

        Ok(notes.into_iter().map(|n| n.into()).collect())
    }

    pub fn add_action_finished(
        uuid: Option<String>,
        mut operations: Vec<WsOperation>,
    ) -> Vec<WsOperation> {
        if let Some(uuid) = uuid {
            operations.push(WsOperation::ActionFinished { uuid });
        }
        operations
    }

    pub fn broadcast_notes(
        uuid: Option<String>,
        operations: Vec<WsOperation>,
    ) -> Result<OperationResult> {
        Ok(OperationResult::Broadcast(Self::add_action_finished(
            uuid, operations,
        )))
    }

    pub fn broadcast_note(uuid: Option<String>, operation: WsOperation) -> Result<OperationResult> {
        Ok(OperationResult::Broadcast(Self::add_action_finished(
            uuid,
            vec![operation],
        )))
    }

    pub fn respond_empty(uuid: Option<String>) -> Result<OperationResult> {
        Ok(OperationResult::ClientOnly(Self::add_action_finished(
            uuid,
            vec![],
        )))
    }

    pub fn respond_error(uuid: Option<String>, message: String) -> Result<OperationResult> {
        Ok(OperationResult::ClientOnly(vec![WsOperation::Error {
            uuid,
            message,
        }]))
    }

    pub async fn apply(&mut self, db: &MySqlPool, action: WsAction) -> Result<OperationResult> {
        match action {
            WsAction::AddNote {
                uuid,
                owner,
                state,
                text,
            } => {
                // Find the next available index
                //let index = self.notes.keys().max().copied().unwrap_or_default() + 1;

                let note = NoteInsert {
                    owner: owner as i32,
                    text,
                    state,
                };

                let created = note::add(db, &note).await;

                if let Err(e) = &created {
                    error!("{:?}", e);
                }

                match created {
                    Result::Ok(success) => Self::broadcast_note(
                        uuid,
                        WsOperation::NoteAdded {
                            note: success.into(),
                        },
                    ),
                    Err(e) => Self::respond_error(uuid, e.to_string()),
                }
            }
            WsAction::UpdateNoteText { uuid, id, text } => {
                note::update_text(db, id, &text).await?;

                Self::broadcast_note(uuid, WsOperation::NoteTextUpdated { id, text })
            }
            WsAction::UpdateNoteTag { uuid, id, tag } => {
                match &tag {
                    Some(t) => {
                        if t == &NoteTag::Error {
                            return Err(anyhow::anyhow!("Cannot set tag to Error"));
                        }
                        note::set_tag(db, id, t.clone()).await?;
                    }
                    None => {
                        note::clear_tag(db, id).await?;
                    }
                }

                Self::broadcast_note(uuid.clone(), WsOperation::NoteTagChanged { id, tag })
            }
            WsAction::Reorder {
                uuid,
                moved_item_id,
                over_id,
            } => {
                let changes = note::transfer(db, moved_item_id, over_id).await?;

                let changes = changes
                    .into_iter()
                    .map(|change| WsOperation::NoteOrderChanged {
                        id: change.id as u32,
                        state: change.state,
                        predecessor_id: change.predecessor_id.map(|id| id as u32),
                    })
                    .collect();

                Self::broadcast_notes(uuid, changes)
            }
            WsAction::RemoveNote { uuid, id } => {
                let deleted = note::remove(db, id).await;

                if let std::result::Result::Ok(changes) = deleted {
                    let mut changes: Vec<WsOperation> = changes
                        .into_iter()
                        .map(|change| WsOperation::NoteOrderChanged {
                            id: change.id as u32,
                            state: change.state,
                            predecessor_id: change.predecessor_id.map(|id| id as u32),
                        })
                        .collect();

                    changes.push(WsOperation::NoteRemoved { id });

                    Self::broadcast_notes(uuid, changes)
                } else {
                    Self::respond_empty(uuid)
                }
            }
            WsAction::AddUser { uuid, name, color } => {
                let user = user::add(
                    db,
                    &user::UserDto {
                        id: 0,
                        index: 9999,
                        name,
                        color,
                        email: "empty@email.com".into(),
                    },
                )
                .await?;

                Self::broadcast_note(uuid, WsOperation::UserAdded { user: user.into() })
            }
            WsAction::UpdateUserName { uuid, id, name } => {
                user::update_name(db, id, &name).await?;

                Self::broadcast_note(uuid, WsOperation::UserNameUpdated { id, name })
            }
            WsAction::UpdateUserColor { uuid, id, color } => {
                user::update_color(db, id, &color).await?;

                Self::broadcast_note(uuid, WsOperation::UserColorUpdated { id, color })
            }
            WsAction::RemoveUser { uuid, id } => {
                let deleted = user::remove(db, id).await?;

                // Note: User index reordering could be implemented here to maintain
                // sequential indices after deletion, but it's not required for functionality

                if deleted {
                    Self::broadcast_note(uuid, WsOperation::UserRemoved { id })
                } else {
                    Self::respond_empty(uuid)
                }
            }
            WsAction::DeleteNotes {
                uuid,
                owner,
                status,
            } => {
                let (deleted, moved) = note::delete_by(db, owner, status).await?;

                let mut operations: Vec<WsOperation> = moved
                    .into_iter()
                    .map(|change| WsOperation::NoteOrderChanged {
                        id: change.id as u32,
                        state: change.state,
                        predecessor_id: change.predecessor_id.map(|id| id as u32),
                    })
                    .collect();

                operations.extend(
                    deleted
                        .iter()
                        .map(|id| WsOperation::NoteRemoved { id: *id as u32 }),
                );

                Self::broadcast_notes(uuid, operations)
            }
            WsAction::NoteUpdate { uuid, id, updates } => {
                let mut operations = Vec::new();

                for update in updates {
                    match update {
                        NoteUpdate::Text { text } => {
                            note::update_text(db, id, &text).await?;
                            operations.push(WsOperation::NoteTextUpdated { id, text });
                        }
                        NoteUpdate::Order { over_id } => {
                            let changes = note::transfer(db, id, over_id).await?;

                            let changes: Vec<WsOperation> = changes
                                .into_iter()
                                .map(|change| WsOperation::NoteOrderChanged {
                                    id: change.id as u32,
                                    state: change.state,
                                    predecessor_id: change.predecessor_id.map(|id| id as u32),
                                })
                                .collect();

                            operations.extend(changes);
                        }
                    }
                }

                Self::broadcast_notes(uuid, operations)
            }
            WsAction::UserUpdate { uuid, id, updates } => {
                let mut operations = Vec::new();

                for update in updates {
                    match update {
                        UserUpdate::Name { name } => {
                            user::update_name(db, id, &name).await?;
                            operations.push(WsOperation::UserNameUpdated { id, name });
                        }
                        UserUpdate::Color { color } => {
                            user::update_color(db, id, &color).await?;
                            operations.push(WsOperation::UserColorUpdated { id, color });
                        }
                    }
                }

                Self::broadcast_notes(uuid, operations)
            }
            WsAction::NotifySnapshot {} => Ok(OperationResult::Broadcast(vec![
                WsOperation::SnapshotCreated {},
            ])),
            WsAction::SplitNote {
                uuid,
                original_id,
                original_text,
                new_text,
                new_state,
                new_owner,
            } => {
                let (_updated_note, new_note) = note::split_note(
                    db,
                    original_id,
                    &original_text,
                    &new_text,
                    new_state.as_deref(),
                    new_owner,
                )
                .await?;

                let operations = vec![
                    WsOperation::NoteTextUpdated {
                        id: original_id,
                        text: original_text,
                    },
                    WsOperation::NoteAdded {
                        note: new_note.into(),
                    },
                ];

                Self::broadcast_notes(uuid, operations)
            }
        }
    }
}

#[derive(Deserialize, PartialEq, Debug, Clone)]
#[serde(tag = "type")]
pub enum WsAction {
    AddNote {
        uuid: Option<String>,
        owner: u32,
        state: String,
        text: Option<String>,
    },
    UpdateNoteText {
        uuid: Option<String>,
        id: u32,
        text: String,
    },
    UpdateNoteTag {
        uuid: Option<String>,
        id: u32,
        tag: Option<NoteTag>,
    },
    Reorder {
        uuid: Option<String>,
        moved_item_id: u32,
        over_id: MoveTarget,
    },
    RemoveNote {
        uuid: Option<String>,
        id: u32,
    },
    AddUser {
        uuid: Option<String>,
        name: String,
        color: String,
    },
    UpdateUserName {
        uuid: Option<String>,
        id: u32,
        name: String,
    },
    UpdateUserColor {
        uuid: Option<String>,
        id: u32,
        color: String,
    },
    RemoveUser {
        uuid: Option<String>,
        id: u32,
    },
    DeleteNotes {
        uuid: Option<String>,
        owner: Option<u32>,
        status: Option<String>,
    },
    NoteUpdate {
        uuid: Option<String>,
        id: u32,
        updates: Vec<NoteUpdate>,
    },
    UserUpdate {
        uuid: Option<String>,
        id: u32,
        updates: Vec<UserUpdate>,
    },
    NotifySnapshot {},
    SplitNote {
        uuid: Option<String>,
        original_id: u32,
        original_text: String,
        new_text: String,
        new_state: Option<String>,
        new_owner: Option<u32>,
    },
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
#[serde(tag = "target")]
pub enum NoteUpdate {
    Text { text: String },
    Order { over_id: MoveTarget },
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
#[serde(tag = "target")]
pub enum UserUpdate {
    Name { name: String },
    Color { color: String },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type")]
pub enum WsOperation {
    NoteAdded {
        note: Note,
    },
    NoteTextUpdated {
        id: u32,
        text: String,
    },
    NoteOrderChanged {
        id: u32,
        state: String,
        predecessor_id: Option<u32>,
    },
    NoteTagChanged {
        id: u32,
        tag: Option<NoteTag>,
    },
    NoteRemoved {
        id: u32,
    },

    UserAdded {
        user: User,
    },
    UserNameUpdated {
        id: u32,
        name: String,
    },
    UserColorUpdated {
        id: u32,
        color: String,
    },
    UserRemoved {
        id: u32,
    },
    ActionFinished {
        uuid: String,
    },
    SnapshotCreated {},
    Error {
        uuid: Option<String>,
        message: String,
    },
}
