use anyhow::Result;
use sqlx::MySqlPool;

use crate::sql::user;
use crate::state::{AppState, WsOperation, BusinessResponse, respond_empty_with_completion};
use crate::state::transaction_helpers::DatabaseOperation;
use crate::ws::OperationResult;

pub mod models;
pub use models::UserUpdate;

impl AppState {
    pub(crate) async fn handle_add_user(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        name: String,
        color: String,
    ) -> Result<OperationResult> {
        user::add(
            db,
            &user::UserDto {
                id: 0,
                index: 9999,
                name,
                color,
                email: "empty@email.com".into(),
            },
        ).await
            .create_and_broadcast(uuid, |user| WsOperation::UserAdded { user: user.into() })
    }

    pub(crate) async fn handle_update_user_name(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        id: u32,
        name: String,
    ) -> Result<OperationResult> {
        user::update_name(db, id, &name).await
            .update_and_broadcast(uuid, |_| WsOperation::UserNameUpdated { id, name })
    }

    pub(crate) async fn handle_update_user_color(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        id: u32,
        color: String,
    ) -> Result<OperationResult> {
        user::update_color(db, id, &color).await
            .update_and_broadcast(uuid, |_| WsOperation::UserColorUpdated { id, color })
    }

    pub(crate) async fn handle_remove_user(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        id: u32,
    ) -> Result<OperationResult> {
        let deleted = user::remove(db, id).await?;

        if deleted {
            WsOperation::UserRemoved { id }.broadcast_with_completion(uuid)
        } else {
            respond_empty_with_completion(uuid)
        }
    }

    pub(crate) async fn handle_user_update(
        &mut self,
        db: &MySqlPool,
        uuid: Option<String>,
        id: u32,
        updates: Vec<UserUpdate>,
    ) -> Result<OperationResult> {
        let mut operations = Vec::new();

        for update in updates {
            match update {
                UserUpdate::Name { name } => {
                    user::update_name(db, id, &name).await?;
                    operations.push(WsOperation::UserNameUpdated { id, name });
                }
                UserUpdate::Color { color } => {
                    user::update_color(db, id, &color).await?;
                    operations.push(WsOperation::UserColorUpdated { id, color });
                }
            }
        }

        operations.broadcast_with_completion(uuid)
    }
}

#[cfg(test)]
mod tests;

#[cfg(test)]
mod serialization_tests;