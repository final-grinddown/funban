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
pub enum NoteState {
    Notes,
    Todo,
    InProgress,
    Done,
}

impl From<String> for NoteState {
    fn from(s: String) -> Self {
        match s.as_str() {
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
