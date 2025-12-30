import { ReactNode } from "react"
import type { Metadata } from "next"
import Provider from "@/app/_provider"
import { AuthProvider } from "@/context/AuthProvider"
import { ConfigProvider } from "@/context/ConfigProvider"
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
  // Server Component - reads env vars at REQUEST time (runtime, not build time)
  // These are read from the container's environment variables
  const config = {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || "",
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || "",
    env: process.env.NEXT_PUBLIC_ENV || "local",
  }

  return (
    <html lang="en">
      <body>
        <ConfigProvider config={config}>
          <AuthProvider>
            <WebSocketProvider>
              <Provider>{children}</Provider>
            </WebSocketProvider>
          </AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  )
}
