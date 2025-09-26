use anyhow::Result;
use crate::ws::OperationResult;
use super::WsOperation;

/// Trait for standardizing action completion handling
pub trait BusinessResponse {
    /// Broadcast a single operation with action completion
    fn broadcast_with_completion(self, uuid: Option<String>) -> Result<OperationResult>;

    /// Send to client only with action completion
    fn respond_with_completion(self, uuid: Option<String>) -> Result<OperationResult>;

}

impl BusinessResponse for WsOperation {
    fn broadcast_with_completion(self, uuid: Option<String>) -> Result<OperationResult> {
        let mut operations = vec![self];
        if let Some(uuid) = uuid {
            operations.push(WsOperation::ActionFinished { uuid });
        }
        Ok(OperationResult::Broadcast(operations))
    }

    fn respond_with_completion(self, uuid: Option<String>) -> Result<OperationResult> {
        let mut operations = vec![self];
        if let Some(uuid) = uuid {
            operations.push(WsOperation::ActionFinished { uuid });
        }
        Ok(OperationResult::ClientOnly(operations))
    }

}

impl BusinessResponse for Vec<WsOperation> {
    fn broadcast_with_completion(self, uuid: Option<String>) -> Result<OperationResult> {
        let mut operations = self;
        if let Some(uuid) = uuid {
            operations.push(WsOperation::ActionFinished { uuid });
        }
        Ok(OperationResult::Broadcast(operations))
    }

    fn respond_with_completion(self, uuid: Option<String>) -> Result<OperationResult> {
        let mut operations = self;
        if let Some(uuid) = uuid {
            operations.push(WsOperation::ActionFinished { uuid });
        }
        Ok(OperationResult::ClientOnly(operations))
    }

}

/// Helper for creating empty responses with completion
pub fn respond_empty_with_completion(uuid: Option<String>) -> Result<OperationResult> {
    vec![].respond_with_completion(uuid)
}

/// Helper for creating error responses (no completion needed)
pub fn respond_error(uuid: Option<String>, message: String) -> Result<OperationResult> {
    Ok(OperationResult::ClientOnly(vec![WsOperation::Error {
        uuid,
        message,
    }]))
}