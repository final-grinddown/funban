use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone, TS)]
#[ts(export, export_to = "../contracts/")]
#[serde(tag = "target")]
pub enum UserUpdate {
    Name { name: String },
    Color { color: String },
}
