import "server-only"

/**
 * Configuration comes from environment variables only – never from the client
 * bundle and never from the repository. See .env.example.
 */

function required(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback
  if (value === undefined || value === "") {
    throw new Error(`Environment variable ${name} is missing`)
  }
  return value
}

function number(name: string, fallback: number) {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  get isProduction() {
    return this.nodeEnv === "production"
  },
  db: {
    host: required("DB_HOST", "127.0.0.1"),
    port: number("DB_PORT", 3306),
    user: required("DB_USER", "pickbank"),
    password: process.env.DB_PASSWORD ?? "",
    database: required("DB_NAME", "pickbank_dev"),
    connectionLimit: number("DB_POOL_SIZE", 10),
    ssl: process.env.DB_SSL === "true",
  },
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME ?? "ptb_session",
    csrfCookieName: process.env.CSRF_COOKIE_NAME ?? "ptb_csrf",
    /** Absolute session lifetime in minutes. */
    lifetimeMinutes: number("SESSION_LIFETIME_MINUTES", 720),
    /** Sessions expire this many minutes after the last request. */
    idleMinutes: number("SESSION_IDLE_MINUTES", 15),
  },
  storage: {
    /** Dateien liegen ausserhalb des Webroots – niemals unter public/. */
    dir: process.env.STORAGE_DIR ?? "./var/storage",
    /** Obergrenze je hochgeladener Datei. */
    maxUploadMb: number("MAX_UPLOAD_MB", 10),
    maxLogoMb: number("MAX_LOGO_MB", 2),
  },
  security: {
    /** Failed logins per identifier before the account is locked. */
    maxLoginAttempts: number("MAX_LOGIN_ATTEMPTS", 5),
    lockoutMinutes: number("LOCKOUT_MINUTES", 15),
    /** Requests per window for the login endpoint, per IP. */
    loginRateLimit: number("LOGIN_RATE_LIMIT", 20),
    loginRateWindowMinutes: number("LOGIN_RATE_WINDOW_MINUTES", 15),
    passwordMinLength: number("PASSWORD_MIN_LENGTH", 10),
    /** Comma separated list of origins allowed for mutating requests. */
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean),
  },
}
