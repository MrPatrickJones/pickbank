"use client"

import { useEffect, useMemo, useState } from "react"

import { Icon } from "@/components/admin/icons"
import { Badge, Button } from "@/components/ui/primitives"
import { Field, Select, TextInput, isDate, isEmail, parseAmount, parseRate } from "@/components/ui/form"
import { FileDrop, Modal, useToast } from "@/components/ui/overlays"
import { formatDate, formatEuro, formatFileSize, formatPercent } from "@/lib/format"
import { addMonths } from "@/lib/finance"
import { useData, type PendingFile } from "@/lib/store"
import { interestPaymentLabels, kycLabels, productLabels } from "@/lib/labels"
import type { DocumentCategory, InterestPayment, KycStatus, ProductType } from "@/lib/types"

const DRAFT_KEY = "ptb.portal.customer-draft.v1"

const steps = [
  { id: 1, title: "Persönliche Daten" },
  { id: 2, title: "Kontaktdaten" },
  { id: 3, title: "Identifikation" },
  { id: 4, title: "Anlage" },
  { id: 5, title: "Dokumente" },
  { id: 6, title: "Übersicht" },
]

type Draft = {
  firstName: string
  lastName: string
  dateOfBirth: string
  nationality: string
  address: string
  postalCode: string
  city: string
  country: string
  email: string
  mobile: string
  phone: string
  customerNumber: string
  identificationType: string
  kycStatus: string
  identifiedAt: string
  productType: ProductType
  principal: string
  currency: string
  interestRate: string
  term: string
  startDate: string
  maturityDate: string
  interestPayment: InterestPayment
  payoutDate: string
  referenceAccount: string
  notes: string
}

const emptyDraft = (customerNumber: string): Draft => ({
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  nationality: "Deutschland",
  address: "",
  postalCode: "",
  city: "",
  country: "Deutschland",
  email: "",
  mobile: "",
  phone: "",
  customerNumber,
  identificationType: "Personalausweis",
  kycStatus: "offen",
  identifiedAt: "",
  productType: "festgeld",
  principal: "",
  currency: "EUR",
  interestRate: "3,25",
  term: "12",
  startDate: "",
  maturityDate: "",
  interestPayment: "endfaellig",
  payoutDate: "",
  referenceAccount: "",
  notes: "",
})

const documentCategories: { value: DocumentCategory; label: string }[] = [
  { value: "identifikation", label: "Ausweisdokument" },
  { value: "vertraege", label: "Vertrag" },
  { value: "anlagebestaetigungen", label: "Anlagebestätigung" },
  { value: "sonstige", label: "Sonstiges Dokument" },
]

export function NewCustomerWizard({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (customerId: string) => void
}) {
  const { createCustomer, nextCustomerNumber } = useData()
  const toast = useToast()

  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(""))
  const [files, setFiles] = useState<PendingFile[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [restored, setRestored] = useState(false)

  // Restore an interrupted entry so nothing is lost on a reload.
  useEffect(() => {
    if (!open) return
    const fallback = emptyDraft(nextCustomerNumber())
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as { draft: Draft; files: PendingFile[]; step: number }
        if (saved?.draft?.lastName || saved?.draft?.firstName) {
          setDraft({ ...fallback, ...saved.draft })
          setFiles(saved.files ?? [])
          setStep(saved.step ?? 1)
          setRestored(true)
          return
        }
      }
    } catch {
      // ignore unreadable drafts
    }
    setDraft(fallback)
    setFiles([])
    setStep(1)
    setRestored(false)
  }, [open, nextCustomerNumber])

  useEffect(() => {
    if (!open) return
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, files, step }))
    } catch {
      // ignore
    }
  }, [open, draft, files, step])

  const set = (key: keyof Draft, value: string) => {
    setDraft((current) => {
      const next = { ...current, [key]: value }
      // Keep the maturity date in sync while the user has not touched it.
      if ((key === "startDate" || key === "term") && next.startDate && next.term) {
        const months = Number(next.term)
        if (Number.isFinite(months) && months > 0 && isDate(next.startDate)) {
          next.maturityDate = addMonths(next.startDate, months)
          next.payoutDate = addMonths(next.startDate, months)
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

  const validateStep = (target: number) => {
    const found: Record<string, string> = {}

    if (target >= 1) {
      if (!draft.firstName.trim()) found.firstName = "Bitte geben Sie den Vornamen ein."
      if (!draft.lastName.trim()) found.lastName = "Bitte geben Sie den Nachnamen ein."
      if (draft.dateOfBirth && !isDate(draft.dateOfBirth)) found.dateOfBirth = "Bitte geben Sie ein gültiges Geburtsdatum ein."
      if (!draft.city.trim()) found.city = "Bitte geben Sie den Ort ein."
    }
    if (target >= 2) {
      if (!isEmail(draft.email)) found.email = "Bitte geben Sie eine gültige E-Mail-Adresse ein."
      if (!draft.mobile.trim() && !draft.phone.trim()) found.mobile = "Bitte hinterlegen Sie mindestens eine Rufnummer."
    }
    if (target >= 3) {
      if (!draft.customerNumber.trim()) found.customerNumber = "Bitte geben Sie eine Kundennummer ein."
      if (draft.identifiedAt && !isDate(draft.identifiedAt)) found.identifiedAt = "Bitte geben Sie ein gültiges Datum ein."
    }
    if (target >= 4 && draft.principal.trim()) {
      const principal = parseAmount(draft.principal)
      const rate = parseRate(draft.interestRate)
      const term = Number(draft.term)
      if (!Number.isFinite(principal) || principal <= 0) found.principal = "Bitte geben Sie einen gültigen Anlagebetrag ein."
      if (!Number.isFinite(rate) || rate < 0 || rate > 25) found.interestRate = "Bitte geben Sie einen gültigen Zinssatz ein."
      if (!Number.isFinite(term) || term <= 0) found.term = "Bitte geben Sie eine gültige Laufzeit ein."
      if (!isDate(draft.startDate)) found.startDate = "Bitte geben Sie ein gültiges Startdatum ein."
      if (!isDate(draft.maturityDate)) found.maturityDate = "Bitte geben Sie ein gültiges Enddatum ein."
      if (isDate(draft.startDate) && isDate(draft.maturityDate) && draft.maturityDate <= draft.startDate) {
        found.maturityDate = "Das Enddatum muss nach dem Startdatum liegen."
      }
      if (!draft.referenceAccount.trim()) found.referenceAccount = "Bitte geben Sie das Referenzkonto an."
    }

    setErrors(found)
    return Object.keys(found).length === 0
  }

  const goNext = () => {
    if (!validateStep(step)) return
    setStep((current) => Math.min(6, current + 1))
  }

  const summary = useMemo(() => {
    const principal = parseAmount(draft.principal)
    const rate = parseRate(draft.interestRate)
    return {
      hasInvestment: draft.principal.trim().length > 0 && Number.isFinite(principal) && principal > 0,
      principal,
      rate,
    }
  }, [draft.principal, draft.interestRate])

  const submit = () => {
    for (const target of [1, 2, 3, 4]) {
      if (!validateStep(target)) {
        setStep(target)
        return
      }
    }

    const customer = createCustomer(
      {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        dateOfBirth: draft.dateOfBirth,
        nationality: draft.nationality,
        address: draft.address.trim(),
        postalCode: draft.postalCode.trim(),
        city: draft.city.trim(),
        country: draft.country,
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        mobile: draft.mobile.trim(),
        status: draft.kycStatus === "geprueft" ? "aktiv" : "pruefung",
        kycStatus: draft.kycStatus as KycStatus,
        identifiedAt: draft.identifiedAt,
        identificationType: draft.identificationType,
        customerNumber: draft.customerNumber.trim(),
      },
      summary.hasInvestment
        ? {
            productType: draft.productType,
            principal: summary.principal,
            interestRate: summary.rate,
            term: Number(draft.term),
            startDate: draft.startDate,
            maturityDate: draft.maturityDate,
            interestPayment: draft.interestPayment,
            payoutDate: draft.payoutDate || draft.maturityDate,
            status: "aktiv",
            referenceAccount: draft.referenceAccount.trim(),
            notes: draft.notes.trim(),
          }
        : undefined,
      files,
    )

    try {
      window.localStorage.removeItem(DRAFT_KEY)
    } catch {
      // ignore
    }

    toast("Kunde wurde erfolgreich angelegt.")
    onCreated(customer.id)
  }

  return (
    <Modal
      open={open}
      size="lg"
      title="Neuen Kunden anlegen"
      subtitle={`Schritt ${step} von 6 · ${steps[step - 1].title}`}
      onClose={onClose}
      footer={
        <>
          {step > 1 && (
            <Button onClick={() => setStep((current) => current - 1)}>
              <Icon name="back" className="h-4 w-4" />
              Zurück
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          {step < 6 ? (
            <Button variant="primary" onClick={goNext}>
              Weiter
            </Button>
          ) : (
            <Button variant="primary" onClick={submit}>
              Kunde erstellen
            </Button>
          )}
        </>
      }
    >
      <ol className="mb-6 flex flex-wrap gap-2">
        {steps.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => (entry.id < step ? setStep(entry.id) : goNext())}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                entry.id === step
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : entry.id < step
                    ? "border-[var(--line)] bg-white text-[var(--body)]"
                    : "border-[var(--line)] bg-white text-[var(--faint)]"
              }`}
            >
              <span className="num">{entry.id}</span>
              <span className="hidden sm:inline">{entry.title}</span>
            </button>
          </li>
        ))}
      </ol>

      {restored && step === 1 && (
        <p className="mb-4 rounded-lg bg-[var(--accent-soft)] px-4 py-2.5 text-[13px] text-[var(--accent)]">
          Ein nicht abgeschlossener Entwurf wurde wiederhergestellt.
        </p>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vorname" required error={errors.firstName}>
            <TextInput value={draft.firstName} invalid={Boolean(errors.firstName)} onChange={(event) => set("firstName", event.target.value)} />
          </Field>
          <Field label="Nachname" required error={errors.lastName}>
            <TextInput value={draft.lastName} invalid={Boolean(errors.lastName)} onChange={(event) => set("lastName", event.target.value)} />
          </Field>
          <Field label="Geburtsdatum" error={errors.dateOfBirth}>
            <TextInput type="date" value={draft.dateOfBirth} invalid={Boolean(errors.dateOfBirth)} onChange={(event) => set("dateOfBirth", event.target.value)} />
          </Field>
          <Field label="Nationalität">
            <TextInput value={draft.nationality} onChange={(event) => set("nationality", event.target.value)} />
          </Field>
          <Field label="Adresse" className="sm:col-span-2">
            <TextInput value={draft.address} placeholder="Straße und Hausnummer" onChange={(event) => set("address", event.target.value)} />
          </Field>
          <Field label="PLZ">
            <TextInput value={draft.postalCode} onChange={(event) => set("postalCode", event.target.value)} />
          </Field>
          <Field label="Ort" required error={errors.city}>
            <TextInput value={draft.city} invalid={Boolean(errors.city)} onChange={(event) => set("city", event.target.value)} />
          </Field>
          <Field label="Land">
            <TextInput value={draft.country} onChange={(event) => set("country", event.target.value)} />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-Mail" required error={errors.email} className="sm:col-span-2">
            <TextInput type="email" value={draft.email} invalid={Boolean(errors.email)} onChange={(event) => set("email", event.target.value)} />
          </Field>
          <Field label="Mobiltelefon" required error={errors.mobile}>
            <TextInput value={draft.mobile} invalid={Boolean(errors.mobile)} onChange={(event) => set("mobile", event.target.value)} />
          </Field>
          <Field label="Telefon">
            <TextInput value={draft.phone} onChange={(event) => set("phone", event.target.value)} />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kundennummer" required error={errors.customerNumber} hint="Vorschlag aus der laufenden Nummernkreis-Vergabe">
            <TextInput value={draft.customerNumber} invalid={Boolean(errors.customerNumber)} onChange={(event) => set("customerNumber", event.target.value)} />
          </Field>
          <Field label="Ausweis-/Identifikationsart">
            <Select value={draft.identificationType} onChange={(event) => set("identificationType", event.target.value)}>
              <option>Personalausweis</option>
              <option>Reisepass</option>
              <option>Aufenthaltstitel</option>
            </Select>
          </Field>
          <Field label="KYC-Status">
            <Select value={draft.kycStatus} onChange={(event) => set("kycStatus", event.target.value)}>
              <option value="offen">Offen</option>
              <option value="eingereicht">Eingereicht</option>
              <option value="geprueft">Geprüft</option>
            </Select>
          </Field>
          <Field label="Identifikationsdatum" error={errors.identifiedAt}>
            <TextInput type="date" value={draft.identifiedAt} invalid={Boolean(errors.identifiedAt)} onChange={(event) => set("identifiedAt", event.target.value)} />
          </Field>
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <p className="sm:col-span-2 text-[13px] text-[var(--muted)]">
            Optional: Lassen Sie den Anlagebetrag leer, um den Kunden ohne Anlage anzulegen.
          </p>
          <Field label="Anlageart">
            <Select value={draft.productType} onChange={(event) => set("productType", event.target.value)}>
              <option value="festgeld">Festgeld</option>
              <option value="tagesgeld">Tagesgeld</option>
              <option value="stufenzins">Stufenzins</option>
            </Select>
          </Field>
          <Field label="Anlagebetrag" error={errors.principal} hint="Eingabe in Euro, z. B. 100.000">
            <TextInput value={draft.principal} inputMode="decimal" invalid={Boolean(errors.principal)} onChange={(event) => set("principal", event.target.value)} />
          </Field>
          <Field label="Währung">
            <Select value={draft.currency} onChange={(event) => set("currency", event.target.value)}>
              <option value="EUR">EUR</option>
            </Select>
          </Field>
          <Field label="Zinssatz (% p. a.)" error={errors.interestRate}>
            <TextInput value={draft.interestRate} inputMode="decimal" invalid={Boolean(errors.interestRate)} onChange={(event) => set("interestRate", event.target.value)} />
          </Field>
          <Field label="Laufzeit (Monate)" error={errors.term}>
            <Select value={draft.term} invalid={Boolean(errors.term)} onChange={(event) => set("term", event.target.value)}>
              {[3, 6, 12, 18, 24, 36, 48, 60].map((months) => (
                <option key={months} value={String(months)}>
                  {months} Monate
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Startdatum" error={errors.startDate}>
            <TextInput type="date" value={draft.startDate} invalid={Boolean(errors.startDate)} onChange={(event) => set("startDate", event.target.value)} />
          </Field>
          <Field label="Enddatum" error={errors.maturityDate} hint="Wird aus Start und Laufzeit vorbelegt">
            <TextInput type="date" value={draft.maturityDate} invalid={Boolean(errors.maturityDate)} onChange={(event) => set("maturityDate", event.target.value)} />
          </Field>
          <Field label="Zinszahlung">
            <Select value={draft.interestPayment} onChange={(event) => set("interestPayment", event.target.value)}>
              <option value="endfaellig">Endfällig</option>
              <option value="jaehrlich">Jährlich</option>
              <option value="quartalsweise">Quartalsweise</option>
              <option value="monatlich">Monatlich</option>
            </Select>
          </Field>
          <Field label="Auszahlungsdatum">
            <TextInput type="date" value={draft.payoutDate} onChange={(event) => set("payoutDate", event.target.value)} />
          </Field>
          <Field label="Referenzkonto (IBAN)" error={errors.referenceAccount} className="sm:col-span-2">
            <TextInput value={draft.referenceAccount} invalid={Boolean(errors.referenceAccount)} onChange={(event) => set("referenceAccount", event.target.value)} />
          </Field>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <FileDrop
            onFiles={(incoming) =>
              setFiles((current) => [
                ...current,
                ...incoming.map((file) => ({ ...file, category: "sonstige" as DocumentCategory })),
              ])
            }
          />
          {files.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">
              Noch keine Dokumente ausgewählt. Ausweisdokument, Vertrag und Anlagebestätigung können auch später ergänzt werden.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--line-soft)] rounded-xl border border-[var(--line)]">
              {files.map((file, index) => (
                <li key={`${file.filename}-${index}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[var(--ink)]">{file.filename}</span>
                  <span className="num text-[12.5px] text-[var(--faint)]">{formatFileSize(file.sizeKb)}</span>
                  <Select
                    value={file.category}
                    className="h-9 w-[190px]"
                    onChange={(event) =>
                      setFiles((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, category: event.target.value as DocumentCategory } : entry,
                        ),
                      )
                    }
                  >
                    {documentCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>
                    Entfernen
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {step === 6 && (
        <div className="space-y-5">
          <SummaryBlock
            title="Persönliche Daten"
            onEdit={() => setStep(1)}
            rows={[
              ["Name", `${draft.firstName} ${draft.lastName}`],
              ["Geburtsdatum", draft.dateOfBirth ? formatDate(draft.dateOfBirth) : "–"],
              ["Nationalität", draft.nationality],
              ["Adresse", [draft.address, `${draft.postalCode} ${draft.city}`.trim(), draft.country].filter(Boolean).join(", ")],
            ]}
          />
          <SummaryBlock
            title="Kontaktdaten"
            onEdit={() => setStep(2)}
            rows={[
              ["E-Mail", draft.email],
              ["Mobiltelefon", draft.mobile || "–"],
              ["Telefon", draft.phone || "–"],
            ]}
          />
          <SummaryBlock
            title="Identifikation"
            onEdit={() => setStep(3)}
            rows={[
              ["Kundennummer", draft.customerNumber],
              ["Ausweisart", draft.identificationType],
              ["KYC-Status", kycLabels[draft.kycStatus as KycStatus]],
              ["Identifiziert am", draft.identifiedAt ? formatDate(draft.identifiedAt) : "–"],
            ]}
          />
          <SummaryBlock
            title="Anlage"
            onEdit={() => setStep(4)}
            rows={
              summary.hasInvestment
                ? [
                    ["Anlageart", productLabels[draft.productType]],
                    ["Betrag", formatEuro(summary.principal)],
                    ["Zinssatz", formatPercent(summary.rate)],
                    ["Laufzeit", `${draft.term} Monate`],
                    ["Zeitraum", `${formatDate(draft.startDate)} – ${formatDate(draft.maturityDate)}`],
                    ["Zinszahlung", interestPaymentLabels[draft.interestPayment]],
                    ["Referenzkonto", draft.referenceAccount],
                  ]
                : [["Anlage", "Keine Anlage erfasst"]]
            }
          />
          <SummaryBlock
            title="Dokumente"
            onEdit={() => setStep(5)}
            rows={files.length ? files.map((file) => [file.filename, formatFileSize(file.sizeKb)]) : [["Dokumente", "Keine Dokumente"]]}
          />
          <p className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
            <Badge tone="info">Prüfen</Badge>
            Nach dem Erstellen wird der Vorgang im Aktivitätsprotokoll festgehalten.
          </p>
        </div>
      )}
    </Modal>
  )
}

function SummaryBlock({
  title,
  rows,
  onEdit,
}: {
  title: string
  rows: (string[] | [string, string])[]
  onEdit: () => void
}) {
  return (
    <section className="rounded-xl border border-[var(--line)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--line-soft)] px-4 py-2.5">
        <h3 className="text-[13.5px] font-semibold text-[var(--ink)]">{title}</h3>
        <Button size="sm" variant="ghost" onClick={onEdit}>
          Ändern
        </Button>
      </header>
      <dl className="grid gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-2">
        {rows.map(([label, value], index) => (
          <div key={`${label}-${index}`} className="flex gap-2 text-[13px]">
            <dt className="text-[var(--muted)]">{label}:</dt>
            <dd className="font-medium text-[var(--ink)]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
