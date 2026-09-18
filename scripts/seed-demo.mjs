import { addMonths, connect, generatePassword, hashPassword, loadEnv } from "./lib.mjs"

/**
 * Beispieldaten für Test- und Abnahmeumgebungen.
 * Verweigert die Ausführung in Produktion.
 */
loadEnv()

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("Demodaten sind in Produktion nicht vorgesehen. Abbruch.")
  process.exit(1)
}

const connection = await connect()

const customers = [
  { first: "Max", last: "Mustermann", city: "Bad Langensalza", country: "Deutschland", amount: "100000.00", rate: "3.2500", term: 12, start: "2026-01-15", status: "ACTIVE" },
  { first: "Andrea", last: "Hoffmann", city: "Erfurt", country: "Deutschland", amount: "60000.00", rate: "3.9500", term: 12, start: "2026-02-01", status: "ACTIVE" },
  { first: "Pierre", last: "Lefevre", city: "Strasbourg", country: "Frankreich", amount: "250000.00", rate: "4.2000", term: 24, start: "2025-10-10", status: "ACTIVE" },
  { first: "Sofia", last: "Rossi", city: "Milano", country: "Italien", amount: "75000.00", rate: "3.6000", term: 18, start: "2026-10-01", status: "PENDING" },
  { first: "Johan", last: "Bergstrom", city: "Stockholm", country: "Schweden", amount: "180000.00", rate: "3.4000", term: 36, start: "2024-07-01", status: "ACTIVE" },
  { first: "Katharina", last: "Wolff", city: "Salzburg", country: "Österreich", amount: "45000.00", rate: "3.8500", term: 24, start: "2026-03-01", status: "PENDING" },
  { first: "Tomas", last: "Silva", city: "Lisboa", country: "Portugal", amount: "30000.00", rate: "3.1500", term: 6, start: "2026-05-15", status: "ACTIVE" },
  { first: "Elena", last: "Novak", city: "Ljubljana", country: "Slowenien", amount: "85000.00", rate: "4.0500", term: 12, start: "2026-02-20", status: "ACTIVE" },
]

const [adminRows] = await connection.execute("SELECT id FROM auth_users WHERE role = 'ADMIN' ORDER BY id LIMIT 1")
const adminId = adminRows[0]?.id ?? null

let created = 0
for (const [index, entry] of customers.entries()) {
  const number = `PTB-${String(index + 1).padStart(6, "0")}`
  const email = `${entry.first.toLowerCase()}.${entry.last.toLowerCase()}@example.com`

  const [existing] = await connection.execute("SELECT id FROM customers WHERE customer_number = ? OR email = ?", [
    number,
    email,
  ])
  if (existing.length > 0) continue

  const [result] = await connection.execute(
    `INSERT INTO customers (customer_number, first_name, last_name, email, mobile, city, country,
       customer_status, kyc_status, identification_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Personalausweis')`,
    [number, entry.first, entry.last, email, "+49 170 0000000", entry.city, entry.country, entry.status, entry.status === "ACTIVE" ? "VERIFIED" : "SUBMITTED"],
  )
  const customerId = result.insertId

  await connection.execute(
    `INSERT INTO fixed_deposit_accounts (customer_id, account_number, product_name, principal_amount, currency,
       interest_rate, term_months, start_date, maturity_date, status, interest_payment_method, reference_account)
     VALUES (?, ?, 'Festgeld', ?, 'EUR', ?, ?, ?, ?, ?, 'AT_MATURITY', 'DE02 1203 0000 0000 2020 51')`,
    [
      customerId,
      `PTB-FT-${String(index + 1).padStart(4, "0")}`,
      entry.amount,
      entry.rate,
      entry.term,
      entry.start,
      addMonths(entry.start, entry.term),
      entry.status === "ACTIVE" ? "ACTIVE" : "PENDING",
    ],
  )

  const password = generatePassword()
  await connection.execute(
    `INSERT INTO auth_users (email, password_hash, role, full_name, customer_id, must_change_password, created_by)
     VALUES (?, ?, 'CUSTOMER', ?, ?, 1, ?)`,
    [email, await hashPassword(password), `${entry.first} ${entry.last}`, customerId, adminId],
  )

  console.log(`${number} ${entry.first} ${entry.last} · ${email} · Passwort: ${password}`)
  created += 1
}

console.log(created === 0 ? "Beispieldaten waren bereits vorhanden." : `${created} Beispielkunden angelegt.`)
await connection.end()
