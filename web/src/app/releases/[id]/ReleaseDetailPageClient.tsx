"use client"
import { useSession } from "next-auth/react"
import { BackdropLoading } from "@/components/BackdropLoading"
import { DashboardLayout } from "@/components/DashboardLayout"
import { ReleaseDetailScreen } from "@/screens/ReleaseDetailScreen"

interface ReleaseDetailPageClientProps {
  id: string
}

export function ReleaseDetailPageClient({ id }: ReleaseDetailPageClientProps) {
  const { data } = useSession()

  if (!data?.user?.email) {
    return <BackdropLoading />
  }

  return (
    <DashboardLayout userEmail={data.user.email}>
      <ReleaseDetailScreen id={id} />
    </DashboardLayout>
  )
}
