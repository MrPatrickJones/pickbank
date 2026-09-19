import { notFound } from "@/server/errors"
import { contentDisposition, readStored } from "@/server/storage"
import { handleError, parseId } from "@/server/http"
import { requireReadableDocument } from "@/server/document-service"
import { requireSession } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Die einzige Stelle, an der eine Datei das System verlässt. Vor jeder
 * Auslieferung stehen Sitzung und Eigentümerprüfung; der Speicherort selbst ist
 * von aussen nicht erreichbar.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const id = parseId((await context.params).id)
    const document = await requireReadableDocument(session, id)

    if (!document.storage_key) throw notFound("Zu diesem Eintrag ist keine Datei hinterlegt.")

    const download = new URL(request.url).searchParams.get("download") === "1"
    const file = await readStored(document.storage_key)

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": document.mime_type ?? "application/octet-stream",
        "Content-Length": String(file.byteLength),
        "Content-Disposition": contentDisposition(document.filename, download ? "attachment" : "inline"),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
