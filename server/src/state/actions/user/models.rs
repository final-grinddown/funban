use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
#[serde(tag = "target")]
pub enum UserUpdate {
    Name { name: String },
    Color { color: String },
}
