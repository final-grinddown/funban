use anyhow::Result;

use crate::state::{AppState, WsOperation, BusinessResponse};
use crate::ws::OperationResult;

impl AppState {
    pub(crate) async fn handle_notify_snapshot(&mut self) -> Result<OperationResult> {
        WsOperation::SnapshotCreated {}.broadcast_with_completion(None)
    }
}

#[cfg(test)]
mod serialization_tests;