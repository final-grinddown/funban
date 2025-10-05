use anyhow::Result;
use sqlx::MySqlPool;

use crate::model::user_mark::UserMarkInsert;
use crate::sql;
use crate::state::{AppState, BusinessOperation, WsOperation};
use crate::ws::OperationResult;

impl AppState {
    pub(crate) async fn handle_add_user_mark(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        user_id: u32,
        mark_type: String,
        custom_text: Option<String>,
        expires_after_status_ends: u32,
    ) -> Result<OperationResult> {
        // Validate mark type
        if !crate::model::user_mark::UserMarkType::is_valid_mark_type(&mark_type) {
            return WsOperation::Error {
                uuid: uuid.clone(),
                message: format!("Invalid mark type: {}", mark_type),
            }
            .respond(uuid);
        }

        let user_mark_insert = UserMarkInsert {
            user_id: user_id as i32,
            mark_type: mark_type.clone(),
            custom_text: custom_text.clone(),
            expires_after_status_ends: Some(expires_after_status_ends as i32),
        };

        match sql::user_mark::add(db, &user_mark_insert).await {
            Ok(mark_dto) => WsOperation::UserMarkAdded {
                mark_id: mark_dto.id as u32,
                user_id,
                mark_type,
                custom_text,
                expires_after_status_ends,
            }
            .broadcast(uuid),
            Err(e) => WsOperation::Error {
                uuid: uuid.clone(),
                message: format!("Failed to add user mark: {}", e),
            }
            .respond(uuid),
        }
    }
}
