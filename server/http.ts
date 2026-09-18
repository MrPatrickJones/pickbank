import "server-only"
import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { env } from "@/server/env"
import { ApiError, badRequest, forbidden } from "@/server/errors"
import { fieldErrors } from "@/server/validation"
import { verifyCsrf, type SessionContext } from "@/server/session"

export function json<T>(data: T, init?: number | ResponseInit) {
  const response = NextResponse.json(data, typeof init === "number" ? { status: init } : init)
  response.headers.set("Cache-Control", "no-store")
  response.headers.set("X-Content-Type-Options", "nosniff")
  return response
}

/** Errors are mapped to a stable shape; internals never reach the client. */
export function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return json({ error: { code: error.code, message: error.message, details: error.details ?? undefined } }, error.status)
  }

  if (error instanceof ZodError) {
    return json(
      { error: { code: "VALIDATION_ERROR", message: "Bitte prüfen Sie Ihre Eingaben.", details: fieldErrors(error) } },
      400,
    )
  }

  // Unexpected: log server-side, answer with a neutral message.
  console.error("[api]", error instanceof Error ? error.message : error)
  return json({ error: { code: "INTERNAL_ERROR", message: "Es ist ein unerwarteter Fehler aufgetreten." } }, 500)
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 45)
  return request.headers.get("x-real-ip")?.slice(0, 45) ?? null
}

/**
 * CSRF: the browser sends the session cookie automatically, so a mutating
 * request must additionally echo the CSRF token and come from a known origin.
 */
export function assertCsrf(request: Request, session: SessionContext) {
  const method = request.method.toUpperCase()
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return

  const origin = request.headers.get("origin")
  if (origin) {
    const allowed = env.security.allowedOrigins
    const host = request.headers.get("host")
    const sameHost = host ? origin.endsWith(`//${host}`) : false
    if (!sameHost && allowed.length > 0 && !allowed.includes(origin)) {
      throw forbidden("Ungültige Anfrage-Herkunft.")
    }
    if (!sameHost && allowed.length === 0) {
      throw forbidden("Ungültige Anfrage-Herkunft.")
    }
  }

  if (!verifyCsrf(request.headers.get("x-csrf-token"), session.csrfToken)) {
    throw forbidden("Sicherheitstoken fehlt oder ist ungültig.")
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw badRequest("Ungültiger Anfrageinhalt.")
  }
}

export function parseId(value: string | undefined): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw badRequest("Ungültige ID.")
  return id
}
