use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Serialize, Deserialize, Default, Debug, Clone, PartialEq, TS)]
#[ts(export)]
pub struct User {
    pub id: i32,
    pub index: i32,
    pub name: String,
    pub color: String,
    pub email: String,
}
