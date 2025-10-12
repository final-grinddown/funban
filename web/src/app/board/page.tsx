"use client"
import { Session } from "next-auth"
import { useSession } from "next-auth/react"
import { BackdropLoading } from "@/components/BackdropLoading"
import { DashboardLayout } from "@/components/DashboardLayout"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { BoardScreen } from "@/screens/BoardScreen"

export default function Board() {
  const { data, status } = useSession()
  const { users, notes } = useWebSocketContext()
  const session = data as Session

  if (status === "loading" || !session?.user?.email) {
    return <BackdropLoading />
  }

  const showLoading = users.length === 0 || notes.length === 0

  return (
    <DashboardLayout userEmail={session.user.email}>
      {showLoading ? (
        <BackdropLoading isInDashboard={true} />
      ) : (
        <BoardScreen users={users} notes={notes} accessToken={session?.accessToken} />
      )}
    </DashboardLayout>
  )
}
