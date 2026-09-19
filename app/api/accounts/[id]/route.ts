import { actorOf, writeAudit, writeFieldChanges } from "@/server/audit"
import { badRequest } from "@/server/errors"
import { assertCsrf, clientIp, handleError, json, parseId, readJson } from "@/server/http"
import { addMonths } from "@/server/money"
import { requireAccountById, toAccountDto, updateAccount } from "@/server/repositories/accounts"
import { requireBankById } from "@/server/repositories/banks"
import { assertCustomerAccess, requireSession, requireStaff } from "@/server/session"
import { accountUpdateSchema } from "@/server/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const FIELD_LABELS: Record<string, string> = {
  productName: "Produktname",
  principalAmount: "Anlagebetrag",
  currency: "Währung",
  interestRate: "Zinssatz",
  termMonths: "Laufzeit",
  startDate: "Startdatum",
  maturityDate: "Fälligkeitsdatum",
  status: "Status",
  interestPaymentMethod: "Zinszahlung",
  payoutDate: "Auszahlungsdatum",
  referenceAccount: "Referenzkonto",
  notes: "Interne Notizen",
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const account = await requireAccountById(parseId((await context.params).id))
    assertCustomerAccess(session, account.customer_id)
    return json({ account: toAccountDto(account, session.user.role !== "CUSTOMER") })
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff()
    assertCsrf(request, session)

    const id = parseId((await context.params).id)
    const before = await requireAccountById(id)
    const body = accountUpdateSchema.parse(await readJson(request))
    const { recalculateMaturity, ...patch } = body

    // Ein Bankwechsel wird mit Namen protokolliert, nicht mit internen Nummern.
    let bankChange: { from: string; to: string } | null = null
    if (patch.bankId !== undefined && patch.bankId !== before.bank_id) {
      const bank = await requireBankById(patch.bankId)
      bankChange = { from: before.bank_name ?? "–", to: bank.name }
    }

    // Dependent values are recalculated on the server, never trusted from the client.
    const startDate = patch.startDate ?? before.start_date
    const termMonths = patch.termMonths ?? Number(before.term_months)
    if (recalculateMaturity || ((patch.startDate || patch.termMonths) && !patch.maturityDate)) {
      patch.maturityDate = addMonths(startDate, termMonths)
    }

    const maturityDate = patch.maturityDate ?? before.maturity_date
    if (maturityDate <= startDate) {
      throw badRequest("Das Fälligkeitsdatum muss nach dem Startdatum liegen.", {
        maturityDate: "Das Fälligkeitsdatum muss nach dem Startdatum liegen.",
      })
    }
    const payoutDate = patch.payoutDate ?? before.payout_date
    if (payoutDate && payoutDate < maturityDate) {
      throw badRequest("Die Auszahlung darf nicht vor der Fälligkeit liegen.", {
        payoutDate: "Die Auszahlung darf nicht vor der Fälligkeit liegen.",
      })
    }

    await updateAccount(id, patch)
    const after = await requireAccountById(id)

    if (bankChange) {
      await writeAudit(actorOf(session.user), clientIp(request), {
        action: "Konto geändert",
        description: `Bank des Kontos ${before.account_number} von „${bankChange.from}" auf „${bankChange.to}" geändert.`,
        customerId: before.customer_id,
        accountId: id,
        bankId: after.bank_id,
        changedField: "bankId",
        oldValue: bankChange.from,
        newValue: bankChange.to,
      })
    }

    await writeFieldChanges(
      actorOf(session.user),
      clientIp(request),
      {
        action: "Konto geändert",
        subject: `des Kontos ${before.account_number}`,
        customerId: before.customer_id,
        accountId: id,
      },
      FIELD_LABELS,
      {
        productName: before.product_name,
        principalAmount: String(before.principal_amount),
        currency: before.currency,
        interestRate: String(before.interest_rate),
        termMonths: Number(before.term_months),
        startDate: before.start_date,
        maturityDate: before.maturity_date,
        status: before.status,
        interestPaymentMethod: before.interest_payment_method,
        payoutDate: before.payout_date,
        referenceAccount: before.reference_account,
        notes: before.notes,
      },
      (({ bankId: _bankId, ...rest }) => rest)(patch) as Record<string, unknown>,
    )

    return json({ account: toAccountDto(after) })
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return PATCH(request, context)
}
