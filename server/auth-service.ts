import "server-only"
import { createHash } from "node:crypto"

import { env } from "@/server/env"
import { execute, queryOne } from "@/server/db"
import { badRequest, conflict, unauthorized } from "@/server/errors"
import { generatePassword, hashPassword, randomToken, verifyPassword } from "@/server/password"
import { assertLoginRateLimit, recordLoginAttempt } from "@/server/rate-limit"
import { createSession, revokeAllSessionsOf, type Role } from "@/server/session"
import { writeAudit } from "@/server/audit"

type UserRow = {
  id: number
  email: string
  password_hash: string
  role: Role
  full_name: string
  customer_id: number | null
  status: "ACTIVE" | "LOCKED" | "DISABLED"
  must_change_password: number
  failed_attempts: number
  locked_until: Date | null
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex")

async function findUserByEmail(email: string) {
  return queryOne<UserRow>(
    `SELECT id, email, password_hash, role, full_name, customer_id, status, must_change_password,
            failed_attempts, locked_until
       FROM auth_users WHERE email = ?`,
    [email.trim().toLowerCase()],
  )
}

/**
 * Sign-in. The answer never reveals whether the email exists, and every attempt
 * is counted for both the account and the calling IP.
 */
export async function login(email: string, password: string, ip: string | null, userAgent: string | null) {
  await assertLoginRateLimit(email, ip)

  const user = await findUserByEmail(email)
  const genericFailure = unauthorized("E-Mail-Adresse oder Passwort ist nicht korrekt.")

  if (!user) {
    // Spend comparable time so a missing account is not detectable by timing.
    await verifyPassword(password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAA==")
    await recordLoginAttempt(email, ip, false)
    throw genericFailure
  }

  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    await recordLoginAttempt(email, ip, false)
    throw unauthorized("Der Zugang ist vorübergehend gesperrt. Bitte versuchen Sie es später erneut.")
  }

  if (user.status !== "ACTIVE") {
    await recordLoginAttempt(email, ip, false)
    throw unauthorized("Dieser Zugang ist gesperrt. Bitte wenden Sie sich an Ihre Betreuung.")
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    const attempts = user.failed_attempts + 1
    const locked = attempts >= env.security.maxLoginAttempts
    await execute(
      `UPDATE auth_users
          SET failed_attempts = ?, locked_until = ${locked ? "(NOW(3) + INTERVAL ? MINUTE)" : "NULL"}
        WHERE id = ?`,
      locked ? [attempts, env.security.lockoutMinutes, user.id] : [attempts, user.id],
    )
    await recordLoginAttempt(email, ip, false)
    if (locked) {
      await writeAudit({ id: user.id, role: user.role, label: user.email }, ip, {
        action: "Zugang gesperrt",
        description: `Zugang nach ${attempts} Fehlversuchen für ${env.security.lockoutMinutes} Minuten gesperrt.`,
        customerId: user.customer_id,
      })
      throw unauthorized("Der Zugang wurde nach mehreren Fehlversuchen vorübergehend gesperrt.")
    }
    throw genericFailure
  }

  await execute(
    `UPDATE auth_users SET failed_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
    [user.id],
  )
  if (user.customer_id) {
    await execute("UPDATE customers SET last_login_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [user.customer_id])
  }
  await recordLoginAttempt(email, ip, true)

  const session = await createSession(user.id, ip, userAgent)

  await writeAudit({ id: user.id, role: user.role, label: `${user.full_name} (${user.email})` }, ip, {
    action: "Anmeldung",
    description: "Erfolgreiche Anmeldung am Portal.",
    customerId: user.customer_id,
  })

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      customerId: user.customer_id,
      mustChangePassword: Boolean(user.must_change_password),
    },
    csrfToken: session.csrfToken,
  }
}

export async function changeOwnPassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
  ip: string | null,
) {
  const user = await queryOne<UserRow>(
    `SELECT id, email, password_hash, role, full_name, customer_id, status, must_change_password,
            failed_attempts, locked_until FROM auth_users WHERE id = ?`,
    [userId],
  )
  if (!user) throw unauthorized()

  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    throw badRequest("Das aktuelle Passwort ist nicht korrekt.", {
      currentPassword: "Das aktuelle Passwort ist nicht korrekt.",
    })
  }
  if (await verifyPassword(newPassword, user.password_hash)) {
    throw badRequest("Das neue Passwort muss sich vom bisherigen unterscheiden.", {
      newPassword: "Das neue Passwort muss sich vom bisherigen unterscheiden.",
    })
  }

  await execute(
    `UPDATE auth_users
        SET password_hash = ?, must_change_password = 0, password_changed_at = CURRENT_TIMESTAMP(3)
      WHERE id = ?`,
    [await hashPassword(newPassword), userId],
  )

  await writeAudit({ id: user.id, role: user.role, label: `${user.full_name} (${user.email})` }, ip, {
    action: "Passwort geändert",
    description: "Passwort über das Portal geändert.",
    customerId: user.customer_id,
  })
}

/** Creates the customer login. Only staff call this; the password is returned once. */
export async function createCustomerLogin(
  customerId: number,
  email: string,
  fullName: string,
  createdBy: { id: number; role: Role; label: string },
  ip: string | null,
) {
  const existing = await queryOne<{ id: number }>("SELECT id FROM auth_users WHERE customer_id = ?", [customerId])
  if (existing) throw conflict("Für diesen Kunden besteht bereits ein Zugang.")

  const emailTaken = await findUserByEmail(email)
  if (emailTaken) {
    throw conflict("Diese E-Mail-Adresse wird bereits für einen Zugang verwendet.", {
      email: "Diese E-Mail-Adresse wird bereits für einen Zugang verwendet.",
    })
  }

  const password = generatePassword()
  await execute(
    `INSERT INTO auth_users (email, password_hash, role, full_name, customer_id, must_change_password, created_by)
     VALUES (?, ?, 'CUSTOMER', ?, ?, 1, ?)`,
    [email.trim().toLowerCase(), await hashPassword(password), fullName.slice(0, 160), customerId, createdBy.id],
  )

  await writeAudit(createdBy, ip, {
    action: "Zugang angelegt",
    description: `Kundenzugang für ${email.trim().toLowerCase()} angelegt.`,
    customerId,
    newValue: email.trim().toLowerCase(),
  })

  return password
}

export async function resetCustomerPassword(
  customerId: number,
  actor: { id: number; role: Role; label: string },
  ip: string | null,
) {
  const account = await queryOne<{ id: number; email: string }>(
    "SELECT id, email FROM auth_users WHERE customer_id = ?",
    [customerId],
  )
  if (!account) throw badRequest("Für diesen Kunden besteht kein Zugang.")

  const password = generatePassword()
  await execute(
    `UPDATE auth_users
        SET password_hash = ?, must_change_password = 1, failed_attempts = 0, locked_until = NULL,
            password_changed_at = CURRENT_TIMESTAMP(3)
      WHERE id = ?`,
    [await hashPassword(password), account.id],
  )
  await revokeAllSessionsOf(account.id)

  await writeAudit(actor, ip, {
    action: "Passwort zurückgesetzt",
    description: `Neues Passwort für den Zugang ${account.email} vergeben.`,
    customerId,
  })

  return password
}

export async function setLoginStatus(
  customerId: number,
  status: "ACTIVE" | "DISABLED",
  actor: { id: number; role: Role; label: string },
  ip: string | null,
) {
  const account = await queryOne<{ id: number; email: string; status: string }>(
    "SELECT id, email, status FROM auth_users WHERE customer_id = ?",
    [customerId],
  )
  if (!account) throw badRequest("Für diesen Kunden besteht kein Zugang.")

  await execute("UPDATE auth_users SET status = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?", [
    status,
    account.id,
  ])
  if (status === "DISABLED") await revokeAllSessionsOf(account.id)

  await writeAudit(actor, ip, {
    action: status === "DISABLED" ? "Zugang gesperrt" : "Zugang entsperrt",
    description: `Kundenzugang ${account.email} ${status === "DISABLED" ? "gesperrt" : "wieder freigegeben"}.`,
    customerId,
    oldValue: account.status,
    newValue: status,
  })
}

export async function getCustomerLogin(customerId: number) {
  const row = await queryOne<{
    id: number
    email: string
    status: string
    must_change_password: number
    last_login_at: Date | null
    password_changed_at: Date
    created_at: Date
    created_by_name: string | null
  }>(
    `SELECT a.id, a.email, a.status, a.must_change_password, a.last_login_at, a.password_changed_at, a.created_at,
            creator.full_name AS created_by_name
       FROM auth_users a
       LEFT JOIN auth_users creator ON creator.id = a.created_by
      WHERE a.customer_id = ?`,
    [customerId],
  )

  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    mustChangePassword: Boolean(row.must_change_password),
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
    passwordChangedAt: row.password_changed_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    createdBy: row.created_by_name,
  }
}

/**
 * Password reset. The endpoint always answers the same way; the token is only
 * created when the account exists.
 */
export async function requestPasswordReset(email: string, ip: string | null) {
  const user = await findUserByEmail(email)
  if (!user || user.status === "DISABLED") return null

  const token = randomToken()
  await execute(
    "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, (NOW(3) + INTERVAL 60 MINUTE))",
    [user.id, sha256(token)],
  )

  await writeAudit({ id: null, role: "SYSTEM", label: "System" }, ip, {
    action: "Passwort-Reset angefordert",
    description: `Reset-Link für ${user.email} erzeugt.`,
    customerId: user.customer_id,
  })

  return token
}

export async function confirmPasswordReset(token: string, newPassword: string, ip: string | null) {
  const row = await queryOne<{ id: number; user_id: number; email: string; role: Role; customer_id: number | null }>(
    `SELECT r.id, r.user_id, u.email, u.role, u.customer_id
       FROM password_resets r
       JOIN auth_users u ON u.id = r.user_id
      WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > NOW(3)`,
    [sha256(token)],
  )
  if (!row) throw badRequest("Der Link ist ungültig oder abgelaufen.")

  await execute(
    `UPDATE auth_users
        SET password_hash = ?, must_change_password = 0, failed_attempts = 0, locked_until = NULL,
            password_changed_at = CURRENT_TIMESTAMP(3)
      WHERE id = ?`,
    [await hashPassword(newPassword), row.user_id],
  )
  await execute("UPDATE password_resets SET used_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [row.id])
  await revokeAllSessionsOf(row.user_id)

  await writeAudit({ id: row.user_id, role: row.role, label: row.email }, ip, {
    action: "Passwort zurückgesetzt",
    description: "Passwort über den Reset-Link neu gesetzt.",
    customerId: row.customer_id,
  })
}
