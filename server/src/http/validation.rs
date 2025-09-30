use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
#[cfg(test)]
use serde::Deserialize;
use serde::Serialize;

/// Custom validation error types
#[derive(Debug, Clone)]
pub enum ValidationError {
    TooLong {
        field: &'static str,
        max_len: usize,
        actual_len: usize,
    },
    TooShort {
        field: &'static str,
        min_len: usize,
        actual_len: usize,
    },
    Empty {
        field: &'static str,
    },
    InvalidFormat {
        field: &'static str,
        expected: &'static str,
    },
}

impl ValidationError {
    pub fn message(&self) -> String {
        match self {
            ValidationError::TooLong {
                field,
                max_len,
                actual_len,
            } => {
                format!(
                    "{} is too long: {} characters (max {})",
                    field, actual_len, max_len
                )
            }
            ValidationError::TooShort {
                field,
                min_len,
                actual_len,
            } => {
                format!(
                    "{} is too short: {} characters (min {})",
                    field, actual_len, min_len
                )
            }
            ValidationError::Empty { field } => {
                format!("{} cannot be empty", field)
            }
            ValidationError::InvalidFormat { field, expected } => {
                format!("{} has invalid format (expected: {})", field, expected)
            }
        }
    }

    pub fn field(&self) -> &'static str {
        match self {
            ValidationError::TooLong { field, .. } => field,
            ValidationError::TooShort { field, .. } => field,
            ValidationError::Empty { field } => field,
            ValidationError::InvalidFormat { field, .. } => field,
        }
    }
}

/// Common validation error response for HTTP endpoints
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

impl From<ValidationError> for ValidationErrorResponse {
    fn from(error: ValidationError) -> Self {
        ValidationErrorResponse {
            message: "Validation failed".to_string(),
            errors: vec![FieldError {
                field: error.field().to_string(),
                message: error.message(),
            }],
        }
    }
}

impl From<Vec<ValidationError>> for ValidationErrorResponse {
    fn from(errors: Vec<ValidationError>) -> Self {
        ValidationErrorResponse {
            message: "Validation failed".to_string(),
            errors: errors
                .into_iter()
                .map(|error| FieldError {
                    field: error.field().to_string(),
                    message: error.message(),
                })
                .collect(),
        }
    }
}

impl IntoResponse for ValidationErrorResponse {
    fn into_response(self) -> Response {
        (StatusCode::BAD_REQUEST, Json(self)).into_response()
    }
}

/// Validate input and return appropriate error response
pub fn validate_input(errors: Vec<ValidationError>) -> Result<(), ValidationErrorResponse> {
    if errors.is_empty() {
        Ok(())
    } else {
        Err(ValidationErrorResponse::from(errors))
    }
}

/// Validation field limits - centralized configuration matching database schema
pub struct ValidationLimits;

impl ValidationLimits {
    /// Note text field: VARCHAR(1000) in database
    pub const NOTE_TEXT_MAX_LEN: usize = 1000;

    /// User name field: VARCHAR(255) in database
    pub const USER_NAME_MAX_LEN: usize = 255;
    pub const USER_NAME_MIN_LEN: usize = 1;

    /// User email field: VARCHAR(255) in database - used in HTTP auth, not WS
    pub const USER_EMAIL_MAX_LEN: usize = 255;

    /// User color field: VARCHAR(31) in database (hex colors like #ff5722)
    pub const USER_COLOR_MAX_LEN: usize = 31;
    pub const USER_COLOR_EXPECTED_LEN: usize = 7; // #rrggbb format

    /// Note state field: VARCHAR(31) in database
    pub const NOTE_STATE_MAX_LEN: usize = 31;
    pub const NOTE_STATE_MIN_LEN: usize = 1;
}

/// Custom validation functions using structured limits
pub mod validators {
    use super::{ValidationError, ValidationLimits};

    /// Validate text length for notes (allows empty for optional fields)
    pub fn validate_note_text(text: &str) -> Result<(), ValidationError> {
        if text.len() > ValidationLimits::NOTE_TEXT_MAX_LEN {
            return Err(ValidationError::TooLong {
                field: "note text",
                max_len: ValidationLimits::NOTE_TEXT_MAX_LEN,
                actual_len: text.len(),
            });
        }
        Ok(())
    }

    /// Validate user name (VARCHAR(255) in database)
    pub fn validate_user_name(name: &str) -> Result<(), ValidationError> {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return Err(ValidationError::Empty { field: "user name" });
        }
        if trimmed.len() < ValidationLimits::USER_NAME_MIN_LEN {
            return Err(ValidationError::TooShort {
                field: "user name",
                min_len: ValidationLimits::USER_NAME_MIN_LEN,
                actual_len: trimmed.len(),
            });
        }
        if name.len() > ValidationLimits::USER_NAME_MAX_LEN {
            return Err(ValidationError::TooLong {
                field: "user name",
                max_len: ValidationLimits::USER_NAME_MAX_LEN,
                actual_len: name.len(),
            });
        }
        Ok(())
    }

    /// Validate user email (VARCHAR(255) in database) - for future HTTP auth
    #[allow(dead_code)]
    pub fn validate_user_email(email: &str) -> Result<(), ValidationError> {
        let trimmed = email.trim();
        if trimmed.is_empty() {
            return Err(ValidationError::Empty { field: "email" });
        }
        if email.len() > ValidationLimits::USER_EMAIL_MAX_LEN {
            return Err(ValidationError::TooLong {
                field: "email",
                max_len: ValidationLimits::USER_EMAIL_MAX_LEN,
                actual_len: email.len(),
            });
        }
        // Basic email format validation (just check for @)
        if !email.contains('@') {
            return Err(ValidationError::InvalidFormat {
                field: "email",
                expected: "user@domain.com",
            });
        }
        Ok(())
    }

    /// Validate user color (VARCHAR(31) in database - should be hex color)
    pub fn validate_user_color(color: &str) -> Result<(), ValidationError> {
        if color.is_empty() {
            return Err(ValidationError::Empty { field: "color" });
        }
        if color.len() > ValidationLimits::USER_COLOR_MAX_LEN {
            return Err(ValidationError::TooLong {
                field: "color",
                max_len: ValidationLimits::USER_COLOR_MAX_LEN,
                actual_len: color.len(),
            });
        }
        // Validate hex color format (#rrggbb)
        if !color.starts_with('#') || color.len() != ValidationLimits::USER_COLOR_EXPECTED_LEN {
            return Err(ValidationError::InvalidFormat {
                field: "color",
                expected: "#rrggbb (e.g., #ff5722)",
            });
        }
        if !color[1..].chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(ValidationError::InvalidFormat {
                field: "color",
                expected: "#rrggbb (e.g., #ff5722)",
            });
        }
        Ok(())
    }

    /// Validate note state (VARCHAR(31) in database)
    pub fn validate_note_state(state: &str) -> Result<(), ValidationError> {
        let trimmed = state.trim();
        if trimmed.is_empty() {
            return Err(ValidationError::Empty { field: "state" });
        }
        if trimmed.len() < ValidationLimits::NOTE_STATE_MIN_LEN {
            return Err(ValidationError::TooShort {
                field: "state",
                min_len: ValidationLimits::NOTE_STATE_MIN_LEN,
                actual_len: trimmed.len(),
            });
        }
        if state.len() > ValidationLimits::NOTE_STATE_MAX_LEN {
            return Err(ValidationError::TooLong {
                field: "state",
                max_len: ValidationLimits::NOTE_STATE_MAX_LEN,
                actual_len: state.len(),
            });
        }
        Ok(())
    }

    /// Validate WebSocket action content against database constraints
    pub fn validate_ws_action_content(
        action: &crate::state::WsAction,
    ) -> Result<(), ValidationError> {
        use crate::state::WsAction;

        match action {
            WsAction::AddNote {
                text: Some(text),
                state,
                ..
            } => {
                validate_note_text(text)?;
                validate_note_state(state)?;
            }
            WsAction::AddNote {
                text: None, state, ..
            } => {
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

/// Common validation structs for API inputs - now using custom validation
#[cfg(test)]
#[derive(Debug, Deserialize)]
pub struct AddNoteInput {
    #[allow(dead_code)]
    pub owner: u32,
    pub state: String,
    pub text: Option<String>,
}

#[cfg(test)]
impl AddNoteInput {
    pub fn validate(&self) -> Vec<ValidationError> {
        let mut errors = Vec::new();

        if let Err(e) = validators::validate_note_state(&self.state) {
            errors.push(e);
        }

        if let Some(text) = &self.text {
            if let Err(e) = validators::validate_note_text(text) {
                errors.push(e);
            }
        }

        errors
    }
}

#[cfg(test)]
#[derive(Debug, Deserialize)]
pub struct AddUserInput {
    pub name: String,
    pub color: String,
}

#[cfg(test)]
impl AddUserInput {
    pub fn validate(&self) -> Vec<ValidationError> {
        let mut errors = Vec::new();

        if let Err(e) = validators::validate_user_name(&self.name) {
            errors.push(e);
        }

        if let Err(e) = validators::validate_user_color(&self.color) {
            errors.push(e);
        }

        errors
    }
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
        let long_text = "a".repeat(ValidationLimits::NOTE_TEXT_MAX_LEN + 1);
        assert!(validate_note_text(&long_text).is_err());

        // Text at exact limit should pass
        let max_text = "a".repeat(ValidationLimits::NOTE_TEXT_MAX_LEN);
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
        let long_name = "a".repeat(ValidationLimits::USER_NAME_MAX_LEN + 1);
        assert!(validate_user_name(&long_name).is_err());

        // Name at exact limit should pass
        let max_name = "a".repeat(ValidationLimits::USER_NAME_MAX_LEN);
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
        let long_color = "#".repeat(ValidationLimits::USER_COLOR_MAX_LEN + 1);
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
        let long_state = "a".repeat(ValidationLimits::NOTE_STATE_MAX_LEN + 1);
        assert!(validate_note_state(&long_state).is_err());

        // State at exact limit should pass
        let max_state = "a".repeat(ValidationLimits::NOTE_STATE_MAX_LEN);
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
        let long_email = format!(
            "{}@example.com",
            "a".repeat(ValidationLimits::USER_EMAIL_MAX_LEN)
        );
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
        assert!(valid_note.validate().is_empty());

        let invalid_note = AddNoteInput {
            owner: 1,
            state: "".to_string(), // Empty state should fail
            text: Some("Valid text".to_string()),
        };
        assert!(!invalid_note.validate().is_empty());

        // Test AddUserInput validation with proper hex color
        let valid_user = AddUserInput {
            name: "John Doe".to_string(),
            color: "#ff5722".to_string(), // Valid hex color
        };
        assert!(valid_user.validate().is_empty());

        let invalid_user = AddUserInput {
            name: "".to_string(), // Empty name should fail
            color: "#ff5722".to_string(),
        };
        assert!(!invalid_user.validate().is_empty());

        // Test invalid color format
        let invalid_color_user = AddUserInput {
            name: "John Doe".to_string(),
            color: "blue".to_string(), // Invalid color format
        };
        assert!(!invalid_color_user.validate().is_empty());
    }
}
