"use client"

/**
 * Demo session handling for the customer portal.
 * Credentials never leave the browser – this is the prototype's stand-in for a
 * real authentication backend with strong customer authentication.
 */

export type PortalSession = {
  email: string
  loginAt: string
}

export const DEMO_CREDENTIALS = {
  email: "demo@pickthebank.eu",
  password: "pickthebank2026",
}

const STORAGE_KEY = "ptb.portal.session"

const storages = (): Storage[] => {
  if (typeof window === "undefined") return []
  return [window.localStorage, window.sessionStorage]
}

export function getSession(): PortalSession | null {
  for (const storage of storages()) {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (!raw) continue
      const parsed = JSON.parse(raw) as PortalSession
      if (parsed?.email) return parsed
    } catch {
      // corrupted or blocked storage – treat as logged out
    }
  }
  return null
}

export function saveSession(session: PortalSession, remember: boolean) {
  if (typeof window === "undefined") return
  try {
    const target = remember ? window.localStorage : window.sessionStorage
    const other = remember ? window.sessionStorage : window.localStorage
    other.removeItem(STORAGE_KEY)
    target.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // storage blocked – the session does not survive a reload
  }
}

export function clearSession() {
  for (const storage of storages()) {
    try {
      storage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}
