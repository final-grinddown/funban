use crate::sql::note::MoveTarget;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
#[serde(tag = "target")]
pub enum NoteUpdate {
    Text { text: String },
    Order { over_id: MoveTarget },
}
