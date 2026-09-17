"use client"

/**
 * Password handling for customer logins.
 *
 * The prototype never stores a password: it keeps a random salt and the
 * SHA-256 hash of `salt:password`, and shows the generated password to the
 * member of staff exactly once so they can hand it over. A production system
 * hashes on the server with a slow KDF (bcrypt, scrypt or Argon2) instead.
 */

const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function randomValues(length: number) {
  const buffer = new Uint32Array(length)
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(buffer)
    return buffer
  }
  for (let index = 0; index < length; index += 1) buffer[index] = Math.floor(Math.random() * 0xffffffff)
  return buffer
}

/** Readable password without ambiguous characters, grouped for dictation. */
export function generatePassword(groups = 3, groupLength = 4) {
  const values = randomValues(groups * groupLength)
  const parts: string[] = []
  for (let group = 0; group < groups; group += 1) {
    let part = ""
    for (let index = 0; index < groupLength; index += 1) {
      part += ALPHABET[values[group * groupLength + index] % ALPHABET.length]
    }
    parts.push(part)
  }
  return parts.join("-")
}

export function randomSalt() {
  return Array.from(randomValues(4))
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("")
}

function fallbackHash(input: string) {
  // Only used where SubtleCrypto is unavailable (insecure context). Weak by
  // design – the README calls this out; production hashing happens server-side.
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `fallback:${hash.toString(16)}`
}

export async function hashPassword(password: string, salt: string) {
  const input = `${salt}:${password}`
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(input)
    const digest = await window.crypto.subtle.digest("SHA-256", encoded)
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  }
  return fallbackHash(input)
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = await hashPassword(password, salt)
  if (actual.length !== expectedHash.length) return false
  // Constant-time comparison, so a wrong password reveals nothing through timing.
  let diff = 0
  for (let index = 0; index < actual.length; index += 1) {
    diff |= actual.charCodeAt(index) ^ expectedHash.charCodeAt(index)
  }
  return diff === 0
}
