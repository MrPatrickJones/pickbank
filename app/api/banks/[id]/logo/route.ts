import { actorOf, writeAudit } from "@/server/audit"
import { badRequest, notFound } from "@/server/errors"
import { assertCsrf, clientIp, handleError, json, parseId } from "@/server/http"
import { requireBankById, setBankLogo } from "@/server/repositories/banks"
import { contentDisposition, readStored, removeStored, storeUpload } from "@/server/storage"
import { requireSession, requireStaff } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Das Logo wird nur an angemeldete Nutzer ausgeliefert, nie über einen Dateipfad. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const id = parseId((await context.params).id)
    const bank = await requireBankById(id)
    if (!bank.logo_key) throw notFound("Für diese Bank ist kein Logo hinterlegt.")

    const file = await readStored(bank.logo_key)
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": bank.logo_mime ?? "application/octet-stream",
        "Content-Length": String(file.byteLength),
        "Content-Disposition": contentDisposition(`${bank.name}-logo`, "inline"),
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff()
    assertCsrf(request, session)

    const id = parseId((await context.params).id)
    const bank = await requireBankById(id)

    const form = await request.formData().catch(() => {
      throw badRequest("Die Datei konnte nicht gelesen werden.")
    })
    const file = form.get("file")
    if (!(file instanceof File)) throw badRequest("Bitte wählen Sie eine Bilddatei aus.")

    const stored = await storeUpload(file, "logo")
    await removeStored(bank.logo_key)
    await setBankLogo(id, stored.storageKey, stored.mimeType)

    await writeAudit(actorOf(session.user), clientIp(request), {
      action: "Banklogo hinterlegt",
      description: `Logo für „${bank.name}" hinterlegt.`,
      bankId: id,
      newValue: stored.filename,
    })

    return json({ logoUrl: `/api/banks/${id}/logo` }, 201)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff()
    assertCsrf(request, session)

    const id = parseId((await context.params).id)
    const bank = await requireBankById(id)

    await setBankLogo(id, null, null)
    await removeStored(bank.logo_key)

    await writeAudit(actorOf(session.user), clientIp(request), {
      action: "Banklogo entfernt",
      description: `Logo von „${bank.name}" entfernt.`,
      bankId: id,
    })

    return json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
