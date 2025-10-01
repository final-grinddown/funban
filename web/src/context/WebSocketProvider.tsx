/**
 * WebSocket Provider with Type-Safe Message Validation
 *
 * This provider implements runtime validation of WebSocket messages using typia.
 * All incoming messages are validated against TypeScript contracts to ensure type safety
 * and catch compatibility issues between frontend and backend.
 *
 * Architecture:
 * - typia validates messages against generated TypeScript contracts from Rust types
 * - WsOperation types from contracts define all possible operations
 * - Runtime validation happens at compile-time with typia transformation
 */
"use client"
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react"
import { Session } from "next-auth"
import { useSession } from "next-auth/react"
import typia from "typia"
import { clearApp } from "@/app/api/auth/clearApp"
import { Alerts } from "@/components/Alerts"
import type { WsNote, WsUser, WsOperation } from "@/schemas/websocket"
import type { User, Note } from "@/utils/interfaces"
import { useActionStateStore } from "@/utils/store"
import { TNoteState } from "@/utils/types"

// WebSocket message types
type PatchMessage = {
  type: "Patch"
  ops: WsOperation[]
}

type UsersMessage = {
  type: "Users"
  items: WsUser[]
}

type NotesMessage = {
  type: "Notes"
  items: WsNote[]
}

type WebSocketMessage = PatchMessage | UsersMessage | NotesMessage

interface WebSocketContextType {
  users: User[]
  notes: Note[]
  sendMessage: (message: string) => void
  sendMessageAsync: (message: string, successNotification: string) => void
  connectionStatus: string
  isLoading: boolean
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [socketUrl, setSocketUrl] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  ///const lastUUIDRef = useRef<string | null>(null)
  const { startAsync, finishAsync } = useActionStateStore()

  useEffect(() => {
    if (status === "authenticated" && session) {
      const extendedSession = session as Session
      if (extendedSession?.accessToken) {
        setSocketUrl(`${WS_URL}?token=${extendedSession.accessToken}`)
      }
    } else {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      setSocketUrl(null)
      setUsers([])
      setNotes([])
    }
  }, [session, status])

  // Transform contract types (bigint IDs) to app types (number IDs)
  const transformNote = (note: WsNote): Note => ({
    ...note,
    state: note.state as TNoteState,  // Convert WsNoteState enum to string union
  })

  const transformUser = (user: WsUser): User => user  // No transformation needed - contracts use number for IDs

  const handlePatchMessage = useCallback(
    (msg: PatchMessage) => {
      msg.ops.forEach((op: WsOperation) => {
        switch (op.type) {
          case "UserAdded":
            setUsers((prevUsers) => [...prevUsers, transformUser(op.user)])
            break
          case "UserNameUpdated":
            setUsers((prevUsers) => prevUsers.map((user) => (user.id === op.id ? { ...user, name: op.name } : user)))
            setNotes((prevNotes) =>
              prevNotes.map((note) => (note.owner_id === op.id ? { ...note, name: op.name } : note)),
            )
            break
          case "UserColorUpdated":
            setUsers((prevUsers) => prevUsers.map((user) => (user.id === op.id ? { ...user, color: op.color } : user)))
            setNotes((prevNotes) =>
              prevNotes.map((note) => (note.owner_id === op.id ? { ...note, color: op.color } : note)),
            )
            break
          case "UserRemoved":
            setUsers((prevUsers) => prevUsers.filter((user) => user.id !== op.id))
            setNotes((prevNotes) => prevNotes.filter((note) => note.owner_id !== op.id))
            break
          case "NoteTextUpdated":
            setNotes((prevNotes) =>
              prevNotes.map((note) =>
                note.id === op.id ? { ...note, text: op.text, updated: new Date().toISOString() } : note,
              ),
            )
            break
          case "NoteTagChanged":
            setNotes((prevNotes) =>
              prevNotes.map((note) =>
                note.id === op.id ? { ...note, tag: op.tag, updated: new Date().toISOString() } : note,
              ),
            )
            break
          case "NoteOrderChanged":
            setNotes((prevNotes) =>
              prevNotes.map((note) =>
                note.id === op.id
                  ? {
                      ...note,
                      state: op.state as TNoteState,
                      predecessor_id: op.predecessor_id,
                      updated: new Date().toISOString(),
                    }
                  : note,
              ),
            )
            break
          case "NoteRemoved":
            setNotes((prevNotes) => prevNotes.filter((note) => note.id !== op.id))
            break
          case "NoteAdded":
            setNotes((prevNotes) => [...prevNotes, transformNote(op.note)])
            break
          case "ActionFinished":
            finishAsync(op.uuid)
            setIsLoading(false)
            break
          case "SnapshotCreated":
            // Handle snapshot creation notification
            break
          case "Error":
            console.error("WebSocket error:", op.message)
            if (op.uuid) {
              finishAsync(op.uuid)
            }
            setIsLoading(false)
            break
        }
      })
    },

    [setUsers, setNotes, finishAsync, setIsLoading],
  )

  const connectWebSocket = useCallback(() => {
    socketRef.current = new WebSocket(socketUrl!)

    socketRef.current.onmessage = (event) => {
      try {
        const rawMessage = JSON.parse(event.data)

        // Validate incoming message against contract types using typia
        const msg = typia.assert<WebSocketMessage>(rawMessage)

        switch (msg.type) {
          case "Patch":
            handlePatchMessage(msg)
            break
          case "Users":
            setUsers(msg.items.map(transformUser))
            break
          case "Notes":
            setNotes(msg.items.map(transformNote))
            break
        }
      } catch (error) {
        console.error('Failed to parse or validate WebSocket message:', error)
      }
    }

    socketRef.current.onclose = () => {
      setTimeout(() => {
        connectWebSocket() // Attempt to reconnect
      }, 1000)
    }

    socketRef.current.onerror = () => {
      clearApp()
    }
  }, [socketUrl, handlePatchMessage])

  function sendMessage(message: string) {
    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(message)
      } else {
        console.error("WebSocket is not open. Unable to send message.")
      }
    } catch (error) {
      console.error("Failed to send the message:", error)
    }
  }

  function sendMessageAsync(message: string, successNotification: string) {
    const uuid = crypto.randomUUID()
    startAsync(uuid, successNotification)

    try {
      const parsedMessage = JSON.parse(message)

      if (typeof parsedMessage === "object" && parsedMessage !== null) {
        parsedMessage.uuid = uuid
      }

      const messageWithUUID = JSON.stringify(parsedMessage)

      setIsLoading(true)

      sendMessage(messageWithUUID)
    } catch (error) {
      console.error("Failed to parse the message or append UUID:", error)
      setIsLoading(false)
      finishAsync(uuid)
    }
  }

  function getConnectionStatus(): string {
    if (!socketRef.current) return "Uninstantiated"

    switch (socketRef.current.readyState) {
      case WebSocket.CONNECTING:
        return "Connecting"
      case WebSocket.OPEN:
        return "Open"
      case WebSocket.CLOSING:
        return "Closing"
      case WebSocket.CLOSED:
        return "Closed"
      default:
        return "Unknown"
    }
  }

  useEffect(() => {
    if (socketUrl) {
      connectWebSocket()
    }
  }, [socketUrl, connectWebSocket])

  return (
    <WebSocketContext.Provider
      value={{ users, notes, sendMessage, sendMessageAsync, connectionStatus: getConnectionStatus(), isLoading }}
    >
      <Alerts />
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)

  if (context === undefined) {
    throw new Error("useWebSocketContext must be used within a WebSocketProvider")
  }

  return context
}
