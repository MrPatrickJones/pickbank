import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { connect, loadEnv } from "./lib.mjs"

/**
 * Applies every SQL file in migrations/ that has not run yet and records it in
 * schema_migrations. Run with `pnpm migrate` after every deployment.
 */
loadEnv()

const connection = await connect()

await connection.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    filename   VARCHAR(190) NOT NULL,
    applied_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_migrations_filename (filename)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

const [applied] = await connection.query("SELECT filename FROM schema_migrations")
const done = new Set(applied.map((row) => row.filename))

const dir = join(process.cwd(), "migrations")
const files = readdirSync(dir).filter((file) => file.endsWith(".sql")).sort()

let count = 0
for (const file of files) {
  if (done.has(file)) continue
  const sql = readFileSync(join(dir, file), "utf8")
  process.stdout.write(`→ ${file} … `)
  try {
    await connection.query(sql)
    await connection.execute("INSERT INTO schema_migrations (filename) VALUES (?)", [file])
    count += 1
    console.log("ok")
  } catch (error) {
    console.log("fehlgeschlagen")
    console.error(error.message)
    await connection.end()
    process.exit(1)
  }
}

console.log(count === 0 ? "Datenbank ist aktuell." : `${count} Migration(en) angewendet.`)
await connection.end()
