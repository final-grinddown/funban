/**
 * WebSocket Type Exports
 *
 * This file re-exports contract types for use throughout the application.
 * All types are generated from Rust backend types and validated at runtime using typia.
 *
 * All contract types are prefixed with "Ws" for consistency.
 * Contract types now use number for IDs (Rust i32 → TS number).
 */

// Re-export all contract types with Ws prefix for consistency
export type { WsAction } from "../../../contracts/WsAction"
export type { WsOperation } from "../../../contracts/WsOperation"
export type { Note as WsNote } from "../../../contracts/Note"
export type { User as WsUser } from "../../../contracts/User"
export type { NoteTag as WsNoteTag } from "../../../contracts/NoteTag"
export type { NoteState as WsNoteState } from "../../../contracts/NoteState"
export type { NoteUpdate as WsNoteUpdate } from "../../../contracts/NoteUpdate"
export type { UserUpdate as WsUserUpdate } from "../../../contracts/UserUpdate"
export type { MoveTarget as WsMoveTarget } from "../../../contracts/MoveTarget"
