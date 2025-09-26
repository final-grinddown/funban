use anyhow::Result;
use super::{WsOperation, BusinessResponse};
use crate::ws::OperationResult;
use sqlx::Error as SqlxError;

/// Unified trait for business transactions with completion tracking
///
/// This trait handles database operations and automatically manages:
/// - Success/failure responses
/// - Client completion notifications (ActionFinished)
/// - Broadcast vs client-only operations
pub trait BusinessTransaction<T> {
    /// Execute operation and broadcast result with completion tracking
    fn execute_and_broadcast<F>(self, uuid: Option<String>, op_fn: F) -> Result<OperationResult>
    where
        F: FnOnce(T) -> WsOperation;

    /// Execute operation and send to client only with completion tracking
    #[allow(dead_code)]
    fn execute_and_respond<F>(self, uuid: Option<String>, op_fn: F) -> Result<OperationResult>
    where
        F: FnOnce(T) -> WsOperation;

    /// Execute operation that produces multiple operations and broadcasts them
    #[allow(dead_code)]
    fn execute_and_broadcast_many<F>(self, uuid: Option<String>, ops_fn: F) -> Result<OperationResult>
    where
        F: FnOnce(T) -> Vec<WsOperation>;

    /// Execute with fallback behavior on error (useful for non-critical operations)
    fn execute_with_fallback<F, FB>(self, uuid: Option<String>, op_fn: F, fallback: FB) -> Result<OperationResult>
    where
        F: FnOnce(T) -> Vec<WsOperation>,
        FB: FnOnce() -> OperationResult;
}

impl<T> BusinessTransaction<T> for Result<T, SqlxError> {
    fn execute_and_broadcast<F>(self, uuid: Option<String>, op_fn: F) -> Result<OperationResult>
    where
        F: FnOnce(T) -> WsOperation,
    {
        match self {
            Ok(result) => op_fn(result).broadcast_with_completion(uuid),
            Err(e) => super::respond_error(uuid, e.to_string()),
        }
    }

    fn execute_and_respond<F>(self, uuid: Option<String>, op_fn: F) -> Result<OperationResult>
    where
        F: FnOnce(T) -> WsOperation,
    {
        match self {
            Ok(result) => op_fn(result).respond_with_completion(uuid),
            Err(e) => super::respond_error(uuid, e.to_string()),
        }
    }

    fn execute_and_broadcast_many<F>(self, uuid: Option<String>, ops_fn: F) -> Result<OperationResult>
    where
        F: FnOnce(T) -> Vec<WsOperation>,
    {
        match self {
            Ok(result) => ops_fn(result).broadcast_with_completion(uuid),
            Err(e) => super::respond_error(uuid, e.to_string()),
        }
    }

    fn execute_with_fallback<F, FB>(self, uuid: Option<String>, op_fn: F, fallback: FB) -> Result<OperationResult>
    where
        F: FnOnce(T) -> Vec<WsOperation>,
        FB: FnOnce() -> OperationResult,
    {
        match self {
            Ok(result) => op_fn(result).broadcast_with_completion(uuid),
            Err(_) => Ok(fallback()),
        }
    }
}

