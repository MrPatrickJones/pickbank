"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { CustomerDashboard } from "@/components/customer/customer-dashboard"
import { useSession } from "@/lib/session"

export default function PortalPage() {
  const router = useRouter()
  const { ready, user } = useSession()

  useEffect(() => {
    if (!ready) return
    if (!user) router.replace("/login")
    else if (user.role !== "CUSTOMER") router.replace("/admin")
  }, [ready, user, router])

  if (!ready || !user || user.role !== "CUSTOMER") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">Wird geladen …</div>
  }

  return <CustomerDashboard />
}
