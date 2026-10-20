use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

/// Team-wide settings for release notifications
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, TS, ToSchema)]
#[ts(export)]
pub struct ReleaseSettings {
    /// Recipients of the release notification email
    pub notification_to: Vec<String>,
    /// Carbon-copy recipients of the release notification email
    pub notification_cc: Vec<String>,
}
