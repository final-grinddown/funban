use crate::http::Result;

use crate::sql::{self, user::UserDto};
use axum::{routing::get, Extension, Json, Router};

use serde::Serialize;

use crate::http::ApiContext;

#[derive(Debug, Serialize, Clone)]
pub struct User {
    id: i64,
    name: String,
    color: String,
}

impl From<UserDto> for User {
    fn from(user: UserDto) -> Self {
        User {
            id: user.id,
            name: user.name,
            color: user.color,
        }
    }
}

pub fn router() -> Router {
    Router::new().route("/user", get(get_all))
    // .route("/api/room/:code", method_routing::get(get))
}

async fn get_all(ctx: Extension<ApiContext>) -> Result<Json<Vec<User>>> {
    let from_db = sql::user::read_all(&ctx.db).await;

    match from_db {
        Ok(users) => {
            let result = users.into_iter().map(User::from).collect();
            Ok(Json(result))
        }
        Err(_) => Ok(Json(vec![])),
    }
}
