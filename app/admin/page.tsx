"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { AdminShell } from "@/components/admin/shell"
import { useSession } from "@/lib/session"

export default function AdminPage() {
  const router = useRouter()
  const { ready, user } = useSession()

  // Client-side redirect for convenience; the API enforces the role on every call.
  useEffect(() => {
    if (!ready) return
    if (!user) router.replace("/login")
    else if (user.role === "CUSTOMER") router.replace("/portal")
  }, [ready, user, router])

  if (!ready || !user || user.role === "CUSTOMER") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">Wird geladen …</div>
  }

  return <AdminShell />
}
