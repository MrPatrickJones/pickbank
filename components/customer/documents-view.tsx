"use client"

import { useMemo, useState } from "react"

import { DocumentRow } from "@/components/customer/investments"
import { DocumentUploadModal } from "@/components/portal/document-upload"
import { ConfirmDialog, useToast } from "@/components/ui/overlays"
import { Button, Card, EmptyState } from "@/components/ui/primitives"
import { ApiRequestError, api } from "@/lib/api"
import { documentCategoryHints, documentCategoryLabels, documentCategoryOptions } from "@/lib/labels"
import type { Account, DocumentCategory, PortalDocument } from "@/lib/types"

/**
 * „Meine Dokumente": nach Kategorien geordnet, mit eigenem Upload. Gelöscht
 * werden dürfen nur selbst hochgeladene Dateien – das setzt der Server durch.
 */
export function CustomerDocuments({
  documents,
  accounts,
  onChanged,
}: {
  documents: PortalDocument[]
  accounts: Account[]
  onChanged: () => Promise<void>
}) {
  const toast = useToast()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [filter, setFilter] = useState<DocumentCategory | "ALL">("ALL")
  const [removeTarget, setRemoveTarget] = useState<PortalDocument | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<DocumentCategory, PortalDocument[]>()
    for (const option of documentCategoryOptions) map.set(option.value, [])
    for (const document of documents) {
      map.get(document.category)?.push(document)
    }
    return map
  }, [documents])

  const visible = documentCategoryOptions.filter((option) => {
    if (filter !== "ALL" && option.value !== filter) return false
    return (grouped.get(option.value)?.length ?? 0) > 0 || filter === option.value
  })

  const remove = async () => {
    if (!removeTarget) return
    try {
      await api.delete(`/api/documents/${removeTarget.id}`)
      toast("Das Dokument wurde gelöscht.")
      await onChanged()
    } catch (caught) {
      toast(
        caught instanceof ApiRequestError ? caught.message : "Das Dokument konnte nicht gelöscht werden.",
        "error",
      )
    } finally {
      setRemoveTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-[var(--ink)]">Meine Dokumente</h2>
          <p className="mt-1 text-[13.5px] text-[var(--muted)]">
            {documents.length === 0
              ? "Noch keine Unterlagen hinterlegt."
              : `${documents.length} ${documents.length === 1 ? "Dokument" : "Dokumente"} in Ihrer Akte.`}
          </p>
        </div>
        <Button variant="primary" onClick={() => setUploadOpen(true)}>
          Dokument hochladen
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "ALL"} onClick={() => setFilter("ALL")}>
          Alle ({documents.length})
        </FilterChip>
        {documentCategoryOptions.map((option) => (
          <FilterChip
            key={option.value}
            active={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label} ({grouped.get(option.value)?.length ?? 0})
          </FilterChip>
        ))}
      </div>

      {documents.length === 0 ? (
        <Card>
          <EmptyState
            title="Noch keine Dokumente"
            hint="Laden Sie Ihren Ausweis oder angeforderte Unterlagen hoch – oder warten Sie auf Dokumente von Pick The Bank."
          />
        </Card>
      ) : (
        visible.map((option) => {
          const entries = grouped.get(option.value) ?? []
          return (
            <Card
              key={option.value}
              title={documentCategoryLabels[option.value]}
              subtitle={documentCategoryHints[option.value]}
            >
              {entries.length === 0 ? (
                <EmptyState title="Keine Dokumente in dieser Kategorie" />
              ) : (
                <ul className="divide-y divide-[var(--line-soft)]">
                  {entries.map((document) => (
                    <DocumentRow key={document.id} document={document} onDelete={setRemoveTarget} />
                  ))}
                </ul>
              )}
            </Card>
          )
        })
      )}

      <DocumentUploadModal
        open={uploadOpen}
        endpoint="/api/me/documents"
        accounts={accounts}
        onClose={() => setUploadOpen(false)}
        onUploaded={async () => {
          toast("Dokument erfolgreich hochgeladen.")
          await onChanged()
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Dokument löschen"
        message={`„${removeTarget?.title}" wird aus Ihrer Akte entfernt. Das lässt sich nicht rückgängig machen.`}
        confirmLabel="Löschen"
        onConfirm={() => void remove()}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
        active
          ? "border-transparent bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
          : "border-[var(--line)] bg-white text-[var(--body)] hover:border-[var(--faint)]"
      }`}
    >
      {children}
    </button>
  )
}
