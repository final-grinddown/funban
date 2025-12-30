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
 * @param setIsLoading - Function to update loading state
 */
export function handleActionPatch(op: WsOperation, store: AppState, setIsLoading: (loading: boolean) => void): void {
  const { finishAsync } = store.actions

  switch (op.type) {
    case "ActionFinished":
      finishAsync(op.uuid)
      setIsLoading(false)
      break

    case "Error":
      console.error("WebSocket error:", op.message)
      if (op.uuid) {
        finishAsync(op.uuid)
      }
      setIsLoading(false)
      break

    case "SnapshotCreated":
      // Handle snapshot creation notification
      // Currently no action needed - backend has created a snapshot
      break
  }
}
