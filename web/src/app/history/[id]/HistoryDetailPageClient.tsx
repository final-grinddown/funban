"use client"
import { useSession } from "next-auth/react"
import { BackdropLoading } from "@/components/BackdropLoading"
import { DashboardLayout } from "@/components/DashboardLayout"
import { HistoryDetailScreen } from "@/screens/HistoryDetailScreen"

interface HistoryDetailPageClientProps {
  id: string
}

export function HistoryDetailPageClient({ id }: HistoryDetailPageClientProps) {
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
