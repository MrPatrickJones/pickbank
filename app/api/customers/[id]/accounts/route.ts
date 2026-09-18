import { actorOf, writeAudit } from "@/server/audit"
import { assertCsrf, clientIp, handleError, json, parseId, readJson } from "@/server/http"
import {
  insertAccount,
  listAccountsOfCustomer,
  nextAccountNumber,
  requireAccountById,
  toAccountDto,
} from "@/server/repositories/accounts"
import { requireCustomerById } from "@/server/repositories/customers"
import { assertCustomerAccess, requireSession, requireStaff } from "@/server/session"
import { accountCreateSchema } from "@/server/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const id = parseId((await context.params).id)
    assertCustomerAccess(session, id)
    const accounts = await listAccountsOfCustomer(id)
    return json({ accounts: accounts.map((row) => toAccountDto(row, session.user.role !== "CUSTOMER")) })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff()
    assertCsrf(request, session)

    const customerId = parseId((await context.params).id)
    await requireCustomerById(customerId)

    const body = accountCreateSchema.parse(await readJson(request))
    const accountNumber = body.accountNumber?.trim() || (await nextAccountNumber())
    const id = await insertAccount(customerId, { ...body, accountNumber })
    const account = await requireAccountById(id)

    await writeAudit(actorOf(session.user), clientIp(request), {
      action: "Konto angelegt",
      description: `Festgeldkonto ${accountNumber} über ${body.principalAmount} ${body.currency} angelegt.`,
      customerId,
      accountId: id,
      newValue: `${body.principalAmount} ${body.currency}`,
    })

    return json({ account: toAccountDto(account) }, 201)
  } catch (error) {
    return handleError(error)
  }
}
