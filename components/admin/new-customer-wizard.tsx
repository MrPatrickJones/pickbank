"use client"

import { useEffect, useState } from "react"

import { CredentialsModal } from "@/components/admin/access-card"
import { Icon } from "@/components/admin/icons"
import { Button } from "@/components/ui/primitives"
import { Field, Select, TextInput } from "@/components/ui/form"
import { Modal, useToast } from "@/components/ui/overlays"
import { ApiRequestError, api } from "@/lib/api"
import { formatAmount, formatDate, formatPercent, parseAmountInput } from "@/lib/format"
import { accountStatusOptions, customerStatusOptions, interestMethodOptions, kycStatusOptions } from "@/lib/labels"
import type { Customer } from "@/lib/types"

const DRAFT_KEY = "ptb.customer-draft.v2"

const steps = [
  { id: 1, title: "Kundendaten" },
  { id: 2, title: "Kontakt" },
  { id: 3, title: "Status & Zugang" },
  { id: 4, title: "Festgeldkonto" },
  { id: 5, title: "Übersicht" },
]

type Draft = {
  firstName: string
  lastName: string
  companyName: string
  dateOfBirth: string
  nationality: string
  address: string
  postalCode: string
  city: string
  country: string
  email: string
  mobile: string
  phone: string
  customerStatus: string
  kycStatus: string
  identificationType: string
  identifiedAt: string
  createLogin: boolean
  withAccount: boolean
  productName: string
  principalAmount: string
  currency: string
  interestRate: string
  termMonths: string
  startDate: string
  status: string
  interestPaymentMethod: string
  referenceAccount: string
}

const emptyDraft: Draft = {
  firstName: "",
  lastName: "",
  companyName: "",
  dateOfBirth: "",
  nationality: "Deutschland",
  address: "",
  postalCode: "",
  city: "",
  country: "Deutschland",
  email: "",
  mobile: "",
  phone: "",
  customerStatus: "PENDING",
  kycStatus: "OPEN",
  identificationType: "Personalausweis",
  identifiedAt: "",
  createLogin: true,
  withAccount: true,
  productName: "Festgeld",
  principalAmount: "",
  currency: "EUR",
  interestRate: "3,25",
  termMonths: "12",
  startDate: "",
  status: "PENDING",
  interestPaymentMethod: "AT_MATURITY",
  referenceAccount: "",
}

export function NewCustomerWizard({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (customerId: number) => void
}) {
  const toast = useToast()
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [restored, setRestored] = useState(false)
  const [credentials, setCredentials] = useState<{ email: string; password: string; name: string; id: number } | null>(null)

  // Nothing is lost if the browser reloads mid-entry.
  useEffect(() => {
    if (!open) return
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as { draft: Draft; step: number }
        if (saved?.draft?.lastName || saved?.draft?.firstName) {
          setDraft({ ...emptyDraft, ...saved.draft })
          setStep(saved.step ?? 1)
          setRestored(true)
          return
        }
      }
    } catch {
      // ignore unreadable drafts
    }
    setDraft(emptyDraft)
    setStep(1)
    setRestored(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step }))
    } catch {
      // ignore
    }
  }, [open, draft, step])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key as string]) return current
      const next = { ...current }
      delete next[key as string]
      return next
    })
  }

  const validate = (target: number) => {
    const found: Record<string, string> = {}
    if (target >= 1) {
      if (!draft.firstName.trim()) found.firstName = "Bitte geben Sie den Vornamen ein."
      if (!draft.lastName.trim()) found.lastName = "Bitte geben Sie den Nachnamen ein."
      if (!draft.city.trim()) found.city = "Bitte geben Sie den Ort ein."
      if (!draft.country.trim()) found.country = "Bitte geben Sie das Land ein."
    }
    if (target >= 2) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(draft.email)) {
        found.email = "Bitte geben Sie eine gültige E-Mail-Adresse ein."
      }
      if (!draft.mobile.trim() && !draft.phone.trim()) found.mobile = "Bitte hinterlegen Sie mindestens eine Rufnummer."
    }
    if (target >= 4 && draft.withAccount) {
      const amount = Number(parseAmountInput(draft.principalAmount || "0"))
      const rate = Number(draft.interestRate.replace(",", "."))
      if (!Number.isFinite(amount) || amount <= 0) found.principalAmount = "Bitte geben Sie einen gültigen Anlagebetrag ein."
      if (!Number.isFinite(rate) || rate < 0 || rate > 25) found.interestRate = "Der Zinssatz muss zwischen 0 % und 25 % liegen."
      if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate)) found.startDate = "Bitte geben Sie ein gültiges Startdatum ein."
      if (!draft.referenceAccount.trim()) found.referenceAccount = "Bitte geben Sie das Referenzkonto an."
    }
    setErrors(found)
    return Object.keys(found).length === 0
  }

  const submit = async () => {
    for (const target of [1, 2, 4]) {
      if (!validate(target)) {
        setStep(target)
        return
      }
    }

    setBusy(true)
    try {
      const created = await api.post<{ customer: Customer; login: { email: string; password: string } | null }>(
        "/api/customers",
        {
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
          companyName: draft.companyName || null,
          email: draft.email.trim(),
          phone: draft.phone || null,
          mobile: draft.mobile || null,
          dateOfBirth: draft.dateOfBirth || null,
          address: draft.address || null,
          postalCode: draft.postalCode || null,
          city: draft.city.trim(),
          country: draft.country.trim(),
          nationality: draft.nationality || null,
          customerStatus: draft.customerStatus,
          kycStatus: draft.kycStatus,
          identifiedAt: draft.identifiedAt || null,
          identificationType: draft.identificationType || null,
          createLogin: draft.createLogin,
        },
      )

      if (draft.withAccount) {
        await api.post(`/api/customers/${created.customer.id}/accounts`, {
          productName: draft.productName,
          principalAmount: parseAmountInput(draft.principalAmount),
          currency: draft.currency,
          interestRate: draft.interestRate.replace(",", "."),
          termMonths: Number(draft.termMonths),
          startDate: draft.startDate,
          status: draft.status,
          interestPaymentMethod: draft.interestPaymentMethod,
          referenceAccount: draft.referenceAccount,
        })
      }

      try {
        window.localStorage.removeItem(DRAFT_KEY)
      } catch {
        // ignore
      }

      toast("Kunde wurde erfolgreich angelegt.")

      if (created.login) {
        setCredentials({
          email: created.login.email,
          password: created.login.password,
          name: `${created.customer.firstName} ${created.customer.lastName}`,
          id: created.customer.id,
        })
        return
      }

      onCreated(created.customer.id)
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        if (Object.keys(caught.details).length) {
          setErrors(caught.details)
          if (caught.details.email) setStep(2)
          else if (caught.details.principalAmount || caught.details.interestRate || caught.details.startDate) setStep(4)
        } else {
          setErrors({ form: caught.message })
        }
      } else {
        setErrors({ form: "Der Kunde konnte nicht angelegt werden." })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      size="lg"
      title="Neuen Kunden anlegen"
      subtitle={`Schritt ${step} von 5 · ${steps[step - 1].title}`}
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
          {step < 5 ? (
            <Button
              variant="primary"
              onClick={() => {
                if (validate(step)) setStep((current) => Math.min(5, current + 1))
              }}
            >
              Weiter
            </Button>
          ) : (
            <Button variant="primary" disabled={busy} onClick={() => void submit()}>
              {busy ? "Wird gespeichert …" : "Kunde erstellen"}
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
              onClick={() => (entry.id < step ? setStep(entry.id) : validate(step) && setStep(Math.min(entry.id, step + 1)))}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                entry.id === step
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--line)] bg-white text-[var(--body)]"
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

      {errors.form && (
        <p role="alert" className="mb-4 rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-[13px] font-medium text-[var(--danger)]">
          {errors.form}
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
          <Field label="Firma (optional)">
            <TextInput value={draft.companyName} onChange={(event) => set("companyName", event.target.value)} />
          </Field>
          <Field label="Geburtsdatum">
            <TextInput type="date" value={draft.dateOfBirth} onChange={(event) => set("dateOfBirth", event.target.value)} />
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
          <Field label="Land" required error={errors.country}>
            <TextInput value={draft.country} invalid={Boolean(errors.country)} onChange={(event) => set("country", event.target.value)} />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-Mail" required error={errors.email} className="sm:col-span-2" hint="Zugleich Benutzername des Kundenzugangs">
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
          <Field label="Kundenstatus">
            <Select value={draft.customerStatus} onChange={(event) => set("customerStatus", event.target.value)}>
              {customerStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="KYC-Status">
            <Select value={draft.kycStatus} onChange={(event) => set("kycStatus", event.target.value)}>
              {kycStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ausweisart">
            <Select value={draft.identificationType} onChange={(event) => set("identificationType", event.target.value)}>
              <option>Personalausweis</option>
              <option>Reisepass</option>
              <option>Aufenthaltstitel</option>
            </Select>
          </Field>
          <Field label="Identifikationsdatum">
            <TextInput type="date" value={draft.identifiedAt} onChange={(event) => set("identifiedAt", event.target.value)} />
          </Field>

          <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-sunken)] px-4 py-3.5">
            <input
              type="checkbox"
              checked={draft.createLogin}
              onChange={(event) => set("createLogin", event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
            />
            <span>
              <span className="block text-[13.5px] font-semibold text-[var(--ink)]">Kundenzugang anlegen</span>
              <span className="block text-[12.5px] leading-relaxed text-[var(--muted)]">
                Erstellt den Login mit der E-Mail-Adresse des Kunden. Das Passwort erzeugt der Server und zeigt es nach
                dem Speichern einmalig an. Der Kunde kann seine Daten nur einsehen.
              </span>
            </span>
          </label>
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-sunken)] px-4 py-3.5">
            <input
              type="checkbox"
              checked={draft.withAccount}
              onChange={(event) => set("withAccount", event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
            />
            <span>
              <span className="block text-[13.5px] font-semibold text-[var(--ink)]">Festgeldkonto direkt anlegen</span>
              <span className="block text-[12.5px] text-[var(--muted)]">Fälligkeit berechnet der Server aus Startdatum und Laufzeit.</span>
            </span>
          </label>

          {draft.withAccount && (
            <>
              <Field label="Produktname">
                <TextInput value={draft.productName} onChange={(event) => set("productName", event.target.value)} />
              </Field>
              <Field label="Status">
                <Select value={draft.status} onChange={(event) => set("status", event.target.value)}>
                  {accountStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Anlagebetrag" required error={errors.principalAmount}>
                <TextInput value={draft.principalAmount} inputMode="decimal" invalid={Boolean(errors.principalAmount)} onChange={(event) => set("principalAmount", event.target.value)} />
              </Field>
              <Field label="Währung">
                <Select value={draft.currency} onChange={(event) => set("currency", event.target.value)}>
                  {["EUR", "CHF", "USD", "GBP"].map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Zinssatz (% p. a.)" required error={errors.interestRate}>
                <TextInput value={draft.interestRate} inputMode="decimal" invalid={Boolean(errors.interestRate)} onChange={(event) => set("interestRate", event.target.value)} />
              </Field>
              <Field label="Laufzeit (Monate)" required>
                <Select value={draft.termMonths} onChange={(event) => set("termMonths", event.target.value)}>
                  {[3, 6, 12, 18, 24, 36, 48, 60].map((months) => (
                    <option key={months} value={String(months)}>
                      {months} Monate
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Startdatum" required error={errors.startDate}>
                <TextInput type="date" value={draft.startDate} invalid={Boolean(errors.startDate)} onChange={(event) => set("startDate", event.target.value)} />
              </Field>
              <Field label="Zinszahlung">
                <Select value={draft.interestPaymentMethod} onChange={(event) => set("interestPaymentMethod", event.target.value)}>
                  {interestMethodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Referenzkonto (IBAN)" required error={errors.referenceAccount} className="sm:col-span-2">
                <TextInput value={draft.referenceAccount} invalid={Boolean(errors.referenceAccount)} onChange={(event) => set("referenceAccount", event.target.value)} />
              </Field>
            </>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <SummaryBlock
            title="Kundendaten"
            onEdit={() => setStep(1)}
            rows={[
              ["Name", `${draft.firstName} ${draft.lastName}`],
              ["Firma", draft.companyName || "–"],
              ["Geburtsdatum", draft.dateOfBirth ? formatDate(draft.dateOfBirth) : "–"],
              ["Adresse", [draft.address, `${draft.postalCode} ${draft.city}`.trim(), draft.country].filter(Boolean).join(", ")],
            ]}
          />
          <SummaryBlock
            title="Kontakt"
            onEdit={() => setStep(2)}
            rows={[
              ["E-Mail", draft.email],
              ["Mobiltelefon", draft.mobile || "–"],
              ["Telefon", draft.phone || "–"],
            ]}
          />
          <SummaryBlock
            title="Status & Zugang"
            onEdit={() => setStep(3)}
            rows={[
              ["Kundenstatus", draft.customerStatus],
              ["KYC-Status", draft.kycStatus],
              ["Kundenzugang", draft.createLogin ? `wird angelegt für ${draft.email || "–"}` : "wird nicht angelegt"],
            ]}
          />
          <SummaryBlock
            title="Festgeldkonto"
            onEdit={() => setStep(4)}
            rows={
              draft.withAccount
                ? [
                    ["Produkt", draft.productName],
                    ["Betrag", formatAmount(parseAmountInput(draft.principalAmount || "0"), draft.currency)],
                    ["Zinssatz", formatPercent(draft.interestRate.replace(",", "."))],
                    ["Laufzeit", `${draft.termMonths} Monate`],
                    ["Start", draft.startDate ? formatDate(draft.startDate) : "–"],
                    ["Referenzkonto", draft.referenceAccount || "–"],
                  ]
                : [["Konto", "Kein Konto erfasst"]]
            }
          />
        </div>
      )}

      <CredentialsModal
        open={Boolean(credentials)}
        email={credentials?.email ?? ""}
        password={credentials?.password ?? ""}
        customerName={credentials?.name ?? ""}
        onClose={() => {
          const id = credentials?.id
          setCredentials(null)
          if (id) onCreated(id)
        }}
      />
    </Modal>
  )
}

function SummaryBlock({
  title,
  rows,
  onEdit,
}: {
  title: string
  rows: [string, string][]
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
