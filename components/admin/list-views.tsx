"use client"

import { useState } from "react"

import {
  AccountStatusBadge,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Kpi,
  LoadingState,
  PageHeader,
  SearchInput,
  Table,
  cell,
  cellRight,
  cellStrong,
  rowClass,
} from "@/components/ui/primitives"
import { BankLogo } from "@/components/admin/banks-view"
import { Field, Select } from "@/components/ui/form"
import { api, buildQuery } from "@/lib/api"
import { daysUntil, formatAmount, formatDate, formatDateTime, formatFileSize, formatPercent } from "@/lib/format"
import { accountStatusOptions, documentCategoryLabels, documentCategoryOptions } from "@/lib/labels"
import { useResource } from "@/lib/use-resource"
import type { AccountWithCustomer, AuditEntry, Message, PortalDocument } from "@/lib/types"

/* ---------------- Accounts ---------------- */

export function AccountsView({
  onOpenCustomer,
  title = "Festgeldkonten",
  subtitle = "Alle Konten über sämtliche Kunden hinweg.",
}: {
  onOpenCustomer: (id: number) => void
  title?: string
  subtitle?: string
}) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")

  const { data, loading, error, reload } = useResource<{ accounts: AccountWithCustomer[] }>(
    () => api.get(`/api/accounts${buildQuery({ search, status })}`),
    [search, status],
  )

  const accounts = data?.accounts ?? []
  const volume = accounts.reduce((sum, account) => sum + Number(account.principalAmount), 0)
  const interest = accounts.reduce((sum, account) => sum + Number(account.interestAtMaturity), 0)

  return (
    <div className="space-y-5">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Konten" value={String(accounts.length)} hint="in der aktuellen Auswahl" />
        <Kpi label="Volumen" value={formatAmount(volume.toFixed(2), "EUR", 0)} tone="accent" />
        <Kpi label="Zinsen bei Laufzeitende" value={formatAmount(interest.toFixed(2), "EUR", 0)} tone="good" />
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--line-soft)] px-5 py-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Kontonummer, Kunde oder Referenzkonto" className="min-w-[240px] flex-1" />
          <Field label="Status" className="w-[190px]">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Alle</option>
              {accountStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {loading && !data && <LoadingState />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && accounts.length === 0 && <EmptyState title="Keine Konten gefunden" hint="Passen Sie Suche oder Filter an." />}

        {accounts.length > 0 && (
          <Table
            minWidth={1160}
            headers={[
              "Konto",
              "Bank",
              "Kunde",
              { label: "Betrag", align: "right" },
              { label: "Zinssatz", align: "right" },
              "Laufzeit",
              "Start",
              "Fälligkeit",
              { label: "Zinsertrag", align: "right" },
              "Status",
            ]}
          >
            {accounts.map((account) => (
              <tr key={account.id} className={`${rowClass} cursor-pointer`} onClick={() => onOpenCustomer(account.customer.id)}>
                <td className={`${cellStrong} num`}>{account.accountNumber}</td>
                <td className={cell}>
                  {account.bank ? (
                    <span className="flex items-center gap-2">
                      <BankLogo bank={account.bank} size={22} />
                      <span className="truncate">{account.bank.name}</span>
                    </span>
                  ) : (
                    <span className="text-[var(--faint)]">–</span>
                  )}
                </td>
                <td className={cell}>
                  {account.customer.firstName} {account.customer.lastName}
                  <div className="num text-[12px] text-[var(--faint)]">{account.customer.customerNumber}</div>
                </td>
                <td className={cellRight}>{formatAmount(account.principalAmount, account.currency, 0)}</td>
                <td className={cellRight}>{formatPercent(account.interestRate)}</td>
                <td className={cell}>{account.termMonths} Monate</td>
                <td className={`${cell} num`}>{formatDate(account.startDate)}</td>
                <td className={`${cell} num`}>{formatDate(account.maturityDate)}</td>
                <td className={cellRight}>{formatAmount(account.accruedInterest, account.currency)}</td>
                <td className={cell}>
                  <AccountStatusBadge status={account.status} />
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

export function DocumentsView({ onOpenCustomer }: { onOpenCustomer: (id: number) => void }) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")

  const { data, loading, error, reload } = useResource<{ documents: PortalDocument[] }>(
    () => api.get(`/api/documents${buildQuery({ search, category })}`),
    [search, category],
  )

  const documents = data?.documents ?? []

  return (
    <div className="space-y-5">
      <PageHeader title="Dokumente" subtitle="Alle hinterlegten Unterlagen über sämtliche Kunden." />

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--line-soft)] px-5 py-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Dateiname oder Kunde" className="min-w-[240px] flex-1" />
          <Field label="Kategorie" className="w-[210px]">
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Alle</option>
              {documentCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {loading && !data && <LoadingState />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && documents.length === 0 && <EmptyState title="Keine Dokumente gefunden" />}

        {documents.length > 0 && (
          <Table
            minWidth={1000}
            headers={[
              "Dokument",
              "Kunde",
              "Kategorie",
              "Anlage",
              "Hochgeladen",
              { label: "Größe", align: "right" },
              { label: "", align: "right" },
            ]}
          >
            {documents.map((document) => (
              <tr key={document.id} className={rowClass}>
                <td className={cellStrong}>
                  {document.title}
                  <span className="block text-[12px] font-normal text-[var(--faint)]">{document.filename}</span>
                </td>
                <td className={cell}>
                  <button type="button" className="hover:text-[var(--accent)]" onClick={() => onOpenCustomer(document.customerId)}>
                    {document.customer ? `${document.customer.firstName} ${document.customer.lastName}` : "–"}
                  </button>
                </td>
                <td className={cell}>{documentCategoryLabels[document.category]}</td>
                <td className={cell}>
                  {document.account ? (
                    <span className="num">
                      {document.account.bankName ? `${document.account.bankName} · ` : ""}
                      {document.account.accountNumber}
                    </span>
                  ) : (
                    <span className="text-[var(--faint)]">–</span>
                  )}
                </td>
                <td className={`${cell} num`}>{formatDate(document.uploadedAt.slice(0, 10))}</td>
                <td className={cellRight}>{formatFileSize(document.sizeBytes)}</td>
                <td className={`${cell} whitespace-nowrap text-right`}>
                  {document.downloadUrl && (
                    <a
                      href={document.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-semibold text-[var(--accent)] hover:underline"
                    >
                      Anzeigen
                    </a>
                  )}
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

export function PayoutsView({ onOpenCustomer }: { onOpenCustomer: (id: number) => void }) {
  const { data, loading, error, reload } = useResource<{ accounts: AccountWithCustomer[] }>(() =>
    api.get("/api/accounts?limit=300"),
  )

  const accounts = (data?.accounts ?? []).filter(
    (account) => account.status === "ACTIVE" || account.status === "PENDING" || account.status === "MATURED",
  )
  const due = accounts.filter((account) => daysUntil(account.maturityDate) <= 0)
  const upcoming = accounts.filter((account) => {
    const days = daysUntil(account.maturityDate)
    return days > 0 && days <= 180
  })
  const rows = [...due, ...upcoming].sort((a, b) => a.maturityDate.localeCompare(b.maturityDate))
  const total = rows.reduce((sum, account) => sum + Number(account.principalAmount) + Number(account.accruedInterest), 0)

  return (
    <div className="space-y-5">
      <PageHeader title="Auszahlungen" subtitle="Fällige und anstehende Auszahlungen der nächsten 180 Tage." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Fällig" value={String(due.length)} tone="warn" hint="wartet auf Anweisung" />
        <Kpi label="Anstehend" value={String(upcoming.length)} />
        <Kpi label="Auszahlungsvolumen" value={formatAmount(total.toFixed(2), "EUR", 0)} tone="accent" hint="inklusive aufgelaufener Zinsen" />
      </div>

      <Card title="Auszahlungsplan">
        {loading && !data && <LoadingState />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && rows.length === 0 && <EmptyState title="Keine anstehenden Auszahlungen" />}

        {rows.length > 0 && (
          <Table
            minWidth={980}
            headers={[
              "Fälligkeit",
              "Auszahlung",
              "Kunde",
              "Konto",
              { label: "Kapital", align: "right" },
              { label: "Zinsen", align: "right" },
              { label: "Auszahlungsbetrag", align: "right" },
              "Referenzkonto",
              "Status",
            ]}
          >
            {rows.map((account) => {
              const days = daysUntil(account.maturityDate)
              const payout = (Number(account.principalAmount) + Number(account.accruedInterest)).toFixed(2)
              return (
                <tr key={account.id} className={`${rowClass} cursor-pointer`} onClick={() => onOpenCustomer(account.customer.id)}>
                  <td className={`${cell} num whitespace-nowrap`}>
                    {formatDate(account.maturityDate)}
                    <div className="text-[12px] text-[var(--faint)]">
                      {days < 0 ? `${Math.abs(days)} Tage überfällig` : `in ${days} Tagen`}
                    </div>
                  </td>
                  <td className={`${cell} num`}>{account.payoutDate ? formatDate(account.payoutDate) : "–"}</td>
                  <td className={cellStrong}>
                    {account.customer.firstName} {account.customer.lastName}
                  </td>
                  <td className={`${cell} num`}>{account.accountNumber}</td>
                  <td className={cellRight}>{formatAmount(account.principalAmount, account.currency, 0)}</td>
                  <td className={cellRight}>{formatAmount(account.accruedInterest, account.currency)}</td>
                  <td className={`${cellRight} font-semibold text-[var(--ink)]`}>{formatAmount(payout, account.currency)}</td>
                  <td className={`${cell} num text-[12.5px]`}>{account.referenceAccount ?? "–"}</td>
                  <td className={cell}>
                    {days <= 0 ? <Badge tone="warn">Zur Anweisung</Badge> : <Badge tone="info">Geplant</Badge>}
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>
    </div>
  )
}

/* ---------------- Activities ---------------- */

export function ActivitiesView({ onOpenCustomer }: { onOpenCustomer: (id: number) => void }) {
  const [search, setSearch] = useState("")

  const { data, loading, error, reload } = useResource<{ entries: AuditEntry[] }>(
    () => api.get(`/api/audit-log${buildQuery({ search, limit: 200 })}`),
    [search],
  )

  const entries = data?.entries ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Aktivitäten"
        subtitle="Revisionssicheres Protokoll aller Änderungen. Einträge lassen sich weder bearbeiten noch löschen."
      />

      <Card>
        <div className="border-b border-[var(--line-soft)] px-5 py-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Vorgang, Beschreibung oder Benutzer" className="max-w-[420px]" />
        </div>

        {loading && !data && <LoadingState />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && entries.length === 0 && <EmptyState title="Keine Einträge" />}

        {entries.length > 0 && (
          <ul className="divide-y divide-[var(--line-soft)]">
            {entries.map((entry) => (
              <li key={entry.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="num text-[12.5px] font-semibold text-[var(--ink)]">{formatDateTime(entry.createdAt)}</span>
                  <span className="text-[12.5px] text-[var(--faint)]">{entry.user}</span>
                </div>
                <p className="mt-1 text-[13.5px] text-[var(--body)]">{entry.description}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{entry.action}</Badge>
                  {entry.customerId && (
                    <button
                      type="button"
                      className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline"
                      onClick={() => onOpenCustomer(entry.customerId as number)}
                    >
                      Kundenakte öffnen
                    </button>
                  )}
                  {entry.oldValue && (
                    <span className="rounded bg-[var(--surface-sunken)] px-2 py-0.5 text-[12px] text-[var(--muted)] line-through">
                      {entry.oldValue}
                    </span>
                  )}
                  {entry.newValue && (
                    <span className="rounded bg-[var(--good-soft)] px-2 py-0.5 text-[12px] font-semibold text-[var(--good)]">
                      {entry.newValue}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

/* ---------------- Messages ---------------- */

export function MessagesView({ onOpenCustomer }: { onOpenCustomer: (id: number) => void }) {
  const [search, setSearch] = useState("")

  const { data, loading, error, reload } = useResource<{ messages: Message[] }>(
    () => api.get(`/api/messages${buildQuery({ search })}`),
    [search],
  )

  const messages = data?.messages ?? []

  return (
    <div className="space-y-5">
      <PageHeader title="Nachrichten" subtitle="Mitteilungen an Kunden – Versand erfolgt aus der Kundenakte." />

      <Card>
        <div className="border-b border-[var(--line-soft)] px-5 py-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Betreff, Inhalt oder Kunde" className="max-w-[420px]" />
        </div>

        {loading && !data && <LoadingState />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && messages.length === 0 && <EmptyState title="Keine Nachrichten" />}

        {messages.length > 0 && (
          <ul className="divide-y divide-[var(--line-soft)]">
            {messages.map((message) => (
              <li key={message.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[13.5px] font-semibold text-[var(--ink)]">{message.subject}</span>
                  <span className="num text-[12.5px] text-[var(--faint)]">{formatDateTime(message.sentAt)}</span>
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--body)]">{message.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--faint)]">
                  <span>{message.sentBy ?? "Pick The Bank"}</span>
                  {message.customer && (
                    <button
                      type="button"
                      className="font-semibold text-[var(--accent)] hover:underline"
                      onClick={() => onOpenCustomer(message.customerId)}
                    >
                      {message.customer.firstName} {message.customer.lastName}
                    </button>
                  )}
                  {!message.readAt && <Badge tone="info">Ungelesen</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
