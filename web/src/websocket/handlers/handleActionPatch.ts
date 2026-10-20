/**
 * Action Patch Handlers
 *
 * Handles WebSocket operations related to async actions (success, error, snapshot)
 */

import type { WsOperation } from "@/schemas/websocket"
import type { AppState } from "@/store"

/**
 * Handles action-related WebSocket patch operations
 * @param op - The WebSocket operation to process
 * @param store - The Zustand store instance
 */
export function handleActionPatch(op: WsOperation, store: AppState): void {
  const { finishAsync, failAsync } = store.actions

  switch (op.type) {
    case "ActionFinished":
      finishAsync(op.uuid)
      break

    case "Error":
      if (op.uuid) {
        failAsync(op.uuid, op.message || undefined)
      }
      break

    case "SnapshotCreated":
      break
  }
}
