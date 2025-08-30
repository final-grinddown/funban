use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Default, Debug, Clone, PartialEq)]
pub struct Note {
    pub id: i32,
    pub text: String,
    pub name: String,
    pub color: String,
    pub owner_id: i64,
    pub state: String,
    pub predecessor_id: Option<i32>,
    pub updated: chrono::DateTime<Utc>,
    pub created: chrono::DateTime<Utc>,
    pub tag: Option<NoteTag>,
}

pub struct NoteInsert {
    pub owner: i32,
    pub state: String,
    pub text: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum NoteTag {
    Important,
    Deadline,
    Waiting,
    Quick,
    Error,
}

impl From<String> for NoteTag {
    fn from(s: String) -> Self {
        match s.as_str() {
            "IMPORTANT" => NoteTag::Important,
            "DEADLINE" => NoteTag::Deadline,
            "WAITING" => NoteTag::Waiting,
            "QUICK" => NoteTag::Quick,
            _ => {
                // Log the invalid value for debugging
                tracing::error!("Unknown tag value: {}", s);
                NoteTag::Error
            }
        }
    }
}

impl From<NoteTag> for String {
    fn from(tag: NoteTag) -> Self {
        match tag {
            NoteTag::Important => "IMPORTANT".to_string(),
            NoteTag::Deadline => "DEADLINE".to_string(),
            NoteTag::Waiting => "WAITING".to_string(),
            NoteTag::Quick => "QUICK".to_string(),
            NoteTag::Error => "ERROR".to_string(),
        }
    }
}
