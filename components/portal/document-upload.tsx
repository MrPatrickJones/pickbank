"use client"

import { useEffect, useMemo, useState } from "react"

import { Field, Select, TextInput } from "@/components/ui/form"
import { FileDrop, Modal } from "@/components/ui/overlays"
import { Button } from "@/components/ui/primitives"
import { api, ApiRequestError } from "@/lib/api"
import { formatFileSize } from "@/lib/format"
import { documentCategoryOptions, documentTypesByCategory } from "@/lib/labels"
import type { Account, DocumentCategory } from "@/lib/types"

/**
 * Ein Dialog für beide Seiten: Mitarbeitende laden in die Akte eines Kunden,
 * Kunden in ihre eigene. Der Unterschied steckt allein in der Zieladresse –
 * welcher Kunde gemeint ist, entscheidet der Server.
 */
export function DocumentUploadModal({
  open,
  endpoint,
  accounts,
  presetAccountId,
  onClose,
  onUploaded,
}: {
  open: boolean
  /** "/api/me/documents" im Kundenportal, "/api/customers/{id}/documents" im Adminbereich. */
  endpoint: string
  accounts: Pick<Account, "id" | "accountNumber" | "bank" | "principalAmount" | "currency">[]
  presetAccountId?: number | null
  onClose: () => void
  onUploaded: () => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<DocumentCategory>("CONTRACTS")
  const [docType, setDocType] = useState("")
  const [accountId, setAccountId] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const types = useMemo(() => documentTypesByCategory[category], [category])

  useEffect(() => {
    if (!open) return
    setFile(null)
    setTitle("")
    setCategory("CONTRACTS")
    setDocType(documentTypesByCategory.CONTRACTS[0]?.value ?? "")
    setAccountId(presetAccountId ? String(presetAccountId) : "")
    setErrors({})
  }, [open, presetAccountId])

  // Die Unterart muss immer zur gewählten Kategorie passen.
  useEffect(() => {
    if (!types.some((entry) => entry.value === docType)) setDocType(types[0]?.value ?? "")
  }, [types, docType])

  const submit = async () => {
    if (!file) {
      setErrors({ file: "Bitte wählen Sie eine Datei aus." })
      return
    }

    const form = new FormData()
    form.set("file", file)
    form.set("title", title.trim() || file.name)
    form.set("category", category)
    form.set("docType", docType)
    if (accountId) form.set("accountId", accountId)

    setBusy(true)
    setErrors({})
    try {
      await api.upload(endpoint, form)
      await onUploaded()
      onClose()
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setErrors(Object.keys(caught.details).length ? caught.details : { form: caught.message })
      } else {
        setErrors({ form: "Das Dokument konnte nicht hochgeladen werden." })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Dokument hochladen"
      subtitle="PDF, JPG, PNG oder DOCX bis 10 MB"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" disabled={busy} onClick={() => void submit()}>
            {busy ? "Wird hochgeladen …" : "Hochladen"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FileDrop
          onFiles={(files) => {
            const next = files[0] ?? null
            setFile(next)
            if (next && !title.trim()) setTitle(next.name.replace(/\.[^.]+$/, ""))
            setErrors({})
          }}
        />

        {file && (
          <p className="rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-[13px] text-[var(--body)]">
            Ausgewählt: <strong className="text-[var(--ink)]">{file.name}</strong>{" "}
            <span className="num text-[var(--faint)]">({formatFileSize(file.size)})</span>
          </p>
        )}
        {errors.file && <p className="text-[13px] font-medium text-[var(--danger)]">{errors.file}</p>}

        <Field label="Dokumentname" required error={errors.title} hint="So erscheint das Dokument in der Übersicht.">
          <TextInput
            value={title}
            invalid={Boolean(errors.title)}
            placeholder="z. B. Festgeldvertrag Bank A"
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kategorie" required error={errors.category}>
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value as DocumentCategory)}
            >
              {documentCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Art des Dokuments" error={errors.docType}>
            <Select value={docType} onChange={(event) => setDocType(event.target.value)}>
              {types.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Zugehörige Festgeldanlage"
          error={errors.accountId}
          hint="Optional – das Dokument erscheint dann zusätzlich bei dieser Anlage."
        >
          <Select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">Keiner Anlage zuordnen</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.bank?.name ?? "Ohne Bank"} · {account.accountNumber}
              </option>
            ))}
          </Select>
        </Field>

        {errors.form && <p className="text-[13px] font-medium text-[var(--danger)]">{errors.form}</p>}
      </div>
    </Modal>
  )
}
