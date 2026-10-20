use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, TS, ToSchema)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum ReleaseType {
    Application,
    Maintenance,
}

impl ReleaseType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ReleaseType::Application => "application",
            ReleaseType::Maintenance => "maintenance",
        }
    }
}

impl TryFrom<&str> for ReleaseType {
    type Error = String;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "application" => Ok(ReleaseType::Application),
            "maintenance" => Ok(ReleaseType::Maintenance),
            other => Err(format!("Invalid release type: {}", other)),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, TS, ToSchema)]
#[ts(export)]
pub struct Release {
    pub id: i32,
    pub release_code: String,
    pub release_type: ReleaseType,
    pub release_at: NaiveDateTime,
    /// `None` when the release is unassigned or the assigned user has been deleted from the team.
    pub assignee_id: Option<i32>,
    /// Current name of the assignee, or the name snapshot taken at assignment time
    /// when the user no longer exists. `None` when the release is unassigned.
    pub assignee_name: Option<String>,
    /// Set when the release is closed; closed releases are read-only
    pub closed_at: Option<NaiveDateTime>,
    /// Summary written when closing, kept after reopening
    pub close_summary: Option<String>,
    /// Markdown notes, editable while the release is open
    pub notes: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, TS)]
#[ts(export)]
pub struct ReleaseInsert {
    pub release_code: String,
    pub release_type: ReleaseType,
    pub release_at: NaiveDateTime,
    /// `None` leaves the release unassigned
    pub assignee_id: Option<i32>,
}
