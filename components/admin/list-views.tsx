"use client"

import { useMemo, useState } from "react"

import {
  Badge,
  Button,
  Card,
  EmptyState,
  InvestmentStatusBadge,
  Kpi,
  PageHeader,
  SearchInput,
  Table,
  cell,
  cellRight,
  cellStrong,
  investmentStatusOptions,
  rowClass,
} from "@/components/ui/primitives"
import { Field, Select } from "@/components/ui/form"
import { useToast } from "@/components/ui/overlays"
import { formatDate, formatDateTime, formatEuro, formatFileSize, formatPercent } from "@/lib/format"
import { TODAY, currentValue, daysToMaturity, effectiveStatus, interestAtMaturity } from "@/lib/finance"
import { useData } from "@/lib/store"
import { documentCategoryLabels as categoryLabels } from "@/lib/labels"



const matches = (query: string, ...values: string[]) =>
  !query.trim() || values.join(" ").toLowerCase().includes(query.trim().toLowerCase())

/* ---------------- Investments ---------------- */

export function InvestmentsView({
  onOpenCustomer,
  fixedTermOnly = false,
}: {
  onOpenCustomer: (id: string) => void
  fixedTermOnly?: boolean
}) {
  const { investments, customers } = useData()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")

  const rows = useMemo(() => {
    return investments
      .filter((investment) => (fixedTermOnly ? investment.productType === "festgeld" : true))
      .filter((investment) => (status ? effectiveStatus(investment) === status : true))
      .map((investment) => ({
        investment,
        customer: customers.find((entry) => entry.id === investment.customerId),
      }))
      .filter(({ investment, customer }) =>
        matches(
          query,
          investment.investmentNumber,
          investment.referenceAccount,
          customer ? `${customer.firstName} ${customer.lastName} ${customer.customerNumber}` : "",
        ),
      )
      .sort((a, b) => a.investment.maturityDate.localeCompare(b.investment.maturityDate))
  }, [investments, customers, query, status, fixedTermOnly])

  const volume = rows.reduce((sum, entry) => sum + entry.investment.principal, 0)
  const interest = rows.reduce((sum, entry) => sum + interestAtMaturity(entry.investment), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title={fixedTermOnly ? "Festgeldkonten" : "Anlagen"}
        subtitle={
          fixedTermOnly
            ? "Alle Festgeldverträge mit Laufzeit, Zins und Fälligkeit."
            : "Sämtliche Anlagen über alle Kunden hinweg."
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Verträge" value={String(rows.length)} hint="in der aktuellen Auswahl" />
        <Kpi label="Volumen" value={formatEuro(volume, 0)} tone="accent" />
        <Kpi label="Zinsen bei Laufzeitende" value={formatEuro(interest, 0)} tone="good" />
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--line-soft)] px-5 py-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Anlage-ID, Kunde oder Referenzkonto" className="min-w-[240px] flex-1" />
          <Field label="Status" className="w-[190px]">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Alle</option>
              {investmentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="Keine Anlagen gefunden" hint="Passen Sie Suche oder Filter an." />
        ) : (
          <Table
            minWidth={1040}
            headers={[
              "Anlage",
              "Kunde",
              { label: "Betrag", align: "right" },
              { label: "Zinssatz", align: "right" },
              "Laufzeit",
              "Start",
              "Fälligkeit",
              { label: "Aktueller Wert", align: "right" },
              "Status",
            ]}
          >
            {rows.map(({ investment, customer }) => (
              <tr key={investment.id} className={`${rowClass} cursor-pointer`} onClick={() => onOpenCustomer(investment.customerId)}>
                <td className={`${cellStrong} num`}>{investment.investmentNumber}</td>
                <td className={cell}>
                  {customer ? `${customer.firstName} ${customer.lastName}` : "–"}
                  <div className="num text-[12px] text-[var(--faint)]">{customer?.customerNumber}</div>
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
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

/* ---------------- Documents ---------------- */

export function DocumentsView({ onOpenCustomer }: { onOpenCustomer: (id: string) => void }) {
  const { documents, customers } = useData()
  const toast = useToast()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")

  const rows = useMemo(
    () =>
      documents
        .filter((document) => (category ? document.category === category : true))
        .map((document) => ({ document, customer: customers.find((entry) => entry.id === document.customerId) }))
        .filter(({ document, customer }) =>
          matches(query, document.filename, customer ? `${customer.firstName} ${customer.lastName}` : ""),
        )
        .sort((a, b) => b.document.uploadedAt.localeCompare(a.document.uploadedAt)),
    [documents, customers, query, category],
  )

  return (
    <div className="space-y-5">
      <PageHeader title="Dokumente" subtitle="Alle hinterlegten Unterlagen über sämtliche Kunden." />

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--line-soft)] px-5 py-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Dateiname oder Kunde" className="min-w-[240px] flex-1" />
          <Field label="Kategorie" className="w-[210px]">
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Alle</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="Keine Dokumente gefunden" />
        ) : (
          <Table
            minWidth={880}
            headers={["Dateiname", "Kunde", "Kategorie", "Hochgeladen", "Hochgeladen von", { label: "Größe", align: "right" }, { label: "", align: "right" }]}
          >
            {rows.map(({ document, customer }) => (
              <tr key={document.id} className={rowClass}>
                <td className={cellStrong}>{document.filename}</td>
                <td className={cell}>
                  <button type="button" className="hover:text-[var(--accent)]" onClick={() => onOpenCustomer(document.customerId)}>
                    {customer ? `${customer.firstName} ${customer.lastName}` : "–"}
                  </button>
                </td>
                <td className={cell}>{categoryLabels[document.category]}</td>
                <td className={`${cell} num`}>{formatDate(document.uploadedAt.slice(0, 10))}</td>
                <td className={cell}>{document.uploadedBy}</td>
                <td className={cellRight}>{formatFileSize(document.sizeKb)}</td>
                <td className={`${cell} text-right`}>
                  <Button size="sm" onClick={() => toast("Download ist im Prototyp nicht hinterlegt.", "info")}>
                    Download
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

/* ---------------- Payouts ---------------- */

export function PayoutsView({ onOpenCustomer }: { onOpenCustomer: (id: string) => void }) {
  const { investments, customers } = useData()

  const rows = useMemo(
    () =>
      investments
        .filter((investment) => effectiveStatus(investment) !== "beendet")
        .map((investment) => ({
          investment,
          customer: customers.find((entry) => entry.id === investment.customerId),
          days: daysToMaturity(investment),
        }))
        .filter((entry) => entry.days <= 180)
        .sort((a, b) => a.investment.maturityDate.localeCompare(b.investment.maturityDate)),
    [investments, customers],
  )

  const due = rows.filter((entry) => entry.days < 0)
  const total = rows.reduce((sum, entry) => sum + currentValue(entry.investment), 0)

  return (
    <div className="space-y-5">
      <PageHeader title="Auszahlungen" subtitle={`Fällige und anstehende Auszahlungen · Stand ${formatDate(TODAY)}`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Fällig" value={String(due.length)} tone="warn" hint="wartet auf Anweisung" />
        <Kpi label="Anstehend (180 Tage)" value={String(rows.length - due.length)} />
        <Kpi label="Auszahlungsvolumen" value={formatEuro(total, 0)} tone="accent" hint="inklusive aufgelaufener Zinsen" />
      </div>

      <Card title="Auszahlungsplan">
        {rows.length === 0 ? (
          <EmptyState title="Keine anstehenden Auszahlungen" />
        ) : (
          <Table
            minWidth={980}
            headers={[
              "Fälligkeit",
              "Auszahlung",
              "Kunde",
              "Anlage",
              { label: "Kapital", align: "right" },
              { label: "Zinsen", align: "right" },
              { label: "Auszahlungsbetrag", align: "right" },
              "Referenzkonto",
              "Status",
            ]}
          >
            {rows.map(({ investment, customer, days }) => (
              <tr key={investment.id} className={`${rowClass} cursor-pointer`} onClick={() => onOpenCustomer(investment.customerId)}>
                <td className={`${cell} num`}>
                  {formatDate(investment.maturityDate)}
                  <div className="text-[12px] text-[var(--faint)]">{days < 0 ? `${Math.abs(days)} Tage überfällig` : `in ${days} Tagen`}</div>
                </td>
                <td className={`${cell} num`}>{formatDate(investment.payoutDate)}</td>
                <td className={cellStrong}>{customer ? `${customer.firstName} ${customer.lastName}` : "–"}</td>
                <td className={`${cell} num`}>{investment.investmentNumber}</td>
                <td className={cellRight}>{formatEuro(investment.principal, 0)}</td>
                <td className={cellRight}>{formatEuro(currentValue(investment) - investment.principal)}</td>
                <td className={`${cellRight} font-semibold text-[var(--ink)]`}>{formatEuro(currentValue(investment))}</td>
                <td className={`${cell} num text-[12.5px]`}>{investment.referenceAccount}</td>
                <td className={cell}>{days < 0 ? <Badge tone="warn">Zur Anweisung</Badge> : <Badge tone="info">Geplant</Badge>}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

/* ---------------- Activities ---------------- */

export function ActivitiesView({ onOpenCustomer }: { onOpenCustomer: (id: string) => void }) {
  const { activities, customers } = useData()
  const [query, setQuery] = useState("")
  const [customerId, setCustomerId] = useState("")

  const rows = useMemo(
    () =>
      activities
        .filter((activity) => (customerId ? activity.customerId === customerId : true))
        .filter((activity) => matches(query, activity.action, activity.description, activity.user)),
    [activities, query, customerId],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Aktivitäten"
        subtitle="Revisionssicheres Protokoll aller Änderungen. Einträge können nicht bearbeitet oder gelöscht werden."
      />

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--line-soft)] px-5 py-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Vorgang, Beschreibung oder Benutzer" className="min-w-[240px] flex-1" />
          <Field label="Kunde" className="w-[240px]">
            <Select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">Alle Kunden</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.lastName}, {customer.firstName}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="Keine Einträge" />
        ) : (
          <ul className="divide-y divide-[var(--line-soft)]">
            {rows.slice(0, 80).map((activity) => {
              const customer = customers.find((entry) => entry.id === activity.customerId)
              return (
                <li key={activity.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="num text-[12.5px] font-semibold text-[var(--ink)]">{formatDateTime(activity.timestamp)}</span>
                    <span className="text-[12.5px] text-[var(--faint)]">{activity.user}</span>
                  </div>
                  <p className="mt-1 text-[13.5px] text-[var(--body)]">{activity.description}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{activity.action}</Badge>
                    {customer && (
                      <button type="button" className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline" onClick={() => onOpenCustomer(customer.id)}>
                        {customer.firstName} {customer.lastName}
                      </button>
                    )}
                    {activity.previousValue && (
                      <span className="rounded bg-[var(--surface-sunken)] px-2 py-0.5 text-[12px] text-[var(--muted)] line-through">{activity.previousValue}</span>
                    )}
                    {activity.newValue && (
                      <span className="rounded bg-[var(--good-soft)] px-2 py-0.5 text-[12px] font-semibold text-[var(--good)]">{activity.newValue}</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

/* ---------------- Messages ---------------- */

export function MessagesView({ onOpenCustomer }: { onOpenCustomer: (id: string) => void }) {
  const { messages, customers } = useData()
  const [query, setQuery] = useState("")

  const rows = useMemo(
    () =>
      messages
        .map((message) => ({ message, customer: customers.find((entry) => entry.id === message.customerId) }))
        .filter(({ message, customer }) =>
          matches(query, message.subject, message.body, customer ? `${customer.firstName} ${customer.lastName}` : ""),
        )
        .sort((a, b) => b.message.sentAt.localeCompare(a.message.sentAt)),
    [messages, customers, query],
  )

  return (
    <div className="space-y-5">
      <PageHeader title="Nachrichten" subtitle="Mitteilungen an Kunden – Versand erfolgt aus der Kundenakte." />

      <Card>
        <div className="border-b border-[var(--line-soft)] px-5 py-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Betreff, Inhalt oder Kunde" className="max-w-[420px]" />
        </div>

        {rows.length === 0 ? (
          <EmptyState title="Keine Nachrichten" />
        ) : (
          <ul className="divide-y divide-[var(--line-soft)]">
            {rows.map(({ message, customer }) => (
              <li key={message.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[13.5px] font-semibold text-[var(--ink)]">{message.subject}</span>
                  <span className="num text-[12.5px] text-[var(--faint)]">{formatDateTime(message.sentAt)}</span>
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--body)]">{message.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--faint)]">
                  <span>{message.sentBy}</span>
                  {customer && (
                    <button type="button" className="font-semibold text-[var(--accent)] hover:underline" onClick={() => onOpenCustomer(customer.id)}>
                      {customer.firstName} {customer.lastName}
                    </button>
                  )}
                  {!message.read && <Badge tone="info">Ungelesen</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
