use crate::sql::note::MoveTarget;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone, TS)]
#[ts(export, export_to = "../contracts/")]
#[serde(tag = "target")]
pub enum NoteUpdate {
    Text { text: String },
    Order { over_id: MoveTarget },
}
