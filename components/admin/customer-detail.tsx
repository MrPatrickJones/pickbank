"use client"

import { useEffect, useMemo, useState } from "react"

import { Icon } from "@/components/admin/icons"
import { InvestmentForm } from "@/components/admin/investment-form"
import {
  Badge,
  Button,
  Card,
  CustomerStatusBadge,
  EmptyState,
  InvestmentStatusBadge,
  Kpi,
  KycBadge,
  Table,
  Tabs,
  cell,
  cellRight,
  cellStrong,
  customerStatusOptions,
  kycStatusOptions,
  rowClass,
} from "@/components/ui/primitives"
import { Field, Select, TextInput, Textarea, isEmail } from "@/components/ui/form"
import { ConfirmDialog, FileDrop, Modal, useToast } from "@/components/ui/overlays"
import { formatDate, formatDateTime, formatEuro, formatFileSize, formatPercent, initialsOf } from "@/lib/format"
import { currentValue, customerTotals, effectiveStatus } from "@/lib/finance"
import { useData } from "@/lib/store"
import { useSession } from "@/lib/session"
import { documentCategoryLabels as categoryLabels, kycLabels, productLabels } from "@/lib/labels"
import type { Customer, DocumentCategory, Investment } from "@/lib/types"



export function CustomerDetail({ customerId, onBack }: { customerId: string; onBack: () => void }) {
  const { customerById, investmentsOf, documentsOf, activitiesOf, messagesOf, updateCustomer, addDocument, removeDocument, sendMessage } =
    useData()
  const { can } = useSession()
  const toast = useToast()

  const [tab, setTab] = useState("overview")
  const [editPersonal, setEditPersonal] = useState(false)
  const [editContact, setEditContact] = useState(false)
  const [editStatus, setEditStatus] = useState(false)
  const [investmentForm, setInvestmentForm] = useState<{ open: boolean; investment: Investment | null }>({
    open: false,
    investment: null,
  })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)

  const customer = customerById(customerId)
  const investments = useMemo(() => investmentsOf(customerId), [investmentsOf, customerId])
  const documents = useMemo(() => documentsOf(customerId), [documentsOf, customerId])
  const activities = useMemo(() => activitiesOf(customerId), [activitiesOf, customerId])
  const messages = useMemo(() => messagesOf(customerId), [messagesOf, customerId])
  const totals = useMemo(() => customerTotals(investments), [investments])

  if (!customer) {
    return (
      <Card>
        <EmptyState title="Kunde nicht gefunden" hint="Der Datensatz wurde möglicherweise gelöscht." />
      </Card>
    )
  }

  const writable = can("customers.write")

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
        <Icon name="back" className="h-4 w-4" />
        Zurück zur Kundenliste
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--navy)] text-[16px] font-semibold text-white">
            {initialsOf(customer.firstName, customer.lastName)}
          </span>
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-[var(--ink)]">
              {customer.firstName} {customer.lastName}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-[var(--muted)]">
              <span className="num">Kundennummer: {customer.customerNumber}</span>
              <CustomerStatusBadge status={customer.status} />
              <KycBadge status={customer.kycStatus} />
            </div>
          </div>
        </div>

        {writable && (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setEditStatus(true)}>Bearbeiten</Button>
            <Button onClick={() => setInvestmentForm({ open: true, investment: null })}>Neue Anlage</Button>
            <Button onClick={() => setUploadOpen(true)}>Dokument hochladen</Button>
            <Button variant="primary" onClick={() => setMessageOpen(true)}>
              Nachricht senden
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Gesamtanlage" value={formatEuro(totals.principal, 0)} tone="accent" hint={`${investments.length} Verträge`} />
        <Kpi label="Aktive Anlagen" value={String(totals.activeCount)} hint={`Ø ${formatPercent(totals.averageRate)}`} />
        <Kpi label="Zinserträge bisher" value={formatEuro(totals.interest)} tone="good" hint={`${formatEuro(totals.expectedInterest)} bei Laufzeitende`} />
        <Kpi label="Nächste Fälligkeit" value={totals.nextMaturity ? formatDate(totals.nextMaturity) : "–"} hint="nächste auslaufende Anlage" />
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Übersicht" },
          { id: "investments", label: "Anlagen", count: investments.length },
          { id: "documents", label: "Dokumente", count: documents.length },
          { id: "activities", label: "Aktivitäten", count: activities.length },
          { id: "messages", label: "Nachrichten", count: messages.length },
        ]}
      />

      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card
            title="Persönliche Informationen"
            action={writable ? <Button size="sm" onClick={() => setEditPersonal(true)}>Bearbeiten</Button> : null}
          >
            <DefinitionList
              rows={[
                ["Vorname", customer.firstName],
                ["Nachname", customer.lastName],
                ["Geburtsdatum", customer.dateOfBirth ? formatDate(customer.dateOfBirth) : "–"],
                ["Nationalität", customer.nationality],
                ["Adresse", `${customer.address}, ${customer.postalCode} ${customer.city}, ${customer.country}`],
              ]}
            />
          </Card>

          <Card title="Kontakt" action={writable ? <Button size="sm" onClick={() => setEditContact(true)}>Bearbeiten</Button> : null}>
            <DefinitionList
              rows={[
                ["E-Mail", customer.email],
                ["Mobiltelefon", customer.mobile || "–"],
                ["Telefon", customer.phone || "–"],
              ]}
            />
          </Card>

          <Card title="Identifikation & Status">
            <DefinitionList
              rows={[
                ["Ausweisart", customer.identificationType],
                ["KYC-Status", kycLabels[customer.kycStatus]],
                ["Identifiziert am", customer.identifiedAt ? formatDate(customer.identifiedAt) : "–"],
                ["Kunde seit", formatDate(customer.createdAt.slice(0, 10))],
                ["Zuletzt aktualisiert", formatDateTime(customer.updatedAt)],
              ]}
            />
          </Card>

          <Card title="Letzte Aktivitäten">
            {activities.length === 0 ? (
              <EmptyState title="Noch keine Aktivitäten" />
            ) : (
              <ul className="divide-y divide-[var(--line-soft)]">
                {activities.slice(0, 5).map((activity) => (
                  <li key={activity.id} className="px-5 py-3">
                    <div className="num text-[12px] text-[var(--faint)]">{formatDateTime(activity.timestamp)}</div>
                    <div className="mt-0.5 text-[13.5px] text-[var(--body)]">{activity.description}</div>
                    <div className="text-[12px] text-[var(--faint)]">{activity.user}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "investments" && (
        <Card
          title="Meine Anlagen"
          subtitle="Alle Festgeld- und Tagesgeldverträge dieses Kunden"
          action={writable ? <Button size="sm" variant="primary" onClick={() => setInvestmentForm({ open: true, investment: null })}>Neue Anlage</Button> : null}
        >
          {investments.length === 0 ? (
            <EmptyState title="Keine Anlagen erfasst" hint="Legen Sie die erste Anlage für diesen Kunden an." />
          ) : (
            <Table
              minWidth={980}
              headers={[
                "Anlage",
                { label: "Betrag", align: "right" },
                { label: "Zinssatz", align: "right" },
                "Laufzeit",
                "Start",
                "Fälligkeit",
                { label: "Aktueller Wert", align: "right" },
                "Status",
                { label: "", align: "right" },
              ]}
            >
              {investments.map((investment) => (
                <tr key={investment.id} className={rowClass}>
                  <td className={cellStrong}>
                    <span className="num">{investment.investmentNumber}</span>
                    <div className="text-[12px] font-normal text-[var(--faint)]">{productLabels[investment.productType]}</div>
                  </td>
                  <td className={cellRight}>{formatEuro(investment.principal, 0)}</td>
                  <td className={cellRight}>{formatPercent(investment.interestRate)}</td>
                  <td className={cell}>{investment.term} Monate</td>
                  <td className={`${cell} num`}>{formatDate(investment.startDate)}</td>
                  <td className={`${cell} num`}>{formatDate(investment.maturityDate)}</td>
                  <td className={cellRight}>{formatEuro(currentValue(investment))}</td>
                  <td className={cell}>
                    <InvestmentStatusBadge status={effectiveStatus(investment)} />
                  </td>
                  <td className={`${cell} text-right`}>
                    {writable && (
                      <Button size="sm" onClick={() => setInvestmentForm({ open: true, investment })}>
                        Bearbeiten
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === "documents" && (
        <Card
          title="Dokumente"
          subtitle="Identifikation, Verträge, Bestätigungen und Kommunikation"
          action={writable ? <Button size="sm" onClick={() => setUploadOpen(true)}>Hochladen</Button> : null}
        >
          {documents.length === 0 ? (
            <EmptyState title="Keine Dokumente" hint="Laden Sie Ausweis, Vertrag oder Anlagebestätigung hoch." />
          ) : (
            <Table
              minWidth={760}
              headers={["Dateiname", "Kategorie", "Hochgeladen", "Hochgeladen von", { label: "Größe", align: "right" }, { label: "", align: "right" }]}
            >
              {documents.map((document) => (
                <tr key={document.id} className={rowClass}>
                  <td className={cellStrong}>{document.filename}</td>
                  <td className={cell}>{categoryLabels[document.category]}</td>
                  <td className={`${cell} num`}>{formatDate(document.uploadedAt.slice(0, 10))}</td>
                  <td className={cell}>{document.uploadedBy}</td>
                  <td className={cellRight}>{formatFileSize(document.sizeKb)}</td>
                  <td className={`${cell} text-right`}>
                    <div className="inline-flex gap-2">
                      <Button size="sm" onClick={() => toast("Vorschau ist im Prototyp nicht hinterlegt.", "info")}>
                        Vorschau
                      </Button>
                      {writable && (
                        <Button size="sm" variant="ghost" onClick={() => setRemoveTarget(document.id)}>
                          Löschen
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === "activities" && (
        <Card title="Aktivitätsprotokoll" subtitle="Unveränderbare Historie aller Änderungen an diesem Kunden">
          {activities.length === 0 ? (
            <EmptyState title="Noch keine Aktivitäten" />
          ) : (
            <ul className="divide-y divide-[var(--line-soft)]">
              {activities.map((activity) => (
                <li key={activity.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="num text-[12.5px] font-semibold text-[var(--ink)]">{formatDateTime(activity.timestamp)}</span>
                    <span className="text-[12.5px] text-[var(--faint)]">{activity.user}</span>
                  </div>
                  <p className="mt-1 text-[13.5px] text-[var(--body)]">{activity.description}</p>
                  {(activity.previousValue || activity.newValue) && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px]">
                      {activity.previousValue && <span className="rounded bg-[var(--surface-sunken)] px-2 py-0.5 text-[var(--muted)] line-through">{activity.previousValue}</span>}
                      {activity.newValue && <span className="rounded bg-[var(--good-soft)] px-2 py-0.5 font-semibold text-[var(--good)]">{activity.newValue}</span>}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "messages" && (
        <Card
          title="Nachrichten"
          subtitle="Mitteilungen an den Kunden"
          action={writable ? <Button size="sm" variant="primary" onClick={() => setMessageOpen(true)}>Nachricht senden</Button> : null}
        >
          {messages.length === 0 ? (
            <EmptyState title="Keine Nachrichten" hint="Senden Sie dem Kunden die erste Mitteilung." />
          ) : (
            <ul className="divide-y divide-[var(--line-soft)]">
              {messages.map((message) => (
                <li key={message.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[13.5px] font-semibold text-[var(--ink)]">{message.subject}</span>
                    <span className="num text-[12.5px] text-[var(--faint)]">{formatDateTime(message.sentAt)}</span>
                  </div>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--body)]">{message.body}</p>
                  <p className="mt-1.5 flex items-center gap-2 text-[12px] text-[var(--faint)]">
                    {message.sentBy}
                    {!message.read && <Badge tone="info">Ungelesen</Badge>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* --- Modals --- */}
      <EditPersonalModal open={editPersonal} customer={customer} onClose={() => setEditPersonal(false)} onSave={(patch) => { updateCustomer(customer.id, patch); toast("Persönliche Daten wurden gespeichert.") }} />
      <EditContactModal open={editContact} customer={customer} onClose={() => setEditContact(false)} onSave={(patch) => { updateCustomer(customer.id, patch); toast("Kontaktdaten wurden gespeichert.") }} />
      <EditStatusModal open={editStatus} customer={customer} onClose={() => setEditStatus(false)} onSave={(patch) => { updateCustomer(customer.id, patch); toast("Status wurde aktualisiert.") }} />

      <InvestmentForm
        open={investmentForm.open}
        customerId={customer.id}
        investment={investmentForm.investment}
        onClose={() => setInvestmentForm({ open: false, investment: null })}
      />

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={(file) => {
          addDocument(customer.id, file)
          toast(`„${file.filename}“ wurde hochgeladen.`)
          setUploadOpen(false)
        }}
      />

      <MessageModal
        open={messageOpen}
        customerName={`${customer.firstName} ${customer.lastName}`}
        onClose={() => setMessageOpen(false)}
        onSend={(subject, body) => {
          sendMessage(customer.id, subject, body)
          toast("Nachricht wurde versendet.")
          setMessageOpen(false)
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Dokument löschen"
        message="Möchten Sie dieses Dokument wirklich löschen? Der Vorgang wird protokolliert."
        confirmLabel="Löschen"
        tone="danger"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) {
            removeDocument(removeTarget)
            toast("Dokument wurde gelöscht.")
          }
          setRemoveTarget(null)
        }}
      />
    </div>
  )
}

function DefinitionList({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-[var(--line-soft)]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3">
          <dt className="text-[13px] text-[var(--muted)]">{label}</dt>
          <dd className="text-[13.5px] font-medium text-[var(--ink)]">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function EditPersonalModal({
  open,
  customer,
  onClose,
  onSave,
}: {
  open: boolean
  customer: Customer
  onClose: () => void
  onSave: (patch: Partial<Customer>) => void
}) {
  const [form, setForm] = useState(customer)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setForm(customer)
      setErrors({})
    }
  }, [open, customer])

  const save = () => {
    const found: Record<string, string> = {}
    if (!form.firstName.trim()) found.firstName = "Bitte geben Sie den Vornamen ein."
    if (!form.lastName.trim()) found.lastName = "Bitte geben Sie den Nachnamen ein."
    setErrors(found)
    if (Object.keys(found).length) return

    onSave({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth,
      nationality: form.nationality,
      address: form.address.trim(),
      postalCode: form.postalCode.trim(),
      city: form.city.trim(),
      country: form.country,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      title="Persönliche Informationen bearbeiten"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" onClick={save}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vorname" required error={errors.firstName}>
          <TextInput value={form.firstName} invalid={Boolean(errors.firstName)} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
        </Field>
        <Field label="Nachname" required error={errors.lastName}>
          <TextInput value={form.lastName} invalid={Boolean(errors.lastName)} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
        </Field>
        <Field label="Geburtsdatum">
          <TextInput type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
        </Field>
        <Field label="Nationalität">
          <TextInput value={form.nationality} onChange={(event) => setForm({ ...form, nationality: event.target.value })} />
        </Field>
        <Field label="Adresse" className="sm:col-span-2">
          <TextInput value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        </Field>
        <Field label="PLZ">
          <TextInput value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
        </Field>
        <Field label="Ort">
          <TextInput value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
        </Field>
        <Field label="Land">
          <TextInput value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}

function EditContactModal({
  open,
  customer,
  onClose,
  onSave,
}: {
  open: boolean
  customer: Customer
  onClose: () => void
  onSave: (patch: Partial<Customer>) => void
}) {
  const [form, setForm] = useState(customer)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm(customer)
      setError("")
    }
  }, [open, customer])

  const save = () => {
    if (!isEmail(form.email)) {
      setError("Bitte geben Sie eine gültige E-Mail-Adresse ein.")
      return
    }
    onSave({ email: form.email.trim(), mobile: form.mobile.trim(), phone: form.phone.trim() })
    onClose()
  }

  return (
    <Modal
      open={open}
      title="Kontaktdaten bearbeiten"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" onClick={save}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="E-Mail" required error={error}>
          <TextInput type="email" value={form.email} invalid={Boolean(error)} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </Field>
        <Field label="Mobiltelefon">
          <TextInput value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} />
        </Field>
        <Field label="Telefon">
          <TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}

function EditStatusModal({
  open,
  customer,
  onClose,
  onSave,
}: {
  open: boolean
  customer: Customer
  onClose: () => void
  onSave: (patch: Partial<Customer>) => void
}) {
  const [status, setStatus] = useState(customer.status)
  const [kyc, setKyc] = useState(customer.kycStatus)
  const [identifiedAt, setIdentifiedAt] = useState(customer.identifiedAt)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (open) {
      setStatus(customer.status)
      setKyc(customer.kycStatus)
      setIdentifiedAt(customer.identifiedAt)
    }
  }, [open, customer])

  return (
    <>
      <Modal
        open={open}
        title="Kundenstatus bearbeiten"
        subtitle="Status- und KYC-Änderungen werden protokolliert."
        onClose={onClose}
        footer={
          <>
            <Button onClick={onClose}>Abbrechen</Button>
            <Button variant="primary" onClick={() => setConfirm(true)}>
              Speichern
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select value={status} onChange={(event) => setStatus(event.target.value as Customer["status"])}>
              {customerStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="KYC-Status">
            <Select value={kyc} onChange={(event) => setKyc(event.target.value as Customer["kycStatus"])}>
              {kycStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Identifikationsdatum" className="sm:col-span-2">
            <TextInput type="date" value={identifiedAt} onChange={(event) => setIdentifiedAt(event.target.value)} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm}
        title="Änderung speichern"
        message="Möchten Sie diese Änderung wirklich speichern?"
        confirmLabel="Ja, speichern"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          onSave({ status, kycStatus: kyc, identifiedAt })
          setConfirm(false)
          onClose()
        }}
      />
    </>
  )
}

function UploadModal({
  open,
  onClose,
  onUpload,
}: {
  open: boolean
  onClose: () => void
  onUpload: (file: { filename: string; category: DocumentCategory; sizeKb: number }) => void
}) {
  const [file, setFile] = useState<{ filename: string; sizeKb: number } | null>(null)
  const [category, setCategory] = useState<DocumentCategory>("vertraege")
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setFile(null)
      setCategory("vertraege")
      setError("")
    }
  }, [open])

  return (
    <Modal
      open={open}
      title="Dokument hochladen"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!file) {
                setError("Bitte wählen Sie eine Datei aus.")
                return
              }
              onUpload({ ...file, category })
            }}
          >
            Hochladen
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FileDrop onFiles={(files) => { setFile(files[0] ?? null); setError("") }} />
        {file && (
          <p className="rounded-lg bg-[var(--surface-sunken)] px-4 py-2.5 text-[13px] text-[var(--body)]">
            Ausgewählt: <strong className="text-[var(--ink)]">{file.filename}</strong>{" "}
            <span className="num text-[var(--faint)]">({formatFileSize(file.sizeKb)})</span>
          </p>
        )}
        {error && <p className="text-[13px] font-medium text-[var(--danger)]">{error}</p>}
        <Field label="Kategorie">
          <Select value={category} onChange={(event) => setCategory(event.target.value as DocumentCategory)}>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  )
}

function MessageModal({
  open,
  customerName,
  onClose,
  onSend,
}: {
  open: boolean
  customerName: string
  onClose: () => void
  onSend: (subject: string, body: string) => void
}) {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setSubject("")
      setBody("")
      setErrors({})
    }
  }, [open])

  return (
    <Modal
      open={open}
      title="Nachricht senden"
      subtitle={`Empfänger: ${customerName}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button
            variant="primary"
            onClick={() => {
              const found: Record<string, string> = {}
              if (!subject.trim()) found.subject = "Bitte geben Sie einen Betreff ein."
              if (body.trim().length < 5) found.body = "Bitte formulieren Sie eine Nachricht."
              setErrors(found)
              if (Object.keys(found).length) return
              onSend(subject.trim(), body.trim())
            }}
          >
            Senden
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Betreff" required error={errors.subject}>
          <TextInput value={subject} invalid={Boolean(errors.subject)} onChange={(event) => setSubject(event.target.value)} />
        </Field>
        <Field label="Nachricht" required error={errors.body}>
          <Textarea rows={5} value={body} invalid={Boolean(errors.body)} onChange={(event) => setBody(event.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
