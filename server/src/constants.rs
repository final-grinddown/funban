/// Common constants for the application
use crate::model::note::{NoteState, NoteTag};

/// Note state constants for easy access
pub mod note_states {
    use super::NoteState;

    pub const NOTES: &str = "notes";
    pub const TODO: &str = "todo";
    pub const IN_PROGRESS: &str = "in_progress";
    pub const DONE: &str = "done";

    /// Helper function to convert string to NoteState
    pub fn from_str(s: &str) -> NoteState {
        s.to_string().into()
    }
}

/// Note tag constants for easy access
pub mod note_tags {
    use super::NoteTag;

    pub const IMPORTANT: &str = "Important";
    pub const DEADLINE: &str = "Deadline";
    pub const WAITING: &str = "Waiting";
    pub const QUICK: &str = "Quick";

    /// Helper function to convert string to NoteTag
    pub fn from_str(s: &str) -> NoteTag {
        s.to_string().into()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_note_states_conversion() {
        assert_eq!(note_states::from_str(note_states::TODO), NoteState::Todo);
        assert_eq!(note_states::from_str(note_states::DONE), NoteState::Done);
        assert_eq!(
            note_states::from_str(note_states::IN_PROGRESS),
            NoteState::InProgress
        );
        assert_eq!(note_states::from_str(note_states::NOTES), NoteState::Notes);
    }

    #[test]
    fn test_note_tags_conversion() {
        assert_eq!(
            note_tags::from_str(note_tags::IMPORTANT),
            NoteTag::Important
        );
        assert_eq!(note_tags::from_str(note_tags::DEADLINE), NoteTag::Deadline);
        assert_eq!(note_tags::from_str(note_tags::WAITING), NoteTag::Waiting);
        assert_eq!(note_tags::from_str(note_tags::QUICK), NoteTag::Quick);
    }

    #[test]
    fn test_state_as_ref() {
        assert_eq!(NoteState::Todo.as_ref(), note_states::TODO);
        assert_eq!(NoteState::Done.as_ref(), note_states::DONE);
        assert_eq!(NoteState::InProgress.as_ref(), note_states::IN_PROGRESS);
        assert_eq!(NoteState::Notes.as_ref(), note_states::NOTES);
    }

    #[test]
    fn test_tag_as_ref() {
        assert_eq!(NoteTag::Important.as_ref(), note_tags::IMPORTANT);
        assert_eq!(NoteTag::Deadline.as_ref(), note_tags::DEADLINE);
        assert_eq!(NoteTag::Waiting.as_ref(), note_tags::WAITING);
        assert_eq!(NoteTag::Quick.as_ref(), note_tags::QUICK);
    }
}
