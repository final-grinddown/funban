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
import { useAppStore } from "@/store"

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
  sendMessage: (message: string) => void
  sendMessageAsync: (message: string, successNotification: string) => void
  connectionStatus: string
  isLoading: boolean
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

// Reconnection configuration
const INITIAL_RECONNECT_DELAY = 1000 // 1 second
const MAX_RECONNECT_DELAY = 30000 // 30 seconds
const RECONNECT_BACKOFF_MULTIPLIER = 1.5

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [socketUrl, setSocketUrl] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shouldReconnectRef = useRef(true)

  // Get actions from unified store
  const { startAsync, finishAsync } = useAppStore((state) => state.actions)

  // Get board actions from unified store
  const setUsers = useAppStore((state) => state.board.setUsers)
  const setNotes = useAppStore((state) => state.board.setNotes)
  const addUser = useAppStore((state) => state.board.addUser)
  const updateUser = useAppStore((state) => state.board.updateUser)
  const removeUser = useAppStore((state) => state.board.removeUser)
  const addUserMark = useAppStore((state) => state.board.addUserMark)
  const updateUserMark = useAppStore((state) => state.board.updateUserMark)
  const removeUserMark = useAppStore((state) => state.board.removeUserMark)
  const addNote = useAppStore((state) => state.board.addNote)
  const updateNote = useAppStore((state) => state.board.updateNote)
  const removeNote = useAppStore((state) => state.board.removeNote)

  useEffect(() => {
    if (status === "authenticated" && session) {
      const extendedSession = session as Session
      if (extendedSession?.accessToken) {
        setSocketUrl(`${WS_URL}?token=${extendedSession.accessToken}`)
        shouldReconnectRef.current = true
      } else {
        console.error('WebSocket: No accessToken in session', session)
      }
    } else {
      // Disable reconnection when unauthenticated
      shouldReconnectRef.current = false

      // Clear any pending reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      if (socketRef.current) {
        socketRef.current.onclose = null // Prevent reconnection
        socketRef.current.close()
        socketRef.current = null
      }
      setSocketUrl(null)
      // Clear board data from Zustand
      setUsers([])
      setNotes([])
    }
  }, [session, status, setUsers, setNotes])

  // Transform contract types to app types
  const transformNote = (note: WsNote): Note => note  // No transformation needed
  const transformUser = (user: WsUser): User => user  // No transformation needed

  const handlePatchMessage = useCallback(
    (msg: PatchMessage) => {
      msg.ops.forEach((op: WsOperation) => {
        switch (op.type) {
          case "UserAdded":
            addUser(transformUser(op.user))
            break
          case "UserNameUpdated":
            updateUser(op.id, { name: op.name })
            break
          case "UserColorUpdated":
            updateUser(op.id, { color: op.color })
            break
          case "UserRemoved":
            removeUser(op.id)
            break
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
          case "NoteTextUpdated":
            updateNote(op.id, { text: op.text, updated: new Date().toISOString() })
            break
          case "NoteTagChanged":
            updateNote(op.id, { tag: op.tag, updated: new Date().toISOString() })
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
          case "NoteAdded":
            addNote(transformNote(op.note))
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

    [addUser, updateUser, removeUser, addUserMark, updateUserMark, removeUserMark, addNote, updateNote, removeNote, finishAsync],
  )

  const connectWebSocket = useCallback(() => {
    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.onclose = null // Prevent reconnection
      socketRef.current.close()
    }

    // Clear any pending reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    socketRef.current = new WebSocket(socketUrl!)

    socketRef.current.onopen = () => {
      // Reset reconnect delay on successful connection
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY
      shouldReconnectRef.current = true
    }

    socketRef.current.onmessage = (event) => {
      try {
        const rawMessage = JSON.parse(event.data)

        // Validate incoming message against contract types using typia
        const msg = typia.assert<WebSocketMessage>(rawMessage)

        switch (msg.type) {
          case "Patch":
            handlePatchMessage(msg)
            break
          case "Users": {
            const users = msg.items.map(transformUser)
            setUsers(users)
            break
          }
          case "Notes": {
            const notes = msg.items.map(transformNote)
            setNotes(notes)
            break
          }
        }
      } catch (error) {
        console.error('Failed to parse or validate WebSocket message:', error)
      }
    }

    socketRef.current.onclose = (event) => {
      console.log('WebSocket: Closed with code', event.code, 'reason:', event.reason)

      // Auth failure (code 1008) - redirect to sign-in
      if (event.code === 1008) {
        console.log('WebSocket: Auth failure, redirecting to sign-in')
        clearApp()
        return
      }

      // Don't reconnect if it was a clean close or reconnection is disabled
      if (!shouldReconnectRef.current || event.code === 1000) {
        console.log('WebSocket: Not reconnecting (clean close)')
        return
      }

      // Attempt to reconnect with exponential backoff
      console.log('WebSocket: Reconnecting in', reconnectDelayRef.current, 'ms')
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket()
        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * RECONNECT_BACKOFF_MULTIPLIER,
          MAX_RECONNECT_DELAY
        )
      }, reconnectDelayRef.current)
    }

    socketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error)
      // Let the close handler manage reconnection or auth redirect
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

    return () => {
      // Cleanup: close socket when component unmounts or socketUrl changes
      shouldReconnectRef.current = false

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      if (socketRef.current) {
        socketRef.current.onclose = null // Prevent reconnection
        socketRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketUrl])

  return (
    <WebSocketContext.Provider
      value={{ sendMessage, sendMessageAsync, connectionStatus: getConnectionStatus(), isLoading }}
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
