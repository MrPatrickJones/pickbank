import { readFileSync, existsSync } from "node:fs"
import { randomBytes, scrypt as scryptCallback } from "node:crypto"
import { promisify } from "node:util"
import mysql from "mysql2/promise"

const scrypt = promisify(scryptCallback)

/** Minimal .env loader so the scripts run without extra dependencies. */
export function loadEnv(file = ".env") {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const index = trimmed.indexOf("=")
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

export async function connect() {
  return mysql.createConnection({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "pickbank",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "pickbank_dev",
    multipleStatements: true,
    timezone: "Z",
    dateStrings: ["DATE"],
  })
}

/** Same format as server/password.ts: scrypt$N$r$p$salt$hash */
export async function hashPassword(password) {
  const N = 16384
  const r = 8
  const p = 1
  const salt = randomBytes(16)
  const derived = await scrypt(password.normalize("NFKC"), salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 })
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${derived.toString("base64")}`
}

const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function generatePassword(groups = 3, groupLength = 4) {
  const bytes = randomBytes(groups * groupLength)
  const parts = []
  for (let group = 0; group < groups; group += 1) {
    let part = ""
    for (let index = 0; index < groupLength; index += 1) {
      part += ALPHABET[bytes[group * groupLength + index] % ALPHABET.length]
    }
    parts.push(part)
  }
  return parts.join("-")
}

export function addMonths(startISO, months) {
  const date = new Date(`${startISO}T00:00:00Z`)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, lastDay))
  return date.toISOString().slice(0, 10)
}
