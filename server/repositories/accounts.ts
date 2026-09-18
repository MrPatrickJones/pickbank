import "server-only"

import { execute, isDuplicateKeyError, query, queryOne, type SqlValue } from "@/server/db"
import { conflict, notFound } from "@/server/errors"
import { accruedInterest, addAmounts, interestAtMaturity, today } from "@/server/money"

export type AccountRow = {
  id: number
  customer_id: number
  account_number: string
  product_name: string
  principal_amount: string
  currency: string
  interest_rate: string
  term_months: number
  start_date: string
  maturity_date: string
  status: "PENDING" | "ACTIVE" | "MATURED" | "CLOSED" | "CANCELLED"
  interest_payment_method: "AT_MATURITY" | "ANNUAL" | "QUARTERLY" | "MONTHLY"
  payout_date: string | null
  reference_account: string | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

const COLUMNS = `id, customer_id, account_number, product_name, principal_amount, currency, interest_rate,
  term_months, start_date, maturity_date, status, interest_payment_method, payout_date, reference_account,
  notes, created_at, updated_at`

/** The derived figures are computed here so the client never recalculates money. */
export function toAccountDto(row: AccountRow, includeInternal = true) {
  const asOf = today()
  return {
    id: row.id,
    customerId: row.customer_id,
    accountNumber: row.account_number,
    productName: row.product_name,
    principalAmount: String(row.principal_amount),
    currency: row.currency,
    interestRate: String(row.interest_rate),
    termMonths: Number(row.term_months),
    startDate: row.start_date,
    maturityDate: row.maturity_date,
    status: row.status,
    interestPaymentMethod: row.interest_payment_method,
    payoutDate: row.payout_date,
    referenceAccount: row.reference_account,
    ...(includeInternal ? { notes: row.notes } : {}),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    accruedInterest: accruedInterest(
      String(row.principal_amount),
      String(row.interest_rate),
      Number(row.term_months),
      row.start_date,
      asOf,
    ),
    interestAtMaturity: interestAtMaturity(
      String(row.principal_amount),
      String(row.interest_rate),
      Number(row.term_months),
    ),
  }
}

export async function listAccountsOfCustomer(customerId: number) {
  const rows = await query<AccountRow>(
    `SELECT ${COLUMNS} FROM fixed_deposit_accounts
      WHERE customer_id = ? AND deleted_at IS NULL ORDER BY start_date DESC, id DESC`,
    [customerId],
  )
  return rows
}

export async function findAccountById(id: number) {
  return queryOne<AccountRow>(`SELECT ${COLUMNS} FROM fixed_deposit_accounts WHERE id = ? AND deleted_at IS NULL`, [id])
}

export async function requireAccountById(id: number) {
  const account = await findAccountById(id)
  if (!account) throw notFound("Das Festgeldkonto wurde nicht gefunden.")
  return account
}

export async function nextAccountNumber() {
  const row = await queryOne<{ max_number: string | null }>(
    `SELECT MAX(CAST(SUBSTRING(account_number, 8) AS UNSIGNED)) AS max_number
       FROM fixed_deposit_accounts WHERE account_number LIKE 'PTB-FT-%'`,
  )
  const next = Number(row?.max_number ?? 0) + 1
  return `PTB-FT-${String(next).padStart(4, "0")}`
}

export type AccountInput = {
  accountNumber: string
  productName: string
  principalAmount: string
  currency: string
  interestRate: string
  termMonths: number
  startDate: string
  maturityDate: string
  status: AccountRow["status"]
  interestPaymentMethod: AccountRow["interest_payment_method"]
  payoutDate?: string | null
  referenceAccount?: string | null
  notes?: string | null
}

export async function insertAccount(customerId: number, input: AccountInput) {
  try {
    const result = await execute(
      `INSERT INTO fixed_deposit_accounts
         (customer_id, account_number, product_name, principal_amount, currency, interest_rate, term_months,
          start_date, maturity_date, status, interest_payment_method, payout_date, reference_account, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerId,
        input.accountNumber,
        input.productName,
        input.principalAmount,
        input.currency,
        input.interestRate,
        input.termMonths,
        input.startDate,
        input.maturityDate,
        input.status,
        input.interestPaymentMethod,
        input.payoutDate ?? null,
        input.referenceAccount ?? null,
        input.notes ?? null,
      ],
    )
    return result.insertId
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw conflict("Diese Kontonummer ist bereits vergeben.", {
        accountNumber: "Diese Kontonummer ist bereits vergeben.",
      })
    }
    throw error
  }
}

const UPDATABLE: Record<string, string> = {
  productName: "product_name",
  principalAmount: "principal_amount",
  currency: "currency",
  interestRate: "interest_rate",
  termMonths: "term_months",
  startDate: "start_date",
  maturityDate: "maturity_date",
  status: "status",
  interestPaymentMethod: "interest_payment_method",
  payoutDate: "payout_date",
  referenceAccount: "reference_account",
  notes: "notes",
}

export async function updateAccount(id: number, patch: Record<string, unknown>) {
  const sets: string[] = []
  const values: SqlValue[] = []

  for (const [key, column] of Object.entries(UPDATABLE)) {
    if (!(key in patch)) continue
    sets.push(`${column} = ?`)
    values.push((patch[key] ?? null) as SqlValue)
  }

  if (sets.length === 0) return
  values.push(id)
  await execute(`UPDATE fixed_deposit_accounts SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`, values)
}

export async function listAllAccounts(filters: { status?: string; search?: string; limit?: number }) {
  const where: string[] = ["a.deleted_at IS NULL", "c.deleted_at IS NULL"]
  const values: SqlValue[] = []

  if (filters.status) {
    where.push("a.status = ?")
    values.push(filters.status)
  }
  if (filters.search) {
    where.push("(a.account_number LIKE ? OR a.reference_account LIKE ? OR c.last_name LIKE ? OR c.customer_number LIKE ?)")
    const like = `%${filters.search}%`
    values.push(like, like, like, like)
  }

  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 500)

  return query<AccountRow & { first_name: string; last_name: string; customer_number: string }>(
    `SELECT ${COLUMNS.split(",").map((column) => `a.${column.trim()}`).join(", ")},
            c.first_name, c.last_name, c.customer_number
       FROM fixed_deposit_accounts a
       JOIN customers c ON c.id = a.customer_id
      WHERE ${where.join(" AND ")}
      ORDER BY a.maturity_date ASC
      LIMIT ${limit}`,
    values,
  )
}

/** Portfolio figures for the admin dashboard. */
export async function portfolioSummary() {
  const asOf = today()

  const [customerCounts] = await query<{
    total: number
    active: number
    pending: number
    blocked: number
    recent: number
  }>(
    `SELECT COUNT(*) AS total,
            SUM(customer_status = 'ACTIVE') AS active,
            SUM(customer_status = 'PENDING') AS pending,
            SUM(customer_status = 'BLOCKED') AS blocked,
            SUM(created_at > (NOW(3) - INTERVAL 90 DAY)) AS recent
       FROM customers WHERE deleted_at IS NULL`,
  )

  const accounts = await query<AccountRow>(
    `SELECT ${COLUMNS} FROM fixed_deposit_accounts
      WHERE deleted_at IS NULL AND status IN ('ACTIVE','PENDING','MATURED')`,
  )

  const volume = accounts.length ? addAmounts(accounts.map((row) => String(row.principal_amount))) : "0.00"
  const maturingSoon = accounts.filter(
    (row) => row.maturity_date >= asOf && new Date(row.maturity_date) <= new Date(Date.now() + 60 * 86_400_000),
  )
  const overdue = accounts.filter((row) => row.status !== "MATURED" && row.maturity_date < asOf)

  return {
    customers: {
      total: Number(customerCounts?.total ?? 0),
      active: Number(customerCounts?.active ?? 0),
      pending: Number(customerCounts?.pending ?? 0),
      blocked: Number(customerCounts?.blocked ?? 0),
      recent: Number(customerCounts?.recent ?? 0),
    },
    accounts: {
      total: accounts.length,
      active: accounts.filter((row) => row.status === "ACTIVE").length,
      volume,
      maturingSoon: maturingSoon.length,
      maturingVolume: maturingSoon.length
        ? addAmounts(maturingSoon.map((row) => String(row.principal_amount)))
        : "0.00",
      overdue: overdue.length,
    },
  }
}
