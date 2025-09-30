import type { MoveTarget as ContractMoveTarget } from "../../../contracts/MoveTarget"
import type { Note } from "../../../contracts/Note"
import type { NoteUpdate as ContractNoteUpdate } from "../../../contracts/NoteUpdate"
import type { User } from "../../../contracts/User"
import { TNoteState } from "./types"

// Re-export contract types for internal use
export type IUser = Omit<User, 'id' | 'index' | 'email'> & {
	id: number
}

export interface IUserAddedOperation {
	type: "UserAdded"
	user: IUser
}

export interface IPatchOperation {
	ops: IUserAddedOperation[]
}

export interface IWebSocketMessage {
	type: "Users" | "Notes" | "Patch"
	items?: IUser[]
	ops?: IPatchOperation[]
}

export interface IServerMessage {
	type: "Users" | "Notes" | "Patch"
}

export interface IAddUser {
	type: "AddUser"
	name: string
	color: string
}

export interface IUpdateUserName {
	type: "UpdateUserName"
	id: number
	name: string
}

export interface IUpdateUserColor {
	type: "UpdateUserColor"
	id: number
	color: string
}

export interface IRemoveUser {
	type: "RemoveUser"
	id: number
}

export type INote = Omit<Note, 'owner_id' | 'tag'> & {
	owner_id: number
	state: TNoteState
	tag: string | null
}

export interface IRawNote {
	id: string
	text: string
	state: TNoteState
	predecessor_id: string | null
	owner: {
		id: string
		name: string
		color: string
	}
	updated: string
	created: string
	tag: string | null
}

export interface IAddNote {
	type: "AddNote"
	owner: number
	state: string
	text: string
}

export interface IUpdateNote {
	type: "NoteUpdate"
	id: number
	updates: NoteUpdate[]
}

// Use contract types for updates
export type NoteUpdate = ContractNoteUpdate

export interface IUpdateNoteText {
	type: "UpdateNoteText"
	id: number
	text: string
}

export interface IUpdateNoteTag {
	type: "UpdateNoteTag"
	id: number
	tag: string | null
}

export interface IRemoveNote {
	type: "RemoveNote"
	id: number
}

export interface IRemoveNoteBulk {
	type: "DeleteNotes"
	owner?: number,
	status: string
}


export interface ISplitNote {
	type: "SplitNote"
	original_id: number
	original_text: string
	new_text: string
	new_state?: string
	new_owner?: number
}

export interface IUpdateReorderNote {
	type: "Reorder"
	moved_item_id: number
	over_id: MoveTarget
}

// Use contract types for move targets
export type MoveTarget = ContractMoveTarget

export type MoveTargetBefore = {
	type: "Before"
	id: number
}

export type MoveTargetLast = {
	type: "Last"
	state: string
}

export type DevSettings = {
	ids: boolean
	predecessors: boolean
}

export interface IHistoryItem {
	id: number
	created_at: string
	label: string
	snapshot: string
	previous: {
		id: number
		label: string
	}
	next: {
		id: number
		label: string
	}
}

export interface ISnapshotData {
	label: string
	notes: IRawNote[]
}

export interface IColumn {
	title: string
	orderKey: number
}

export interface IColumnData {
	title: string
	state: TNoteState
	items: INote[]
	orderKey: number
}

export interface ErrorWithCode {
	code: string
	message: string
}