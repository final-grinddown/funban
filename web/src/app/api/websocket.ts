import type { WsAction, WsNoteTag } from "@/schemas/websocket"

// Helper to create a WsAction message with optional UUID
function createAction(action: any): string {
	return JSON.stringify({ uuid: null, ...action })
}

export function createAddUserMessage(name: string, color: string): string {
	return createAction({
		type: "AddUser",
		name,
		color,
	})
}

export function createUpdateUserNameMessage(id: number, name: string): string {
	return createAction({
		type: "UpdateUserName",
		id,
		name,
	})
}

export function createUpdateUserColorMessage(id: number, color: string): string {
	return createAction({
		type: "UpdateUserColor",
		id,
		color,
	})
}

export function createDeleteUser(id: number): string {
	return createAction({
		type: "RemoveUser",
		id,
	})
}

export function createNewNote(owner: string, text: string, state: string): string {
	return createAction({
		type: "AddNote",
		owner: parseInt(owner),
		state,
		text,
	})
}

export function createUpdateNote(id: string, text: string, destinationStatus: string): string {
	return createAction({
		type: "NoteUpdate",
		id: parseInt(id),
		updates: [
			{
				target: "Text",
				text: text,
			},
			{
				target: "Order",
				over_id: {
					type: "Last",
					state: destinationStatus,
				},
			},
		],
	})
}

export function createUpdateNoteText(id: string, text: string): string {
	return createAction({
		type: "UpdateNoteText",
		id: parseInt(id),
		text,
	})
}

export function createUpdateNoteTag(id: string, tag: WsNoteTag | null): string {
	return createAction({
		type: "UpdateNoteTag",
		id: parseInt(id),
		tag,
	})
}

export function createUpdateNoteReorderBefore(id: string, over_id: number): string {
	return createAction({
		type: "Reorder",
		moved_item_id: parseInt(id),
		over_id: {
			type: "Before",
			id: over_id,
		},
	})
}

export function createUpdateNoteReorderLast(id: string, state: string): string {
	return createAction({
		type: "Reorder",
		moved_item_id: parseInt(id),
		over_id: {
			type: "Last",
			state,
		},
	})
}

export function createDeleteNote(id: string): string {
	return createAction({
		type: "RemoveNote",
		id: parseInt(id),
	})
}

export function createDeleteNoteUserBulk(status: string, owner: number): string {
	return createAction({
		type: "DeleteNotes",
		owner,
		status,
	})
}

export function createDeleteNoteBulk(status: string): string {
	return createAction({
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
		type: "SplitNote",
		original_id: parseInt(originalId),
		original_text: originalText,
		new_text: newText,
		new_state: newState ?? null,
		new_owner: newOwner ? parseInt(newOwner) : null,
	})
}
