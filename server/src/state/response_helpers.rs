use anyhow::Result;
use crate::ws::OperationResult;
use super::WsOperation;


/// Helper for creating error responses (no completion needed)
pub fn respond_error(uuid: Option<String>, message: String) -> Result<OperationResult> {
    Ok(OperationResult::ClientOnly(vec![WsOperation::Error {
        uuid,
        message,
    }]))
}