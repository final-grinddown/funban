import type { WsNote, WsUser, WsNoteState } from "@/schemas/websocket"

// Release contract types (REST only)
export type { Release } from "../../../contracts/Release"
export type { ReleaseType } from "../../../contracts/ReleaseType"
export type { ReleaseInsert } from "../../../contracts/ReleaseInsert"

/** Minimal user shape returned by `GET /user` */
export interface ITeamMember {
  id: number
  name: string
  color: string
}

// App types - contracts now use number for IDs (Rust i32 → TS number)
export type User = WsUser
export type Note = WsNote

// Re-export contract types for WebSocket message handling
export type {
  WsNote,
  WsUser,
  WsNoteTag,
  WsNoteState,
  WsNoteUpdate,
  WsUserUpdate,
  WsMoveTarget,
} from "@/schemas/websocket"

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
  state: WsNoteState
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
  version: number
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
  state: WsNoteState
  items: Note[]
  orderKey: number
}

export interface ErrorWithCode {
  code: string
  message: string
}
