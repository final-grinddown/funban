use anyhow::Result;

use crate::state::{AppState, WsOperation, BusinessOperation};
use crate::ws::OperationResult;

impl AppState {
    pub(crate) async fn handle_notify_snapshot(&mut self) -> Result<OperationResult> {
        WsOperation::SnapshotCreated {}.broadcast(None)
    }
}

#[cfg(test)]
mod serialization_tests;