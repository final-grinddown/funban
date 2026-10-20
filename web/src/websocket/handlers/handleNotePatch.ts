/**
 * Note Patch Handlers
 *
 * Handles all WebSocket operations related to notes (add, update, delete, reorder)
 */

import type { WsOperation } from "@/schemas/websocket"
import type { AppState } from "@/store"
import type { Note } from "@/utils/interfaces"

/**
 * Handles note-related WebSocket patch operations
 * @param op - The WebSocket operation to process
 * @param store - The Zustand store instance
 */
export function handleNotePatch(op: WsOperation, store: AppState): void {
  const { addNote, updateNote, removeNote } = store.board

  switch (op.type) {
    case "NoteAdded": {
      // Transform WsNote to Note (currently no transformation needed)
      const note: Note = op.note as Note
      addNote(note)
      break
    }

    case "NoteTextUpdated":
      updateNote(op.id, {
        text: op.text,
        updated: new Date().toISOString(),
      })
      break

    case "NoteTagChanged":
      updateNote(op.id, {
        tag: op.tag,
        updated: new Date().toISOString(),
      })
      break

    case "NoteOrderChanged":
      updateNote(op.id, {
        state: op.state,
        predecessor_id: op.predecessor_id,
        updated: new Date().toISOString(),
      })
      break

    case "NoteRemoved":
      removeNote(op.id)
      break
  }
}
