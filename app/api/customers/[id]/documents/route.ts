import { actorOf, writeAudit } from "@/server/audit"
import { assertCsrf, clientIp, handleError, json, parseId, readJson } from "@/server/http"
import { insertDocument, listDocuments, toDocumentDto } from "@/server/repositories/misc"
import { requireCustomerById } from "@/server/repositories/customers"
import { assertCustomerAccess, requireSession, requireStaff } from "@/server/session"
import { documentCreateSchema } from "@/server/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const id = parseId((await context.params).id)
    assertCustomerAccess(session, id)
    const rows = await listDocuments({ customerId: id })
    return json({ documents: rows.map(toDocumentDto) })
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

    const body = documentCreateSchema.parse(await readJson(request))
    const id = await insertDocument({
      customerId,
      accountId: body.accountId ?? null,
      filename: body.filename,
      category: body.category,
      sizeKb: body.sizeKb,
      uploadedBy: session.user.id,
    })

    await writeAudit(actorOf(session.user), clientIp(request), {
      action: "Dokument hochgeladen",
      description: `Dokument „${body.filename}" in Kategorie ${body.category} hinterlegt.`,
      customerId,
      newValue: body.filename,
    })

    return json({ id }, 201)
  } catch (error) {
    return handleError(error)
  }
}
