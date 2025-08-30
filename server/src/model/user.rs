use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Default, Debug, Clone, PartialEq)]
pub struct User {
    pub id: i64,
    pub index: i64,
    pub name: String,
    pub color: String,
    pub email: String,
}
