use anyhow::Result;
use sqlx::MySqlPool;

use crate::sql::note::{self, MoveTarget};
use crate::state::{AppState, WsOperation, BusinessResponse};
use crate::ws::OperationResult;

impl AppState {
    pub(crate) async fn handle_reorder(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        moved_item_id: u32,
        over_id: MoveTarget,
    ) -> Result<OperationResult> {
        let changes = note::transfer(db, moved_item_id, over_id).await?;

        let changes: Vec<WsOperation> = changes
            .into_iter()
            .map(|change| WsOperation::NoteOrderChanged {
                id: change.id as u32,
                state: change.state,
                predecessor_id: change.predecessor_id.map(|id| id as u32),
            })
            .collect();

        changes.broadcast_with_completion(uuid)
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
                state: change.state,
                predecessor_id: change.predecessor_id.map(|id| id as u32),
            })
            .collect();

        operations.extend(
            deleted
                .iter()
                .map(|id| WsOperation::NoteRemoved { id: *id as u32 }),
        );

        operations.broadcast_with_completion(uuid)
    }
}

#[cfg(test)]
mod serialization_tests;