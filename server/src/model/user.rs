use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Serialize, Deserialize, Default, Debug, Clone, PartialEq, TS)]
#[ts(export, export_to = "../contracts/")]
pub struct User {
    pub id: i64,
    pub index: i64,
    pub name: String,
    pub color: String,
    pub email: String,
}
