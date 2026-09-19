import { actorOf, writeAudit, writeFieldChanges } from "@/server/audit"
import { assertCsrf, clientIp, handleError, json, parseId, readJson } from "@/server/http"
import {
  countAccountsOfBank,
  requireBankById,
  softDeleteBank,
  toBankDto,
  updateBank,
} from "@/server/repositories/banks"
import { removeStored } from "@/server/storage"
import { requireAdmin, requireSession, requireStaff } from "@/server/session"
import { bankUpdateSchema } from "@/server/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  legalName: "Firmierung",
  country: "Land",
  city: "Sitz",
  address: "Adresse",
  postalCode: "PLZ",
  website: "Website",
  bic: "BIC",
  notes: "Notiz",
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const id = parseId((await context.params).id)
    const bank = await requireBankById(id)
    const isStaff = session.user.role !== "CUSTOMER"

    return json({
      bank: toBankDto(bank, {
        includeInternal: isStaff,
        ...(isStaff ? { accountCount: await countAccountsOfBank(id) } : {}),
      }),
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
    const before = await requireBankById(id)
    const patch = bankUpdateSchema.parse(await readJson(request))

    await updateBank(id, patch)
    await writeFieldChanges(
      actorOf(session.user),
      clientIp(request),
      { action: "Bank geändert", subject: `der Bank „${before.name}"`, bankId: id },
      FIELD_LABELS,
      toBankDto(before),
      patch,
    )

    const after = await requireBankById(id)
    return json({ bank: toBankDto(after, { accountCount: await countAccountsOfBank(id) }) })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin()
    assertCsrf(request, session)

    const id = parseId((await context.params).id)
    const bank = await requireBankById(id)

    await softDeleteBank(id)
    await removeStored(bank.logo_key)

    await writeAudit(actorOf(session.user), clientIp(request), {
      action: "Bank entfernt",
      description: `Bank „${bank.name}" entfernt.`,
      bankId: id,
      oldValue: bank.name,
    })

    return json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
