import { connect, generatePassword, hashPassword, loadEnv } from "./lib.mjs"

/**
 * Creates (or updates) the first administrator from the environment.
 * ADMIN_EMAIL is required; ADMIN_PASSWORD is optional – without it a password
 * is generated and printed once.
 */
loadEnv()

const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase()
const name = process.env.ADMIN_NAME ?? "Administrator"
if (!email) {
  console.error("ADMIN_EMAIL fehlt. Bitte in der .env setzen.")
  process.exit(1)
}

const password = process.env.ADMIN_PASSWORD?.trim() || generatePassword(4)
if (password.length < 10) {
  console.error("ADMIN_PASSWORD muss mindestens 10 Zeichen haben.")
  process.exit(1)
}

const connection = await connect()
const hash = await hashPassword(password)

const [existing] = await connection.execute("SELECT id FROM auth_users WHERE email = ?", [email])
if (existing.length > 0) {
  await connection.execute(
    "UPDATE auth_users SET password_hash = ?, role = 'ADMIN', full_name = ?, status = 'ACTIVE', failed_attempts = 0, locked_until = NULL WHERE id = ?",
    [hash, name, existing[0].id],
  )
  console.log(`Administrator ${email} aktualisiert.`)
} else {
  await connection.execute(
    "INSERT INTO auth_users (email, password_hash, role, full_name, status) VALUES (?, ?, 'ADMIN', ?, 'ACTIVE')",
    [email, hash, name],
  )
  console.log(`Administrator ${email} angelegt.`)
}

if (!process.env.ADMIN_PASSWORD) {
  console.log(`Passwort (einmalig angezeigt): ${password}`)
}

await connection.end()
