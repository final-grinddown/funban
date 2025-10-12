use anyhow::Result;
use chrono::NaiveDateTime;
use sqlx::MySqlPool;

use crate::model::user_mark::UserMarkInsert;
use crate::sql;
use crate::state::{AppState, BusinessOperation, WsOperation};
use crate::ws::OperationResult;

pub(crate) struct AddUserMarkParams {
    pub user_id: u32,
    pub mark_type: String,
    pub custom_text: Option<String>,
    pub expires_after_status_ends: u32,
    pub expires_at: Option<String>,
}

impl AppState {
    pub(crate) async fn handle_add_user_mark(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        params: AddUserMarkParams,
    ) -> Result<OperationResult> {
        // Validate mark type
        if !crate::model::user_mark::UserMarkType::is_valid_mark_type(&params.mark_type) {
            return WsOperation::Error {
                uuid: uuid.clone(),
                message: format!("Invalid mark type: {}", params.mark_type),
            }
            .respond(uuid);
        }

        // Parse expires_at if provided
        let expires_at_datetime = params.expires_at.as_ref().and_then(|s| {
            NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.fZ")
                .or_else(|_| NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S"))
                .or_else(|_| NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S"))
                .ok()
        });

        let user_mark_insert = UserMarkInsert {
            user_id: params.user_id as i32,
            mark_type: params.mark_type.clone(),
            custom_text: params.custom_text.clone(),
            expires_after_status_ends: Some(params.expires_after_status_ends as i32),
            expires_at: expires_at_datetime,
        };

        match sql::user_mark::add(db, &user_mark_insert).await {
            Ok(mark_dto) => WsOperation::UserMarkAdded {
                mark_id: mark_dto.id as u32,
                user_id: params.user_id,
                mark_type: params.mark_type,
                custom_text: params.custom_text,
                expires_after_status_ends: mark_dto.expires_after_status_ends.unwrap_or(0) as u32,
                expires_at: mark_dto
                    .expires_at
                    .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S").to_string()),
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
