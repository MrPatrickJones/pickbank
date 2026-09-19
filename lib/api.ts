"use client"

/** Typed client for the portal API. Cookies carry the session, never tokens in JS. */

export class ApiRequestError extends Error {
  status: number
  code: string
  details: Record<string, string>

  constructor(status: number, code: string, message: string, details: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

function csrfToken() {
  if (typeof document === "undefined") return ""
  const match = document.cookie.match(/(?:^|;\s*)ptb_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ""
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (method !== "GET") headers["X-CSRF-Token"] = csrfToken()

  const response = await fetch(path, {
    method,
    headers,
    credentials: "same-origin",
    cache: "no-store",
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {}

  if (!response.ok) {
    const error = (payload.error ?? {}) as { code?: string; message?: string; details?: Record<string, string> }
    throw new ApiRequestError(
      response.status,
      error.code ?? "ERROR",
      error.message ?? "Die Anfrage konnte nicht verarbeitet werden.",
      error.details ?? {},
    )
  }

  return payload as T
}

/** Multipart-Upload: der Browser setzt die Content-Type-Grenze selbst. */
async function upload<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { Accept: "application/json", "X-CSRF-Token": csrfToken() },
    credentials: "same-origin",
    cache: "no-store",
    body: form,
  })

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {}

  if (!response.ok) {
    const error = (payload.error ?? {}) as { code?: string; message?: string; details?: Record<string, string> }
    throw new ApiRequestError(
      response.status,
      error.code ?? "ERROR",
      error.message ?? "Die Datei konnte nicht hochgeladen werden.",
      error.details ?? {},
    )
  }

  return payload as T
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  upload,
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
}

export function buildQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}
