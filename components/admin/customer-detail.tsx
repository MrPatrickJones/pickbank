"use client"

import { useEffect, useState } from "react"

import { AccessCard } from "@/components/admin/access-card"
import { AccountForm } from "@/components/admin/account-form"
import { Icon } from "@/components/admin/icons"
import {
  AccountStatusBadge,
  Badge,
  Button,
  Card,
  CustomerStatusBadge,
  EmptyState,
  ErrorState,
  Kpi,
  KycBadge,
  LoadingState,
  Table,
  Tabs,
  cell,
  cellRight,
  cellStrong,
  rowClass,
} from "@/components/ui/primitives"
import { Field, Select, TextInput, Textarea } from "@/components/ui/form"
import { ConfirmDialog, FileDrop, Modal, useToast } from "@/components/ui/overlays"
import { ApiRequestError, api } from "@/lib/api"
import { formatAmount, formatDate, formatDateTime, formatFileSize, formatPercent, initialsOf } from "@/lib/format"
import { customerStatusOptions, documentCategoryLabels, documentCategoryOptions, kycLabels, kycStatusOptions } from "@/lib/labels"
import { useSession } from "@/lib/session"
import { useResource } from "@/lib/use-resource"
import type { Account, Customer, CustomerFile, DocumentCategory } from "@/lib/types"

export function CustomerDetail({ customerId, onBack }: { customerId: number; onBack: () => void }) {
  const { can } = useSession()
  const toast = useToast()

  const { data, loading, error, reload } = useResource<CustomerFile>(
    () => api.get<CustomerFile>(`/api/customers/${customerId}`),
    [customerId],
  )

  const [tab, setTab] = useState("overview")
  const [editPersonal, setEditPersonal] = useState(false)
  const [editContact, setEditContact] = useState(false)
  const [editStatus, setEditStatus] = useState(false)
  const [accountForm, setAccountForm] = useState<{ open: boolean; account: Account | null }>({ open: false, account: null })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<number | null>(null)

  if (loading && !data) return <Card><LoadingState /></Card>
  if (error) return <Card><ErrorState message={error} onRetry={reload} /></Card>
  if (!data) return null

  const { customer, totals, accounts, documents, messages, activities, login } = data
  const writable = can("customers.write")

  const patchCustomer = async (patch: Record<string, unknown>, message: string) => {
    try {
      await api.patch(`/api/customers/${customer.id}`, patch)
      toast(message)
      await reload()
      return true
    } catch (caught) {
      toast(caught instanceof ApiRequestError ? caught.message : "Speichern fehlgeschlagen.", "error")
      return false
    }
  }

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
              <CustomerStatusBadge status={customer.customerStatus} />
              <KycBadge status={customer.kycStatus} />
            </div>
          </div>
        </div>

        {writable && (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setEditStatus(true)}>Bearbeiten</Button>
            <Button onClick={() => setAccountForm({ open: true, account: null })}>Neues Konto</Button>
            <Button onClick={() => setUploadOpen(true)}>Dokument hochladen</Button>
            <Button variant="primary" onClick={() => setMessageOpen(true)}>
              Nachricht senden
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Gesamtanlage" value={formatAmount(totals.principal, "EUR", 0)} tone="accent" hint={`${totals.accountCount} Konten`} />
        <Kpi label="Aktive Konten" value={String(totals.activeAccounts)} hint={`Ø ${formatPercent(totals.averageRate)}`} />
        <Kpi label="Zinserträge bisher" value={formatAmount(totals.accruedInterest)} tone="good" hint={`${formatAmount(totals.expectedInterest)} bei Laufzeitende`} />
        <Kpi label="Nächste Fälligkeit" value={totals.nextMaturity ? formatDate(totals.nextMaturity) : "–"} hint="nächstes auslaufendes Konto" />
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Übersicht" },
          { id: "accounts", label: "Festgeldkonten", count: accounts.length },
          { id: "documents", label: "Dokumente", count: documents.length },
          { id: "activities", label: "Aktivitäten", count: activities.length },
          { id: "messages", label: "Nachrichten", count: messages.length },
        ]}
      />

      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Persönliche Informationen" action={writable ? <Button size="sm" onClick={() => setEditPersonal(true)}>Bearbeiten</Button> : null}>
            <DefinitionList
              rows={[
                ["Vorname", customer.firstName],
                ["Nachname", customer.lastName],
                ["Firma", customer.companyName ?? "–"],
                ["Geburtsdatum", customer.dateOfBirth ? formatDate(customer.dateOfBirth) : "–"],
                ["Nationalität", customer.nationality ?? "–"],
                [
                  "Adresse",
                  [customer.address, `${customer.postalCode ?? ""} ${customer.city ?? ""}`.trim(), customer.country]
                    .filter(Boolean)
                    .join(", "),
                ],
              ]}
            />
          </Card>

          <Card title="Kontakt" action={writable ? <Button size="sm" onClick={() => setEditContact(true)}>Bearbeiten</Button> : null}>
            <DefinitionList
              rows={[
                ["E-Mail", customer.email],
                ["Mobiltelefon", customer.mobile ?? "–"],
                ["Telefon", customer.phone ?? "–"],
              ]}
            />
          </Card>

          <AccessCard customer={customer} login={login} onChanged={reload} />

          <Card title="Identifikation & Status">
            <DefinitionList
              rows={[
                ["Ausweisart", customer.identificationType ?? "–"],
                ["KYC-Status", kycLabels[customer.kycStatus]],
                ["Identifiziert am", customer.identifiedAt ? formatDate(customer.identifiedAt) : "–"],
                ["Kunde seit", formatDate(customer.createdAt.slice(0, 10))],
                ["Zuletzt aktualisiert", formatDateTime(customer.updatedAt)],
                ["Letzte Anmeldung", customer.lastLoginAt ? formatDateTime(customer.lastLoginAt) : "–"],
              ]}
            />
          </Card>
        </div>
      )}

      {tab === "accounts" && (
        <Card
          title="Festgeldkonten"
          subtitle="Alle Konten dieses Kunden"
          action={writable ? <Button size="sm" variant="primary" onClick={() => setAccountForm({ open: true, account: null })}>Neues Konto</Button> : null}
        >
          {accounts.length === 0 ? (
            <EmptyState title="Keine Konten erfasst" hint="Legen Sie das erste Festgeldkonto an." />
          ) : (
            <Table
              minWidth={1020}
              headers={[
                "Konto",
                "Produkt",
                { label: "Betrag", align: "right" },
                { label: "Zinssatz", align: "right" },
                "Laufzeit",
                "Start",
                "Fälligkeit",
                { label: "Zinsertrag", align: "right" },
                "Status",
                { label: "", align: "right" },
              ]}
            >
              {accounts.map((account) => (
                <tr key={account.id} className={rowClass}>
                  <td className={`${cellStrong} num`}>{account.accountNumber}</td>
                  <td className={cell}>{account.productName}</td>
                  <td className={cellRight}>{formatAmount(account.principalAmount, account.currency, 0)}</td>
                  <td className={cellRight}>{formatPercent(account.interestRate)}</td>
                  <td className={cell}>{account.termMonths} Monate</td>
                  <td className={`${cell} num`}>{formatDate(account.startDate)}</td>
                  <td className={`${cell} num`}>{formatDate(account.maturityDate)}</td>
                  <td className={cellRight}>{formatAmount(account.accruedInterest, account.currency)}</td>
                  <td className={cell}>
                    <AccountStatusBadge status={account.status} />
                  </td>
                  <td className={`${cell} text-right`}>
                    {writable && (
                      <Button size="sm" onClick={() => setAccountForm({ open: true, account })}>
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
                  <td className={cell}>{documentCategoryLabels[document.category]}</td>
                  <td className={`${cell} num`}>{formatDate(document.uploadedAt.slice(0, 10))}</td>
                  <td className={cell}>{document.uploadedBy ?? "–"}</td>
                  <td className={cellRight}>{formatFileSize(document.sizeKb)}</td>
                  <td className={`${cell} text-right`}>
                    {writable && (
                      <Button size="sm" variant="ghost" onClick={() => setRemoveTarget(document.id)}>
                        Löschen
                      </Button>
                    )}
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
                    <span className="num text-[12.5px] font-semibold text-[var(--ink)]">{formatDateTime(activity.createdAt)}</span>
                    <span className="text-[12.5px] text-[var(--faint)]">{activity.user}</span>
                  </div>
                  <p className="mt-1 text-[13.5px] text-[var(--body)]">{activity.description}</p>
                  {(activity.oldValue || activity.newValue) && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px]">
                      {activity.oldValue && (
                        <span className="rounded bg-[var(--surface-sunken)] px-2 py-0.5 text-[var(--muted)] line-through">{activity.oldValue}</span>
                      )}
                      {activity.newValue && (
                        <span className="rounded bg-[var(--good-soft)] px-2 py-0.5 font-semibold text-[var(--good)]">{activity.newValue}</span>
                      )}
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
                    {message.sentBy ?? "Pick The Bank"}
                    {!message.readAt && <Badge tone="info">Ungelesen</Badge>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <EditPersonalModal
        open={editPersonal}
        customer={customer}
        onClose={() => setEditPersonal(false)}
        onSave={(patch) => patchCustomer(patch, "Persönliche Daten wurden gespeichert.")}
      />
      <EditContactModal
        open={editContact}
        customer={customer}
        onClose={() => setEditContact(false)}
        onSave={(patch) => patchCustomer(patch, "Kontaktdaten wurden gespeichert.")}
      />
      <EditStatusModal
        open={editStatus}
        customer={customer}
        onClose={() => setEditStatus(false)}
        onSave={(patch) => patchCustomer(patch, "Status wurde aktualisiert.")}
      />

      <AccountForm
        open={accountForm.open}
        customerId={customer.id}
        account={accountForm.account}
        onClose={() => setAccountForm({ open: false, account: null })}
        onSaved={reload}
      />

      <UploadModal
        open={uploadOpen}
        customerId={customer.id}
        onClose={() => setUploadOpen(false)}
        onUploaded={async () => {
          toast("Dokument wurde hinterlegt.")
          await reload()
        }}
      />

      <MessageModal
        open={messageOpen}
        customerId={customer.id}
        customerName={`${customer.firstName} ${customer.lastName}`}
        onClose={() => setMessageOpen(false)}
        onSent={async () => {
          toast("Nachricht wurde versendet.")
          await reload()
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Dokument löschen"
        message="Möchten Sie dieses Dokument wirklich löschen? Der Vorgang wird protokolliert."
        confirmLabel="Löschen"
        tone="danger"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={async () => {
          if (removeTarget) {
            try {
              await api.delete(`/api/documents/${removeTarget}`)
              toast("Dokument wurde gelöscht.")
              await reload()
            } catch (caught) {
              toast(caught instanceof ApiRequestError ? caught.message : "Löschen fehlgeschlagen.", "error")
            }
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
  onSave: (patch: Record<string, unknown>) => Promise<boolean>
}) {
  const [form, setForm] = useState(customer)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setForm(customer)
      setErrors({})
    }
  }, [open, customer])

  const save = async () => {
    const found: Record<string, string> = {}
    if (!form.firstName.trim()) found.firstName = "Bitte geben Sie den Vornamen ein."
    if (!form.lastName.trim()) found.lastName = "Bitte geben Sie den Nachnamen ein."
    if (!form.city?.trim()) found.city = "Bitte geben Sie den Ort ein."
    setErrors(found)
    if (Object.keys(found).length) return

    const ok = await onSave({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      companyName: form.companyName || null,
      dateOfBirth: form.dateOfBirth || null,
      nationality: form.nationality || null,
      address: form.address || null,
      postalCode: form.postalCode || null,
      city: form.city,
      country: form.country,
    })
    if (ok) onClose()
  }

  return (
    <Modal
      open={open}
      title="Persönliche Informationen bearbeiten"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" onClick={() => void save()}>
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
        <Field label="Firma (optional)">
          <TextInput value={form.companyName ?? ""} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
        </Field>
        <Field label="Geburtsdatum">
          <TextInput type="date" value={form.dateOfBirth ?? ""} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
        </Field>
        <Field label="Nationalität">
          <TextInput value={form.nationality ?? ""} onChange={(event) => setForm({ ...form, nationality: event.target.value })} />
        </Field>
        <Field label="Adresse" className="sm:col-span-2">
          <TextInput value={form.address ?? ""} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        </Field>
        <Field label="PLZ">
          <TextInput value={form.postalCode ?? ""} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
        </Field>
        <Field label="Ort" required error={errors.city}>
          <TextInput value={form.city ?? ""} invalid={Boolean(errors.city)} onChange={(event) => setForm({ ...form, city: event.target.value })} />
        </Field>
        <Field label="Land">
          <TextInput value={form.country ?? ""} onChange={(event) => setForm({ ...form, country: event.target.value })} />
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
  onSave: (patch: Record<string, unknown>) => Promise<boolean>
}) {
  const [form, setForm] = useState(customer)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setForm(customer)
      setErrors({})
    }
  }, [open, customer])

  const save = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) {
      setErrors({ email: "Bitte geben Sie eine gültige E-Mail-Adresse ein." })
      return
    }
    const ok = await onSave({ email: form.email.trim(), mobile: form.mobile || null, phone: form.phone || null })
    if (ok) onClose()
  }

  return (
    <Modal
      open={open}
      title="Kontaktdaten bearbeiten"
      subtitle="Die E-Mail-Adresse ist zugleich der Benutzername des Kundenzugangs."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" onClick={() => void save()}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="E-Mail" required error={errors.email}>
          <TextInput type="email" value={form.email} invalid={Boolean(errors.email)} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </Field>
        <Field label="Mobiltelefon">
          <TextInput value={form.mobile ?? ""} onChange={(event) => setForm({ ...form, mobile: event.target.value })} />
        </Field>
        <Field label="Telefon">
          <TextInput value={form.phone ?? ""} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
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
  onSave: (patch: Record<string, unknown>) => Promise<boolean>
}) {
  const [status, setStatus] = useState(customer.customerStatus)
  const [kyc, setKyc] = useState(customer.kycStatus)
  const [identifiedAt, setIdentifiedAt] = useState(customer.identifiedAt ?? "")
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (open) {
      setStatus(customer.customerStatus)
      setKyc(customer.kycStatus)
      setIdentifiedAt(customer.identifiedAt ?? "")
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
            <Select value={status} onChange={(event) => setStatus(event.target.value as Customer["customerStatus"])}>
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
        message={`Status: ${customer.customerStatus} → ${status}. Möchten Sie diese Änderung wirklich speichern?`}
        confirmLabel="Ja, speichern"
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setConfirm(false)
          const ok = await onSave({ customerStatus: status, kycStatus: kyc, identifiedAt: identifiedAt || null })
          if (ok) onClose()
        }}
      />
    </>
  )
}

function UploadModal({
  open,
  customerId,
  onClose,
  onUploaded,
}: {
  open: boolean
  customerId: number
  onClose: () => void
  onUploaded: () => Promise<void>
}) {
  const [file, setFile] = useState<{ filename: string; sizeKb: number } | null>(null)
  const [category, setCategory] = useState<DocumentCategory>("CONTRACTS")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setFile(null)
      setCategory("CONTRACTS")
      setError("")
    }
  }, [open])

  const upload = async () => {
    if (!file) {
      setError("Bitte wählen Sie eine Datei aus.")
      return
    }
    setBusy(true)
    try {
      await api.post(`/api/customers/${customerId}/documents`, {
        filename: file.filename,
        sizeKb: file.sizeKb,
        category,
      })
      await onUploaded()
      onClose()
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Upload fehlgeschlagen.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Dokument hinterlegen"
      subtitle="Der Prototyp speichert Name, Kategorie und Größe; die Ablage der Datei erfolgt über den Dokumentenspeicher."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" disabled={busy} onClick={() => void upload()}>
            Hinterlegen
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
            {documentCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
  customerId,
  customerName,
  onClose,
  onSent,
}: {
  open: boolean
  customerId: number
  customerName: string
  onClose: () => void
  onSent: () => Promise<void>
}) {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setSubject("")
      setBody("")
      setErrors({})
    }
  }, [open])

  const send = async () => {
    setBusy(true)
    try {
      await api.post(`/api/customers/${customerId}/messages`, { subject, body })
      await onSent()
      onClose()
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setErrors(Object.keys(caught.details).length ? caught.details : { form: caught.message })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Nachricht senden"
      subtitle={`Empfänger: ${customerName}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" disabled={busy} onClick={() => void send()}>
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
        {errors.form && <p className="text-[13px] font-medium text-[var(--danger)]">{errors.form}</p>}
      </div>
    </Modal>
  )
}
