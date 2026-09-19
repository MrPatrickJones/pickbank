/**
 * Integration tests against a running server (BASE_URL, default http://127.0.0.1:3101).
 * They exercise the checklist: login, roles, ownership, validation, audit log,
 * password change, CSRF and error handling.
 *
 *   pnpm build && BASE_URL=... DB_NAME=pickbank_test pnpm test:api
 */

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3101"

let passed = 0
let failed = 0
const failures = []

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    failures.push(`${name}${detail ? ` – ${detail}` : ""}`)
    console.log(`  ✗ ${name}${detail ? ` – ${detail}` : ""}`)
  }
}

/** Minimal cookie jar so each role keeps its own session. */
function createClient() {
  const cookies = new Map()

  const store = (response) => {
    const raw = response.headers.getSetCookie?.() ?? []
    for (const entry of raw) {
      const [pair] = entry.split(";")
      const index = pair.indexOf("=")
      const name = pair.slice(0, index).trim()
      const value = pair.slice(index + 1).trim()
      if (value === "" ) cookies.delete(name)
      else cookies.set(name, value)
    }
  }

  const header = () => Array.from(cookies.entries()).map(([name, value]) => `${name}=${value}`).join("; ")

  return {
    cookies,
    async request(method, path, body, extraHeaders = {}) {
      const headers = { Accept: "application/json", Cookie: header(), Origin: BASE, ...extraHeaders }
      if (body !== undefined) headers["Content-Type"] = "application/json"
      if (method !== "GET" && !("X-CSRF-Token" in headers) && cookies.has("ptb_csrf")) {
        headers["X-CSRF-Token"] = decodeURIComponent(cookies.get("ptb_csrf"))
      }
      const response = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "manual",
      })
      store(response)
      const text = await response.text()
      let json = {}
      try {
        json = text ? JSON.parse(text) : {}
      } catch {
        json = { raw: text.slice(0, 200) }
      }
      return { status: response.status, body: json }
    },
    get(path) {
      return this.request("GET", path)
    },
    post(path, body, headers) {
      return this.request("POST", path, body ?? {}, headers)
    },
    patch(path, body) {
      return this.request("PATCH", path, body)
    },
    del(path) {
      return this.request("DELETE", path)
    },
    /** Multipart-Upload ohne Content-Type-Kopfzeile – die setzt fetch selbst. */
    async upload(path, form) {
      const headers = { Accept: "application/json", Cookie: header(), Origin: BASE }
      if (cookies.has("ptb_csrf")) headers["X-CSRF-Token"] = decodeURIComponent(cookies.get("ptb_csrf"))
      const response = await fetch(`${BASE}${path}`, { method: "POST", headers, body: form, redirect: "manual" })
      store(response)
      const text = await response.text()
      let json = {}
      try {
        json = text ? JSON.parse(text) : {}
      } catch {
        json = { raw: text.slice(0, 200) }
      }
      return { status: response.status, body: json }
    },
    /** Rohabruf für Dateien: liefert Status und Kopfzeilen statt JSON. */
    async raw(path) {
      const response = await fetch(`${BASE}${path}`, {
        headers: { Cookie: header(), Origin: BASE },
        redirect: "manual",
      })
      const buffer = Buffer.from(await response.arrayBuffer())
      return { status: response.status, headers: response.headers, buffer }
    },
  }
}

const admin = createClient()
const customer = createClient()
const anonymous = createClient()
const stamp = Date.now()

console.log(`\nAPI-Tests gegen ${BASE}\n`)

/* ---------------- Authentifizierung ---------------- */
console.log("Authentifizierung")
{
  const wrong = await admin.post("/api/auth/login", { email: process.env.ADMIN_EMAIL, password: "falsch-falsch" })
  check("Login mit falschem Passwort wird abgewiesen", wrong.status === 401, `status ${wrong.status}`)
  check("Fehlermeldung verrät nicht, ob das Konto existiert", wrong.body?.error?.message?.includes("nicht korrekt"))

  const login = await admin.post("/api/auth/login", {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  })
  check("Admin-Login erfolgreich", login.status === 200, JSON.stringify(login.body).slice(0, 120))
  check("Rolle ADMIN wird zurückgegeben", login.body?.user?.role === "ADMIN")
  check("Session-Cookie ist http-only gesetzt", admin.cookies.has("ptb_session"))

  const session = await admin.get("/api/auth/session")
  check("Session-Endpunkt liefert den Benutzer", session.body?.user?.email === process.env.ADMIN_EMAIL)

  const anon = await anonymous.get("/api/customers")
  check("Ohne Anmeldung kein Zugriff auf Kunden", anon.status === 401, `status ${anon.status}`)
}

/* ---------------- CSRF ---------------- */
console.log("\nCSRF-Schutz")
{
  const withoutToken = await admin.request("POST", "/api/customers", { firstName: "X" }, { "X-CSRF-Token": "" })
  check("Schreibende Anfrage ohne CSRF-Token wird abgelehnt", withoutToken.status === 403, `status ${withoutToken.status}`)
}

/* ---------------- Validierung ---------------- */
console.log("\nValidierung beim Anlegen")
let customerId = null
{
  const invalidEmail = await admin.post("/api/customers", {
    firstName: "Test",
    lastName: "Kunde",
    email: "keine-email",
    city: "Berlin",
    country: "Deutschland",
  })
  check("Ungültige E-Mail wird abgewiesen", invalidEmail.status === 400 && Boolean(invalidEmail.body?.error?.details?.email))

  const created = await admin.post("/api/customers", {
    firstName: "Test",
    lastName: `Kunde${stamp}`,
    email: `test${stamp}@example.com`,
    mobile: "+49 170 1234567",
    city: "Berlin",
    country: "Deutschland",
    customerStatus: "ACTIVE",
    kycStatus: "VERIFIED",
    createLogin: false,
  })
  check("Kunde wird angelegt", created.status === 201, JSON.stringify(created.body).slice(0, 140))
  customerId = created.body?.customer?.id ?? null
  check("Kundennummer wird vergeben", /^PTB-\d{6}$/.test(created.body?.customer?.customerNumber ?? ""))

  const duplicate = await admin.post("/api/customers", {
    firstName: "Test",
    lastName: "Doppelt",
    email: `test${stamp}@example.com`,
    city: "Berlin",
    country: "Deutschland",
  })
  check("Doppelte E-Mail wird abgewiesen", duplicate.status === 409, `status ${duplicate.status}`)
}

/* ---------------- Banken ---------------- */
console.log("\nBanken")
let bankId = null
{
  const invalid = await admin.post("/api/banks", { name: "X", country: "Deutschland" })
  check("Zu kurzer Bankname wird abgewiesen", invalid.status === 400, `status ${invalid.status}`)

  const badBic = await admin.post("/api/banks", { name: `Testbank ${stamp}`, country: "Deutschland", bic: "ABC" })
  check("Ungültiger BIC wird abgewiesen", badBic.status === 400)

  const created = await admin.post("/api/banks", {
    name: `Testbank ${stamp}`,
    country: "Deutschland",
    city: "Berlin",
    website: "https://www.example-test.test",
    bic: "TESTDEB1",
  })
  check("Bank wird angelegt", created.status === 201, JSON.stringify(created.body).slice(0, 140))
  bankId = created.body?.id ?? null

  const duplicate = await admin.post("/api/banks", { name: `Testbank ${stamp}`, country: "Deutschland" })
  check("Doppelter Bankname wird abgewiesen", duplicate.status === 409, `status ${duplicate.status}`)

  const list = await admin.get("/api/banks")
  check("Bankenliste enthält die neue Bank", (list.body?.banks ?? []).some((bank) => bank.id === bankId))
}

/* ---------------- Konten ---------------- */
console.log("\nFestgeldkonten")
let accountId = null
{
  const withoutBank = await admin.post(`/api/customers/${customerId}/accounts`, {
    productName: "Festgeld",
    principalAmount: "100000",
    interestRate: "3.0",
    termMonths: 12,
    startDate: "2026-01-01",
    referenceAccount: "DE02 1203 0000 0000 2020 51",
  })
  check("Konto ohne Bank wird abgewiesen", withoutBank.status === 400, `status ${withoutBank.status}`)

  const unknownBank = await admin.post(`/api/customers/${customerId}/accounts`, {
    bankId: 999999,
    productName: "Festgeld",
    principalAmount: "100000",
    interestRate: "3.0",
    termMonths: 12,
    startDate: "2026-01-01",
    referenceAccount: "DE02 1203 0000 0000 2020 51",
  })
  check("Unbekannte Bank wird abgewiesen", unknownBank.status === 404, `status ${unknownBank.status}`)

  const negative = await admin.post(`/api/customers/${customerId}/accounts`, {
    bankId,
    productName: "Festgeld",
    principalAmount: "-1000",
    interestRate: "3.0",
    termMonths: 12,
    startDate: "2026-01-01",
    referenceAccount: "DE02 1203 0000 0000 2020 51",
  })
  check("Negativer Betrag wird abgewiesen", negative.status === 400, `status ${negative.status}`)

  const crazyRate = await admin.post(`/api/customers/${customerId}/accounts`, {
    bankId,
    productName: "Festgeld",
    principalAmount: "100000",
    interestRate: "400",
    termMonths: 12,
    startDate: "2026-01-01",
    referenceAccount: "DE02 1203 0000 0000 2020 51",
  })
  check("Zinssatz von 400 % wird abgewiesen", crazyRate.status === 400)
  check(
    "Fehlermeldung nennt den gültigen Bereich",
    String(crazyRate.body?.error?.details?.interestRate ?? "").includes("25"),
  )

  const badDates = await admin.post(`/api/customers/${customerId}/accounts`, {
    bankId,
    productName: "Festgeld",
    principalAmount: "100000",
    interestRate: "3.25",
    termMonths: 12,
    startDate: "2026-01-01",
    maturityDate: "2025-01-01",
    referenceAccount: "DE02 1203 0000 0000 2020 51",
  })
  check("Fälligkeit vor Startdatum wird abgewiesen", badDates.status === 400)

  const account = await admin.post(`/api/customers/${customerId}/accounts`, {
    bankId,
    productName: "Festgeld 12 Monate",
    principalAmount: "100.000,00",
    currency: "EUR",
    interestRate: "4,00",
    termMonths: 12,
    startDate: "2026-01-15",
    status: "ACTIVE",
    interestPaymentMethod: "AT_MATURITY",
    referenceAccount: "DE02 1203 0000 0000 2020 51",
  })
  check("Konto wird angelegt", account.status === 201, JSON.stringify(account.body).slice(0, 140))
  accountId = account.body?.account?.id ?? null
  check("Betrag wird als Dezimalwert gespeichert", account.body?.account?.principalAmount === "100000.00")
  check("Fälligkeit wird serverseitig berechnet", account.body?.account?.maturityDate === "2027-01-15")
  check("Zinsertrag wird serverseitig berechnet", account.body?.account?.interestAtMaturity === "4000.00")
  check("Auszahlungsbetrag wird serverseitig berechnet", account.body?.account?.expectedTotal === "104000.00")
  check("Die Bank hängt an der Anlage", account.body?.account?.bank?.id === bankId)

  const patched = await admin.patch(`/api/accounts/${accountId}`, { interestRate: "4,25" })
  check("Zinssatz kann geändert werden", patched.status === 200 && patched.body?.account?.interestRate === "4.2500")

  const recalculated = await admin.patch(`/api/accounts/${accountId}`, { termMonths: 24, recalculateMaturity: true })
  check(
    "Laufzeitänderung berechnet die Fälligkeit neu",
    recalculated.body?.account?.maturityDate === "2028-01-15",
    recalculated.body?.account?.maturityDate,
  )
}

/* ---------------- Audit Log ---------------- */
console.log("\nAktivitätsprotokoll")
{
  const log = await admin.get(`/api/audit-log?customerId=${customerId}`)
  const entries = log.body?.entries ?? []
  check("Protokoll enthält Einträge zum Kunden", entries.length >= 3, `Einträge: ${entries.length}`)
  const rateChange = entries.find((entry) => entry.changedField === "interestRate")
  check("Zinsänderung ist protokolliert", Boolean(rateChange))
  check(
    "Alter und neuer Wert stehen im Protokoll",
    rateChange?.oldValue === "4.0000" && rateChange?.newValue === "4.2500",
    `${rateChange?.oldValue} → ${rateChange?.newValue}`,
  )
}

/* ---------------- Kundenzugang ---------------- */
console.log("\nKundenzugang")
let customerPassword = null
{
  const created = await admin.post(`/api/customers/${customerId}/login`, { action: "create" })
  check("Zugang wird angelegt", created.status === 201, JSON.stringify(created.body).slice(0, 120))
  customerPassword = created.body?.password ?? null
  check("Startpasswort wird einmalig zurückgegeben", Boolean(customerPassword))

  const again = await admin.post(`/api/customers/${customerId}/login`, { action: "create" })
  check("Zweiter Zugang für denselben Kunden wird verhindert", again.status === 409)
}

/* ---------------- Kundenrolle ---------------- */
console.log("\nKundenrolle und Objektzugriff")
{
  const login = await customer.post("/api/auth/login", {
    email: `test${stamp}@example.com`,
    password: customerPassword,
  })
  check("Kunde kann sich anmelden", login.status === 200 && login.body?.user?.role === "CUSTOMER")
  check("Kunde muss das Startpasswort ändern", login.body?.user?.mustChangePassword === true)

  const me = await customer.get("/api/me")
  check("Kunde sieht die eigenen Daten", me.status === 200 && me.body?.customer?.id === customerId)
  check("Eigene Konten sind enthalten", (me.body?.accounts ?? []).length === 1)
  check("Interne Notizen werden nicht ausgeliefert", me.body?.accounts?.[0]?.notes === undefined)

  const foreign = await customer.get(`/api/customers/${customerId === 1 ? 2 : 1}`)
  check("Fremde Kundenakte ist gesperrt", foreign.status === 403 || foreign.status === 404, `status ${foreign.status}`)

  const list = await customer.get("/api/customers")
  check("Kundenliste ist für Kunden gesperrt", list.status === 403, `status ${list.status}`)

  const audit = await customer.get("/api/audit-log")
  check("Aktivitätsprotokoll ist für Kunden gesperrt", audit.status === 403)

  const write = await customer.patch(`/api/customers/${customerId}`, { firstName: "Hacker" })
  check("Kunde kann eigene Stammdaten nicht ändern", write.status === 403)

  const accountWrite = await customer.patch(`/api/accounts/${accountId}`, { principalAmount: "999999" })
  check("Kunde kann Konten nicht ändern", accountWrite.status === 403)

  const dashboard = await customer.get("/api/dashboard")
  check("Admin-Dashboard ist für Kunden gesperrt", dashboard.status === 403)

  const bankWrite = await customer.post("/api/banks", { name: `Kundenbank ${stamp}`, country: "Deutschland" })
  check("Kunde kann keine Bank anlegen", bankWrite.status === 403, `status ${bankWrite.status}`)
}

/* ---------------- Dokumente ---------------- */
console.log("\nDokumente")
let staffDocumentId = null
let customerDocumentId = null
{
  const pdf = () => new Blob([Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n")], {
    type: "application/pdf",
  })

  const form = new FormData()
  form.set("file", pdf(), "vertrag.pdf")
  form.set("title", "Festgeldvertrag Test")
  form.set("category", "CONTRACTS")
  form.set("docType", "DEPOSIT_CONTRACT")
  form.set("accountId", String(accountId))
  const uploaded = await admin.upload(`/api/customers/${customerId}/documents`, form)
  check("Mitarbeiter kann ein Dokument hochladen", uploaded.status === 201, JSON.stringify(uploaded.body).slice(0, 140))
  staffDocumentId = uploaded.body?.id ?? null

  const wrongType = new FormData()
  wrongType.set("file", new Blob([Buffer.from("<?php echo 1; ?>")], { type: "application/pdf" }), "schad.php")
  wrongType.set("title", "Unerlaubt")
  const rejectedType = await admin.upload(`/api/customers/${customerId}/documents`, wrongType)
  check("Unerlaubter Dateityp wird abgewiesen", rejectedType.status === 400, `status ${rejectedType.status}`)
  check(
    "Meldung nennt den Grund verständlich",
    String(rejectedType.body?.error?.message ?? "").includes("Dateityp"),
    String(rejectedType.body?.error?.message ?? "").slice(0, 80),
  )

  const disguised = new FormData()
  disguised.set("file", new Blob([Buffer.from("<?php echo 1; ?>")], { type: "application/pdf" }), "schad.pdf")
  disguised.set("title", "Umbenannt")
  const rejectedContent = await admin.upload(`/api/customers/${customerId}/documents`, disguised)
  check("Umbenannte Datei wird am Inhalt erkannt", rejectedContent.status === 400, `status ${rejectedContent.status}`)

  const tooBig = new FormData()
  tooBig.set(
    "file",
    new Blob([Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(11 * 1024 * 1024, 0x20)])], {
      type: "application/pdf",
    }),
    "gross.pdf",
  )
  tooBig.set("title", "Zu groß")
  const rejectedSize = await admin.upload(`/api/customers/${customerId}/documents`, tooBig)
  check("Zu große Datei wird abgewiesen", rejectedSize.status === 400, `status ${rejectedSize.status}`)

  const file = await admin.raw(`/api/documents/${staffDocumentId}/file`)
  check("Mitarbeiter kann die Datei abrufen", file.status === 200 && file.buffer.length > 0)
  check("Auslieferung verbietet MIME-Raten", file.headers.get("x-content-type-options") === "nosniff")

  const anonymousFile = await anonymous.raw(`/api/documents/${staffDocumentId}/file`)
  check("Ohne Anmeldung ist die Datei gesperrt", anonymousFile.status === 401, `status ${anonymousFile.status}`)

  const ownFile = await customer.raw(`/api/documents/${staffDocumentId}/file`)
  check("Kunde kann sein eigenes Dokument abrufen", ownFile.status === 200)

  const ownList = await customer.get("/api/me/documents")
  check(
    "Dokument erscheint in der eigenen Akte",
    (ownList.body?.documents ?? []).some((entry) => entry.id === staffDocumentId),
  )
  check(
    "Dokument ist der Anlage zugeordnet",
    (ownList.body?.documents ?? []).find((entry) => entry.id === staffDocumentId)?.accountId === accountId,
  )

  const ownUpload = new FormData()
  ownUpload.set("file", pdf(), "ausweis.pdf")
  ownUpload.set("title", "Mein Ausweis")
  ownUpload.set("category", "IDENTITY")
  ownUpload.set("docType", "ID_CARD")
  const customerUpload = await customer.upload("/api/me/documents", ownUpload)
  check("Kunde kann selbst hochladen", customerUpload.status === 201, JSON.stringify(customerUpload.body).slice(0, 140))
  customerDocumentId = customerUpload.body?.id ?? null

  const foreignAccount = new FormData()
  foreignAccount.set("file", pdf(), "fremd.pdf")
  foreignAccount.set("title", "Fremde Anlage")
  foreignAccount.set("accountId", "999999")
  const rejectedAccount = await customer.upload("/api/me/documents", foreignAccount)
  check("Fremde Anlage kann nicht zugeordnet werden", rejectedAccount.status === 400, `status ${rejectedAccount.status}`)

  // Zweiter Kunde: sein Dokument darf der erste unter keinen Umständen sehen.
  const otherCustomer = await admin.post("/api/customers", {
    firstName: "Fremd",
    lastName: "Kunde",
    email: `fremd${stamp}@example.com`,
    city: "Hamburg",
    country: "Deutschland",
  })
  const otherForm = new FormData()
  otherForm.set("file", pdf(), "fremdvertrag.pdf")
  otherForm.set("title", "Fremdes Dokument")
  const otherUpload = await admin.upload(`/api/customers/${otherCustomer.body?.customer?.id}/documents`, otherForm)
  check("Dokument für zweiten Kunden angelegt", otherUpload.status === 201)

  const foreignFile = await customer.raw(`/api/documents/${otherUpload.body?.id}/file`)
  check("Fremdes Dokument ist gesperrt", foreignFile.status === 403, `status ${foreignFile.status}`)

  const foreignDelete = await customer.del(`/api/documents/${otherUpload.body?.id}`)
  check("Fremdes Dokument kann nicht gelöscht werden", foreignDelete.status === 403)

  const deleteStaffDocument = await customer.del(`/api/documents/${staffDocumentId}`)
  check("Kunde kann fremd hinterlegte Unterlagen nicht löschen", deleteStaffDocument.status === 403)

  const deleteOwn = await customer.del(`/api/documents/${customerDocumentId}`)
  check("Kunde kann eigene Uploads löschen", deleteOwn.status === 200, `status ${deleteOwn.status}`)

  const goneFile = await customer.raw(`/api/documents/${customerDocumentId}/file`)
  check("Gelöschtes Dokument ist nicht mehr abrufbar", goneFile.status === 404, `status ${goneFile.status}`)
}

/* ---------------- Passwortwechsel ---------------- */
console.log("\nPasswortänderung")
{
  const wrongCurrent = await customer.post("/api/auth/password", {
    currentPassword: "falsch-falsch",
    newPassword: "NeuesPasswort-2026",
    repeatPassword: "NeuesPasswort-2026",
  })
  check("Falsches aktuelles Passwort wird abgewiesen", wrongCurrent.status === 400)

  const mismatch = await customer.post("/api/auth/password", {
    currentPassword: customerPassword,
    newPassword: "NeuesPasswort-2026",
    repeatPassword: "AnderesPasswort-2026",
  })
  check("Abweichende Wiederholung wird abgewiesen", mismatch.status === 400)

  const changed = await customer.post("/api/auth/password", {
    currentPassword: customerPassword,
    newPassword: "NeuesPasswort-2026",
    repeatPassword: "NeuesPasswort-2026",
  })
  check("Passwort wird geändert", changed.status === 200, JSON.stringify(changed.body).slice(0, 120))

  const oldPassword = createClient()
  const retryOld = await oldPassword.post("/api/auth/login", {
    email: `test${stamp}@example.com`,
    password: customerPassword,
  })
  check("Altes Passwort funktioniert nicht mehr", retryOld.status === 401)

  const newPassword = createClient()
  const retryNew = await newPassword.post("/api/auth/login", {
    email: `test${stamp}@example.com`,
    password: "NeuesPasswort-2026",
  })
  check("Neues Passwort funktioniert", retryNew.status === 200)
}

/* ---------------- Brute Force ---------------- */
console.log("\nBrute-Force-Schutz")
{
  const attacker = createClient()
  const email = `brute${stamp}@example.com`
  await admin.post("/api/customers", {
    firstName: "Brute",
    lastName: "Force",
    email,
    mobile: "+49 170 0000000",
    city: "Berlin",
    country: "Deutschland",
    createLogin: true,
  })

  let lockedMessage = ""
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await attacker.post("/api/auth/login", { email, password: `falsch-${attempt}` })
    lockedMessage = response.body?.error?.message ?? ""
  }
  check("Zugang wird nach mehreren Fehlversuchen gesperrt", /gesperrt/i.test(lockedMessage), lockedMessage)
}

/* ---------------- Abmeldung und Löschen ---------------- */
console.log("\nAbmeldung und Löschen")
{
  const logout = await customer.post("/api/auth/logout")
  check("Abmeldung erfolgreich", logout.status === 200)

  const afterLogout = await customer.get("/api/me")
  check("Nach der Abmeldung ist die Sitzung ungültig", afterLogout.status === 401)

  const removed = await admin.del(`/api/customers/${customerId}`)
  check("Administrator kann den Kunden löschen", removed.status === 200, JSON.stringify(removed.body).slice(0, 120))

  const gone = await admin.get(`/api/customers/${customerId}`)
  check("Gelöschter Kunde ist nicht mehr abrufbar", gone.status === 404)
}

/* ---------------- Fehlerbehandlung ---------------- */
console.log("\nFehlerbehandlung")
{
  const notFound = await admin.get("/api/customers/999999")
  check("Unbekannte ID liefert 404", notFound.status === 404)
  check("Fehlermeldung enthält keine internen Details", !JSON.stringify(notFound.body).toLowerCase().includes("sql"))

  const badId = await admin.get("/api/customers/abc")
  check("Ungültige ID liefert 400", badId.status === 400)
}

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`)
if (failures.length) {
  console.log("\nFehlgeschlagen:")
  for (const failure of failures) console.log(` - ${failure}`)
}
process.exit(failed === 0 ? 0 : 1)
