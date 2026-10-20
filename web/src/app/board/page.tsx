"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Session } from "next-auth"
import { useSession } from "next-auth/react"
import { BackdropLoading } from "@/components/BackdropLoading"
import { DashboardLayout } from "@/components/DashboardLayout"
import { BoardScreen } from "@/screens/BoardScreen"
import { useAppStore, selectUsers } from "@/store"

export default function Board() {
  const { data, status } = useSession()
  const router = useRouter()
  const users = useAppStore(selectUsers)
  const session = data as Session
  const [isMounted, setIsMounted] = useState(false)

  // Wait for client-side mount to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in")
    }
  }, [status, router])

  if (status === "loading" || !session?.user?.email) {
    return <BackdropLoading />
  }

  const showLoading = !isMounted || users.length === 0

  return (
    <DashboardLayout userEmail={session.user.email}>
      {showLoading ? <BackdropLoading isInDashboard={true} /> : <BoardScreen accessToken={session?.accessToken} />}
    </DashboardLayout>
  )
}
