import "server-only"

import { execute, isDuplicateKeyError, query, queryOne, type SqlValue } from "@/server/db"
import { conflict, notFound } from "@/server/errors"
import { accruedInterest, addAmounts, interestAtMaturity, today } from "@/server/money"
import type { CustomerListQuery } from "@/server/validation"

export type CustomerRow = {
  id: number
  customer_number: string
  first_name: string
  last_name: string
  company_name: string | null
  email: string
  phone: string | null
  mobile: string | null
  date_of_birth: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  country: string | null
  nationality: string | null
  customer_status: "ACTIVE" | "INACTIVE" | "PENDING" | "BLOCKED"
  kyc_status: "OPEN" | "SUBMITTED" | "VERIFIED" | "REJECTED"
  identified_at: string | null
  identification_type: string | null
  created_at: Date
  updated_at: Date
  last_login_at: Date | null
}

export type CustomerDto = ReturnType<typeof toCustomerDto>

export function toCustomerDto(row: CustomerRow) {
  return {
    id: row.id,
    customerNumber: row.customer_number,
    firstName: row.first_name,
    lastName: row.last_name,
    companyName: row.company_name,
    email: row.email,
    phone: row.phone,
    mobile: row.mobile,
    dateOfBirth: row.date_of_birth,
    address: row.address,
    postalCode: row.postal_code,
    city: row.city,
    country: row.country,
    nationality: row.nationality,
    customerStatus: row.customer_status,
    kycStatus: row.kyc_status,
    identifiedAt: row.identified_at,
    identificationType: row.identification_type,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
  }
}

const COLUMNS = `id, customer_number, first_name, last_name, company_name, email, phone, mobile,
  date_of_birth, address, postal_code, city, country, nationality, customer_status, kyc_status,
  identified_at, identification_type, created_at, updated_at, last_login_at`

export async function findCustomerById(id: number) {
  const row = await queryOne<CustomerRow>(
    `SELECT ${COLUMNS} FROM customers WHERE id = ? AND deleted_at IS NULL`,
    [id],
  )
  return row ? toCustomerDto(row) : null
}

export async function requireCustomerById(id: number) {
  const customer = await findCustomerById(id)
  if (!customer) throw notFound("Der Kunde wurde nicht gefunden.")
  return customer
}

export async function nextCustomerNumber() {
  const row = await queryOne<{ max_number: string | null }>(
    `SELECT MAX(CAST(SUBSTRING(customer_number, 5) AS UNSIGNED)) AS max_number
       FROM customers WHERE customer_number LIKE 'PTB-%'`,
  )
  const next = Number(row?.max_number ?? 0) + 1
  return `PTB-${String(next).padStart(6, "0")}`
}

type CustomerInput = {
  customerNumber: string
  firstName: string
  lastName: string
  companyName?: string | null
  email: string
  phone?: string | null
  mobile?: string | null
  dateOfBirth?: string | null
  address?: string | null
  postalCode?: string | null
  city: string
  country: string
  nationality?: string | null
  customerStatus: CustomerRow["customer_status"]
  kycStatus: CustomerRow["kyc_status"]
  identifiedAt?: string | null
  identificationType?: string | null
}

export async function insertCustomer(input: CustomerInput) {
  try {
    const result = await execute(
      `INSERT INTO customers
         (customer_number, first_name, last_name, company_name, email, phone, mobile, date_of_birth,
          address, postal_code, city, country, nationality, customer_status, kyc_status,
          identified_at, identification_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.customerNumber,
        input.firstName,
        input.lastName,
        input.companyName ?? null,
        input.email,
        input.phone ?? null,
        input.mobile ?? null,
        input.dateOfBirth ?? null,
        input.address ?? null,
        input.postalCode ?? null,
        input.city,
        input.country,
        input.nationality ?? null,
        input.customerStatus,
        input.kycStatus,
        input.identifiedAt ?? null,
        input.identificationType ?? null,
      ],
    )
    return result.insertId
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      if (error.message.includes("uq_customers_email")) {
        throw conflict("Diese E-Mail-Adresse ist bereits vergeben.", { email: "Diese E-Mail-Adresse ist bereits vergeben." })
      }
      throw conflict("Diese Kundennummer ist bereits vergeben.", {
        customerNumber: "Diese Kundennummer ist bereits vergeben.",
      })
    }
    throw error
  }
}

const UPDATABLE: Record<string, string> = {
  firstName: "first_name",
  lastName: "last_name",
  companyName: "company_name",
  email: "email",
  phone: "phone",
  mobile: "mobile",
  dateOfBirth: "date_of_birth",
  address: "address",
  postalCode: "postal_code",
  city: "city",
  country: "country",
  nationality: "nationality",
  customerStatus: "customer_status",
  kycStatus: "kyc_status",
  identifiedAt: "identified_at",
  identificationType: "identification_type",
}

export async function updateCustomer(id: number, patch: Record<string, unknown>) {
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
    await execute(`UPDATE customers SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`, values)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw conflict("Diese E-Mail-Adresse ist bereits vergeben.", { email: "Diese E-Mail-Adresse ist bereits vergeben." })
    }
    throw error
  }
}

export async function softDeleteCustomer(id: number) {
  await execute(
    `UPDATE customers
        SET deleted_at = CURRENT_TIMESTAMP(3),
            customer_status = 'INACTIVE',
            email = CONCAT('deleted+', id, '@invalid'),
            customer_number = CONCAT(customer_number, '-DEL', id)
      WHERE id = ? AND deleted_at IS NULL`,
    [id],
  )
  await execute("DELETE FROM auth_users WHERE customer_id = ?", [id])
}

export type CustomerListRow = CustomerRow & {
  account_count: number
  active_accounts: number
  total_principal: string | null
  next_maturity: string | null
}

/** Filtering, sorting and pagination happen in SQL, never in the browser. */
export async function listCustomers(params: CustomerListQuery) {
  const where: string[] = ["c.deleted_at IS NULL"]
  const values: SqlValue[] = []

  if (params.search) {
    where.push(
      `(c.first_name LIKE ? OR c.last_name LIKE ? OR c.customer_number LIKE ? OR c.email LIKE ? OR c.city LIKE ?)`,
    )
    const like = `%${params.search}%`
    values.push(like, like, like, like, like)
  }
  if (params.status) {
    where.push("c.customer_status = ?")
    values.push(params.status)
  }
  if (params.kycStatus) {
    where.push("c.kyc_status = ?")
    values.push(params.kycStatus)
  }
  if (params.country) {
    where.push("c.country = ?")
    values.push(params.country)
  }
  if (params.createdAfter) {
    where.push("c.created_at >= ?")
    values.push(`${params.createdAfter} 00:00:00`)
  }

  const having: string[] = []
  if (params.minVolume !== undefined) {
    having.push("COALESCE(total_principal, 0) >= ?")
    values.push(params.minVolume)
  }
  if (params.maturityBefore) {
    having.push("next_maturity IS NOT NULL AND next_maturity <= ?")
    values.push(params.maturityBefore)
  }
  if (params.termMonths !== undefined) {
    having.push(
      `EXISTS (SELECT 1 FROM fixed_deposit_accounts t WHERE t.customer_id = c.id AND t.deleted_at IS NULL AND t.term_months = ?)`,
    )
    values.push(params.termMonths)
  }

  const sortColumns: Record<CustomerListQuery["sort"], string> = {
    name: "c.last_name, c.first_name",
    customerNumber: "c.customer_number",
    volume: "total_principal",
    created: "c.created_at",
    updated: "c.updated_at",
    maturity: "next_maturity",
  }

  const direction = params.direction === "desc" ? "DESC" : "ASC"
  const offset = (params.page - 1) * params.pageSize

  const sql = `
    SELECT ${COLUMNS.split(",").map((column) => `c.${column.trim()}`).join(", ")},
           COUNT(a.id) AS account_count,
           SUM(CASE WHEN a.status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_accounts,
           SUM(CASE WHEN a.status IN ('ACTIVE','PENDING','IN_PROGRESS','MATURED') THEN a.principal_amount ELSE 0 END) AS total_principal,
           MIN(CASE WHEN a.status IN ('ACTIVE','PENDING','IN_PROGRESS') AND a.maturity_date >= CURDATE() THEN a.maturity_date END) AS next_maturity
      FROM customers c
      LEFT JOIN fixed_deposit_accounts a ON a.customer_id = c.id AND a.deleted_at IS NULL
     WHERE ${where.join(" AND ")}
     GROUP BY c.id
     ${having.length ? `HAVING ${having.join(" AND ")}` : ""}
     ORDER BY ${sortColumns[params.sort]} ${direction}
     LIMIT ${Number(params.pageSize)} OFFSET ${Number(offset)}`

  const rows = await query<CustomerListRow>(sql, values)

  const countSql = `
    SELECT COUNT(*) AS total FROM (
      SELECT c.id,
             SUM(CASE WHEN a.status IN ('ACTIVE','PENDING','IN_PROGRESS','MATURED') THEN a.principal_amount ELSE 0 END) AS total_principal,
             MIN(CASE WHEN a.status IN ('ACTIVE','PENDING','IN_PROGRESS') AND a.maturity_date >= CURDATE() THEN a.maturity_date END) AS next_maturity
        FROM customers c
        LEFT JOIN fixed_deposit_accounts a ON a.customer_id = c.id AND a.deleted_at IS NULL
       WHERE ${where.join(" AND ")}
       GROUP BY c.id
       ${having.length ? `HAVING ${having.join(" AND ")}` : ""}
    ) AS filtered`

  const totalRow = await queryOne<{ total: number }>(countSql, values)

  return {
    items: rows.map((row) => ({
      ...toCustomerDto(row),
      accountCount: Number(row.account_count ?? 0),
      activeAccounts: Number(row.active_accounts ?? 0),
      totalPrincipal: row.total_principal ? String(row.total_principal) : "0.00",
      nextMaturity: row.next_maturity ?? null,
    })),
    total: Number(totalRow?.total ?? 0),
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(Number(totalRow?.total ?? 0) / params.pageSize)),
  }
}

/** Aggregate figures for one customer, calculated on the server. */
export async function customerTotals(customerId: number) {
  const rows = await query<{
    principal_amount: string
    interest_rate: string
    term_months: number
    start_date: string
    maturity_date: string
    status: string
  }>(
    `SELECT principal_amount, interest_rate, term_months, start_date, maturity_date, status
       FROM fixed_deposit_accounts
      WHERE customer_id = ? AND deleted_at IS NULL AND status IN ('ACTIVE','PENDING','IN_PROGRESS','MATURED')`,
    [customerId],
  )

  const asOf = today()
  const principal = rows.length ? addAmounts(rows.map((row) => row.principal_amount)) : "0.00"
  const accrued = rows.length
    ? addAmounts(
        rows.map((row) =>
          accruedInterest(row.principal_amount, row.interest_rate, row.term_months, row.start_date, asOf),
        ),
      )
    : "0.00"
  const expected = rows.length
    ? addAmounts(rows.map((row) => interestAtMaturity(row.principal_amount, row.interest_rate, row.term_months)))
    : "0.00"

  const upcoming = rows
    .filter((row) => row.status !== "MATURED" && row.maturity_date >= asOf)
    .map((row) => row.maturity_date)
    .sort()

  const weightedRate =
    Number(principal) > 0
      ? rows.reduce((sum, row) => sum + Number(row.interest_rate) * Number(row.principal_amount), 0) /
        Number(principal)
      : 0

  return {
    principal,
    accruedInterest: accrued,
    expectedInterest: expected,
    accountCount: rows.length,
    activeAccounts: rows.filter((row) => row.status === "ACTIVE").length,
    averageRate: weightedRate.toFixed(4),
    nextMaturity: upcoming[0] ?? null,
  }
}
