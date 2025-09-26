use anyhow::Result;
use sqlx::MySqlPool;

use crate::model::note::{NoteInsert, NoteTag};
use crate::sql::note;
use crate::state::{AppState, WsOperation, BusinessResponse, respond_empty_with_completion};
use crate::state::transaction_helpers::{DatabaseOperation, TransactionResult};
use crate::ws::OperationResult;

pub mod models;
pub use models::NoteUpdate;

pub struct SplitNoteParams {
    pub original_id: u32,
    pub original_text: String,
    pub new_text: String,
    pub new_state: Option<String>,
    pub new_owner: Option<u32>,
}

impl AppState {
    pub(crate) async fn handle_add_note(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        owner: u32,
        state: String,
        text: Option<String>,
    ) -> Result<OperationResult> {
        let note = NoteInsert {
            owner: owner as i32,
            text,
            state,
        };

        note::add(db, &note).await
            .create_and_broadcast(uuid, |success| WsOperation::NoteAdded {
                note: success.into(),
            })
    }

    pub(crate) async fn handle_update_note_text(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        id: u32,
        text: String,
    ) -> Result<OperationResult> {
        note::update_text(db, id, &text).await
            .update_and_broadcast(uuid, |_| WsOperation::NoteTextUpdated { id, text })
    }

    pub(crate) async fn handle_update_note_tag(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        id: u32,
        tag: Option<NoteTag>,
    ) -> Result<OperationResult> {
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

        WsOperation::NoteTagChanged { id, tag }.broadcast_with_completion(uuid)
    }

    pub(crate) async fn handle_remove_note(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        id: u32,
    ) -> Result<OperationResult> {
        note::remove(db, id).await
            .into_broadcast_with_fallback(
                uuid,
                |changes| {
                    let mut ops: Vec<WsOperation> = changes
                        .into_iter()
                        .map(|change| WsOperation::NoteOrderChanged {
                            id: change.id as u32,
                            state: change.state,
                            predecessor_id: change.predecessor_id.map(|id| id as u32),
                        })
                        .collect();
                    ops.push(WsOperation::NoteRemoved { id });
                    ops
                },
                || respond_empty_with_completion(None).unwrap()
            )
    }

    pub(crate) async fn handle_note_update(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        id: u32,
        updates: Vec<NoteUpdate>,
    ) -> Result<OperationResult> {
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

        operations.broadcast_with_completion(uuid)
    }

    pub(crate) async fn handle_split_note(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        params: SplitNoteParams,
    ) -> Result<OperationResult> {
        let (_updated_note, new_note) = note::split_note(
            db,
            params.original_id,
            &params.original_text,
            &params.new_text,
            params.new_state.as_deref(),
            params.new_owner,
        )
        .await?;

        let operations = vec![
            WsOperation::NoteTextUpdated {
                id: params.original_id,
                text: params.original_text,
            },
            WsOperation::NoteAdded {
                note: new_note.into(),
            },
        ];

        operations.broadcast_with_completion(uuid)
    }
}

#[cfg(test)]
mod tests;

#[cfg(test)]
mod serialization_tests;