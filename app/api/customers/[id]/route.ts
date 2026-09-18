import { actorOf, writeAudit, writeFieldChanges } from "@/server/audit"
import { getCustomerLogin } from "@/server/auth-service"
import { assertCsrf, clientIp, handleError, json, parseId, readJson } from "@/server/http"
import { listAccountsOfCustomer, toAccountDto } from "@/server/repositories/accounts"
import {
  customerTotals,
  requireCustomerById,
  softDeleteCustomer,
  updateCustomer,
} from "@/server/repositories/customers"
import { listDocuments, listMessages, toDocumentDto, toMessageDto } from "@/server/repositories/misc"
import { listAuditLog } from "@/server/repositories/misc"
import { assertCustomerAccess, requireAdmin, requireSession, requireStaff } from "@/server/session"
import { customerUpdateSchema } from "@/server/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const FIELD_LABELS: Record<string, string> = {
  firstName: "Vorname",
  lastName: "Nachname",
  companyName: "Firma",
  email: "E-Mail",
  phone: "Telefon",
  mobile: "Mobiltelefon",
  dateOfBirth: "Geburtsdatum",
  address: "Adresse",
  postalCode: "PLZ",
  city: "Ort",
  country: "Land",
  nationality: "Nationalität",
  customerStatus: "Kundenstatus",
  kycStatus: "KYC-Status",
  identifiedAt: "Identifikationsdatum",
  identificationType: "Ausweisart",
}

/** Full customer file. Staff see everything, a customer only their own record. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const id = parseId((await context.params).id)
    assertCustomerAccess(session, id)

    const isStaff = session.user.role !== "CUSTOMER"
    const customer = await requireCustomerById(id)
    const accounts = await listAccountsOfCustomer(id)
    const documents = await listDocuments({ customerId: id })
    const messages = await listMessages({ customerId: id })

    return json({
      customer,
      totals: await customerTotals(id),
      accounts: accounts.map((row) => toAccountDto(row, isStaff)),
      documents: documents.map(toDocumentDto),
      messages: messages.map(toMessageDto),
      // Audit trail and login details are internal – customers never receive them.
      activities: isStaff ? await listAuditLog({ customerId: id, limit: 100 }) : [],
      login: isStaff ? await getCustomerLogin(id) : null,
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff()
    assertCsrf(request, session)

    const id = parseId((await context.params).id)
    const before = await requireCustomerById(id)
    const patch = customerUpdateSchema.parse(await readJson(request))

    await updateCustomer(id, patch)
    const after = await requireCustomerById(id)

    await writeFieldChanges(
      actorOf(session.user),
      clientIp(request),
      { action: "Kunde geändert", subject: `von ${after.firstName} ${after.lastName}`, customerId: id },
      FIELD_LABELS,
      before as unknown as Record<string, unknown>,
      patch as Record<string, unknown>,
    )

    return json({ customer: after })
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return PATCH(request, context)
}

/** Deleting is reserved for administrators and keeps the audit trail intact. */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin()
    assertCsrf(request, session)

    const id = parseId((await context.params).id)
    const customer = await requireCustomerById(id)
    await softDeleteCustomer(id)

    await writeAudit(actorOf(session.user), clientIp(request), {
      action: "Kunde gelöscht",
      description: `Kunde ${customer.firstName} ${customer.lastName} (${customer.customerNumber}) gelöscht.`,
      customerId: id,
    })

    return json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
