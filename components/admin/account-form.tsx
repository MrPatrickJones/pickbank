"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/primitives"
import { Field, Select, TextInput, Textarea } from "@/components/ui/form"
import { ConfirmDialog, Modal, useToast } from "@/components/ui/overlays"
import { ApiRequestError, api } from "@/lib/api"
import { formatAmount, formatPercent, parseAmountInput } from "@/lib/format"
import { accountStatusOptions, interestMethodOptions } from "@/lib/labels"
import type { Account } from "@/lib/types"

type FormState = {
  productName: string
  principalAmount: string
  currency: string
  interestRate: string
  termMonths: string
  startDate: string
  maturityDate: string
  status: string
  interestPaymentMethod: string
  payoutDate: string
  referenceAccount: string
  notes: string
}

const toForm = (account?: Account | null): FormState => ({
  productName: account?.productName ?? "Festgeld",
  principalAmount: account ? account.principalAmount.replace(".", ",") : "",
  currency: account?.currency ?? "EUR",
  interestRate: account ? Number(account.interestRate).toFixed(2).replace(".", ",") : "3,25",
  termMonths: String(account?.termMonths ?? 12),
  startDate: account?.startDate ?? "",
  maturityDate: account?.maturityDate ?? "",
  status: account?.status ?? "PENDING",
  interestPaymentMethod: account?.interestPaymentMethod ?? "AT_MATURITY",
  payoutDate: account?.payoutDate ?? "",
  referenceAccount: account?.referenceAccount ?? "",
  notes: account?.notes ?? "",
})

/** Maturity is calculated by the server; this mirrors it for the preview only. */
function addMonths(startISO: string, months: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startISO) || !Number.isFinite(months)) return ""
  const date = new Date(`${startISO}T00:00:00Z`)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, lastDay))
  return date.toISOString().slice(0, 10)
}

export function AccountForm({
  open,
  customerId,
  account,
  onClose,
  onSaved,
}: {
  open: boolean
  customerId: number
  account?: Account | null
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState<FormState>(() => toForm(account))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(toForm(account))
      setErrors({})
    }
  }, [open, account])

  const set = (key: keyof FormState, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === "startDate" || key === "termMonths") {
        const derived = addMonths(next.startDate, Number(next.termMonths))
        if (derived) {
          next.maturityDate = derived
          if (!current.payoutDate || current.payoutDate === current.maturityDate) next.payoutDate = derived
        }
      }
      return next
    })
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const preview = useMemo(() => {
    const principal = Number(parseAmountInput(form.principalAmount))
    const rate = Number(form.interestRate.replace(",", "."))
    const term = Number(form.termMonths)
    if (!Number.isFinite(principal) || !Number.isFinite(rate) || !Number.isFinite(term)) return null
    return ((principal * rate) / 100 / 12) * term
  }, [form.principalAmount, form.interestRate, form.termMonths])

  const payload = () => ({
    productName: form.productName,
    principalAmount: parseAmountInput(form.principalAmount),
    currency: form.currency,
    interestRate: form.interestRate.replace(",", "."),
    termMonths: Number(form.termMonths),
    startDate: form.startDate,
    maturityDate: form.maturityDate || undefined,
    status: form.status,
    interestPaymentMethod: form.interestPaymentMethod,
    payoutDate: form.payoutDate || null,
    referenceAccount: form.referenceAccount || null,
    notes: form.notes || null,
  })

  const save = async () => {
    setBusy(true)
    try {
      if (account) {
        await api.patch(`/api/accounts/${account.id}`, payload())
        toast(`Konto ${account.accountNumber} wurde aktualisiert.`)
      } else {
        await api.post(`/api/customers/${customerId}/accounts`, payload())
        toast("Festgeldkonto wurde angelegt.")
      }
      setConfirm(false)
      onSaved()
      onClose()
    } catch (caught) {
      setConfirm(false)
      if (caught instanceof ApiRequestError) {
        setErrors(Object.keys(caught.details).length ? caught.details : { form: caught.message })
      } else {
        setErrors({ form: "Speichern fehlgeschlagen." })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        size="lg"
        title={account ? `Konto ${account.accountNumber} bearbeiten` : "Neues Festgeldkonto"}
        subtitle="Änderungen werden im Aktivitätsprotokoll festgehalten."
        onClose={onClose}
        footer={
          <>
            <Button onClick={onClose}>Abbrechen</Button>
            <Button variant="primary" disabled={busy} onClick={() => setConfirm(true)}>
              {account ? "Änderungen speichern" : "Konto anlegen"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Produktname" required error={errors.productName}>
            <TextInput value={form.productName} invalid={Boolean(errors.productName)} onChange={(event) => set("productName", event.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => set("status", event.target.value)}>
              {accountStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Anlagebetrag" required error={errors.principalAmount} hint="Eingabe in der gewählten Währung">
            <TextInput
              value={form.principalAmount}
              inputMode="decimal"
              invalid={Boolean(errors.principalAmount)}
              onChange={(event) => set("principalAmount", event.target.value)}
            />
          </Field>
          <Field label="Währung">
            <Select value={form.currency} onChange={(event) => set("currency", event.target.value)}>
              {["EUR", "CHF", "USD", "GBP"].map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Zinssatz (% p. a.)" required error={errors.interestRate}>
            <TextInput
              value={form.interestRate}
              inputMode="decimal"
              invalid={Boolean(errors.interestRate)}
              onChange={(event) => set("interestRate", event.target.value)}
            />
          </Field>
          <Field label="Laufzeit (Monate)" required error={errors.termMonths}>
            <Select value={form.termMonths} invalid={Boolean(errors.termMonths)} onChange={(event) => set("termMonths", event.target.value)}>
              {[3, 6, 12, 18, 24, 36, 48, 60].map((months) => (
                <option key={months} value={String(months)}>
                  {months} Monate
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Startdatum" required error={errors.startDate}>
            <TextInput type="date" value={form.startDate} invalid={Boolean(errors.startDate)} onChange={(event) => set("startDate", event.target.value)} />
          </Field>
          <Field label="Fälligkeitsdatum" error={errors.maturityDate} hint="Wird aus Start und Laufzeit berechnet">
            <TextInput type="date" value={form.maturityDate} invalid={Boolean(errors.maturityDate)} onChange={(event) => set("maturityDate", event.target.value)} />
          </Field>
          <Field label="Zinszahlung">
            <Select value={form.interestPaymentMethod} onChange={(event) => set("interestPaymentMethod", event.target.value)}>
              {interestMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Auszahlungsdatum" error={errors.payoutDate}>
            <TextInput type="date" value={form.payoutDate} invalid={Boolean(errors.payoutDate)} onChange={(event) => set("payoutDate", event.target.value)} />
          </Field>
          <Field label="Referenzkonto (IBAN)" error={errors.referenceAccount} className="sm:col-span-2">
            <TextInput value={form.referenceAccount} invalid={Boolean(errors.referenceAccount)} onChange={(event) => set("referenceAccount", event.target.value)} />
          </Field>
          <Field label="Interne Notizen" className="sm:col-span-2">
            <Textarea rows={3} value={form.notes} onChange={(event) => set("notes", event.target.value)} />
          </Field>
        </div>

        {errors.form && (
          <p role="alert" className="mt-4 rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-[13px] font-medium text-[var(--danger)]">
            {errors.form}
          </p>
        )}

        {preview !== null && Number.isFinite(preview) && (
          <p className="mt-5 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-[13px] text-[var(--body)]">
            Zinsertrag bei Laufzeitende:{" "}
            <strong className="num text-[var(--ink)]">{formatAmount(preview.toFixed(2), form.currency)}</strong>{" "}
            <span className="text-[var(--faint)]">
              ({formatAmount(parseAmountInput(form.principalAmount || "0"), form.currency, 0)} ·{" "}
              {formatPercent(form.interestRate.replace(",", "."))} · {form.termMonths} Monate) — verbindlich berechnet der
              Server.
            </span>
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm}
        title="Änderung speichern"
        message="Möchten Sie diese Änderung wirklich speichern? Der Vorgang wird mit Benutzer, Zeitpunkt sowie altem und neuem Wert protokolliert."
        confirmLabel="Ja, speichern"
        onCancel={() => setConfirm(false)}
        onConfirm={() => void save()}
      />
    </>
  )
}
