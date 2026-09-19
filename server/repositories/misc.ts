import "server-only"

import { execute, query, queryOne, type SqlValue } from "@/server/db"

/* ---------------- Documents ---------------- */

export type DocumentRow = {
  id: number
  customer_id: number
  account_id: number | null
  title: string | null
  filename: string
  category: string
  doc_type: string | null
  mime_type: string | null
  size_kb: number
  size_bytes: number
  storage_key: string | null
  uploaded_by: number | null
  uploaded_by_name: string | null
  uploaded_by_role: string
  uploaded_at: Date
  account_number?: string | null
  bank_name?: string | null
}

export function toDocumentDto(row: DocumentRow) {
  return {
    id: row.id,
    customerId: row.customer_id,
    accountId: row.account_id,
    title: row.title ?? row.filename,
    filename: row.filename,
    category: row.category,
    docType: row.doc_type,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes ?? 0) || Number(row.size_kb ?? 0) * 1024,
    hasFile: Boolean(row.storage_key),
    // Die Datei kommt ausschliesslich über diese geprüfte Route, nie über einen Dateipfad.
    downloadUrl: row.storage_key ? `/api/documents/${row.id}/file` : null,
    uploadedBy: row.uploaded_by_name,
    uploadedByRole: row.uploaded_by_role as "ADMIN" | "STAFF" | "CUSTOMER" | "SYSTEM",
    uploadedAt: row.uploaded_at.toISOString(),
    account: row.account_id
      ? { id: row.account_id, accountNumber: row.account_number ?? "", bankName: row.bank_name ?? null }
      : null,
  }
}

const DOCUMENT_SELECT = `SELECT d.id, d.customer_id, d.account_id, d.title, d.filename, d.category, d.doc_type,
       d.mime_type, d.size_kb, d.size_bytes, d.storage_key, d.uploaded_by, d.uploaded_by_role,
       u.full_name AS uploaded_by_name, d.uploaded_at,
       a.account_number, b.name AS bank_name
  FROM documents d
  JOIN customers c ON c.id = d.customer_id AND c.deleted_at IS NULL
  LEFT JOIN auth_users u ON u.id = d.uploaded_by
  LEFT JOIN fixed_deposit_accounts a ON a.id = d.account_id
  LEFT JOIN banks b ON b.id = a.bank_id`

export async function listDocuments(filters: {
  customerId?: number
  accountId?: number
  category?: string
  search?: string
}) {
  const where: string[] = ["d.deleted_at IS NULL"]
  const values: SqlValue[] = []

  if (filters.customerId) {
    where.push("d.customer_id = ?")
    values.push(filters.customerId)
  }
  if (filters.accountId) {
    where.push("d.account_id = ?")
    values.push(filters.accountId)
  }
  if (filters.category) {
    where.push("d.category = ?")
    values.push(filters.category)
  }
  if (filters.search) {
    where.push("(d.title LIKE ? OR d.filename LIKE ? OR c.last_name LIKE ?)")
    const like = `%${filters.search}%`
    values.push(like, like, like)
  }

  return query<DocumentRow & { first_name: string; last_name: string }>(
    `${DOCUMENT_SELECT.replace("  FROM documents d", ", c.first_name, c.last_name\n  FROM documents d")}
      WHERE ${where.join(" AND ")}
      ORDER BY d.uploaded_at DESC
      LIMIT 300`,
    values,
  )
}

export async function findDocumentById(id: number) {
  return queryOne<DocumentRow>(`${DOCUMENT_SELECT} WHERE d.id = ? AND d.deleted_at IS NULL`, [id])
}

/** Anzahl je Kategorie – für die Übersicht im Kundenportal. */
export async function documentCounts(customerId: number) {
  const rows = await query<{ category: string; total: number }>(
    `SELECT category, COUNT(*) AS total FROM documents
      WHERE customer_id = ? AND deleted_at IS NULL GROUP BY category`,
    [customerId],
  )

  const byCategory: Record<string, number> = {
    IDENTITY: 0,
    KYC: 0,
    CONTRACTS: 0,
    BANK_DOCUMENTS: 0,
    OTHER: 0,
  }
  let total = 0
  for (const row of rows) {
    byCategory[row.category] = Number(row.total)
    total += Number(row.total)
  }
  return { total, byCategory }
}

export async function countDocumentsPerAccount(customerId: number) {
  const rows = await query<{ account_id: number; total: number }>(
    `SELECT account_id, COUNT(*) AS total FROM documents
      WHERE customer_id = ? AND account_id IS NOT NULL AND deleted_at IS NULL
      GROUP BY account_id`,
    [customerId],
  )
  const map = new Map<number, number>()
  for (const row of rows) map.set(Number(row.account_id), Number(row.total))
  return map
}

export async function insertDocument(input: {
  customerId: number
  accountId: number | null
  title: string
  filename: string
  category: string
  docType: string | null
  mimeType: string | null
  sizeBytes: number
  storageKey: string | null
  checksum: string | null
  uploadedBy: number
  uploadedByRole: string
}) {
  const result = await execute(
    `INSERT INTO documents
       (customer_id, account_id, title, filename, category, doc_type, mime_type, size_kb, size_bytes,
        storage_key, checksum, uploaded_by, uploaded_by_role)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.customerId,
      input.accountId,
      input.title,
      input.filename,
      input.category,
      input.docType,
      input.mimeType,
      Math.ceil(input.sizeBytes / 1024),
      input.sizeBytes,
      input.storageKey,
      input.checksum,
      input.uploadedBy,
      input.uploadedByRole,
    ],
  )
  return result.insertId
}

/** Der Datensatz bleibt für die Nachvollziehbarkeit, die Datei wird entfernt. */
export async function softDeleteDocument(id: number) {
  await execute(
    "UPDATE documents SET deleted_at = CURRENT_TIMESTAMP(3), storage_key = NULL WHERE id = ? AND deleted_at IS NULL",
    [id],
  )
}

/* ---------------- Messages ---------------- */

export type MessageRow = {
  id: number
  customer_id: number
  subject: string
  body: string
  sent_by: number | null
  sent_by_name: string | null
  sent_at: Date
  read_at: Date | null
}

export function toMessageDto(row: MessageRow) {
  return {
    id: row.id,
    customerId: row.customer_id,
    subject: row.subject,
    body: row.body,
    sentBy: row.sent_by_name,
    sentAt: row.sent_at.toISOString(),
    readAt: row.read_at ? row.read_at.toISOString() : null,
  }
}

export async function listMessages(filters: { customerId?: number; search?: string }) {
  const where: string[] = ["1 = 1"]
  const values: SqlValue[] = []

  if (filters.customerId) {
    where.push("m.customer_id = ?")
    values.push(filters.customerId)
  }
  if (filters.search) {
    where.push("(m.subject LIKE ? OR m.body LIKE ? OR c.last_name LIKE ?)")
    const like = `%${filters.search}%`
    values.push(like, like, like)
  }

  return query<MessageRow & { first_name: string; last_name: string }>(
    `SELECT m.id, m.customer_id, m.subject, m.body, m.sent_by, u.full_name AS sent_by_name, m.sent_at, m.read_at,
            c.first_name, c.last_name
       FROM messages m
       JOIN customers c ON c.id = m.customer_id AND c.deleted_at IS NULL
       LEFT JOIN auth_users u ON u.id = m.sent_by
      WHERE ${where.join(" AND ")}
      ORDER BY m.sent_at DESC
      LIMIT 300`,
    values,
  )
}

export async function insertMessage(input: { customerId: number; subject: string; body: string; sentBy: number }) {
  const result = await execute("INSERT INTO messages (customer_id, subject, body, sent_by) VALUES (?, ?, ?, ?)", [
    input.customerId,
    input.subject,
    input.body,
    input.sentBy,
  ])
  return result.insertId
}

export async function markMessageRead(id: number, customerId: number) {
  await execute(
    "UPDATE messages SET read_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND customer_id = ? AND read_at IS NULL",
    [id, customerId],
  )
}

/* ---------------- Audit ---------------- */

export type AuditRow = {
  id: number
  user_label: string
  user_role: string
  action: string
  description: string
  affected_customer_id: number | null
  affected_account_id: number | null
  changed_field: string | null
  old_value: string | null
  new_value: string | null
  created_at: Date
}

export async function listAuditLog(filters: { customerId?: number; action?: string; search?: string; limit?: number }) {
  const where: string[] = ["1 = 1"]
  const values: SqlValue[] = []

  if (filters.customerId) {
    where.push("a.affected_customer_id = ?")
    values.push(filters.customerId)
  }
  if (filters.action) {
    where.push("a.action = ?")
    values.push(filters.action)
  }
  if (filters.search) {
    where.push("(a.description LIKE ? OR a.user_label LIKE ? OR a.action LIKE ?)")
    const like = `%${filters.search}%`
    values.push(like, like, like)
  }

  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500)

  const rows = await query<AuditRow>(
    `SELECT a.id, a.user_label, a.user_role, a.action, a.description, a.affected_customer_id,
            a.affected_account_id, a.changed_field, a.old_value, a.new_value, a.created_at
       FROM audit_logs a
      WHERE ${where.join(" AND ")}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ${limit}`,
    values,
  )

  return rows.map((row) => ({
    id: row.id,
    user: row.user_label,
    userRole: row.user_role,
    action: row.action,
    description: row.description,
    customerId: row.affected_customer_id,
    accountId: row.affected_account_id,
    changedField: row.changed_field,
    oldValue: row.old_value,
    newValue: row.new_value,
    createdAt: row.created_at.toISOString(),
  }))
}
