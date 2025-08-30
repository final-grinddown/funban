"use client"

import { ReactNode, useEffect } from "react"
import { SessionProvider, useSession } from "next-auth/react"
import { getStoredUserEmail, removeStoredUserEmail, setStoredUserEmail } from "@/utils/storage"

interface Props {
  children: ReactNode
}

export function AuthProvider({ children }: Props) {
  return (
    <SessionProvider>
      <EmailStorageHandler />
      {children}
    </SessionProvider>
  )
}

function EmailStorageHandler() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      const storedEmail = getStoredUserEmail()

      if (!storedEmail) {
        setStoredUserEmail(session.user.email)
      }
    }

    if (status === "unauthenticated") {
      removeStoredUserEmail()
    }
  }, [session, status])

  return null
}
