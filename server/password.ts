import "server-only"
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>

/**
 * scrypt from the Node standard library – a memory-hard KDF, no native build
 * step, which matters on shared hosting. Format: scrypt$N$r$p$salt$hash
 */
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const KEY_LENGTH = 64

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const derived = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, PARAMS)
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64")}$${derived.toString("base64")}`
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$")
  if (parts.length !== 6 || parts[0] !== "scrypt") return false

  const [, n, r, p, saltB64, hashB64] = parts
  const salt = Buffer.from(saltB64, "base64")
  const expected = Buffer.from(hashB64, "base64")

  const derived = await scrypt(password.normalize("NFKC"), salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 128 * 1024 * 1024,
  })

  return derived.length === expected.length && timingSafeEqual(derived, expected)
}

const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** Readable start password, e.g. tKar-3KEP-mQ7v. */
export function generatePassword(groups = 3, groupLength = 4) {
  const bytes = randomBytes(groups * groupLength)
  const parts: string[] = []
  for (let group = 0; group < groups; group += 1) {
    let part = ""
    for (let index = 0; index < groupLength; index += 1) {
      part += ALPHABET[bytes[group * groupLength + index] % ALPHABET.length]
    }
    parts.push(part)
  }
  return parts.join("-")
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url")
}
