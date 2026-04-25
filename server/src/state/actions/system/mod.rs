use anyhow::Result;
use metrics::counter;

use crate::state::{AppState, BusinessOperation, WsOperation};
use crate::ws::OperationResult;

impl AppState {
    pub(crate) async fn handle_notify_snapshot(&mut self) -> Result<OperationResult> {
        counter!("snapshots_total").increment(1);
        WsOperation::SnapshotCreated {}.broadcast(None)
    }
}

#[cfg(test)]
mod serialization_tests;
