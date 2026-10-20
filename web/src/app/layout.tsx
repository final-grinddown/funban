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

// Force dynamic rendering to read env vars at request time
export const dynamic = "force-dynamic"

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  // Server Component - reads env vars at REQUEST time (runtime, not build time)
  // Use regular env vars (NO NEXT_PUBLIC_ prefix) for runtime configuration
  const config = {
    apiUrl: process.env.API_URL || "",
    wsUrl: process.env.WS_URL || "",
    env: process.env.APP_ENV || "local",
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
