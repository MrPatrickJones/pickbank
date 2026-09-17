"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

import type { Role, SessionUser } from "@/lib/types"

/**
 * Session handling for the prototype: role, idle timeout and the permission
 * checks the UI uses. Credentials are never stored, and the demo accounts below
 * carry no secrets – a real deployment authenticates on the server and keeps
 * the session in an http-only cookie.
 */

const STORAGE_KEY = "ptb.portal.session.v1"
export const IDLE_TIMEOUT_MINUTES = 15

export type DemoAccount = SessionUser & { hint: string; description: string }

/** Staff logins of the prototype. Customer logins live in the data store and are issued by staff. */
export const staffAccounts: DemoAccount[] = [
  {
    name: "Patrick Jones",
    email: "admin@pickthebank.eu",
    role: "admin",
    hint: "Voller Zugriff inklusive Einstellungen und Benutzerverwaltung.",
    description: "Administrator",
  },
  {
    name: "Sandra Vogt",
    email: "mitarbeiter@pickthebank.eu",
    role: "mitarbeiter",
    hint: "Kunden und Anlagen bearbeiten, keine Systemeinstellungen.",
    description: "Mitarbeiterin Kundenbetreuung",
  },
]

/** Kept for compatibility with existing imports. */
export const demoAccounts = staffAccounts

export type Permission =
  | "customers.read"
  | "customers.write"
  | "customers.deactivate"
  | "investments.write"
  | "documents.write"
  | "messages.send"
  | "accounts.manage"
  | "settings.manage"
  | "users.manage"

const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    "customers.read",
    "customers.write",
    "customers.deactivate",
    "investments.write",
    "documents.write",
    "messages.send",
    "accounts.manage",
    "settings.manage",
    "users.manage",
  ],
  mitarbeiter: [
    "customers.read",
    "customers.write",
    "investments.write",
    "documents.write",
    "messages.send",
    "accounts.manage",
  ],
  kunde: [],
}

export const roleLabel: Record<Role, string> = {
  admin: "Administrator",
  mitarbeiter: "Mitarbeiter",
  kunde: "Kunde",
}

type SessionContextValue = {
  ready: boolean
  user: SessionUser | null
  signIn: (user: SessionUser) => void
  signOut: (reason?: "manual" | "timeout") => void
  signOutReason: "manual" | "timeout" | null
  clearSignOutReason: () => void
  can: (permission: Permission) => boolean
  minutesLeft: number
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)
  const [signOutReason, setSignOutReason] = useState<"manual" | "timeout" | null>(null)
  const [minutesLeft, setMinutesLeft] = useState(IDLE_TIMEOUT_MINUTES)
  const lastActivity = useRef(Date.now())

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw) as SessionUser)
    } catch {
      // blocked storage – start signed out
    }
    setReady(true)
  }, [])

  const signIn = useCallback((next: SessionUser) => {
    lastActivity.current = Date.now()
    setUser(next)
    setSignOutReason(null)
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }, [])

  const signOut = useCallback((reason: "manual" | "timeout" = "manual") => {
    setUser(null)
    setSignOutReason(reason)
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  // Automatic sign-out after inactivity.
  useEffect(() => {
    if (!user) return

    const touch = () => {
      lastActivity.current = Date.now()
    }
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "focus"]
    events.forEach((event) => window.addEventListener(event, touch, { passive: true }))

    const timer = window.setInterval(() => {
      const idleMs = Date.now() - lastActivity.current
      const left = Math.max(0, IDLE_TIMEOUT_MINUTES - Math.floor(idleMs / 60000))
      setMinutesLeft(left)
      if (idleMs >= IDLE_TIMEOUT_MINUTES * 60000) signOut("timeout")
    }, 20000)

    return () => {
      events.forEach((event) => window.removeEventListener(event, touch))
      window.clearInterval(timer)
    }
  }, [user, signOut])

  const value = useMemo<SessionContextValue>(
    () => ({
      ready,
      user,
      signIn,
      signOut,
      signOutReason,
      clearSignOutReason: () => setSignOutReason(null),
      can: (permission) => (user ? rolePermissions[user.role].includes(permission) : false),
      minutesLeft,
    }),
    [ready, user, signIn, signOut, signOutReason, minutesLeft],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error("useSession must be used inside SessionProvider")
  return context
}
