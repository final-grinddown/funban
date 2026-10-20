/**
 * User Mark Patch Handlers
 *
 * Handles all WebSocket operations related to user marks (add, update, delete)
 */

import type { WsOperation } from "@/schemas/websocket"
import type { AppState } from "@/store"

/**
 * Handles user mark-related WebSocket patch operations
 * @param op - The WebSocket operation to process
 * @param store - The Zustand store instance
 */
export function handleUserMarkPatch(op: WsOperation, store: AppState): void {
  const { addUserMark, updateUserMark, removeUserMark } = store.board

  switch (op.type) {
    case "UserMarkAdded":
      addUserMark(op.user_id, {
        id: op.mark_id,
        user_id: op.user_id,
        mark_type: op.mark_type,
        custom_text: op.custom_text,
        expires_after_status_ends: op.expires_after_status_ends,
        expires_at: op.expires_at,
      })
      break

    case "UserMarkUpdated":
      updateUserMark(op.user_id, op.mark_id, {
        id: op.mark_id,
        user_id: op.user_id,
        mark_type: op.mark_type,
        custom_text: op.custom_text,
        expires_after_status_ends: op.expires_after_status_ends,
        expires_at: op.expires_at,
      })
      break

    case "UserMarkRemoved":
      removeUserMark(op.user_id, op.mark_id)
      break
  }
}
