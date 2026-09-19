import { uploadDocumentFor } from "@/server/document-service"
import { badRequest } from "@/server/errors"
import { assertCsrf, clientIp, handleError, json } from "@/server/http"
import { listDocuments, toDocumentDto } from "@/server/repositories/misc"
import { requireCustomer } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Immer nur die eigene Akte: die Kundennummer kommt aus der Sitzung. */
export async function GET() {
  try {
    const session = await requireCustomer()
    const rows = await listDocuments({ customerId: session.customerId })
    return json({ documents: rows.map(toDocumentDto) })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireCustomer()
    assertCsrf(request, session)

    const form = await request.formData().catch(() => {
      throw badRequest("Das Dokument konnte nicht hochgeladen werden.")
    })

    const id = await uploadDocumentFor(session, session.customerId, form, clientIp(request))
    return json({ id }, 201)
  } catch (error) {
    return handleError(error)
  }
}
