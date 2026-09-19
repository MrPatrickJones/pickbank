"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { api } from "@/lib/api"
import type { Role, SessionUser } from "@/lib/types"

/**
 * The session lives in an http-only cookie on the server; the client only
 * mirrors who is signed in. Permissions shown here mirror the server rules –
 * the server enforces them on every request regardless.
 */

export type Permission =
  | "customers.read"
  | "customers.write"
  | "customers.delete"
  | "accounts.write"
  | "banks.write"
  | "documents.write"
  | "messages.send"
  | "logins.manage"
  | "audit.read"
  | "settings.manage"

const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    "customers.read",
    "customers.write",
    "customers.delete",
    "accounts.write",
    "banks.write",
    "documents.write",
    "messages.send",
    "logins.manage",
    "audit.read",
    "settings.manage",
  ],
  STAFF: [
    "customers.read",
    "customers.write",
    "accounts.write",
    "banks.write",
    "documents.write",
    "messages.send",
    "logins.manage",
    "audit.read",
  ],
  CUSTOMER: [],
}

export const roleLabel: Record<Role, string> = {
  ADMIN: "Administrator",
  STAFF: "Mitarbeiter",
  CUSTOMER: "Kunde",
}

type SessionContextValue = {
  ready: boolean
  user: SessionUser | null
  signIn: (email: string, password: string) => Promise<SessionUser>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  can: (permission: Permission) => boolean
  signOutReason: "manual" | "expired" | null
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)
  const [signOutReason, setSignOutReason] = useState<"manual" | "expired" | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ user: SessionUser | null }>("/api/auth/session")
      setUser((current) => {
        if (current && !data.user) setSignOutReason("expired")
        return data.user
      })
    } catch {
      setUser(null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // The server expires idle sessions; the client notices on the next poll.
  useEffect(() => {
    if (!user) return
    const timer = window.setInterval(() => void refresh(), 60_000)
    return () => window.clearInterval(timer)
  }, [user, refresh])

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: SessionUser }>("/api/auth/login", { email, password })
    setUser(data.user)
    setSignOutReason(null)
    return data.user
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.post("/api/auth/logout")
    } finally {
      setUser(null)
      setSignOutReason("manual")
    }
  }, [])

  const value = useMemo<SessionContextValue>(
    () => ({
      ready,
      user,
      signIn,
      signOut,
      refresh,
      signOutReason,
      can: (permission) => (user ? rolePermissions[user.role].includes(permission) : false),
    }),
    [ready, user, signIn, signOut, refresh, signOutReason],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error("useSession must be used inside SessionProvider")
  return context
}
