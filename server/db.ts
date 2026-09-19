import "server-only"
import mysql from "mysql2/promise"

import { env } from "@/server/env"

/**
 * One pool per process. Next.js reloads modules in development, so the pool is
 * cached on globalThis to avoid leaking connections.
 */
const globalForDb = globalThis as unknown as { __ptbPool?: mysql.Pool }

export function pool() {
  if (!globalForDb.__ptbPool) {
    globalForDb.__ptbPool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      waitForConnections: true,
      connectionLimit: env.db.connectionLimit,
      maxIdle: env.db.connectionLimit,
      enableKeepAlive: true,
      timezone: "Z",
      dateStrings: ["DATE"],
      decimalNumbers: false,
      namedPlaceholders: false,
      ssl: env.db.ssl ? { rejectUnauthorized: true } : undefined,
    })
  }
  return globalForDb.__ptbPool
}

export type Row = Record<string, unknown>

/** Values accepted as bound parameters. */
export type SqlValue = string | number | boolean | Date | null

/** All statements are parameterised – never build SQL by string concatenation. */
export async function query<T = Row>(sql: string, params: SqlValue[] = []): Promise<T[]> {
  const [rows] = await pool().execute(sql, params)
  return rows as T[]
}

export async function queryOne<T = Row>(sql: string, params: SqlValue[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

export async function execute(sql: string, params: SqlValue[] = []) {
  const [result] = await pool().execute(sql, params)
  return result as mysql.ResultSetHeader
}

/** Runs the callback inside a transaction and rolls back on any error. */
export async function transaction<T>(handler: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool().getConnection()
  try {
    await connection.beginTransaction()
    const result = await handler(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export function isDuplicateKeyError(error: unknown): error is { code: string; message: string } {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "ER_DUP_ENTRY"
}
