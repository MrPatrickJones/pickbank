import "server-only"

import { actorOf, writeAudit } from "@/server/audit"
import { badRequest, forbidden, notFound } from "@/server/errors"
import { findAccountById } from "@/server/repositories/accounts"
import { findDocumentById, insertDocument, softDeleteDocument } from "@/server/repositories/misc"
import { removeStored, storeUpload } from "@/server/storage"
import type { SessionContext } from "@/server/session"
import { documentUploadSchema } from "@/server/validation"

/**
 * Gemeinsamer Ablauf für alle Uploads – ob aus dem Adminbereich oder aus dem
 * Kundenportal. Die Kundenzuordnung kommt immer vom Aufrufer (bei Kunden aus
 * der Sitzung), nie aus dem Formular.
 */
export async function uploadDocumentFor(
  session: SessionContext,
  customerId: number,
  form: FormData,
  ip: string | null,
) {
  const file = form.get("file")
  if (!(file instanceof File)) {
    throw badRequest("Bitte wählen Sie eine Datei aus.", { file: "Bitte wählen Sie eine Datei aus." })
  }

  const meta = documentUploadSchema.parse({
    title: form.get("title") ?? "",
    category: form.get("category") ?? undefined,
    docType: form.get("docType") || null,
    accountId: form.get("accountId") || null,
  })

  // Eine Anlage darf nur zugeordnet werden, wenn sie diesem Kunden gehört.
  let accountId: number | null = null
  if (meta.accountId) {
    const account = await findAccountById(meta.accountId)
    if (!account || account.customer_id !== customerId) {
      throw badRequest("Die gewählte Festgeldanlage gehört nicht zu diesem Kunden.", {
        accountId: "Bitte wählen Sie eine Anlage dieses Kunden.",
      })
    }
    accountId = account.id
  }

  const stored = await storeUpload(file, "document")

  let id: number
  try {
    id = await insertDocument({
      customerId,
      accountId,
      title: meta.title,
      filename: stored.filename,
      category: meta.category,
      docType: meta.docType ?? null,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      storageKey: stored.storageKey,
      checksum: stored.checksum,
      uploadedBy: session.user.id,
      uploadedByRole: session.user.role,
    })
  } catch (error) {
    // Kein verwaister Inhalt, wenn der Datensatz nicht geschrieben werden konnte.
    await removeStored(stored.storageKey)
    throw error
  }

  await writeAudit(actorOf(session.user), ip, {
    action: "Dokument hochgeladen",
    description: `Dokument „${meta.title}" hinterlegt.`,
    customerId,
    accountId,
    documentId: id,
    newValue: meta.title,
  })

  return id
}

/**
 * Zugriffsprüfung für eine einzelne Akte: Mitarbeitende dürfen alles, Kunden
 * ausschliesslich ihre eigenen Dokumente. Beides wird hier serverseitig
 * entschieden, nicht in der Oberfläche.
 */
export async function requireReadableDocument(session: SessionContext, id: number) {
  const document = await findDocumentById(id)
  if (!document) throw notFound("Das Dokument wurde nicht gefunden.")

  if (session.user.role === "CUSTOMER" && document.customer_id !== session.user.customerId) {
    throw forbidden("Sie haben keine Berechtigung, dieses Dokument aufzurufen.")
  }

  return document
}

export async function deleteDocumentFor(session: SessionContext, id: number, ip: string | null) {
  const document = await requireReadableDocument(session, id)

  // Kunden dürfen nur entfernen, was sie selbst hochgeladen haben.
  if (session.user.role === "CUSTOMER" && document.uploaded_by_role !== "CUSTOMER") {
    throw forbidden("Von Pick The Bank hinterlegte Unterlagen können Sie nicht löschen.")
  }

  await softDeleteDocument(id)
  await removeStored(document.storage_key)

  await writeAudit(actorOf(session.user), ip, {
    action: "Dokument gelöscht",
    description: `Dokument „${document.title ?? document.filename}" gelöscht.`,
    customerId: document.customer_id,
    accountId: document.account_id,
    documentId: id,
    oldValue: document.title ?? document.filename,
  })
}
