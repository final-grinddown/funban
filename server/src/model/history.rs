use chrono::{DateTime, Utc};
use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Debug, Clone, Default)]
pub struct History {
    pub id: i32,
    pub label: Option<String>,
    pub snapshot: String,
    pub version: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Deserialize, ToSchema)]
pub struct HistoryInsert {
    pub label: Option<String>,
}

#[derive(Deserialize, ToSchema)]
pub struct HistoryRename {
    pub id: u32,
    pub label: String,
}
