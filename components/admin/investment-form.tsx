"use client"

import { useEffect, useMemo, useState } from "react"

import { Button, investmentStatusOptions } from "@/components/ui/primitives"
import { Field, Select, TextInput, Textarea, isDate, parseAmount, parseRate } from "@/components/ui/form"
import { ConfirmDialog, Modal, useToast } from "@/components/ui/overlays"
import { formatEuro, formatPercent } from "@/lib/format"
import { addMonths, interestAtMaturity } from "@/lib/finance"
import { useData } from "@/lib/store"
import type { InterestPayment, Investment, InvestmentStatus, ProductType } from "@/lib/types"

type FormState = {
  productType: ProductType
  principal: string
  currency: string
  interestRate: string
  term: string
  startDate: string
  maturityDate: string
  interestPayment: InterestPayment
  payoutDate: string
  status: InvestmentStatus
  referenceAccount: string
  notes: string
}

const toForm = (investment?: Investment | null): FormState => ({
  productType: investment?.productType ?? "festgeld",
  principal: investment ? String(investment.principal).replace(".", ",") : "",
  currency: "EUR",
  interestRate: investment ? String(investment.interestRate).replace(".", ",") : "3,25",
  term: String(investment?.term ?? 12),
  startDate: investment?.startDate ?? "",
  maturityDate: investment?.maturityDate ?? "",
  interestPayment: investment?.interestPayment ?? "endfaellig",
  payoutDate: investment?.payoutDate ?? "",
  status: investment?.status ?? "aktiv",
  referenceAccount: investment?.referenceAccount ?? "",
  notes: investment?.notes ?? "",
})

export function InvestmentForm({
  open,
  customerId,
  investment,
  onClose,
}: {
  open: boolean
  customerId: string
  investment?: Investment | null
  onClose: () => void
}) {
  const { createInvestment, updateInvestment } = useData()
  const toast = useToast()

  const [form, setForm] = useState<FormState>(() => toForm(investment))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(toForm(investment))
      setErrors({})
    }
  }, [open, investment])

  const set = (key: keyof FormState, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value } as FormState
      if ((key === "startDate" || key === "term") && next.startDate && isDate(next.startDate)) {
        const months = Number(next.term)
        if (Number.isFinite(months) && months > 0) {
          next.maturityDate = addMonths(next.startDate, months)
          if (!current.payoutDate || current.payoutDate === current.maturityDate) next.payoutDate = next.maturityDate
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

  const parsed = useMemo(
    () => ({ principal: parseAmount(form.principal), rate: parseRate(form.interestRate), term: Number(form.term) }),
    [form.principal, form.interestRate, form.term],
  )

  const preview = useMemo(() => {
    if (!Number.isFinite(parsed.principal) || !Number.isFinite(parsed.rate) || !Number.isFinite(parsed.term)) return null
    return interestAtMaturity({
      principal: parsed.principal,
      interestRate: parsed.rate,
      term: parsed.term,
    } as Investment)
  }, [parsed])

  const validate = () => {
    const found: Record<string, string> = {}
    if (!Number.isFinite(parsed.principal) || parsed.principal <= 0) {
      found.principal = "Bitte geben Sie einen gültigen Anlagebetrag ein."
    }
    if (!Number.isFinite(parsed.rate) || parsed.rate < 0 || parsed.rate > 25) {
      found.interestRate = "Bitte geben Sie einen gültigen Zinssatz ein."
    }
    if (!Number.isFinite(parsed.term) || parsed.term <= 0) found.term = "Bitte geben Sie eine gültige Laufzeit ein."
    if (!isDate(form.startDate)) found.startDate = "Bitte geben Sie ein gültiges Startdatum ein."
    if (!isDate(form.maturityDate)) found.maturityDate = "Bitte geben Sie ein gültiges Enddatum ein."
    if (isDate(form.startDate) && isDate(form.maturityDate) && form.maturityDate <= form.startDate) {
      found.maturityDate = "Das Enddatum muss nach dem Startdatum liegen."
    }
    if (form.payoutDate && isDate(form.maturityDate) && form.payoutDate < form.maturityDate) {
      found.payoutDate = "Die Auszahlung darf nicht vor dem Enddatum liegen."
    }
    if (!form.referenceAccount.trim()) found.referenceAccount = "Bitte geben Sie das Referenzkonto an."
    setErrors(found)
    return Object.keys(found).length === 0
  }

  const save = () => {
    const payload = {
      productType: form.productType,
      principal: parsed.principal,
      interestRate: parsed.rate,
      term: parsed.term,
      startDate: form.startDate,
      maturityDate: form.maturityDate,
      interestPayment: form.interestPayment,
      payoutDate: form.payoutDate || form.maturityDate,
      status: form.status,
      referenceAccount: form.referenceAccount.trim(),
      notes: form.notes.trim(),
    }

    if (investment) {
      updateInvestment(investment.id, payload)
      toast(`Anlage ${investment.investmentNumber} wurde aktualisiert.`)
    } else {
      const created = createInvestment(customerId, payload)
      toast(`Anlage ${created.investmentNumber} wurde angelegt.`)
    }
    setConfirm(false)
    onClose()
  }

  return (
    <>
      <Modal
        open={open}
        size="lg"
        title={investment ? `Anlage ${investment.investmentNumber} bearbeiten` : "Neue Anlage erfassen"}
        subtitle="Änderungen werden im Aktivitätsprotokoll festgehalten."
        onClose={onClose}
        footer={
          <>
            <Button onClick={onClose}>Abbrechen</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (validate()) setConfirm(true)
              }}
            >
              {investment ? "Änderungen speichern" : "Anlage anlegen"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Anlageart">
            <Select value={form.productType} onChange={(event) => set("productType", event.target.value)}>
              <option value="festgeld">Festgeld</option>
              <option value="tagesgeld">Tagesgeld</option>
              <option value="stufenzins">Stufenzins</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => set("status", event.target.value)}>
              {investmentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Anlagebetrag" required error={errors.principal} hint="Eingabe in Euro">
            <TextInput value={form.principal} inputMode="decimal" invalid={Boolean(errors.principal)} onChange={(event) => set("principal", event.target.value)} />
          </Field>
          <Field label="Währung">
            <Select value={form.currency} onChange={(event) => set("currency", event.target.value)}>
              <option value="EUR">EUR</option>
            </Select>
          </Field>
          <Field label="Zinssatz (% p. a.)" required error={errors.interestRate}>
            <TextInput value={form.interestRate} inputMode="decimal" invalid={Boolean(errors.interestRate)} onChange={(event) => set("interestRate", event.target.value)} />
          </Field>
          <Field label="Laufzeit (Monate)" required error={errors.term}>
            <Select value={form.term} invalid={Boolean(errors.term)} onChange={(event) => set("term", event.target.value)}>
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
          <Field label="Enddatum" required error={errors.maturityDate} hint="Wird aus Start und Laufzeit vorbelegt">
            <TextInput type="date" value={form.maturityDate} invalid={Boolean(errors.maturityDate)} onChange={(event) => set("maturityDate", event.target.value)} />
          </Field>
          <Field label="Zinszahlung">
            <Select value={form.interestPayment} onChange={(event) => set("interestPayment", event.target.value)}>
              <option value="endfaellig">Endfällig</option>
              <option value="jaehrlich">Jährlich</option>
              <option value="quartalsweise">Quartalsweise</option>
              <option value="monatlich">Monatlich</option>
            </Select>
          </Field>
          <Field label="Auszahlungsdatum" error={errors.payoutDate}>
            <TextInput type="date" value={form.payoutDate} invalid={Boolean(errors.payoutDate)} onChange={(event) => set("payoutDate", event.target.value)} />
          </Field>
          <Field label="Referenzkonto (IBAN)" required error={errors.referenceAccount} className="sm:col-span-2">
            <TextInput value={form.referenceAccount} invalid={Boolean(errors.referenceAccount)} onChange={(event) => set("referenceAccount", event.target.value)} />
          </Field>
          <Field label="Interne Notizen" className="sm:col-span-2">
            <Textarea rows={3} value={form.notes} onChange={(event) => set("notes", event.target.value)} />
          </Field>
        </div>

        {preview !== null && Number.isFinite(preview) && (
          <p className="mt-5 rounded-xl bg-[var(--surface-sunken)] px-4 py-3 text-[13px] text-[var(--body)]">
            Zinsertrag bei Laufzeitende:{" "}
            <strong className="num text-[var(--ink)]">{formatEuro(preview)}</strong>{" "}
            <span className="text-[var(--faint)]">
              ({formatEuro(parsed.principal, 0)} · {formatPercent(parsed.rate)} · {parsed.term} Monate)
            </span>
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm}
        title="Änderung speichern"
        message="Möchten Sie diese Änderung wirklich speichern? Der Vorgang wird mit Benutzer und Zeitpunkt protokolliert."
        confirmLabel="Ja, speichern"
        onCancel={() => setConfirm(false)}
        onConfirm={save}
      />
    </>
  )
}
