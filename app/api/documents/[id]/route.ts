import { actorOf, writeAudit } from "@/server/audit"
import { notFound } from "@/server/errors"
import { assertCsrf, clientIp, handleError, json, parseId } from "@/server/http"
import { queryOne } from "@/server/db"
import { deleteDocument } from "@/server/repositories/misc"
import { requireStaff } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff()
    assertCsrf(request, session)

    const id = parseId((await context.params).id)
    const document = await queryOne<{ id: number; customer_id: number; filename: string }>(
      "SELECT id, customer_id, filename FROM documents WHERE id = ?",
      [id],
    )
    if (!document) throw notFound("Das Dokument wurde nicht gefunden.")

    await deleteDocument(id)
    await writeAudit(actorOf(session.user), clientIp(request), {
      action: "Dokument gelöscht",
      description: `Dokument „${document.filename}" gelöscht.`,
      customerId: document.customer_id,
      oldValue: document.filename,
    })

    return json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
