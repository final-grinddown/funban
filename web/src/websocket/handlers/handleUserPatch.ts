/**
 * User Patch Handlers
 *
 * Handles all WebSocket operations related to users (add, update, delete)
 */

import type { WsOperation } from "@/schemas/websocket"
import type { AppState } from "@/store"
import type { User } from "@/utils/interfaces"

/**
 * Handles user-related WebSocket patch operations
 * @param op - The WebSocket operation to process
 * @param store - The Zustand store instance
 */
export function handleUserPatch(op: WsOperation, store: AppState): void {
  const { addUser, updateUser, removeUser } = store.board

  switch (op.type) {
    case "UserAdded": {
      // Transform WsUser to User (currently no transformation needed)
      const user: User = op.user as User
      addUser(user)
      break
    }

    case "UserNameUpdated":
      updateUser(op.id, { name: op.name })
      break

    case "UserColorUpdated":
      updateUser(op.id, { color: op.color })
      break

    case "UserRemoved":
      removeUser(op.id)
      break
  }
}
