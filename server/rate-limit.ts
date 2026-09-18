import "server-only"

import { env } from "@/server/env"
import { execute, queryOne } from "@/server/db"
import { tooManyRequests } from "@/server/errors"

/** Brute-force protection: per identifier (email) and per IP, backed by the database. */

export async function recordLoginAttempt(identifier: string, ip: string | null, successful: boolean) {
  await execute("INSERT INTO login_attempts (identifier, ip_address, successful) VALUES (?, ?, ?)", [
    identifier.slice(0, 190).toLowerCase(),
    ip,
    successful ? 1 : 0,
  ])
}

export async function assertLoginRateLimit(identifier: string, ip: string | null) {
  const windowMinutes = env.security.loginRateWindowMinutes

  const byIdentifier = await queryOne<{ attempts: number }>(
    `SELECT COUNT(*) AS attempts FROM login_attempts
      WHERE identifier = ? AND successful = 0 AND created_at > (NOW(3) - INTERVAL ? MINUTE)`,
    [identifier.slice(0, 190).toLowerCase(), windowMinutes],
  )

  if (Number(byIdentifier?.attempts ?? 0) >= env.security.maxLoginAttempts * 2) {
    throw tooManyRequests("Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.")
  }

  if (ip) {
    const byIp = await queryOne<{ attempts: number }>(
      `SELECT COUNT(*) AS attempts FROM login_attempts
        WHERE ip_address = ? AND successful = 0 AND created_at > (NOW(3) - INTERVAL ? MINUTE)`,
      [ip, windowMinutes],
    )
    if (Number(byIp?.attempts ?? 0) >= env.security.loginRateLimit) {
      throw tooManyRequests("Zu viele Anmeldeversuche von dieser Verbindung. Bitte später erneut versuchen.")
    }
  }
}

export async function purgeOldLoginAttempts() {
  await execute("DELETE FROM login_attempts WHERE created_at < (NOW(3) - INTERVAL 30 DAY)")
}
