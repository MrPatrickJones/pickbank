import "server-only"

import { createHash, randomBytes } from "node:crypto"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve, sep } from "node:path"

import { env } from "@/server/env"
import { badRequest } from "@/server/errors"

/**
 * Dateiablage ausserhalb des Webroots.
 *
 * Der Speicherschlüssel wird ausschliesslich hier erzeugt (Zufall + Datum) und
 * nie aus einer Nutzereingabe abgeleitet. Ausgeliefert werden Dateien nur über
 * die API, nachdem Sitzung und Eigentümerschaft geprüft wurden.
 */

export type AllowedKind = "document" | "logo"

type TypeSpec = { mime: string; extensions: string[]; magic?: (bytes: Uint8Array) => boolean }

const startsWith = (bytes: Uint8Array, signature: number[]) =>
  signature.every((byte, index) => bytes[index] === byte)

const PDF: TypeSpec = { mime: "application/pdf", extensions: ["pdf"], magic: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]) }
const JPEG: TypeSpec = { mime: "image/jpeg", extensions: ["jpg", "jpeg"], magic: (b) => startsWith(b, [0xff, 0xd8, 0xff]) }
const PNG: TypeSpec = {
  mime: "image/png",
  extensions: ["png"],
  magic: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
}
const WEBP: TypeSpec = {
  mime: "image/webp",
  extensions: ["webp"],
  magic: (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b.subarray(8), [0x57, 0x45, 0x42, 0x50]),
}
const SVG: TypeSpec = { mime: "image/svg+xml", extensions: ["svg"] }
const DOCX: TypeSpec = {
  mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  extensions: ["docx"],
  // Jede DOCX ist ein ZIP-Container.
  magic: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
}

const DOCUMENT_TYPES = [PDF, JPEG, PNG, DOCX]
const LOGO_TYPES = [PNG, JPEG, WEBP, SVG]

export const documentAccept = ".pdf,.jpg,.jpeg,.png,.docx"
export const logoAccept = ".png,.jpg,.jpeg,.webp,.svg"

export function maxUploadBytes(kind: AllowedKind) {
  const megabytes = kind === "logo" ? env.storage.maxLogoMb : env.storage.maxUploadMb
  return Math.round(megabytes * 1024 * 1024)
}

function extensionOf(filename: string) {
  const index = filename.lastIndexOf(".")
  return index === -1 ? "" : filename.slice(index + 1).toLowerCase()
}

/** Nur der reine Dateiname, ohne Pfadanteile und Steuerzeichen. */
export function sanitizeFilename(input: string) {
  const base = input.split(/[\\/]/).pop() ?? ""
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim()
  return cleaned.slice(0, 200) || "dokument"
}

export type StoredFile = {
  storageKey: string
  filename: string
  mimeType: string
  sizeBytes: number
  checksum: string
}

/**
 * Prüft Typ, Endung, Inhalt und Grösse und legt die Datei ab.
 * Wirft ausschliesslich verständliche Meldungen ohne interne Pfade.
 */
export async function storeUpload(file: File, kind: AllowedKind): Promise<StoredFile> {
  const limit = maxUploadBytes(kind)
  const allowed = kind === "logo" ? LOGO_TYPES : DOCUMENT_TYPES

  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) {
    throw badRequest("Bitte wählen Sie eine Datei aus.", { file: "Bitte wählen Sie eine Datei aus." })
  }

  if (file.size > limit) {
    const message = `Die Datei ist zu groß. Erlaubt sind höchstens ${kind === "logo" ? env.storage.maxLogoMb : env.storage.maxUploadMb} MB.`
    throw badRequest(message, { file: message })
  }

  const filename = sanitizeFilename(file.name)
  const extension = extensionOf(filename)
  const spec = allowed.find((entry) => entry.extensions.includes(extension))

  if (!spec) {
    const message = `Dieser Dateityp wird nicht unterstützt. Erlaubt sind ${allowed
      .flatMap((entry) => entry.extensions)
      .map((value) => value.toUpperCase())
      .join(", ")}.`
    throw badRequest(message, { file: message })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())

  if (bytes.byteLength > limit) {
    const message = "Die Datei ist zu groß."
    throw badRequest(message, { file: message })
  }

  // Der Inhalt muss zur Endung passen – eine umbenannte Datei wird abgewiesen.
  if (spec.magic && !spec.magic(bytes)) {
    const message = "Der Inhalt der Datei passt nicht zum Dateityp."
    throw badRequest(message, { file: message })
  }

  const now = new Date()
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`
  const storageKey = `${kind === "logo" ? "logos" : "documents"}/${folder}/${randomBytes(16).toString("hex")}.${extension}`
  const target = absolutePath(storageKey)

  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, bytes, { mode: 0o600 })

  return {
    storageKey,
    filename,
    mimeType: spec.mime,
    sizeBytes: bytes.byteLength,
    checksum: createHash("sha256").update(bytes).digest("hex"),
  }
}

/** Löst einen Speicherschlüssel auf und verhindert jeden Ausbruch aus dem Ablageverzeichnis. */
function absolutePath(storageKey: string) {
  const root = resolve(env.storage.dir)
  const target = resolve(join(root, storageKey))
  if (target !== root && !target.startsWith(root + sep)) {
    throw badRequest("Ungültiger Dateiverweis.")
  }
  return target
}

export async function readStored(storageKey: string) {
  return readFile(absolutePath(storageKey))
}

export async function removeStored(storageKey: string | null) {
  if (!storageKey) return
  await rm(absolutePath(storageKey), { force: true })
}

/** Content-Disposition mit korrekt kodiertem Dateinamen. */
export function contentDisposition(filename: string, mode: "inline" | "attachment") {
  const fallback = filename.replace(/[^\w.\- ]+/g, "_")
  return `${mode}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}
