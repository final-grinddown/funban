use anyhow::{Ok, Result};
use serde::{Deserialize, Serialize};
use sqlx::MySqlPool;
use ts_rs::TS;

use crate::model::note::{Note, NoteState, NoteTag};
use crate::model::user::User;
use crate::sql::note::MoveTarget;
use crate::sql::{note, user};
use crate::ws::OperationResult;

mod actions;
mod response_helpers;
mod transaction_helpers;

pub use response_helpers::respond_error;
pub use transaction_helpers::BusinessOperation;

// Re-export domain models for external use
pub use actions::note::NoteUpdate;
pub use actions::user::UserUpdate;

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
        let mut user_dtos = user::read_all(db).await?;
        user_dtos.sort_by(|a, b| a.index.cmp(&b.index));

        // Fetch all user marks
        let all_marks = crate::sql::user_mark::read_all(db).await?;

        // Build users with their marks
        let users: Vec<User> = user_dtos
            .into_iter()
            .map(|user_dto| {
                let user_marks: Vec<crate::model::user_mark::UserMark> = all_marks
                    .iter()
                    .filter(|mark| mark.user_id == user_dto.id)
                    .map(|mark| crate::model::user_mark::UserMark {
                        id: mark.id,
                        user_id: mark.user_id,
                        mark_type: mark.mark_type.clone(),
                        custom_text: mark.custom_text.clone(),
                        expires_after_status_ends: mark.expires_after_status_ends,
                    })
                    .collect();

                User {
                    id: user_dto.id,
                    index: user_dto.index,
                    name: user_dto.name,
                    color: user_dto.color,
                    email: user_dto.email,
                    marks: user_marks,
                }
            })
            .collect();

        Ok(users)
    }

    pub async fn get_notes(&self, db: &MySqlPool) -> Result<Vec<Note>> {
        let notes = note::read_all(db).await?;

        Ok(notes.into_iter().map(|n| n.into()).collect())
    }

    pub async fn apply(&mut self, db: &MySqlPool, action: WsAction) -> Result<OperationResult> {
        match action {
            WsAction::AddNote {
                uuid,
                owner,
                state,
                text,
            } => self.handle_add_note(db, uuid, owner, state, text).await,
            WsAction::UpdateNoteText { uuid, id, text } => {
                self.handle_update_note_text(db, uuid, id, text).await
            }
            WsAction::UpdateNoteTag { uuid, id, tag } => {
                self.handle_update_note_tag(db, uuid, id, tag).await
            }
            WsAction::Reorder {
                uuid,
                moved_item_id,
                over_id,
            } => self.handle_reorder(db, uuid, moved_item_id, over_id).await,
            WsAction::RemoveNote { uuid, id } => self.handle_remove_note(db, uuid, id).await,
            WsAction::AddUser { uuid, name, color } => {
                self.handle_add_user(db, uuid, name, color).await
            }
            WsAction::UpdateUserName { uuid, id, name } => {
                self.handle_update_user_name(db, uuid, id, name).await
            }
            WsAction::UpdateUserColor { uuid, id, color } => {
                self.handle_update_user_color(db, uuid, id, color).await
            }
            WsAction::RemoveUser { uuid, id } => self.handle_remove_user(db, uuid, id).await,
            WsAction::DeleteNotes {
                uuid,
                owner,
                status,
            } => self.handle_delete_notes(db, uuid, owner, status).await,
            WsAction::NoteUpdate { uuid, id, updates } => {
                self.handle_note_update(db, uuid, id, updates).await
            }
            WsAction::UserUpdate { uuid, id, updates } => {
                self.handle_user_update(db, uuid, id, updates).await
            }
            WsAction::NotifySnapshot {} => self.handle_notify_snapshot().await,
            WsAction::AddUserMark {
                uuid,
                user_id,
                mark_type,
                custom_text,
                expires_after_status_ends,
            } => {
                self.handle_add_user_mark(
                    db,
                    uuid,
                    user_id,
                    mark_type,
                    custom_text,
                    expires_after_status_ends,
                )
                .await
            }
            WsAction::SplitNote {
                uuid,
                original_id,
                original_text,
                new_text,
                new_state,
                new_owner,
            } => {
                let params = actions::note::SplitNoteParams {
                    original_id,
                    original_text,
                    new_text,
                    new_state,
                    new_owner,
                };
                self.handle_split_note(db, uuid, params).await
            }
        }
    }
}

#[derive(Deserialize, PartialEq, Debug, Clone, TS)]
#[ts(export)]
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
    AddUserMark {
        uuid: Option<String>,
        user_id: u32,
        mark_type: String,
        custom_text: Option<String>,
        expires_after_status_ends: u32,
    },
    SplitNote {
        uuid: Option<String>,
        original_id: u32,
        original_text: String,
        new_text: String,
        new_state: Option<String>,
        new_owner: Option<u32>,
    },
}

#[derive(Serialize, Deserialize, Debug, Clone, TS)]
#[ts(export)]
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
        state: NoteState,
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
    UserMarkAdded {
        user_id: u32,
        mark_type: String,
        custom_text: Option<String>,
        expires_after_status_ends: u32,
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
