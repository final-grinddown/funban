use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
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

/// Text validation constants
#[allow(dead_code)]
pub const MAX_NOTE_TEXT_LENGTH: usize = 5000;
#[allow(dead_code)]
pub const MAX_USER_NAME_LENGTH: usize = 100;
#[allow(dead_code)]
pub const MIN_PASSWORD_LENGTH: usize = 8;

/// Custom validation functions
#[allow(dead_code)]
pub mod validators {
    use validator::ValidationError;

    /// Validate text length for notes (allows empty for optional fields)
    pub fn validate_note_text(text: &str) -> Result<(), ValidationError> {
        if text.len() > super::MAX_NOTE_TEXT_LENGTH {
            return Err(ValidationError::new("text_too_long"));
        }
        Ok(())
    }

    /// Validate required text length for notes
    pub fn validate_required_note_text(text: &str) -> Result<(), ValidationError> {
        if text.is_empty() {
            return Err(ValidationError::new("empty_text"));
        }
        if text.len() > super::MAX_NOTE_TEXT_LENGTH {
            return Err(ValidationError::new("text_too_long"));
        }
        Ok(())
    }

    /// Validate user name
    pub fn validate_user_name(name: &str) -> Result<(), ValidationError> {
        if name.trim().is_empty() {
            return Err(ValidationError::new("empty_name"));
        }
        if name.len() > super::MAX_USER_NAME_LENGTH {
            return Err(ValidationError::new("name_too_long"));
        }
        Ok(())
    }

    /// Validate password strength
    pub fn validate_password_strength(password: &str) -> Result<(), ValidationError> {
        if password.len() < super::MIN_PASSWORD_LENGTH {
            return Err(ValidationError::new("password_too_short"));
        }

        let has_letter = password.chars().any(|c| c.is_alphabetic());
        let has_number = password.chars().any(|c| c.is_numeric());

        if !has_letter || !has_number {
            return Err(ValidationError::new("password_weak"));
        }

        Ok(())
    }
}

/// Common validation structs for API inputs
#[allow(dead_code)]
#[derive(Debug, Deserialize, Validate)]
pub struct AddNoteInput {
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

/// Middleware to validate request bodies
#[allow(dead_code)]
pub async fn validation_middleware(request: Request, next: Next) -> Response {
    // For now, this is a placeholder for request-level validation
    // Individual endpoints handle their own validation
    next.run(request).await
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

        // Too long text should fail
        let long_text = "a".repeat(MAX_NOTE_TEXT_LENGTH + 1);
        assert!(validate_note_text(&long_text).is_err());

        // Test required text validation
        assert!(validate_required_note_text("Valid text").is_ok());
        assert!(validate_required_note_text("").is_err());
    }

    #[test]
    fn test_user_name_validation() {
        // Valid name
        assert!(validate_user_name("John Doe").is_ok());

        // Empty name should fail
        assert!(validate_user_name("").is_err());
        assert!(validate_user_name("   ").is_err());

        // Too long name should fail
        let long_name = "a".repeat(MAX_USER_NAME_LENGTH + 1);
        assert!(validate_user_name(&long_name).is_err());
    }

    #[test]
    fn test_password_validation() {
        // Valid passwords
        assert!(validate_password_strength("password123").is_ok());
        assert!(validate_password_strength("MySecure1Pass").is_ok());

        // Too short
        assert!(validate_password_strength("short1").is_err());

        // No numbers
        assert!(validate_password_strength("onlyletters").is_err());

        // No letters
        assert!(validate_password_strength("12345678").is_err());
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
