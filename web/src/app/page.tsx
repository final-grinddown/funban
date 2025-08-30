"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { BackdropLoading } from "@/components/BackdropLoading"
import { ERoutes } from "@/utils/enums"

export default function Landing() {
  const router = useRouter()

  useEffect(() => {
    router.replace(ERoutes.Board)
  }, [router])

  return <BackdropLoading />
}
