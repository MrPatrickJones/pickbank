import { uploadDocumentFor } from "@/server/document-service"
import { badRequest } from "@/server/errors"
import { assertCsrf, clientIp, handleError, json, parseId } from "@/server/http"
import { listDocuments, toDocumentDto } from "@/server/repositories/misc"
import { requireCustomerById } from "@/server/repositories/customers"
import { assertCustomerAccess, requireSession, requireStaff } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const id = parseId((await context.params).id)
    assertCustomerAccess(session, id)

    const params = new URL(request.url).searchParams
    const accountId = params.get("accountId")
    const rows = await listDocuments({
      customerId: id,
      category: params.get("category") ?? undefined,
      accountId: accountId ? Number(accountId) : undefined,
    })
    return json({ documents: rows.map(toDocumentDto) })
  } catch (error) {
    return handleError(error)
  }
}

/** Upload aus dem Adminbereich – die Datei kommt als multipart/form-data. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff()
    assertCsrf(request, session)

    const customerId = parseId((await context.params).id)
    await requireCustomerById(customerId)

    const form = await request.formData().catch(() => {
      throw badRequest("Das Dokument konnte nicht hochgeladen werden.")
    })

    const id = await uploadDocumentFor(session, customerId, form, clientIp(request))
    return json({ id }, 201)
  } catch (error) {
    return handleError(error)
  }
}
