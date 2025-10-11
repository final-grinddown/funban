import typia from "typia"
import type { WsAction, WsNoteTag, WsNoteUpdate, WsMoveTarget, WsNoteState } from "@/schemas/websocket"

// Helper to create and validate a WsAction message
// Uses typia to validate the complete action before sending to server
function createAction<T extends WsAction>(action: T): string {
	typia.assert<WsAction>(action)
	return JSON.stringify(action)
}

export function createAddUserMessage(name: string, color: string): string {
	return createAction({
		type: "AddUser",
		uuid: null,
		name,
		color,
	})
}

export function createAddUserMark(
	userId: number,
	markType: string,
	expiresAfterStatusEnds: number,
	customText?: string,
	expiresAt?: string
): string {
	return createAction({
		type: "AddUserMark",
		uuid: null,
		user_id: userId,
		mark_type: markType,
		custom_text: customText ?? null,
		expires_after_status_ends: expiresAfterStatusEnds,
		expires_at: expiresAt ?? null,
	})
}

export function createUpdateUserNameMessage(id: number, name: string): string {
	return createAction({
		uuid: null,
		type: "UpdateUserName",
		id,
		name,
	})
}

export function createUpdateUserColorMessage(id: number, color: string): string {
	return createAction({
		uuid: null,
		type: "UpdateUserColor",
		id,
		color,
	})
}

export function createDeleteUser(id: number): string {
	return createAction({
		uuid: null,
		type: "RemoveUser",
		id,
	})
}

export function createNewNote(owner: string, text: string, state: string): string {
	return createAction({
		uuid: null,
		type: "AddNote",
		owner: parseInt(owner),
		state,
		text,
	})
}

export function createUpdateNote(id: string, text: string, destinationStatus: string): string {
	const updates: WsNoteUpdate[] = [
		{
			target: "Text",
			text: text,
		},
		{
			target: "Order",
			over_id: {
				type: "Last",
				state: destinationStatus as WsNoteState,
			},
		},
	]
	return createAction({
		uuid: null,
		type: "NoteUpdate",
		id: parseInt(id),
		updates,
	})
}

export function createUpdateNoteText(id: string, text: string): string {
	return createAction({
		uuid: null,
		type: "UpdateNoteText",
		id: parseInt(id),
		text,
	})
}

export function createUpdateNoteTag(id: string, tag: WsNoteTag | null): string {
	return createAction({
		uuid: null,
		type: "UpdateNoteTag",
		id: parseInt(id),
		tag,
	})
}

export function createUpdateNoteReorderBefore(id: string, over_id: number): string {
	const moveTarget: WsMoveTarget = {
		type: "Before",
		id: over_id,
	}
	return createAction({
		uuid: null,
		type: "Reorder",
		moved_item_id: parseInt(id),
		over_id: moveTarget,
	})
}

export function createUpdateNoteReorderLast(id: string, state: string): string {
	const moveTarget: WsMoveTarget = {
		type: "Last",
		state: state as WsNoteState,
	}
	return createAction({
		uuid: null,
		type: "Reorder",
		moved_item_id: parseInt(id),
		over_id: moveTarget,
	})
}

export function createDeleteNote(id: string): string {
	return createAction({
		uuid: null,
		type: "RemoveNote",
		id: parseInt(id),
	})
}

export function createDeleteNoteUserBulk(status: string, owner: number): string {
	return createAction({
		uuid: null,
		type: "DeleteNotes",
		owner,
		status,
	})
}

export function createDeleteNoteBulk(status: string): string {
	return createAction({
		uuid: null,
		type: "DeleteNotes",
		owner: null,
		status,
	})
}

export function createSplitNote(
	originalId: string,
	originalText: string,
	newText: string,
	newState?: string,
	newOwner?: string
): string {
	return createAction({
		uuid: null,
		type: "SplitNote",
		original_id: parseInt(originalId),
		original_text: originalText,
		new_text: newText,
		new_state: newState ?? null,
		new_owner: newOwner ? parseInt(newOwner) : null,
	})
}
