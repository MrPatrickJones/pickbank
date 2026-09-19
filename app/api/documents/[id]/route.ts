import { deleteDocumentFor } from "@/server/document-service"
import { assertCsrf, clientIp, handleError, json, parseId } from "@/server/http"
import { requireSession } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    assertCsrf(request, session)

    const id = parseId((await context.params).id)
    await deleteDocumentFor(session, id, clientIp(request))

    return json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
