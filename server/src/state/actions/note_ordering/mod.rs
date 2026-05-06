use anyhow::Result;
use sqlx::MySqlPool;
use tracing::warn;

use crate::sql::note::{self, MoveTarget};
use crate::state::{respond_error, AppState, BusinessOperation, WsOperation};
use crate::ws::OperationResult;

impl AppState {
    pub(crate) async fn handle_reorder(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        moved_item_id: u32,
        over_id: MoveTarget,
    ) -> Result<OperationResult> {
        match note::transfer(db, moved_item_id, over_id.clone()).await {
            Ok(changes) => {
                let changes: Vec<WsOperation> = changes
                    .into_iter()
                    .map(|change| WsOperation::NoteOrderChanged {
                        id: change.id as u32,
                        state: change.state.into(),
                        predecessor_id: change.predecessor_id.map(|id| id as u32),
                    })
                    .collect();
                if changes.is_empty() {
                    // no-op: server detected the note is already at the requested position.
                    // Return a silent error so the client clears the pending action and
                    // snaps back to store state, without showing a success notification.
                    return respond_error(uuid, String::new());
                }
                changes.broadcast(uuid)
            }
            Err(sqlx::Error::RowNotFound) => {
                warn!(
                    moved_item_id,
                    ?over_id,
                    "Reorder rejected: anchor note not found in DB (stale client state)"
                );
                respond_error(
                    uuid,
                    "Reorder failed: the target position no longer exists. Please refresh the page.".to_string(),
                )
            }
            Err(e) => Err(e.into()),
        }
    }

    pub(crate) async fn handle_delete_notes(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        owner: Option<u32>,
        status: Option<String>,
    ) -> Result<OperationResult> {
        let (deleted, moved) = note::delete_by(db, owner, status).await?;

        let mut operations: Vec<WsOperation> = moved
            .into_iter()
            .map(|change| WsOperation::NoteOrderChanged {
                id: change.id as u32,
                state: change.state.into(),
                predecessor_id: change.predecessor_id.map(|id| id as u32),
            })
            .collect();

        operations.extend(
            deleted
                .iter()
                .map(|id| WsOperation::NoteRemoved { id: *id as u32 }),
        );

        operations.broadcast(uuid)
    }
}

#[cfg(test)]
mod serialization_tests;
