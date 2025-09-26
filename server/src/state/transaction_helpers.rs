use anyhow::Result;
use super::{WsOperation, BusinessResponse};
use crate::ws::OperationResult;
use sqlx::Error as SqlxError;

/// Helper trait for standardizing common database transaction patterns
pub trait TransactionResult<T> {
    /// Execute a database operation and handle the result with standardized broadcasting
    fn into_broadcast_operation<F>(self, uuid: Option<String>, op_fn: F) -> Result<OperationResult>
    where
        F: FnOnce(T) -> WsOperation;


    /// Execute a database operation that might fail, providing fallback behavior
    fn into_broadcast_with_fallback<F, FB>(
        self,
        uuid: Option<String>,
        op_fn: F,
        fallback_fn: FB,
    ) -> Result<OperationResult>
    where
        F: FnOnce(T) -> Vec<WsOperation>,
        FB: FnOnce() -> OperationResult;
}

impl<T> TransactionResult<T> for Result<T, SqlxError> {
    fn into_broadcast_operation<F>(self, uuid: Option<String>, op_fn: F) -> Result<OperationResult>
    where
        F: FnOnce(T) -> WsOperation,
    {
        match self {
            Ok(result) => op_fn(result).broadcast_with_completion(uuid),
            Err(e) => super::respond_error(uuid, e.to_string()),
        }
    }


    fn into_broadcast_with_fallback<F, FB>(
        self,
        uuid: Option<String>,
        op_fn: F,
        fallback_fn: FB,
    ) -> Result<OperationResult>
    where
        F: FnOnce(T) -> Vec<WsOperation>,
        FB: FnOnce() -> OperationResult,
    {
        match self {
            Ok(result) => op_fn(result).broadcast_with_completion(uuid),
            Err(_) => Ok(fallback_fn()),
        }
    }
}

/// Extension trait for common database operation patterns
pub trait DatabaseOperation<T> {
    /// Execute and broadcast a single create operation
    fn create_and_broadcast<F>(self, uuid: Option<String>, op_fn: F) -> Result<OperationResult>
    where
        F: FnOnce(T) -> WsOperation;

    /// Execute and broadcast an update operation
    fn update_and_broadcast<F>(self, uuid: Option<String>, op_fn: F) -> Result<OperationResult>
    where
        F: FnOnce(T) -> WsOperation;

}

impl<T> DatabaseOperation<T> for Result<T, SqlxError> {
    fn create_and_broadcast<F>(self, uuid: Option<String>, op_fn: F) -> Result<OperationResult>
    where
        F: FnOnce(T) -> WsOperation,
    {
        self.into_broadcast_operation(uuid, op_fn)
    }

    fn update_and_broadcast<F>(self, uuid: Option<String>, op_fn: F) -> Result<OperationResult>
    where
        F: FnOnce(T) -> WsOperation,
    {
        self.into_broadcast_operation(uuid, op_fn)
    }

}

