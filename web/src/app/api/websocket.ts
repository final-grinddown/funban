import {
	AddNote,
	AddUser,
	RemoveNote,
	DeleteNotes,
	RemoveUser,
	SplitNote,
	NoteUpdate,
	UpdateNoteTag,
	UpdateNoteText,
	Reorder,
	UpdateUserColor,
	UpdateUserName,
} from "@/schemas/websocket"

export function createAddUserMessage(name: string, color: string): string {
	const action: AddUser = {
		type: "AddUser",
		uuid: undefined,
		name,
		color,
	}

	return JSON.stringify(action)
}

export function createUpdateUserNameMessage(id: number, name: string): string {
	const action: UpdateUserName = {
		type: "UpdateUserName",
		uuid: undefined,
		id,
		name,
	}

	return JSON.stringify(action)
}

export function createUpdateUserColorMessage(id: number, color: string): string {
	const action: UpdateUserColor = {
		type: "UpdateUserColor",
		uuid: undefined,
		id: id,
		color: color,
	}

	return JSON.stringify(action)
}

export function createDeleteUser(id: number): string {
	const action: RemoveUser = {
		type: "RemoveUser",
		uuid: undefined,
		id: id,
	}

	return JSON.stringify(action)
}

export function createNewNote(owner: string, text: string, state: string): string {
	const action: AddNote = {
		type: "AddNote",
		uuid: undefined,
		owner: parseInt(owner),
		state,
		text,
	}

	return JSON.stringify(action)
}

export function createUpdateNote(id: string, text: string, destinationStatus: string): string {
	const action: NoteUpdate = {
		type: "NoteUpdate",
		uuid: undefined,
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
	}

	return JSON.stringify(action)
}

export function createUpdateNoteText(id: string, text: string): string {
	const action: UpdateNoteText = {
		type: "UpdateNoteText",
		uuid: undefined,
		id: parseInt(id),
		text,
	}

	return JSON.stringify(action)
}

export function createUpdateNoteTag(id: string, tag: string | null): string {
	const action: UpdateNoteTag = {
		type: "UpdateNoteTag",
		uuid: undefined,
		id: parseInt(id),
		tag: tag as any, // TODO: Fix tag type mapping
	}

	return JSON.stringify(action)
}

export function createUpdateNoteReorderBefore(id: string, over_id: number): string {
	const action: Reorder = {
		type: "Reorder",
		uuid: undefined,
		moved_item_id: parseInt(id),
		over_id: {
			type: "Before",
			id: over_id,
		},
	}

	return JSON.stringify(action)
}

export function createUpdateNoteReorderLast(id: string, state: string): string {
	const action: Reorder = {
		type: "Reorder",
		uuid: undefined,
		moved_item_id: parseInt(id),
		over_id: {
			type: "Last",
			state,
		},
	}

	return JSON.stringify(action)
}

export function createDeleteNote(id: string): string {
	const action: RemoveNote = {
		type: "RemoveNote",
		uuid: undefined,
		id: parseInt(id),
	}

	return JSON.stringify(action)
}

export function createDeleteNoteUserBulk(status: string, owner: number): string {
	const action: DeleteNotes = {
		type: "DeleteNotes",
		uuid: undefined,
		owner,
		status,
	}

	return JSON.stringify(action)
}

export function createDeleteNoteBulk(status: string): string {
	const action: DeleteNotes = {
		type: "DeleteNotes",
		uuid: undefined,
		owner: undefined,
		status,
	}

	return JSON.stringify(action)
}


export function createSplitNote(
	originalId: string,
	originalText: string,
	newText: string,
	newState?: string,
	newOwner?: string
): string {
	const action: SplitNote = {
		type: "SplitNote",
		uuid: undefined,
		original_id: parseInt(originalId),
		original_text: originalText,
		new_text: newText,
		new_state: newState,
		new_owner: newOwner ? parseInt(newOwner) : undefined,
	}

	return JSON.stringify(action)
}
