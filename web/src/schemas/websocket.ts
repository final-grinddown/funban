/**
 * WebSocket Type Exports
 *
 * This file re-exports contract types for use throughout the application.
 * All types are generated from Rust backend types and validated at runtime using typia.
 *
 * All contract types are prefixed with "Ws" and use bigint for IDs as they come from Rust.
 * App types (Note, User) use number for IDs and are defined in @/utils/interfaces.
 */

// Re-export all contract types with Ws prefix for consistency
export type { WsAction } from '../../../contracts/WsAction'
export type { WsOperation } from '../../../contracts/WsOperation'
export type { Note as WsNote } from '../../../contracts/Note'
export type { User as WsUser } from '../../../contracts/User'
export type { NoteTag as WsNoteTag } from '../../../contracts/NoteTag'
export type { NoteUpdate as WsNoteUpdate } from '../../../contracts/NoteUpdate'
export type { UserUpdate as WsUserUpdate } from '../../../contracts/UserUpdate'
export type { MoveTarget as WsMoveTarget } from '../../../contracts/MoveTarget'
