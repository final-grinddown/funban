use serde::{Deserialize, Serialize};
use crate::sql::note::MoveTarget;

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
#[serde(tag = "target")]
pub enum NoteUpdate {
    Text { text: String },
    Order { over_id: MoveTarget },
}