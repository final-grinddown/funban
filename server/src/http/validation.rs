use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use validator::{Validate, ValidationErrors};

/// Common validation error response
#[derive(Debug, Serialize)]
pub struct ValidationErrorResponse {
    pub message: String,
    pub errors: Vec<FieldError>,
}

#[derive(Debug, Serialize)]
pub struct FieldError {
    pub field: String,
    pub message: String,
}

/// Convert validator::ValidationErrors into our custom error response
impl From<ValidationErrors> for ValidationErrorResponse {
    fn from(errors: ValidationErrors) -> Self {
        let field_errors: Vec<FieldError> = errors
            .field_errors()
            .into_iter()
            .flat_map(|(field, field_errors)| {
                field_errors.iter().map(move |error| FieldError {
                    field: field.to_string(),
                    message: error
                        .message
                        .as_ref()
                        .map(|msg| msg.to_string())
                        .unwrap_or_else(|| format!("Invalid {}", field)),
                })
            })
            .collect();

        ValidationErrorResponse {
            message: "Validation failed".to_string(),
            errors: field_errors,
        }
    }
}

impl IntoResponse for ValidationErrorResponse {
    fn into_response(self) -> Response {
        (StatusCode::BAD_REQUEST, Json(self)).into_response()
    }
}

/// Validate a struct that implements the Validate trait
pub fn validate_input<T: Validate>(input: &T) -> Result<(), ValidationErrorResponse> {
    input.validate().map_err(ValidationErrorResponse::from)
}

/// Database-backed validation constants
/// These match the actual database field limits to prevent DB constraint violations
/// Note text field: VARCHAR(1000) in database
pub const MAX_NOTE_TEXT_LENGTH: usize = 1000;

/// User name field: VARCHAR(255) in database
pub const MAX_USER_NAME_LENGTH: usize = 255;

/// User email field: VARCHAR(255) in database - used in HTTP auth, not WS
#[allow(dead_code)]
pub const MAX_USER_EMAIL_LENGTH: usize = 255;

/// User color field: VARCHAR(31) in database (hex colors like #ff5722)
pub const MAX_USER_COLOR_LENGTH: usize = 31;

/// Note state field: VARCHAR(31) in database
pub const MAX_NOTE_STATE_LENGTH: usize = 31;

/// Password field: VARCHAR(255) in database (hashed) - used in HTTP auth, not WS
#[allow(dead_code)]
pub const MAX_PASSWORD_LENGTH: usize = 255;

/// Note change_set field: VARCHAR(64) in database - internal field, not user input
#[allow(dead_code)]
pub const MAX_CHANGE_SET_LENGTH: usize = 64;

/// Custom validation functions
pub mod validators {
    use validator::ValidationError;

    /// Validate text length for notes (allows empty for optional fields)
    pub fn validate_note_text(text: &str) -> Result<(), ValidationError> {
        if text.len() > super::MAX_NOTE_TEXT_LENGTH {
            return Err(ValidationError::new("text_too_long"));
        }
        Ok(())
    }


    /// Validate user name (VARCHAR(255) in database)
    pub fn validate_user_name(name: &str) -> Result<(), ValidationError> {
        if name.trim().is_empty() {
            return Err(ValidationError::new("empty_name"));
        }
        if name.len() > super::MAX_USER_NAME_LENGTH {
            return Err(ValidationError::new("name_too_long"));
        }
        Ok(())
    }

    /// Validate user email (VARCHAR(255) in database) - for future HTTP auth
    #[allow(dead_code)]
    pub fn validate_user_email(email: &str) -> Result<(), ValidationError> {
        if email.trim().is_empty() {
            return Err(ValidationError::new("empty_email"));
        }
        if email.len() > super::MAX_USER_EMAIL_LENGTH {
            return Err(ValidationError::new("email_too_long"));
        }
        // Basic email format validation (just check for @)
        if !email.contains('@') {
            return Err(ValidationError::new("invalid_email_format"));
        }
        Ok(())
    }

    /// Validate user color (VARCHAR(31) in database - should be hex color)
    pub fn validate_user_color(color: &str) -> Result<(), ValidationError> {
        if color.is_empty() {
            return Err(ValidationError::new("empty_color"));
        }
        if color.len() > super::MAX_USER_COLOR_LENGTH {
            return Err(ValidationError::new("color_too_long"));
        }
        // Validate hex color format (#rrggbb)
        if !color.starts_with('#') || color.len() != 7 {
            return Err(ValidationError::new("invalid_color_format"));
        }
        if !color[1..].chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(ValidationError::new("invalid_color_format"));
        }
        Ok(())
    }

    /// Validate note state (VARCHAR(31) in database)
    pub fn validate_note_state(state: &str) -> Result<(), ValidationError> {
        if state.trim().is_empty() {
            return Err(ValidationError::new("empty_state"));
        }
        if state.len() > super::MAX_NOTE_STATE_LENGTH {
            return Err(ValidationError::new("state_too_long"));
        }
        Ok(())
    }


    /// Validate WebSocket action content against database constraints
    pub fn validate_ws_action_content(action: &crate::state::WsAction) -> Result<(), ValidationError> {
        use crate::state::WsAction;

        match action {
            WsAction::AddNote { text: Some(text), state, .. } => {
                validate_note_text(text)?;
                validate_note_state(state)?;
            }
            WsAction::AddNote { text: None, state, .. } => {
                validate_note_state(state)?;
            }
            WsAction::UpdateNoteText { text, .. } => {
                validate_note_text(text)?;
            }
            WsAction::AddUser { name, color, .. } => {
                validate_user_name(name)?;
                validate_user_color(color)?;
            }
            WsAction::UpdateUserName { name, .. } => {
                validate_user_name(name)?;
            }
            WsAction::UpdateUserColor { color, .. } => {
                validate_user_color(color)?;
            }
            _ => {} // Other actions don't need content validation
        }
        Ok(())
    }
}

/// Common validation structs for API inputs
#[cfg(test)]
#[derive(Debug, Deserialize, Validate)]
pub struct AddNoteInput {
    #[allow(dead_code)]
    pub owner: u32,
    #[validate(length(
        min = 1,
        max = 20,
        message = "State must be between 1 and 20 characters"
    ))]
    pub state: String,
    #[validate(length(max = 5000, message = "Text cannot exceed 5000 characters"))]
    pub text: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateNoteTextInput {
    #[validate(length(
        min = 1,
        max = 5000,
        message = "Text must be between 1 and 5000 characters"
    ))]
    pub text: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct AddUserInput {
    #[validate(length(
        min = 1,
        max = 100,
        message = "Name must be between 1 and 100 characters"
    ))]
    pub name: String,
    #[validate(length(min = 3, max = 7, message = "Color must be a valid color name"))]
    pub color: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateUserNameInput {
    #[validate(length(
        min = 1,
        max = 100,
        message = "Name must be between 1 and 100 characters"
    ))]
    pub name: String,
}


#[cfg(test)]
mod tests {
    use super::validators::*;
    use super::*;

    #[test]
    fn test_note_text_validation() {
        // Valid text
        assert!(validate_note_text("Valid note text").is_ok());

        // Empty text is now allowed (for optional fields)
        assert!(validate_note_text("").is_ok());

        // Too long text should fail (DATABASE LIMIT: 1000 chars)
        let long_text = "a".repeat(MAX_NOTE_TEXT_LENGTH + 1);
        assert!(validate_note_text(&long_text).is_err());

        // Text at exact limit should pass
        let max_text = "a".repeat(MAX_NOTE_TEXT_LENGTH);
        assert!(validate_note_text(&max_text).is_ok());

    }

    #[test]
    fn test_user_name_validation() {
        // Valid name
        assert!(validate_user_name("John Doe").is_ok());

        // Empty name should fail
        assert!(validate_user_name("").is_err());
        assert!(validate_user_name("   ").is_err());

        // Too long name should fail (DATABASE LIMIT: 255 chars)
        let long_name = "a".repeat(MAX_USER_NAME_LENGTH + 1);
        assert!(validate_user_name(&long_name).is_err());

        // Name at exact limit should pass
        let max_name = "a".repeat(MAX_USER_NAME_LENGTH);
        assert!(validate_user_name(&max_name).is_ok());
    }


    #[test]
    fn test_user_color_validation() {
        // Valid hex colors
        assert!(validate_user_color("#ff5722").is_ok());
        assert!(validate_user_color("#000000").is_ok());
        assert!(validate_user_color("#FFFFFF").is_ok());

        // Invalid formats
        assert!(validate_user_color("").is_err());
        assert!(validate_user_color("ff5722").is_err()); // Missing #
        assert!(validate_user_color("#ff572").is_err()); // Too short
        assert!(validate_user_color("#ff57222").is_err()); // Too long
        assert!(validate_user_color("#gg5722").is_err()); // Invalid hex

        // Too long for database (DATABASE LIMIT: 31 chars)
        let long_color = "#".repeat(32);
        assert!(validate_user_color(&long_color).is_err());
    }

    #[test]
    fn test_note_state_validation() {
        // Valid states
        assert!(validate_note_state("todo").is_ok());
        assert!(validate_note_state("in_progress").is_ok());
        assert!(validate_note_state("done").is_ok());

        // Invalid states
        assert!(validate_note_state("").is_err());
        assert!(validate_note_state("   ").is_err());

        // Too long for database (DATABASE LIMIT: 31 chars)
        let long_state = "a".repeat(MAX_NOTE_STATE_LENGTH + 1);
        assert!(validate_note_state(&long_state).is_err());

        // State at exact limit should pass
        let max_state = "a".repeat(MAX_NOTE_STATE_LENGTH);
        assert!(validate_note_state(&max_state).is_ok());
    }

    #[test]
    fn test_user_email_validation() {
        // Valid emails
        assert!(validate_user_email("user@example.com").is_ok());
        assert!(validate_user_email("test@test.org").is_ok());

        // Invalid emails
        assert!(validate_user_email("").is_err());
        assert!(validate_user_email("   ").is_err());
        assert!(validate_user_email("notanemail").is_err());

        // Too long for database (DATABASE LIMIT: 255 chars)
        let long_email = format!("{}@example.com", "a".repeat(250));
        assert!(validate_user_email(&long_email).is_err());
    }

    #[test]
    fn test_validation_structs() {
        // Test AddNoteInput validation
        let valid_note = AddNoteInput {
            owner: 1,
            state: crate::constants::note_states::TODO.to_string(),
            text: Some("Valid note text".to_string()),
        };
        assert!(valid_note.validate().is_ok());

        let invalid_note = AddNoteInput {
            owner: 1,
            state: "".to_string(), // Empty state should fail
            text: Some("Valid text".to_string()),
        };
        assert!(invalid_note.validate().is_err());

        // Test AddUserInput validation
        let valid_user = AddUserInput {
            name: "John Doe".to_string(),
            color: "blue".to_string(),
        };
        assert!(valid_user.validate().is_ok());

        let invalid_user = AddUserInput {
            name: "".to_string(), // Empty name should fail
            color: "blue".to_string(),
        };
        assert!(invalid_user.validate().is_err());
    }
}
