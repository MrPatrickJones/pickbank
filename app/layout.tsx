import type { Metadata } from "next"
import type React from "react"
import { Poppins } from "next/font/google"

import { LocaleProvider } from "@/lib/i18n"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "PickTheBank · Kundenportal",
  description:
    "Kundenportal von PickTheBank: Einlagen, Zinsgutschriften, Fälligkeiten und Portfolio-Reports auf einen Blick.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={poppins.className}>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  )
}
