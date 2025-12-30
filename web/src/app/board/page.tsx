"use client"
import { useEffect } from "react"
import { Session } from "next-auth"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { BackdropLoading } from "@/components/BackdropLoading"
import { DashboardLayout } from "@/components/DashboardLayout"
import { BoardScreen } from "@/screens/BoardScreen"
import { useAppStore, selectUsers, selectNotes } from "@/store"

export default function Board() {
  const { data, status } = useSession()
  const router = useRouter()
  const users = useAppStore(selectUsers)
  const notes = useAppStore(selectNotes)
  const session = data as Session

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in")
    }
  }, [status, router])

  if (status === "loading" || !session?.user?.email) {
    return <BackdropLoading />
  }

  const showLoading = users.length === 0 || notes.length === 0

  return (
    <DashboardLayout userEmail={session.user.email}>
      {showLoading ? (
        <BackdropLoading isInDashboard={true} />
      ) : (
        <BoardScreen accessToken={session?.accessToken} />
      )}
    </DashboardLayout>
  )
}
