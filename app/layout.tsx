import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { MessageProvider } from "@/context/message-context"
import { Toaster } from "@/components/ui/toaster"
import { GmailLinkHandler } from "@/components/gmail-link-handler"
import { BottomTodoDock } from "@/components/bottom-todo-dock"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Adaptive Memory System",
  description: "An iMessage-based ERP with adaptive memory",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <MessageProvider>
            <div className="pb-[14rem] sm:pb-52 md:pb-48 min-h-[100dvh] min-h-screen">{children}</div>
            <BottomTodoDock />
            <GmailLinkHandler />
            <Toaster />
          </MessageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
