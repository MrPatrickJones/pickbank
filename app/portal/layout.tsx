import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Kundenportal · PickTheBank",
  description: "Einlagen, Zinsgutschriften, Fälligkeiten und Portfolio-Reports Ihrer Anlagen.",
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#F4F7FF]">{children}</div>
}
