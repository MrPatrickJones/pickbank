import { actorOf, writeAudit } from "@/server/audit"
import { assertCsrf, clientIp, handleError, json, parseId, readJson } from "@/server/http"
import { insertMessage, listMessages, toMessageDto } from "@/server/repositories/misc"
import { requireCustomerById } from "@/server/repositories/customers"
import { assertCustomerAccess, requireSession, requireStaff } from "@/server/session"
import { messageCreateSchema } from "@/server/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const id = parseId((await context.params).id)
    assertCustomerAccess(session, id)
    const rows = await listMessages({ customerId: id })
    return json({ messages: rows.map(toMessageDto) })
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

    const body = messageCreateSchema.parse(await readJson(request))
    const id = await insertMessage({ customerId, subject: body.subject, body: body.body, sentBy: session.user.id })

    await writeAudit(actorOf(session.user), clientIp(request), {
      action: "Nachricht versendet",
      description: `Nachricht „${body.subject}" an den Kunden versendet.`,
      customerId,
      newValue: body.subject,
    })

    return json({ id }, 201)
  } catch (error) {
    return handleError(error)
  }
}
