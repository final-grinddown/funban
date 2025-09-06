// Alternative approach using React 19's use() hook
"use client"
import { use } from "react"
import { useSession } from "next-auth/react"
import { BackdropLoading } from "@/components/BackdropLoading"
import { DashboardLayout } from "@/components/DashboardLayout"
import { HistoryDetailScreen } from "@/screens/HistoryDetailScreen"

export default function HistoryItemWithUseHook({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params) // React 19's use() hook unwraps promises
  const { data } = useSession()

  if (!data?.user?.email) {
    return <BackdropLoading />
  }

  return (
    <DashboardLayout userEmail={data.user.email}>
      <HistoryDetailScreen id={id} />
    </DashboardLayout>
  )
}
