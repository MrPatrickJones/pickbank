import "server-only"
import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

import { env } from "@/server/env"
import { execute, query, queryOne } from "@/server/db"
import { forbidden, unauthorized } from "@/server/errors"

export type Role = "ADMIN" | "STAFF" | "CUSTOMER"

export type AuthUser = {
  id: number
  email: string
  role: Role
  fullName: string
  customerId: number | null
  mustChangePassword: boolean
}

export type SessionContext = {
  user: AuthUser
  sessionId: number
  csrfToken: string
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex")

export async function createSession(userId: number, ip: string | null, userAgent: string | null) {
  const token = randomBytes(32).toString("base64url")
  const csrfToken = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + env.session.lifetimeMinutes * 60_000)

  await execute(
    `INSERT INTO sessions (user_id, token_hash, csrf_token, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, sha256(token), csrfToken, ip, userAgent?.slice(0, 255) ?? null, expiresAt],
  )

  const store = await cookies()
  const secure = env.isProduction
  store.set(env.session.cookieName, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  })
  // Readable by the client so it can echo it back in the X-CSRF-Token header.
  store.set(env.session.csrfCookieName, csrfToken, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  })

  return { token, csrfToken, expiresAt }
}

export async function readSession(): Promise<SessionContext | null> {
  const store = await cookies()
  const token = store.get(env.session.cookieName)?.value
  if (!token) return null

  const row = await queryOne<{
    session_id: number
    csrf_token: string
    expires_at: Date
    last_seen_at: Date
    revoked_at: Date | null
    user_id: number
    email: string
    role: Role
    full_name: string
    customer_id: number | null
    status: string
    must_change_password: number
  }>(
    `SELECT s.id AS session_id, s.csrf_token, s.expires_at, s.last_seen_at, s.revoked_at,
            u.id AS user_id, u.email, u.role, u.full_name, u.customer_id, u.status, u.must_change_password
       FROM sessions s
       JOIN auth_users u ON u.id = s.user_id
      WHERE s.token_hash = ?`,
    [sha256(token)],
  )

  if (!row || row.revoked_at) return null
  if (row.status !== "ACTIVE") return null

  const now = Date.now()
  if (new Date(row.expires_at).getTime() <= now) return null

  // Idle timeout: a session that has not been used is treated as expired.
  const idleLimit = env.session.idleMinutes * 60_000
  if (now - new Date(row.last_seen_at).getTime() > idleLimit) {
    await execute("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [row.session_id])
    return null
  }

  await execute("UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [row.session_id])

  return {
    sessionId: row.session_id,
    csrfToken: row.csrf_token,
    user: {
      id: row.user_id,
      email: row.email,
      role: row.role,
      fullName: row.full_name,
      customerId: row.customer_id,
      mustChangePassword: Boolean(row.must_change_password),
    },
  }
}

export async function destroySession() {
  const store = await cookies()
  const token = store.get(env.session.cookieName)?.value
  if (token) {
    await execute("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE token_hash = ?", [sha256(token)])
  }
  store.delete(env.session.cookieName)
  store.delete(env.session.csrfCookieName)
}

export async function revokeAllSessionsOf(userId: number) {
  await execute("UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND revoked_at IS NULL", [
    userId,
  ])
}

export async function purgeExpiredSessions() {
  await query("DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP(3) OR revoked_at IS NOT NULL")
}

/** Every protected handler starts here – authorisation is never left to the UI. */
export async function requireSession(): Promise<SessionContext> {
  const session = await readSession()
  if (!session) throw unauthorized()
  return session
}

export async function requireStaff(): Promise<SessionContext> {
  const session = await requireSession()
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") throw forbidden()
  return session
}

export async function requireAdmin(): Promise<SessionContext> {
  const session = await requireSession()
  if (session.user.role !== "ADMIN") throw forbidden("Diese Aktion ist Administratoren vorbehalten.")
  return session
}

export async function requireCustomer(): Promise<SessionContext & { customerId: number }> {
  const session = await requireSession()
  if (session.user.role !== "CUSTOMER" || !session.user.customerId) throw forbidden()
  return { ...session, customerId: session.user.customerId }
}

/**
 * Object level authorisation: staff may reach any customer, a customer only
 * their own record – checked against the session, never against a request field.
 */
export function assertCustomerAccess(session: SessionContext, customerId: number) {
  if (session.user.role === "ADMIN" || session.user.role === "STAFF") return
  if (session.user.role === "CUSTOMER" && session.user.customerId === customerId) return
  throw forbidden()
}

export function verifyCsrf(headerToken: string | null, sessionToken: string) {
  if (!headerToken) return false
  const a = Buffer.from(headerToken)
  const b = Buffer.from(sessionToken)
  return a.length === b.length && timingSafeEqual(a, b)
}
