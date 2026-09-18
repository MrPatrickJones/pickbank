import { assertCsrf, handleError, json, parseId } from "@/server/http"
import { markMessageRead } from "@/server/repositories/misc"
import { requireCustomer } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCustomer()
    assertCsrf(request, session)
    // Scoped to the session's customer – a foreign message id simply matches nothing.
    await markMessageRead(parseId((await context.params).id), session.customerId)
    return json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
