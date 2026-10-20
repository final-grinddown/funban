"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { BackdropLoading } from "@/components/BackdropLoading"
import { ERoutes } from "@/utils/enums"

export default function Landing() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(ERoutes.Board)
    } else if (status === "unauthenticated") {
      router.replace("/sign-in")
    }
  }, [status, router])

  return <BackdropLoading />
}
