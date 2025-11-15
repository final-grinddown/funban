/**
 * WebSocket Patch Handlers
 *
 * Central module for dispatching WebSocket operations to specialized handlers.
 * Each handler module focuses on a specific domain (notes, users, user marks, actions).
 */

import type { WsOperation } from "@/schemas/websocket"
import type { AppState } from "@/store"
import { handleActionPatch } from "./handleActionPatch"
import { handleNotePatch } from "./handleNotePatch"
import { handleUserMarkPatch } from "./handleUserMarkPatch"
import { handleUserPatch } from "./handleUserPatch"

/**
 * Dispatches a WebSocket operation to the appropriate handler
 * @param op - The WebSocket operation to process
 * @param store - The Zustand store instance
 * @param setIsLoading - Function to update loading state
 */
export function dispatchPatchOperation(
  op: WsOperation,
  store: AppState,
  setIsLoading: (loading: boolean) => void
): void {
  // Classify operation by type and dispatch to appropriate handler
  switch (op.type) {
    // Note operations
    case "NoteAdded":
    case "NoteTextUpdated":
    case "NoteTagChanged":
    case "NoteOrderChanged":
    case "NoteRemoved":
      handleNotePatch(op, store)
      break

    // User operations
    case "UserAdded":
    case "UserNameUpdated":
    case "UserColorUpdated":
    case "UserRemoved":
      handleUserPatch(op, store)
      break

    // User mark operations
    case "UserMarkAdded":
    case "UserMarkUpdated":
    case "UserMarkRemoved":
      handleUserMarkPatch(op, store)
      break

    // Action operations (async completion, errors, snapshots)
    case "ActionFinished":
    case "Error":
    case "SnapshotCreated":
      handleActionPatch(op, store, setIsLoading)
      break

    default: {
      // TypeScript exhaustiveness check - this should never execute
      const _exhaustive: never = op
      console.warn("Unhandled WebSocket operation:", _exhaustive)
    }
  }
}

// Re-export individual handlers for testing
export { handleActionPatch } from "./handleActionPatch"
export { handleNotePatch } from "./handleNotePatch"
export { handleUserMarkPatch } from "./handleUserMarkPatch"
export { handleUserPatch } from "./handleUserPatch"
