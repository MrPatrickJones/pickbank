import "server-only"

import { execute, isDuplicateKeyError, query, queryOne, type SqlValue } from "@/server/db"
import { conflict, notFound } from "@/server/errors"

/**
 * Banken werden einmal zentral gepflegt. Anlagen verweisen nur darauf, damit
 * Name und Logo nicht an jeder einzelnen Anlage hängen.
 */

export type BankRow = {
  id: number
  name: string
  legal_name: string | null
  country: string
  city: string | null
  address: string | null
  postal_code: string | null
  website: string | null
  bic: string | null
  logo_key: string | null
  logo_mime: string | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

const COLUMNS = `id, name, legal_name, country, city, address, postal_code, website, bic,
  logo_key, logo_mime, notes, created_at, updated_at`

/** Das Logo wird über die API ausgeliefert, nie über einen öffentlichen Pfad. */
export const bankLogoUrl = (row: { id: number; logo_key: string | null; updated_at?: Date }) =>
  row.logo_key ? `/api/banks/${row.id}/logo` : null

export function toBankDto(row: BankRow, extra?: { accountCount?: number; includeInternal?: boolean }) {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    country: row.country,
    city: row.city,
    address: row.address,
    postalCode: row.postal_code,
    website: row.website,
    bic: row.bic,
    hasLogo: Boolean(row.logo_key),
    logoUrl: bankLogoUrl(row),
    ...(extra?.includeInternal === false ? {} : { notes: row.notes }),
    ...(extra?.accountCount === undefined ? {} : { accountCount: extra.accountCount }),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

/** Kurzform für die Kundenansicht – ohne interne Notizen. */
export function toBankRef(row: {
  id: number
  name: string
  country: string
  city: string | null
  address: string | null
  website: string | null
  bic: string | null
  logo_key: string | null
}) {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    city: row.city,
    address: row.address,
    website: row.website,
    bic: row.bic,
    logoUrl: bankLogoUrl(row),
  }
}

export async function listBanks(search?: string) {
  const values: SqlValue[] = []
  let where = "b.deleted_at IS NULL"
  if (search) {
    where += " AND (b.name LIKE ? OR b.country LIKE ? OR b.bic LIKE ?)"
    const like = `%${search}%`
    values.push(like, like, like)
  }

  return query<BankRow & { account_count: number }>(
    `SELECT ${COLUMNS.split(",").map((column) => `b.${column.trim()}`).join(", ")},
            (SELECT COUNT(*) FROM fixed_deposit_accounts a
              WHERE a.bank_id = b.id AND a.deleted_at IS NULL) AS account_count
       FROM banks b
      WHERE ${where}
      ORDER BY b.name ASC`,
    values,
  )
}

export async function findBankById(id: number) {
  return queryOne<BankRow>(`SELECT ${COLUMNS} FROM banks WHERE id = ? AND deleted_at IS NULL`, [id])
}

export async function requireBankById(id: number) {
  const bank = await findBankById(id)
  if (!bank) throw notFound("Die Bank wurde nicht gefunden.")
  return bank
}

export type BankInput = {
  name: string
  legalName?: string | null
  country: string
  city?: string | null
  address?: string | null
  postalCode?: string | null
  website?: string | null
  bic?: string | null
  notes?: string | null
}

export async function insertBank(input: BankInput) {
  try {
    const result = await execute(
      `INSERT INTO banks (name, legal_name, country, city, address, postal_code, website, bic, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name,
        input.legalName ?? null,
        input.country,
        input.city ?? null,
        input.address ?? null,
        input.postalCode ?? null,
        input.website ?? null,
        input.bic ?? null,
        input.notes ?? null,
      ],
    )
    return result.insertId
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw conflict("Diese Bank ist bereits angelegt.", { name: "Diese Bank ist bereits angelegt." })
    }
    throw error
  }
}

const UPDATABLE: Record<string, string> = {
  name: "name",
  legalName: "legal_name",
  country: "country",
  city: "city",
  address: "address",
  postalCode: "postal_code",
  website: "website",
  bic: "bic",
  notes: "notes",
}

export async function updateBank(id: number, patch: Record<string, unknown>) {
  const sets: string[] = []
  const values: SqlValue[] = []

  for (const [key, column] of Object.entries(UPDATABLE)) {
    if (!(key in patch)) continue
    sets.push(`${column} = ?`)
    values.push((patch[key] ?? null) as SqlValue)
  }

  if (sets.length === 0) return
  values.push(id)
  try {
    await execute(`UPDATE banks SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`, values)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw conflict("Diese Bank ist bereits angelegt.", { name: "Diese Bank ist bereits angelegt." })
    }
    throw error
  }
}

export async function setBankLogo(id: number, logoKey: string | null, logoMime: string | null) {
  await execute("UPDATE banks SET logo_key = ?, logo_mime = ? WHERE id = ? AND deleted_at IS NULL", [
    logoKey,
    logoMime,
    id,
  ])
}

export async function countAccountsOfBank(id: number) {
  const row = await queryOne<{ total: number }>(
    "SELECT COUNT(*) AS total FROM fixed_deposit_accounts WHERE bank_id = ? AND deleted_at IS NULL",
    [id],
  )
  return Number(row?.total ?? 0)
}

/** Banken mit laufenden Anlagen bleiben erhalten – sonst verlöre die Anlage ihren Bezug. */
export async function softDeleteBank(id: number) {
  const inUse = await countAccountsOfBank(id)
  if (inUse > 0) {
    throw conflict(
      `Diese Bank ist noch ${inUse === 1 ? "einer Anlage" : `${inUse} Anlagen`} zugeordnet und kann nicht entfernt werden.`,
    )
  }
  await execute("UPDATE banks SET deleted_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [id])
}
