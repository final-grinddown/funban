/**
 * Zod schemas for WebSocket messages
 *
 * These schemas define what the frontend expects from WebSocket messages.
 * They are tested against the auto-generated contracts to ensure compatibility.
 *
 * When contract tests fail, it means either:
 * 1. Backend changed and we need to update our expectations (schemas)
 * 2. Backend broke compatibility and needs to be fixed
 */

import { z } from 'zod'

// Base schemas for reusable types
export const UuidSchema = z.string().optional().nullable()
export const NoteTagSchema = z.enum(['Important', 'Deadline', 'Waiting', 'Quick']).nullable()

// Move target schemas
export const MoveTargetBeforeSchema = z.object({
  type: z.literal('Before'),
  id: z.number(),
})

export const MoveTargetLastSchema = z.object({
  type: z.literal('Last'),
  state: z.string(),
})

export const MoveTargetSchema = z.union([
  MoveTargetBeforeSchema,
  MoveTargetLastSchema,
])

// Note update schemas
export const NoteUpdateTextSchema = z.object({
  target: z.literal('Text'),
  text: z.string(),
})

export const NoteUpdateOrderSchema = z.object({
  target: z.literal('Order'),
  over_id: MoveTargetSchema,
})

export const NoteUpdateSchema = z.union([
  NoteUpdateTextSchema,
  NoteUpdateOrderSchema,
])

// User update schemas
export const UserUpdateNameSchema = z.object({
  target: z.literal('Name'),
  name: z.string(),
})

export const UserUpdateColorSchema = z.object({
  target: z.literal('Color'),
  color: z.string(),
})

export const UserUpdateSchema = z.union([
  UserUpdateNameSchema,
  UserUpdateColorSchema,
])

// WebSocket Action schemas (frontend → backend)
export const AddNoteSchema = z.object({
  type: z.literal('AddNote'),
  uuid: UuidSchema,
  owner: z.number(),
  state: z.string(),
  text: z.string().optional().nullable(),
})

export const UpdateNoteTextSchema = z.object({
  type: z.literal('UpdateNoteText'),
  uuid: UuidSchema,
  id: z.number(),
  text: z.string(),
})

export const UpdateNoteTagSchema = z.object({
  type: z.literal('UpdateNoteTag'),
  uuid: UuidSchema,
  id: z.number(),
  tag: NoteTagSchema,
})

export const ReorderSchema = z.object({
  type: z.literal('Reorder'),
  uuid: UuidSchema,
  moved_item_id: z.number(),
  over_id: MoveTargetSchema,
})

export const RemoveNoteSchema = z.object({
  type: z.literal('RemoveNote'),
  uuid: UuidSchema,
  id: z.number(),
})

export const AddUserSchema = z.object({
  type: z.literal('AddUser'),
  uuid: UuidSchema,
  name: z.string(),
  color: z.string(),
})

export const UpdateUserNameSchema = z.object({
  type: z.literal('UpdateUserName'),
  uuid: UuidSchema,
  id: z.number(),
  name: z.string(),
})

export const UpdateUserColorSchema = z.object({
  type: z.literal('UpdateUserColor'),
  uuid: UuidSchema,
  id: z.number(),
  color: z.string(),
})

export const RemoveUserSchema = z.object({
  type: z.literal('RemoveUser'),
  uuid: UuidSchema,
  id: z.number(),
})

export const DeleteNotesSchema = z.object({
  type: z.literal('DeleteNotes'),
  uuid: UuidSchema,
  owner: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
})

export const NoteUpdateMessageSchema = z.object({
  type: z.literal('NoteUpdate'),
  uuid: UuidSchema,
  id: z.number(),
  updates: z.array(NoteUpdateSchema),
})

export const UserUpdateMessageSchema = z.object({
  type: z.literal('UserUpdate'),
  uuid: UuidSchema,
  id: z.number(),
  updates: z.array(UserUpdateSchema),
})

export const NotifySnapshotSchema = z.object({
  type: z.literal('NotifySnapshot'),
})

export const SplitNoteSchema = z.object({
  type: z.literal('SplitNote'),
  uuid: UuidSchema,
  original_id: z.number(),
  original_text: z.string(),
  new_text: z.string(),
  new_state: z.string().optional().nullable(),
  new_owner: z.number().optional().nullable(),
})

// Union of all WebSocket actions
export const WsActionSchema = z.union([
  AddNoteSchema,
  UpdateNoteTextSchema,
  UpdateNoteTagSchema,
  ReorderSchema,
  RemoveNoteSchema,
  AddUserSchema,
  UpdateUserNameSchema,
  UpdateUserColorSchema,
  RemoveUserSchema,
  DeleteNotesSchema,
  NoteUpdateMessageSchema,
  UserUpdateMessageSchema,
  NotifySnapshotSchema,
  SplitNoteSchema,
])

// WebSocket Operation schemas (backend → frontend)
export const NoteSchema = z.object({
  id: z.number(),
  owner: z.number(),
  state: z.string(),
  text: z.string(),
  tag: NoteTagSchema,
  predecessor_id: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  index: z.number(),
})

export const NoteAddedSchema = z.object({
  type: z.literal('NoteAdded'),
  note: NoteSchema,
})

export const NoteTextUpdatedSchema = z.object({
  type: z.literal('NoteTextUpdated'),
  id: z.number(),
  text: z.string(),
})

export const NoteOrderChangedSchema = z.object({
  type: z.literal('NoteOrderChanged'),
  id: z.number(),
  state: z.string(),
  predecessor_id: z.number().nullable(),
})

export const NoteTagChangedSchema = z.object({
  type: z.literal('NoteTagChanged'),
  id: z.number(),
  tag: NoteTagSchema,
})

export const NoteRemovedSchema = z.object({
  type: z.literal('NoteRemoved'),
  id: z.number(),
})

export const UserAddedSchema = z.object({
  type: z.literal('UserAdded'),
  user: UserSchema,
})

export const UserNameUpdatedSchema = z.object({
  type: z.literal('UserNameUpdated'),
  id: z.number(),
  name: z.string(),
})

export const UserColorUpdatedSchema = z.object({
  type: z.literal('UserColorUpdated'),
  id: z.number(),
  color: z.string(),
})

export const UserRemovedSchema = z.object({
  type: z.literal('UserRemoved'),
  id: z.number(),
})

export const ActionFinishedSchema = z.object({
  type: z.literal('ActionFinished'),
  uuid: z.string(),
})

export const SnapshotCreatedSchema = z.object({
  type: z.literal('SnapshotCreated'),
})

export const ErrorSchema = z.object({
  type: z.literal('Error'),
  uuid: z.string().nullable(),
  message: z.string(),
})

// Union of all WebSocket operations
export const WsOperationSchema = z.union([
  NoteAddedSchema,
  NoteTextUpdatedSchema,
  NoteOrderChangedSchema,
  NoteTagChangedSchema,
  NoteRemovedSchema,
  UserAddedSchema,
  UserNameUpdatedSchema,
  UserColorUpdatedSchema,
  UserRemovedSchema,
  ActionFinishedSchema,
  SnapshotCreatedSchema,
  ErrorSchema,
])

// Type exports for use in application code
export type WsAction = z.infer<typeof WsActionSchema>
export type WsOperation = z.infer<typeof WsOperationSchema>
export type AddNote = z.infer<typeof AddNoteSchema>
export type UpdateNoteText = z.infer<typeof UpdateNoteTextSchema>
export type UpdateNoteTag = z.infer<typeof UpdateNoteTagSchema>
export type Reorder = z.infer<typeof ReorderSchema>
export type RemoveNote = z.infer<typeof RemoveNoteSchema>
export type AddUser = z.infer<typeof AddUserSchema>
export type UpdateUserName = z.infer<typeof UpdateUserNameSchema>
export type UpdateUserColor = z.infer<typeof UpdateUserColorSchema>
export type RemoveUser = z.infer<typeof RemoveUserSchema>
export type DeleteNotes = z.infer<typeof DeleteNotesSchema>
export type NoteUpdate = z.infer<typeof NoteUpdateMessageSchema>
export type UserUpdate = z.infer<typeof UserUpdateMessageSchema>
export type NotifySnapshot = z.infer<typeof NotifySnapshotSchema>
export type SplitNote = z.infer<typeof SplitNoteSchema>