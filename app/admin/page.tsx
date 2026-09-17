"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { AdminShell } from "@/components/admin/shell"
import { useSession } from "@/lib/session"
import { useData } from "@/lib/store"

export default function AdminPage() {
  const router = useRouter()
  const { ready, user } = useSession()
  const { ready: dataReady } = useData()

  // Role guard: customers never reach the administration.
  useEffect(() => {
    if (!ready) return
    if (!user) router.replace("/login")
    else if (user.role === "kunde") router.replace("/portal")
  }, [ready, user, router])

  if (!ready || !dataReady || !user || user.role === "kunde") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">Wird geladen …</div>
  }

  return <AdminShell />
}
