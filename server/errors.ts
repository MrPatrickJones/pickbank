import "server-only"

/** Errors that may be shown to the caller verbatim. Everything else becomes a 500. */
export class ApiError extends Error {
  status: number
  code: string
  details?: Record<string, string>

  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const badRequest = (message: string, details?: Record<string, string>) =>
  new ApiError(400, "BAD_REQUEST", message, details)
export const unauthorized = (message = "Nicht angemeldet.") => new ApiError(401, "UNAUTHORIZED", message)
export const forbidden = (message = "Keine Berechtigung für diese Aktion.") => new ApiError(403, "FORBIDDEN", message)
export const notFound = (message = "Der Datensatz wurde nicht gefunden.") => new ApiError(404, "NOT_FOUND", message)
export const conflict = (message: string, details?: Record<string, string>) =>
  new ApiError(409, "CONFLICT", message, details)
export const tooManyRequests = (message: string) => new ApiError(429, "TOO_MANY_REQUESTS", message)
