use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

use crate::model::release::ReleaseType;

/// One step of the team-wide release template; the list order is the step order
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, TS, ToSchema)]
#[ts(export)]
pub struct ReleaseStep {
    /// Markdown text of the step, may span multiple lines
    pub title: String,
    /// Free-text hint of when to do the step, e.g. "3 days before release"
    pub timing: Option<String>,
    /// `None` applies the step to every release type
    pub release_type: Option<ReleaseType>,
}

/// Team-wide settings for release notifications
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, TS, ToSchema)]
#[ts(export)]
pub struct ReleaseSettings {
    /// Recipients of the release notification email
    pub notification_to: Vec<String>,
    /// Carbon-copy recipients of the release notification email
    pub notification_cc: Vec<String>,
}
