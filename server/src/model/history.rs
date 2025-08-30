use chrono::{DateTime, Utc};
use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Debug, Clone, Default)]
pub struct History {
    pub id: i64,
    pub label: Option<String>,
    pub snapshot: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Deserialize, ToSchema)]
pub struct HistoryInsert {
    pub label: Option<String>,
    pub snapshot: String,
}

#[derive(Deserialize, ToSchema)]
pub struct HistoryRename {
    pub id: u32,
    pub label: String,
}
