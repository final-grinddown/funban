import type { WsNote, WsUser, WsNoteTag } from "@/schemas/websocket"
import { TNoteState } from "./types"

// App types with number IDs (transformed from contract bigint IDs)
export type User = Omit<WsUser, 'id' | 'index'> & {
	id: number
	index: number
}
export type Note = Omit<WsNote, 'owner_id'> & {
	owner_id: number
	state: TNoteState  // TODO: Make this an enum in Rust to remove cast
	tag: WsNoteTag | null
}

// Re-export contract types for WebSocket message handling
export type { WsNote, WsUser, WsNoteTag, WsNoteUpdate, WsUserUpdate, WsMoveTarget } from "@/schemas/websocket"

export interface IPatchOperation {
	ops: { type: "UserAdded"; user: User }[]
}

export interface IWebSocketMessage {
	type: "Users" | "Notes" | "Patch"
	items?: User[]
	ops?: IPatchOperation[]
}

export interface IServerMessage {
	type: "Users" | "Notes" | "Patch"
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
	items: Note[]
	orderKey: number
}

export interface ErrorWithCode {
	code: string
	message: string
}
