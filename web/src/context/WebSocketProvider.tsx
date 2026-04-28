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
 * - Uses reconnecting-websocket for automatic reconnection with exponential backoff
 * - Message handlers are modular and extracted to separate files
 */
"use client"
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react"
import { Session } from "next-auth"
import { useSession } from "next-auth/react"
import ReconnectingWebSocket, { Options as RWSOptions } from "reconnecting-websocket"
import typia from "typia"
import { clearApp } from "@/app/api/auth/clearApp"
import { Alerts } from "@/components/Alerts"
import { useConfig } from "@/context/ConfigProvider"
import type { WsNote, WsUser, WsOperation } from "@/schemas/websocket"
import { useAppStore } from "@/store"
import { dispatchPatchOperation } from "@/websocket/handlers"

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
  sendMessageAsync: (message: string, successNotification: string) => string // Returns UUID
  connectionStatus: string
  isLoading: boolean
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

// Reconnection configuration for reconnecting-websocket
const WS_OPTIONS: RWSOptions = {
  connectionTimeout: 5000, // 5 seconds to establish connection
  maxRetries: Infinity, // Keep trying forever
  minReconnectionDelay: 1000, // Start with 1 second delay
  maxReconnectionDelay: 30000, // Cap at 30 seconds
  reconnectionDelayGrowFactor: 1.5, // Exponential backoff multiplier
  minUptime: 5000, // Consider connection stable after 5 seconds
  maxEnqueuedMessages: 50, // Buffer up to 50 messages during disconnection
  debug: process.env.NODE_ENV === "development",
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { wsUrl } = useConfig()
  const { data: session, status } = useSession()
  const [socketUrl, setSocketUrl] = useState<string | null>(null)
  const socketRef = useRef<ReconnectingWebSocket | null>(null)
  const isLoading = useAppStore((state) => state.actions.asyncQueue.length > 0)
  const [connectionStatus, setConnectionStatus] = useState<string>("Uninstantiated")

  // Get store instance for handlers
  const store = useAppStore()

  // Get board actions for bulk operations
  const setUsers = useAppStore((state) => state.board.setUsers)
  const setNotes = useAppStore((state) => state.board.setNotes)
  const cancelAllPending = useAppStore((state) => state.actions.cancelAllPending)

  useEffect(() => {
    if (status === "authenticated" && session) {
      const extendedSession = session as Session
      if (extendedSession?.accessToken) {
        setSocketUrl(`${wsUrl}?token=${extendedSession.accessToken}`)
      } else {
        console.error("WebSocket: No accessToken in session", session)
      }
    } else {
      // When unauthenticated, close socket and clear data
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      setSocketUrl(null)
      // Clear board data from Zustand
      setUsers([])
      setNotes([])
    }
  }, [session, status, wsUrl, setUsers, setNotes])

  const handlePatchMessage = useCallback(
    (msg: PatchMessage) => {
      msg.ops.forEach((op: WsOperation) => {
        dispatchPatchOperation(op, store)
      })
    },
    [store],
  )

  const connectWebSocket = useCallback(() => {
    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }

    // Create new ReconnectingWebSocket with automatic reconnection
    socketRef.current = new ReconnectingWebSocket(socketUrl!, [], WS_OPTIONS)

    socketRef.current.addEventListener("open", () => {
      console.log("WebSocket: Connected")
      setConnectionStatus("Open")
    })

    socketRef.current.addEventListener("message", (event) => {
      try {
        const rawMessage = JSON.parse(event.data)

        // Validate incoming message against contract types using typia
        const msg = typia.assert<WebSocketMessage>(rawMessage)

        switch (msg.type) {
          case "Patch":
            handlePatchMessage(msg)
            break
          case "Users":
            setUsers(msg.items)
            break
          case "Notes":
            // Fresh board state from server (sent on each new WS session).
            // Cancel any in-flight optimistic operations — the server's list is authoritative.
            cancelAllPending()
            setNotes(msg.items)
            break
        }
      } catch (error) {
        console.error("Failed to parse or validate WebSocket message:", error)
      }
    })

    socketRef.current.addEventListener("close", (event) => {
      console.log("WebSocket: Closed with code", event.code, "reason:", event.reason)

      // Auth failure (code 1008) - redirect to sign-in
      if (event.code === 1008) {
        console.log("WebSocket: Auth failure, redirecting to sign-in")
        setConnectionStatus("Closed")
        clearApp()
        // Close the reconnecting websocket to stop reconnection attempts
        if (socketRef.current) {
          socketRef.current.close()
          socketRef.current = null
        }
      } else {
        // Normal close or reconnecting
        setConnectionStatus("Reconnecting")
      }
    })

    socketRef.current.addEventListener("error", (error) => {
      console.error("WebSocket error:", error)
    })
  }, [socketUrl, handlePatchMessage, setNotes, setUsers, cancelAllPending])

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

  function sendMessageAsync(message: string, successNotification: string): string {
    const uuid = crypto.randomUUID()
    store.actions.startAsync(uuid, successNotification)

    try {
      const parsedMessage = JSON.parse(message)

      if (typeof parsedMessage === "object" && parsedMessage !== null) {
        parsedMessage.uuid = uuid
      }

      sendMessage(JSON.stringify(parsedMessage))
    } catch (error) {
      console.error("Failed to parse the message or append UUID:", error)
      store.actions.failAsync(uuid)
    }

    return uuid
  }

  useEffect(() => {
    if (socketUrl) {
      connectWebSocket()
    }

    return () => {
      // Cleanup: close socket when component unmounts or socketUrl changes
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketUrl])

  return (
    <WebSocketContext.Provider value={{ sendMessage, sendMessageAsync, connectionStatus, isLoading }}>
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
