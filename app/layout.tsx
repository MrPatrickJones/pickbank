import type { Metadata } from "next"
import type React from "react"
import { Instrument_Sans } from "next/font/google"

import { ToastProvider } from "@/components/ui/overlays"
import { SessionProvider } from "@/lib/session"
import "./globals.css"

const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Pick The Bank · Kundenportal",
  description: "Kundenportal und Verwaltung von Pick The Bank.",
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={sans.className}>
      <body>
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
