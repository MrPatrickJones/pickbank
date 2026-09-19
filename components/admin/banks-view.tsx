"use client"

import { useEffect, useState } from "react"

import { Field, Select, TextInput, Textarea } from "@/components/ui/form"
import { ConfirmDialog, FileDrop, Modal, useToast } from "@/components/ui/overlays"
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SearchInput,
  Table,
  cell,
  cellRight,
  cellStrong,
  rowClass,
} from "@/components/ui/primitives"
import { ApiRequestError, api, buildQuery } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { useSession } from "@/lib/session"
import { useResource } from "@/lib/use-resource"
import type { Bank } from "@/lib/types"

/**
 * Banken werden einmal zentral gepflegt. Jede Festgeldanlage verweist darauf,
 * deshalb ändert eine Korrektur hier alle betroffenen Anlagen zugleich.
 */
export function BanksView() {
  const { can } = useSession()
  const toast = useToast()
  const writable = can("banks.write")

  const [search, setSearch] = useState("")
  const [formState, setFormState] = useState<{ open: boolean; bank: Bank | null }>({ open: false, bank: null })
  const [removeTarget, setRemoveTarget] = useState<Bank | null>(null)

  const { data, loading, error, reload } = useResource<{ banks: Bank[] }>(
    () => api.get<{ banks: Bank[] }>(`/api/banks${buildQuery({ search })}`),
    [search],
  )

  const banks = data?.banks ?? []

  const remove = async () => {
    if (!removeTarget) return
    try {
      await api.delete(`/api/banks/${removeTarget.id}`)
      toast("Die Bank wurde entfernt.")
      await reload()
    } catch (caught) {
      toast(caught instanceof ApiRequestError ? caught.message : "Die Bank konnte nicht entfernt werden.", "error")
    } finally {
      setRemoveTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Banken"
        subtitle="Partnerbanken mit Logo, Sitz und Bankdaten – Grundlage jeder Festgeldanlage."
        actions={
          writable ? (
            <Button variant="primary" onClick={() => setFormState({ open: true, bank: null })}>
              Neue Bank
            </Button>
          ) : null
        }
      />

      <Card>
        <div className="border-b border-[var(--line-soft)] px-5 py-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Name, Land oder BIC" />
        </div>

        {loading && !data && <LoadingState />}
        {error && <ErrorState message={error} onRetry={reload} />}

        {data && banks.length === 0 && (
          <EmptyState
            title="Keine Bank hinterlegt"
            hint="Legen Sie zuerst eine Bank an, bevor Sie eine Festgeldanlage erfassen."
          />
        )}

        {data && banks.length > 0 && (
          <Table
            minWidth={880}
            headers={[
              "Bank",
              "Sitz",
              "BIC",
              "Website",
              { label: "Anlagen", align: "right" },
              { label: "", align: "right" },
            ]}
          >
            {banks.map((bank) => (
              <tr key={bank.id} className={rowClass}>
                <td className={cellStrong}>
                  <span className="flex items-center gap-3">
                    <BankLogo bank={bank} />
                    <span>
                      {bank.name}
                      {bank.legalName && (
                        <span className="block text-[12px] font-normal text-[var(--faint)]">{bank.legalName}</span>
                      )}
                    </span>
                  </span>
                </td>
                <td className={cell}>
                  {[bank.city, bank.country].filter(Boolean).join(", ") || "–"}
                </td>
                <td className={`${cell} num`}>{bank.bic ?? "–"}</td>
                <td className={cell}>
                  {bank.website ? (
                    <a
                      href={bank.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline"
                    >
                      {bank.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    "–"
                  )}
                </td>
                <td className={cellRight}>{bank.accountCount ?? 0}</td>
                <td className={`${cell} whitespace-nowrap text-right`}>
                  {writable && (
                    <>
                      <Button size="sm" onClick={() => setFormState({ open: true, bank })}>
                        Bearbeiten
                      </Button>
                      <Button size="sm" variant="ghost" className="ml-2" onClick={() => setRemoveTarget(bank)}>
                        Entfernen
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <BankForm
        open={formState.open}
        bank={formState.bank}
        onClose={() => setFormState({ open: false, bank: null })}
        onSaved={async () => {
          await reload()
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Bank entfernen"
        message={`„${removeTarget?.name}" wird aus der Auswahl entfernt. Banken mit laufenden Anlagen bleiben bestehen.`}
        confirmLabel="Entfernen"
        onConfirm={() => void remove()}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}

export function BankLogo({ bank, size = 32 }: { bank: { name: string; logoUrl: string | null }; size?: number }) {
  if (bank.logoUrl) {
    return (
      // Das Logo kommt aus der geschützten API, nicht aus dem öffentlichen Verzeichnis.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={bank.logoUrl}
        alt=""
        style={{ height: size, maxWidth: size * 3.5 }}
        className="w-auto flex-none object-contain"
      />
    )
  }
  return (
    <span
      style={{ height: size, width: size }}
      className="grid flex-none place-items-center rounded-md border border-[var(--line)] bg-white text-[11px] font-semibold text-[var(--muted)]"
    >
      {bank.name.slice(0, 2).toUpperCase()}
    </span>
  )
}

type FormState = {
  name: string
  legalName: string
  country: string
  city: string
  address: string
  postalCode: string
  website: string
  bic: string
  notes: string
}

const COUNTRIES = [
  "Deutschland",
  "Österreich",
  "Schweiz",
  "Frankreich",
  "Italien",
  "Niederlande",
  "Belgien",
  "Luxemburg",
  "Spanien",
  "Portugal",
  "Schweden",
  "Norwegen",
  "Dänemark",
  "Finnland",
  "Irland",
  "Polen",
  "Tschechien",
]

const toForm = (bank?: Bank | null): FormState => ({
  name: bank?.name ?? "",
  legalName: bank?.legalName ?? "",
  country: bank?.country ?? "Deutschland",
  city: bank?.city ?? "",
  address: bank?.address ?? "",
  postalCode: bank?.postalCode ?? "",
  website: bank?.website ?? "",
  bic: bank?.bic ?? "",
  notes: bank?.notes ?? "",
})

function BankForm({
  open,
  bank,
  onClose,
  onSaved,
}: {
  open: boolean
  bank: Bank | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const toast = useToast()
  const [form, setForm] = useState<FormState>(() => toForm(bank))
  const [logo, setLogo] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(toForm(bank))
    setLogo(null)
    setErrors({})
  }, [open, bank])

  const set = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const save = async () => {
    setBusy(true)
    setErrors({})
    try {
      const payload = {
        name: form.name,
        legalName: form.legalName || null,
        country: form.country,
        city: form.city || null,
        address: form.address || null,
        postalCode: form.postalCode || null,
        website: form.website || null,
        bic: form.bic || null,
        notes: form.notes || null,
      }

      const id = bank
        ? (await api.patch<{ bank: Bank }>(`/api/banks/${bank.id}`, payload)).bank.id
        : (await api.post<{ id: number }>("/api/banks", payload)).id

      if (logo) {
        const data = new FormData()
        data.set("file", logo)
        await api.upload(`/api/banks/${id}/logo`, data)
      }

      toast(bank ? "Die Bank wurde aktualisiert." : "Die Bank wurde angelegt.")
      await onSaved()
      onClose()
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setErrors(Object.keys(caught.details).length ? caught.details : { form: caught.message })
      } else {
        setErrors({ form: "Die Bank konnte nicht gespeichert werden." })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      size="lg"
      title={bank ? `${bank.name} bearbeiten` : "Neue Bank"}
      subtitle="Diese Angaben sehen Kunden an jeder Anlage dieser Bank."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" disabled={busy} onClick={() => void save()}>
            {busy ? "Wird gespeichert …" : bank ? "Änderungen speichern" : "Bank anlegen"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required error={errors.name} className="sm:col-span-2">
          <TextInput
            value={form.name}
            invalid={Boolean(errors.name)}
            placeholder="z. B. Beispiel Bank AG"
            onChange={(event) => set("name", event.target.value)}
          />
        </Field>

        <Field label="Firmierung" error={errors.legalName} className="sm:col-span-2">
          <TextInput value={form.legalName} onChange={(event) => set("legalName", event.target.value)} />
        </Field>

        <Field label="Land" required error={errors.country}>
          <Select value={form.country} onChange={(event) => set("country", event.target.value)}>
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Sitz" error={errors.city}>
          <TextInput value={form.city} onChange={(event) => set("city", event.target.value)} />
        </Field>

        <Field label="Adresse" error={errors.address}>
          <TextInput value={form.address} onChange={(event) => set("address", event.target.value)} />
        </Field>

        <Field label="PLZ" error={errors.postalCode}>
          <TextInput value={form.postalCode} onChange={(event) => set("postalCode", event.target.value)} />
        </Field>

        <Field label="Website" error={errors.website} hint="Mit https://">
          <TextInput
            value={form.website}
            invalid={Boolean(errors.website)}
            placeholder="https://www.bank.de"
            onChange={(event) => set("website", event.target.value)}
          />
        </Field>

        <Field label="BIC / SWIFT" error={errors.bic}>
          <TextInput
            value={form.bic}
            invalid={Boolean(errors.bic)}
            onChange={(event) => set("bic", event.target.value.toUpperCase())}
          />
        </Field>

        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-[12.5px] font-semibold text-[var(--body)]">Logo</span>
          {bank?.logoUrl && !logo && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white px-4 py-3">
              <BankLogo bank={bank} />
              <span className="text-[13px] text-[var(--muted)]">Aktuelles Logo</span>
            </div>
          )}
          <FileDrop
            accept=".png,.jpg,.jpeg,.webp,.svg"
            hint="PNG, JPG, WEBP oder SVG bis 2 MB"
            onFiles={(files) => setLogo(files[0] ?? null)}
          />
          {logo && (
            <p className="mt-2 text-[13px] text-[var(--body)]">
              Ausgewählt: <strong className="text-[var(--ink)]">{logo.name}</strong>
            </p>
          )}
          {errors.file && <p className="mt-2 text-[13px] font-medium text-[var(--danger)]">{errors.file}</p>}
        </div>

        <Field label="Interne Notizen" className="sm:col-span-2">
          <Textarea rows={3} value={form.notes} onChange={(event) => set("notes", event.target.value)} />
        </Field>
      </div>

      {bank && (
        <p className="mt-4 text-[12.5px] text-[var(--faint)]">
          Angelegt am {formatDate(bank.createdAt.slice(0, 10))} · {bank.accountCount ?? 0} zugeordnete Anlagen
        </p>
      )}

      {errors.form && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-[13px] font-medium text-[var(--danger)]"
        >
          {errors.form}
        </p>
      )}
    </Modal>
  )
}
