import "server-only"

import { execute, query, type SqlValue } from "@/server/db"

/* ---------------- Documents ---------------- */

export type DocumentRow = {
  id: number
  customer_id: number
  account_id: number | null
  filename: string
  category: string
  size_kb: number
  uploaded_by: number | null
  uploaded_by_name: string | null
  uploaded_at: Date
}

export function toDocumentDto(row: DocumentRow) {
  return {
    id: row.id,
    customerId: row.customer_id,
    accountId: row.account_id,
    filename: row.filename,
    category: row.category,
    sizeKb: Number(row.size_kb),
    uploadedBy: row.uploaded_by_name,
    uploadedAt: row.uploaded_at.toISOString(),
  }
}

export async function listDocuments(filters: { customerId?: number; category?: string; search?: string }) {
  const where: string[] = ["1 = 1"]
  const values: SqlValue[] = []

  if (filters.customerId) {
    where.push("d.customer_id = ?")
    values.push(filters.customerId)
  }
  if (filters.category) {
    where.push("d.category = ?")
    values.push(filters.category)
  }
  if (filters.search) {
    where.push("(d.filename LIKE ? OR c.last_name LIKE ?)")
    const like = `%${filters.search}%`
    values.push(like, like)
  }

  return query<DocumentRow & { first_name: string; last_name: string }>(
    `SELECT d.id, d.customer_id, d.account_id, d.filename, d.category, d.size_kb, d.uploaded_by,
            u.full_name AS uploaded_by_name, d.uploaded_at, c.first_name, c.last_name
       FROM documents d
       JOIN customers c ON c.id = d.customer_id AND c.deleted_at IS NULL
       LEFT JOIN auth_users u ON u.id = d.uploaded_by
      WHERE ${where.join(" AND ")}
      ORDER BY d.uploaded_at DESC
      LIMIT 300`,
    values,
  )
}

export async function insertDocument(input: {
  customerId: number
  accountId: number | null
  filename: string
  category: string
  sizeKb: number
  uploadedBy: number
}) {
  const result = await execute(
    `INSERT INTO documents (customer_id, account_id, filename, category, size_kb, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.customerId, input.accountId, input.filename, input.category, input.sizeKb, input.uploadedBy],
  )
  return result.insertId
}

export async function deleteDocument(id: number) {
  await execute("DELETE FROM documents WHERE id = ?", [id])
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
