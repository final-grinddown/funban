import { ReactNode } from "react"
import type { Metadata } from "next"
import Provider from "@/app/_provider"
import { AuthProvider } from "@/context/AuthProvider"
import { WebSocketProvider } from "@/context/WebSocketProvider"

export const metadata: Metadata = {
  title: "Funban",
  description: "Kanban board status tool",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <WebSocketProvider>
            <Provider>{children}</Provider>
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
