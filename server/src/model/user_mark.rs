use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, TS)]
#[ts(export)]
pub struct UserMark {
    pub id: i32,
    pub user_id: i32,
    pub mark_type: String,
    pub custom_text: Option<String>,
    pub expires_after_status_ends: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, TS)]
#[ts(export)]
pub struct UserMarkInsert {
    pub user_id: i32,
    pub mark_type: String,
    pub custom_text: Option<String>,
    pub expires_after_status_ends: Option<i32>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum UserMarkType {
    BlackMark,
    GoldStar,
    Clock,
}

impl From<UserMarkType> for String {
    fn from(mark_type: UserMarkType) -> Self {
        match mark_type {
            UserMarkType::BlackMark => "⚫".to_string(),
            UserMarkType::GoldStar => "⭐".to_string(),
            UserMarkType::Clock => "🕐".to_string(),
        }
    }
}

impl AsRef<str> for UserMarkType {
    fn as_ref(&self) -> &str {
        match self {
            UserMarkType::BlackMark => "⚫",
            UserMarkType::GoldStar => "⭐",
            UserMarkType::Clock => "🕐",
        }
    }
}

impl UserMarkType {
    pub fn is_valid_mark_type(mark_type: &str) -> bool {
        matches!(mark_type, "⚫" | "⭐" | "🕐")
    }
}