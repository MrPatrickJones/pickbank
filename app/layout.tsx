import type { Metadata } from "next"
import type React from "react"
import { Instrument_Sans } from "next/font/google"

import { ToastProvider } from "@/components/ui/overlays"
import { DataProvider } from "@/lib/store"
import { SessionProvider } from "@/lib/session"
import "./globals.css"

const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Pick The Bank · Kundenportal",
  description:
    "Kundenportal und Verwaltung von Pick The Bank: Kunden, Festgeldanlagen, Dokumente und Aktivitäten an einem Ort.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={sans.className}>
      <body>
        <SessionProvider>
          <DataProvider>
            <ToastProvider>{children}</ToastProvider>
          </DataProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
