"use client"
import { useSession } from "next-auth/react"
import { BackdropLoading } from "@/components/BackdropLoading"
import { DashboardLayout } from "@/components/DashboardLayout"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { SettingsScreen } from "@/screens/SettingsScreen"

export default function Settings() {
  const { data } = useSession()
  const { users } = useWebSocketContext()

  if (!data?.user?.email) {
    return <BackdropLoading />
  }

  return (
    <DashboardLayout userEmail={data.user.email}>
      {users.length === 0 ? <BackdropLoading isInDashboard={true} /> : <SettingsScreen users={users} />}
    </DashboardLayout>
  )
}
