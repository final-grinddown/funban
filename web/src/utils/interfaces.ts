import { Session } from "next-auth"
import { JWT } from "next-auth/jwt"
import { TNoteState } from "./types"

export interface IExtendedSession extends Session {
	accessToken?: string
}

export interface IExtendedJWT extends JWT {
	accessToken?: string
}

export interface IUser {
	id: number
	name: string
	color: string
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

export interface INote {
	id: number
	text: string
	name: string
	owner_id: number
	color: string
	state: TNoteState
	predecessor_id: number | null
	updated: string
	created: string
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

export type NoteUpdate =
	| {
		target: "Text"
		text: string
	}
	| {
		target: "Order"
		over_id: MoveTarget
	}

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

export interface ICloneNote {
	type: "CloneNote"
	id: number
}

export interface IUpdateReorderNote {
	type: "Reorder"
	moved_item_id: number
	over_id: MoveTarget
}

export type MoveTarget = MoveTargetBefore | MoveTargetLast

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