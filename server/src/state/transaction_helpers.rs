use super::WsOperation;
use crate::ws::OperationResult;
use anyhow::Result;
use sqlx::Error as SqlxError;

/// Unified trait for all business operations with completion tracking
///
/// This trait provides a single, consistent interface for:
/// - Database operations (Result<T, SqlxError>)
/// - Direct operations (WsOperation)
/// - Multiple operations (Vec<WsOperation>)
///
/// All operations automatically handle:
/// - Success/failure responses
/// - Client completion notifications (ActionFinished)
/// - Error conversion to client responses
pub trait BusinessOperation {
    /// Broadcast to all clients with completion tracking
    fn broadcast(self, uuid: Option<String>) -> Result<OperationResult>;

    /// Send to requesting client only with completion tracking
    fn respond(self, uuid: Option<String>) -> Result<OperationResult>;
}

/// Extension trait for database results that need transformation
pub trait DatabaseOperation<T> {
    /// Transform database result and broadcast with completion tracking
    fn broadcast_with<F>(self, uuid: Option<String>, op_fn: F) -> Result<OperationResult>
    where
        F: FnOnce(T) -> WsOperation;
}

/// Implementation for database results with transformation
impl<T> DatabaseOperation<T> for Result<T, SqlxError> {
    fn broadcast_with<F>(self, uuid: Option<String>, op_fn: F) -> Result<OperationResult>
    where
        F: FnOnce(T) -> WsOperation,
    {
        match self {
            Ok(data) => op_fn(data).broadcast(uuid),
            Err(e) => super::respond_error(uuid, e.to_string()),
        }
    }
}

/// Implementation for single operations
impl BusinessOperation for WsOperation {
    fn broadcast(self, uuid: Option<String>) -> Result<OperationResult> {
        let mut operations = vec![self];
        if let Some(uuid) = uuid {
            operations.push(WsOperation::ActionFinished { uuid });
        }
        Ok(OperationResult::Broadcast(operations))
    }

    fn respond(self, uuid: Option<String>) -> Result<OperationResult> {
        let mut operations = vec![self];
        if let Some(uuid) = uuid {
            operations.push(WsOperation::ActionFinished { uuid });
        }
        Ok(OperationResult::ClientOnly(operations))
    }
}

/// Implementation for multiple operations
impl BusinessOperation for Vec<WsOperation> {
    fn broadcast(self, uuid: Option<String>) -> Result<OperationResult> {
        let mut operations = self;
        if let Some(uuid) = uuid {
            operations.push(WsOperation::ActionFinished { uuid });
        }
        Ok(OperationResult::Broadcast(operations))
    }

    fn respond(self, uuid: Option<String>) -> Result<OperationResult> {
        let mut operations = self;
        if let Some(uuid) = uuid {
            operations.push(WsOperation::ActionFinished { uuid });
        }
        Ok(OperationResult::ClientOnly(operations))
    }
}

/// Convenience functions for common patterns
pub mod helpers {
    use super::*;

    /// Create an empty response with completion (useful for operations that don't return data)
    pub fn empty_response(uuid: Option<String>) -> Result<OperationResult> {
        vec![].respond(uuid)
    }
}
