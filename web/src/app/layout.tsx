import { ReactNode } from "react"
import type { Metadata } from "next"
import Script from "next/script"
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
        <Script src="/env.js" strategy="beforeInteractive" />
        <AuthProvider>
          <WebSocketProvider>
            <Provider>{children}</Provider>
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
