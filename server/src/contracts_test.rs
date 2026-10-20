//! TypeScript contract generation test
//! This test file exists solely to trigger ts-rs contract generation
//! without requiring database connections or extensive test fixtures.

#[cfg(test)]
mod tests {
    use crate::model::{note::*, release::*, user::*};
    use crate::sql::note::MoveTarget;
    use crate::state::{NoteUpdate, UserUpdate, WsAction, WsOperation};

    #[test]
    fn generate_typescript_contracts() {
        // This test exists to trigger ts-rs contract generation
        // The contracts are generated via the #[ts(export)] annotations
        // on the types imported above.

        // We don't need to do anything here - just importing the types
        // with #[ts(export)] annotations will trigger the generation
        // when this test runs.

        // Verify the types are accessible (this will compile-check the imports)
        let _note: Option<Note> = None;
        let _user: Option<User> = None;
        let _move_target: Option<MoveTarget> = None;
        let _ws_action: Option<WsAction> = None;
        let _ws_operation: Option<WsOperation> = None;
        let _note_update: Option<NoteUpdate> = None;
        let _user_update: Option<UserUpdate> = None;
        let _note_tag: Option<NoteTag> = None;
        let _note_state: Option<NoteState> = None;
        let _release: Option<Release> = None;
        let _release_insert: Option<ReleaseInsert> = None;
        let _release_type: Option<ReleaseType> = None;

        // Test passes if compilation succeeds
        assert!(true);
    }
}
