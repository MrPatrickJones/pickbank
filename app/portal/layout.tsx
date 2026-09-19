import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Mein Konto · Pick The Bank",
  description: "Ihre Anlagen, Dokumente und Nachrichten bei Pick The Bank.",
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
