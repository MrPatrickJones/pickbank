import { createHash, randomBytes } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

import { addMonths, connect, generatePassword, hashPassword, loadEnv } from "./lib.mjs"

/**
 * Beispieldaten für Test- und Abnahmeumgebungen: Banken, Kunden, mehrere
 * Festgeldanlagen je Kunde und echte Platzhalterdateien.
 *
 * Sämtliche Namen, Beträge und Dokumente sind frei erfunden und als DEMO
 * gekennzeichnet. In Produktion verweigert das Skript die Ausführung.
 */
loadEnv()

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("Demodaten sind in Produktion nicht vorgesehen. Abbruch.")
  process.exit(1)
}

const STORAGE = resolve(process.env.STORAGE_DIR ?? "./var/storage")

/* ------------------------------------------------------------ Dateien */

/** Legt eine Datei unter demselben Schlüsselschema ab wie server/storage.ts. */
function store(kind, extension, bytes) {
  const now = new Date()
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`
  const key = `${kind}/${folder}/${randomBytes(16).toString("hex")}.${extension}`
  const target = join(STORAGE, key)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, bytes, { mode: 0o600 })
  return { key, sizeBytes: bytes.length, checksum: createHash("sha256").update(bytes).digest("hex") }
}

/** Schlankes, aber gültiges PDF mit korrekter Querverweistabelle. */
function buildPdf(title, lines) {
  const escape = (value) => value.replace(/([\\()])/g, "\\$1")
  const content = [
    "BT /F1 20 Tf 60 780 Td (DEMO) Tj ET",
    `BT /F1 15 Tf 60 748 Td (${escape(title)}) Tj ET`,
    ...lines.map((line, index) => `BT /F1 11 Tf 60 ${706 - index * 20} Td (${escape(line)}) Tj ET`),
    "BT /F1 9 Tf 60 90 Td (Beispieldokument ohne rechtliche Wirkung. Alle Angaben sind frei erfunden.) Tj ET",
  ].join("\n")

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ]

  let pdf = "%PDF-1.4\n"
  const offsets = []
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"))
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(pdf, "latin1")
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.from(pdf, "latin1")
}

/** Platzhalterlogo: Kürzel der Bank auf ruhigem Grund, eindeutig als DEMO markiert. */
function buildLogo(name, color) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64" viewBox="0 0 240 64" role="img" aria-label="${name}">
  <rect width="240" height="64" rx="8" fill="#ffffff"/>
  <rect x="8" y="12" width="40" height="40" rx="8" fill="${color}"/>
  <text x="28" y="39" font-family="Helvetica,Arial,sans-serif" font-size="17" font-weight="600" fill="#ffffff" text-anchor="middle">${initials}</text>
  <text x="58" y="33" font-family="Helvetica,Arial,sans-serif" font-size="15" font-weight="600" fill="#0f1d33">${name.slice(0, 22)}</text>
  <text x="58" y="48" font-family="Helvetica,Arial,sans-serif" font-size="10" letter-spacing="1.5" fill="#94a1b8">DEMO</text>
</svg>`
  return Buffer.from(svg, "utf8")
}

/* -------------------------------------------------------------- Daten */

const banks = [
  {
    name: "Atlantik Sparbank AG",
    legal: "Atlantik Sparbank Aktiengesellschaft",
    country: "Deutschland",
    city: "Hamburg",
    address: "Alsterufer 12",
    postal: "20354",
    website: "https://www.example-atlantik.test",
    bic: "ATLSDEH1",
    color: "#1f4fd8",
  },
  {
    name: "Nordbank Skandinavien AB",
    legal: "Nordbank Skandinavien Aktiebolag",
    country: "Schweden",
    city: "Stockholm",
    address: "Kungsgatan 44",
    postal: "111 35",
    website: "https://www.example-nordbank.test",
    bic: "NORDSES1",
    color: "#0f6f5c",
  },
  {
    name: "Banca Adriatica SpA",
    legal: "Banca Adriatica Societa per Azioni",
    country: "Italien",
    city: "Trieste",
    address: "Via Carducci 8",
    postal: "34122",
    website: "https://www.example-adriatica.test",
    bic: "ADRIITM1",
    color: "#a2432c",
  },
  {
    name: "Banque du Rhin SA",
    legal: "Banque du Rhin Societe Anonyme",
    country: "Frankreich",
    city: "Strasbourg",
    address: "Quai Kleber 3",
    postal: "67000",
    website: "https://www.example-rhin.test",
    bic: "RHINFRP1",
    color: "#3b3f8c",
  },
  {
    name: "Alpen Kredit AG",
    legal: "Alpen Kredit Aktiengesellschaft",
    country: "Österreich",
    city: "Salzburg",
    address: "Getreidegasse 21",
    postal: "5020",
    website: "https://www.example-alpen.test",
    bic: "ALPEATW1",
    color: "#7a5b18",
  },
]

const customers = [
  {
    first: "Max",
    last: "Mustermann",
    city: "Bad Langensalza",
    country: "Deutschland",
    status: "ACTIVE",
    birth: "1979-04-12",
    nationality: "Deutschland",
    address: "Marktstraße 7",
    postal: "99947",
    // Mehrere Anlagen bei unterschiedlichen Banken – der Regelfall im Portal.
    accounts: [
      { bank: "Atlantik Sparbank AG", amount: "100000.00", rate: "3.2500", term: 12, start: "2026-01-15", status: "ACTIVE" },
      { bank: "Nordbank Skandinavien AB", amount: "75000.00", rate: "3.5000", term: 24, start: "2026-03-01", status: "ACTIVE" },
      { bank: "Banca Adriatica SpA", amount: "50000.00", rate: "3.1000", term: 6, start: "2026-06-01", status: "IN_PROGRESS" },
    ],
  },
  {
    first: "Andrea",
    last: "Hoffmann",
    city: "Erfurt",
    country: "Deutschland",
    status: "ACTIVE",
    birth: "1985-09-30",
    nationality: "Deutschland",
    address: "Anger 18",
    postal: "99084",
    accounts: [
      { bank: "Atlantik Sparbank AG", amount: "60000.00", rate: "3.9500", term: 12, start: "2026-02-01", status: "ACTIVE" },
      { bank: "Alpen Kredit AG", amount: "40000.00", rate: "3.7000", term: 18, start: "2026-04-01", status: "ACTIVE" },
    ],
  },
  {
    first: "Pierre",
    last: "Lefevre",
    city: "Strasbourg",
    country: "Frankreich",
    status: "ACTIVE",
    birth: "1968-01-22",
    nationality: "Frankreich",
    address: "Rue des Orfevres 4",
    postal: "67000",
    accounts: [
      { bank: "Banque du Rhin SA", amount: "250000.00", rate: "4.2000", term: 24, start: "2025-10-10", status: "ACTIVE" },
    ],
  },
  {
    first: "Sofia",
    last: "Rossi",
    city: "Milano",
    country: "Italien",
    status: "PENDING",
    birth: "1990-07-03",
    nationality: "Italien",
    address: "Via Torino 15",
    postal: "20123",
    accounts: [
      { bank: "Banca Adriatica SpA", amount: "75000.00", rate: "3.6000", term: 18, start: "2026-10-01", status: "DOCS_PENDING" },
    ],
  },
  {
    first: "Johan",
    last: "Bergstrom",
    city: "Stockholm",
    country: "Schweden",
    status: "ACTIVE",
    birth: "1974-11-11",
    nationality: "Schweden",
    address: "Sveavägen 90",
    postal: "113 59",
    accounts: [
      { bank: "Nordbank Skandinavien AB", amount: "180000.00", rate: "3.4000", term: 36, start: "2024-07-01", status: "ACTIVE" },
    ],
  },
  {
    first: "Katharina",
    last: "Wolff",
    city: "Salzburg",
    country: "Österreich",
    status: "PENDING",
    birth: "1988-02-17",
    nationality: "Österreich",
    address: "Linzer Gasse 33",
    postal: "5020",
    accounts: [
      { bank: "Alpen Kredit AG", amount: "45000.00", rate: "3.8500", term: 24, start: "2026-03-01", status: "KYC_PENDING" },
    ],
  },
  {
    first: "Tomas",
    last: "Silva",
    city: "Lisboa",
    country: "Portugal",
    status: "ACTIVE",
    birth: "1981-06-25",
    nationality: "Portugal",
    address: "Rua Augusta 100",
    postal: "1100-053",
    accounts: [
      { bank: "Banque du Rhin SA", amount: "30000.00", rate: "3.1500", term: 6, start: "2026-05-15", status: "ACTIVE" },
    ],
  },
  {
    first: "Elena",
    last: "Novak",
    city: "Ljubljana",
    country: "Slowenien",
    status: "ACTIVE",
    birth: "1993-03-08",
    nationality: "Slowenien",
    address: "Slovenska cesta 5",
    postal: "1000",
    accounts: [
      { bank: "Atlantik Sparbank AG", amount: "85000.00", rate: "4.0500", term: 12, start: "2026-02-20", status: "ACTIVE" },
    ],
  },
]

/* ------------------------------------------------------------- Ablauf */

const connection = await connect()

const [adminRows] = await connection.execute("SELECT id FROM auth_users WHERE role = 'ADMIN' ORDER BY id LIMIT 1")
const adminId = adminRows[0]?.id ?? null

const money = (value) => `${Number(value).toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR`
const interestAtMaturity = (amount, rate, term) => ((Number(amount) * Number(rate)) / 100 / 12) * term

/* Banken */
const bankIds = new Map()
let newBanks = 0
for (const bank of banks) {
  const [existing] = await connection.execute("SELECT id FROM banks WHERE name = ?", [bank.name])
  if (existing.length > 0) {
    bankIds.set(bank.name, existing[0].id)
    continue
  }

  const logo = store("logos", "svg", buildLogo(bank.name, bank.color))
  const [result] = await connection.execute(
    `INSERT INTO banks (name, legal_name, country, city, address, postal_code, website, bic, logo_key, logo_mime, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'image/svg+xml', 'DEMO – frei erfundene Partnerbank')`,
    [bank.name, bank.legal, bank.country, bank.city, bank.address, bank.postal, bank.website, bank.bic, logo.key],
  )
  bankIds.set(bank.name, result.insertId)
  newBanks += 1
}
console.log(newBanks === 0 ? "Banken waren bereits vorhanden." : `${newBanks} Banken angelegt.`)

/* Kunden, Anlagen und Dokumente */
const [maxAccount] = await connection.execute(
  "SELECT MAX(CAST(SUBSTRING(account_number, 8) AS UNSIGNED)) AS maximum FROM fixed_deposit_accounts WHERE account_number LIKE 'PTB-FT-%'",
)
let accountCounter = Number(maxAccount[0]?.maximum ?? 0)

let createdCustomers = 0
let createdDocuments = 0

for (const [index, entry] of customers.entries()) {
  const number = `PTB-${String(index + 1).padStart(6, "0")}`
  const email = `${entry.first.toLowerCase()}.${entry.last.toLowerCase()}@example.com`

  const [existing] = await connection.execute("SELECT id FROM customers WHERE customer_number = ? OR email = ?", [
    number,
    email,
  ])
  if (existing.length > 0) continue

  const [result] = await connection.execute(
    `INSERT INTO customers (customer_number, first_name, last_name, email, mobile, date_of_birth, nationality,
       address, postal_code, city, country, customer_status, kyc_status, identification_type, identified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Personalausweis', ?)`,
    [
      number,
      entry.first,
      entry.last,
      email,
      "+49 170 0000000",
      entry.birth,
      entry.nationality,
      entry.address,
      entry.postal,
      entry.city,
      entry.country,
      entry.status,
      entry.status === "ACTIVE" ? "VERIFIED" : "SUBMITTED",
      entry.status === "ACTIVE" ? "2026-01-05" : null,
    ],
  )
  const customerId = result.insertId

  const addDocument = async (document) => {
    const file = store("documents", "pdf", buildPdf(document.title, document.lines))
    await connection.execute(
      `INSERT INTO documents (customer_id, account_id, title, filename, category, doc_type, mime_type,
         size_kb, size_bytes, storage_key, checksum, uploaded_by, uploaded_by_role)
       VALUES (?, ?, ?, ?, ?, ?, 'application/pdf', ?, ?, ?, ?, ?, 'STAFF')`,
      [
        customerId,
        document.accountId ?? null,
        `DEMO · ${document.title}`,
        `${document.title.replace(/[^\w]+/g, "-").toLowerCase()}-demo.pdf`,
        document.category,
        document.docType,
        Math.ceil(file.sizeBytes / 1024),
        file.sizeBytes,
        file.key,
        file.checksum,
        adminId,
      ],
    )
    createdDocuments += 1
  }

  await addDocument({
    title: "Personalausweis",
    category: "IDENTITY",
    docType: "ID_CARD",
    lines: [`Kunde: ${entry.first} ${entry.last}`, `Kundennummer: ${number}`, "Art: Personalausweis"],
  })

  await addDocument({
    title: "Adressnachweis",
    category: "KYC",
    docType: "ADDRESS_PROOF",
    lines: [
      `Kunde: ${entry.first} ${entry.last}`,
      `Anschrift: ${entry.address}, ${entry.postal} ${entry.city}`,
      `Land: ${entry.country}`,
    ],
  })

  for (const account of entry.accounts) {
    accountCounter += 1
    const accountNumber = `PTB-FT-${String(accountCounter).padStart(4, "0")}`
    const maturity = addMonths(account.start, account.term)

    const [accountResult] = await connection.execute(
      `INSERT INTO fixed_deposit_accounts (customer_id, bank_id, account_number, product_name, principal_amount,
         currency, interest_rate, term_months, start_date, maturity_date, status, interest_payment_method,
         reference_account)
       VALUES (?, ?, ?, 'Festgeld', ?, 'EUR', ?, ?, ?, ?, ?, 'AT_MATURITY', 'DE02 1203 0000 0000 2020 51')`,
      [
        customerId,
        bankIds.get(account.bank),
        accountNumber,
        account.amount,
        account.rate,
        account.term,
        account.start,
        maturity,
        account.status,
      ],
    )
    const accountId = accountResult.insertId

    const interest = interestAtMaturity(account.amount, account.rate, account.term)
    const detail = [
      `Bank: ${account.bank}`,
      `Kunde: ${entry.first} ${entry.last} (${number})`,
      `Konto: ${accountNumber}`,
      `Anlagebetrag: ${money(account.amount)}`,
      `Zinssatz: ${Number(account.rate).toFixed(2).replace(".", ",")} % p.a.`,
      `Laufzeit: ${account.term} Monate`,
      `Anlagebeginn: ${account.start}`,
      `Faelligkeit: ${maturity}`,
      `Erwartete Zinsen: ${money(interest.toFixed(2))}`,
      `Auszahlungsbetrag: ${money((Number(account.amount) + interest).toFixed(2))}`,
    ]

    await addDocument({
      title: `Festgeldvertrag ${account.bank}`,
      category: "CONTRACTS",
      docType: "DEPOSIT_CONTRACT",
      accountId,
      lines: detail,
    })

    await addDocument({
      title: `Anlagebestaetigung ${accountNumber}`,
      category: "BANK_DOCUMENTS",
      docType: "INVESTMENT_CONFIRMATION",
      accountId,
      lines: detail,
    })
  }

  const password = generatePassword()
  await connection.execute(
    `INSERT INTO auth_users (email, password_hash, role, full_name, customer_id, must_change_password, created_by)
     VALUES (?, ?, 'CUSTOMER', ?, ?, 1, ?)`,
    [email, await hashPassword(password), `${entry.first} ${entry.last}`, customerId, adminId],
  )

  await connection.execute(
    `INSERT INTO messages (customer_id, subject, body, sent_by)
     VALUES (?, 'Willkommen im Kundenportal', ?, ?)`,
    [
      customerId,
      `Guten Tag ${entry.first} ${entry.last}, Ihre Unterlagen liegen im Portal bereit. Bei Fragen zu Ihren Anlagen erreichen Sie uns jederzeit. (DEMO)`,
      adminId,
    ],
  )

  console.log(
    `${number} ${entry.first} ${entry.last} · ${email} · ${entry.accounts.length} Anlage(n) · Passwort: ${password}`,
  )
  createdCustomers += 1
}

console.log(
  createdCustomers === 0
    ? "Beispielkunden waren bereits vorhanden."
    : `${createdCustomers} Beispielkunden mit ${createdDocuments} Dokumenten angelegt.`,
)
console.log(`Dateiablage: ${STORAGE}`)
await connection.end()
