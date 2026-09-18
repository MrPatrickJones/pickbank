import "server-only"

import { execute } from "@/server/db"
import type { AuthUser } from "@/server/session"

export type AuditEntry = {
  action: string
  description: string
  customerId?: number | null
  accountId?: number | null
  changedField?: string | null
  oldValue?: string | null
  newValue?: string | null
}

/**
 * Append-only history. Nothing in the application updates or deletes rows here,
 * and customers never read from this table.
 */
export async function writeAudit(
  actor: { id: number | null; role: "ADMIN" | "STAFF" | "CUSTOMER" | "SYSTEM"; label: string },
  ip: string | null,
  entry: AuditEntry,
) {
  await execute(
    `INSERT INTO audit_logs
       (user_id, user_role, user_label, action, description, affected_customer_id, affected_account_id,
        changed_field, old_value, new_value, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      actor.id,
      actor.role,
      actor.label.slice(0, 160),
      entry.action.slice(0, 80),
      entry.description.slice(0, 500),
      entry.customerId ?? null,
      entry.accountId ?? null,
      entry.changedField?.slice(0, 80) ?? null,
      entry.oldValue?.slice(0, 255) ?? null,
      entry.newValue?.slice(0, 255) ?? null,
      ip,
    ],
  )
}

export function actorOf(user: AuthUser) {
  return { id: user.id, role: user.role, label: `${user.fullName} (${user.email})` }
}

/** Writes one entry per changed field, so the log reads as a diff. */
export async function writeFieldChanges(
  actor: { id: number | null; role: "ADMIN" | "STAFF" | "CUSTOMER" | "SYSTEM"; label: string },
  ip: string | null,
  base: { action: string; subject: string; customerId?: number | null; accountId?: number | null },
  labels: Record<string, string>,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  for (const [field, label] of Object.entries(labels)) {
    if (!(field in after)) continue
    const oldValue = before[field]
    const newValue = after[field]
    if (String(oldValue ?? "") === String(newValue ?? "")) continue

    await writeAudit(actor, ip, {
      action: base.action,
      description: `${label} ${base.subject} von „${format(oldValue)}" auf „${format(newValue)}" geändert.`,
      customerId: base.customerId ?? null,
      accountId: base.accountId ?? null,
      changedField: field,
      oldValue: format(oldValue),
      newValue: format(newValue),
    })
  }
}

function format(value: unknown) {
  if (value === null || value === undefined || value === "") return "–"
  return String(value)
}
