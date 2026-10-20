use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

/// A common error type that can be used throughout the API.
///
/// Can be returned in a `Result` from an API handler function.
///
/// For convenience, this represents both API errors as well as internal recoverable errors,
/// and maps them to appropriate status codes along with at least a minimally useful error
/// message in a plain text body, or a JSON body in the case of `UnprocessableEntity`.
#[derive(thiserror::Error, Debug)]
pub enum Error {
    /// Return `404 Not Found`
    #[error("request path not found")]
    NotFound,

    /// Automatically return `500 Internal Server Error` on a `sqlx::Error`.
    ///
    /// Via the generated `From<sqlx::Error> for Error` impl,
    /// this allows using `?` on database calls in handler functions without a manual mapping step.
    ///
    /// I highly recommend creating an error type like this if only to make handler function code
    /// nicer; code in Actix-web projects that we started before I settled on this pattern is
    /// filled with `.map_err(ErrInternalServerError)?` which is a *ton* of unnecessary noise.
    ///
    /// The actual error message isn't returned to the client for security reasons.
    /// It should be logged instead.
    ///
    /// Note that this could also contain database constraint errors, which should usually
    /// be transformed into client errors (e.g. `422 Unprocessable Entity` or `409 Conflict`).
    /// See `ResultExt` below for a convenient way to do this.
    #[error("an error occurred with the database")]
    Sqlx(#[from] sqlx::Error),

    /// Return `500 Internal Server Error` on a `anyhow::Error`.
    ///
    /// `anyhow::Error` is used in a few places to capture context and backtraces
    /// on unrecoverable (but technically non-fatal) errors which could be highly useful for
    /// debugging. We use it a lot in our code for background tasks or making API calls
    /// to external services so we can use `.context()` to refine the logged error.
    ///
    /// Via the generated `From<anyhow::Error> for Error` impl, this allows the
    /// use of `?` in handler functions to automatically convert `anyhow::Error` into a response.
    ///
    /// Like with `Error::Sqlx`, the actual error message is not returned to the client
    /// for security reasons.
    #[error("an internal server error occurred")]
    Anyhow(#[from] anyhow::Error),

    #[error("OpenAPI error")]
    OpenApi,

    #[error("Jwt error")]
    Jwt(#[from] jsonwebtoken::errors::Error),

    #[error("{0}")]
    Unauthorized(String),

    #[error("Bad Request: {0}")]
    BadRequest(String),

    /// Return `409 Conflict`, e.g. on a unique constraint violation
    #[error("{0}")]
    Conflict(String),

    #[error("{0}")]
    Internal(String),
}

impl Error {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::Sqlx(_) | Self::Anyhow(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::OpenApi => StatusCode::INTERNAL_SERVER_ERROR,
            Self::Jwt(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::Conflict(_) => StatusCode::CONFLICT,
        }
    }
}

#[derive(Debug, Serialize)]
struct Message {
    message: String,
}

impl Message {
    fn new(message: &str) -> Self {
        Self {
            message: message.to_string(),
        }
    }
}

/// Axum allows you to return `Result` from handler functions, but the error type
/// also must be some sort of response type.
///
/// By default, the generated `Display` impl is used to return a plaintext error message
/// to the client.
impl IntoResponse for Error {
    fn into_response(self) -> Response {
        match self {
            Self::Sqlx(ref e) => match e {
                sqlx::Error::RowNotFound => {
                    tracing::warn!("SQLx: Row not found");
                    return (StatusCode::NOT_FOUND, Json(Message::new("Row not found")))
                        .into_response();
                }
                _ => tracing::error!("SQLx: {}", e),
            },

            Self::Anyhow(ref e) => {
                tracing::error!("{}", e);
            }
            Self::BadRequest(ref e) => {
                return (StatusCode::BAD_REQUEST, e.to_string()).into_response();
            }

            // Other errors get mapped normally.
            _ => (),
        }

        (self.status_code(), self.to_string()).into_response()
    }
}
