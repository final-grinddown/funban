use chrono::Utc;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, TS)]
#[ts(export)]
pub struct Note {
    pub id: i32,
    pub text: String,
    pub name: String,
    pub color: String,
    pub owner_id: i32,
    pub state: NoteState,
    pub predecessor_id: Option<i32>,
    pub updated: chrono::DateTime<Utc>,
    pub created: chrono::DateTime<Utc>,
    pub tag: Option<NoteTag>,
}

impl Default for Note {
    fn default() -> Self {
        Self {
            id: 0,
            text: String::new(),
            name: String::new(),
            color: String::new(),
            owner_id: 0,
            state: NoteState::Notes,
            predecessor_id: None,
            updated: Utc::now(),
            created: Utc::now(),
            tag: None,
        }
    }
}

pub struct NoteInsert {
    pub owner: i32,
    pub state: String,
    pub text: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum NoteState {
    Notes,
    Todo,
    InProgress,
    Done,
}

impl From<String> for NoteState {
    fn from(s: String) -> Self {
        Self::from(s.as_str())
    }
}

impl From<&str> for NoteState {
    fn from(s: &str) -> Self {
        match s {
            "notes" => NoteState::Notes,
            "todo" => NoteState::Todo,
            "in_progress" => NoteState::InProgress,
            "done" => NoteState::Done,
            _ => {
                tracing::warn!("Unknown state value '{}', defaulting to Notes", s);
                NoteState::Notes
            }
        }
    }
}

impl From<NoteState> for String {
    fn from(state: NoteState) -> Self {
        state.as_ref().to_owned()
    }
}

impl AsRef<str> for NoteState {
    fn as_ref(&self) -> &str {
        match self {
            NoteState::Notes => "notes",
            NoteState::Todo => "todo",
            NoteState::InProgress => "in_progress",
            NoteState::Done => "done",
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, TS)]
#[ts(export)]
pub enum NoteTag {
    Important,
    Deadline,
    Waiting,
    Quick,
    Error,
}

impl From<String> for NoteTag {
    fn from(s: String) -> Self {
        match s.to_uppercase().as_str() {
            "IMPORTANT" => NoteTag::Important,
            "DEADLINE" => NoteTag::Deadline,
            "WAITING" => NoteTag::Waiting,
            "QUICK" => NoteTag::Quick,
            _ => {
                tracing::warn!("Unknown tag value '{}', defaulting to Error", s);
                NoteTag::Error
            }
        }
    }
}

impl From<NoteTag> for String {
    fn from(tag: NoteTag) -> Self {
        tag.as_ref().to_owned()
    }
}

impl AsRef<str> for NoteTag {
    fn as_ref(&self) -> &str {
        match self {
            NoteTag::Important => "Important",
            NoteTag::Deadline => "Deadline",
            NoteTag::Waiting => "Waiting",
            NoteTag::Quick => "Quick",
            NoteTag::Error => "Error",
        }
    }
}
