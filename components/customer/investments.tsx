"use client"

import { BankLogo } from "@/components/admin/banks-view"
import { Icon } from "@/components/admin/icons"
import { AccountStatusBadge, Button, Card, EmptyState } from "@/components/ui/primitives"
import { daysUntil, fileTypeOf, formatAmount, formatDate, formatFileSize, formatPercent } from "@/lib/format"
import { documentCategoryLabels, documentTypeLabel, interestMethodLabels } from "@/lib/labels"
import type { Account, PortalDocument } from "@/lib/types"

/** Restlaufzeit in verständlicher Form. */
function remaining(maturityDate: string) {
  const days = daysUntil(maturityDate)
  if (days > 60) return `noch ${Math.round(days / 30)} Monate`
  if (days > 0) return `noch ${days} Tage`
  if (days === 0) return "heute fällig"
  return `seit ${Math.abs(days)} Tagen fällig`
}

/**
 * Die Liste aller Anlagen des Kunden. Jede Karte zeigt Bank, Betrag, Zinssatz
 * und Fälligkeit; ein Klick öffnet die vollständige Anlage.
 */
export function InvestmentList({
  accounts,
  onOpen,
}: {
  accounts: Account[]
  onOpen: (account: Account) => void
}) {
  if (accounts.length === 0) {
    return (
      <Card>
        <EmptyState title="Noch keine Anlage" hint="Sobald eine Festgeldanlage eingerichtet ist, erscheint sie hier." />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {accounts.map((account) => (
        <article
          key={account.id}
          className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-card"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-5">
            <div className="flex min-w-0 items-center gap-3">
              {account.bank ? (
                <BankLogo bank={account.bank} size={36} />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)] text-[11px] font-semibold text-[var(--muted)]">
                  –
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-[var(--ink)]">
                  {account.bank?.name ?? "Bank wird ergänzt"}
                </p>
                <p className="text-[12.5px] text-[var(--muted)]">
                  {account.bank?.country ?? "–"} · {account.productName}
                </p>
              </div>
            </div>
            <AccountStatusBadge status={account.status} />
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-5 pt-4">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Anlagebetrag</p>
              <p className="num mt-1 text-[28px] font-semibold leading-none tracking-tight text-[var(--ink)]">
                {formatAmount(account.principalAmount, account.currency, 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="num text-[22px] font-semibold leading-none text-[var(--accent)]">
                {formatPercent(account.interestRate)}
              </p>
              <p className="mt-1 text-[12px] text-[var(--muted)]">Zinssatz p. a.</p>
            </div>
          </div>

          <dl className="grid gap-x-6 gap-y-4 border-t border-[var(--line-soft)] px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Laufzeit" value={`${account.termMonths} Monate`} />
            <Fact label="Anlagebeginn" value={formatDate(account.startDate)} />
            <Fact label="Fälligkeit" value={formatDate(account.maturityDate)} />
            <Fact
              label="Auszahlungsbetrag"
              value={formatAmount(account.expectedTotal, account.currency, 0)}
            />
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-soft)] px-6 py-4">
            <span className="num text-[12.5px] text-[var(--muted)]">
              {remaining(account.maturityDate)} · Konto {account.accountNumber}
            </span>
            <Button size="sm" onClick={() => onOpen(account)}>
              Anlage ansehen
              <Icon name="back" className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        </article>
      ))}
    </div>
  )
}

/** Vollständige Ansicht einer einzelnen Anlage samt Bank und Unterlagen. */
export function InvestmentDetail({
  account,
  documents,
  onBack,
}: {
  account: Account
  documents: PortalDocument[]
  onBack: () => void
}) {
  const related = documents.filter((document) => document.accountId === account.id)

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
      >
        <Icon name="back" className="h-4 w-4" />
        Zurück zu meinen Anlagen
      </button>

      <section className="rounded-2xl border border-[var(--line)] bg-white px-6 py-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {account.bank && <BankLogo bank={account.bank} size={44} />}
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight text-[var(--ink)]">
                {account.bank?.name ?? "Festgeldanlage"}
              </h1>
              <p className="num mt-1 text-[13px] text-[var(--muted)]">
                {account.productName} · Konto {account.accountNumber}
              </p>
            </div>
          </div>
          <AccountStatusBadge status={account.status} />
        </div>

        <div className="mt-6 grid gap-5 border-t border-[var(--line-soft)] pt-5 sm:grid-cols-3">
          <Headline label="Anlagebetrag" value={formatAmount(account.principalAmount, account.currency, 0)} />
          <Headline label="Zinssatz p. a." value={formatPercent(account.interestRate)} accent />
          <Headline
            label="Auszahlung bei Fälligkeit"
            value={formatAmount(account.expectedTotal, account.currency, 0)}
          />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Anlageinformationen">
          <dl className="divide-y divide-[var(--line-soft)]">
            <Row label="Anlagebetrag" value={formatAmount(account.principalAmount, account.currency)} />
            <Row label="Währung" value={account.currency} />
            <Row label="Zinssatz" value={`${formatPercent(account.interestRate)} p. a.`} />
            <Row label="Zinsberechnung" value={interestMethodLabels[account.interestPaymentMethod]} />
            <Row label="Laufzeit" value={`${account.termMonths} Monate`} />
            <Row label="Anlagebeginn" value={formatDate(account.startDate)} />
            <Row label="Fälligkeit" value={`${formatDate(account.maturityDate)} (${remaining(account.maturityDate)})`} />
            <Row label="Erwartete Zinsen" value={formatAmount(account.interestAtMaturity, account.currency)} />
            <Row label="Erwarteter Endbetrag" value={formatAmount(account.expectedTotal, account.currency)} />
            {account.payoutDate && <Row label="Auszahlungsdatum" value={formatDate(account.payoutDate)} />}
          </dl>
        </Card>

        <Card title="Bankinformationen">
          {account.bank ? (
            <dl className="divide-y divide-[var(--line-soft)]">
              <Row label="Name" value={account.bank.name} />
              <Row label="Land" value={account.bank.country || "–"} />
              <Row label="Sitz" value={account.bank.city ?? "–"} />
              <Row label="Adresse" value={account.bank.address ?? "–"} />
              <Row label="BIC" value={account.bank.bic ?? "–"} />
              <Row
                label="Website"
                value={
                  account.bank.website ? (
                    <a
                      href={account.bank.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline"
                    >
                      {account.bank.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    "–"
                  )
                }
              />
            </dl>
          ) : (
            <EmptyState title="Bankangaben folgen" hint="Die Bank wird von Pick The Bank ergänzt." />
          )}
        </Card>
      </div>

      <Card title="Unterlagen zu dieser Anlage" subtitle="Vertrag, Bestätigungen und weitere Dokumente">
        {related.length === 0 ? (
          <EmptyState title="Noch keine Unterlagen" hint="Sobald Dokumente vorliegen, erscheinen sie hier." />
        ) : (
          <ul className="divide-y divide-[var(--line-soft)]">
            {related.map((document) => (
              <DocumentRow key={document.id} document={document} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export function DocumentRow({
  document,
  onDelete,
}: {
  document: PortalDocument
  onDelete?: (document: PortalDocument) => void
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-4">
      <span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-[var(--accent-soft)] text-[11px] font-semibold text-[var(--accent)]">
        {fileTypeOf(document.filename).slice(0, 4)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-[var(--ink)]">{document.title}</div>
        <div className="text-[12.5px] text-[var(--muted)]">
          {documentCategoryLabels[document.category]}
          {document.docType ? ` · ${documentTypeLabel(document.docType)}` : ""} ·{" "}
          {formatDate(document.uploadedAt.slice(0, 10))} · {formatFileSize(document.sizeBytes)}
        </div>
      </div>
      {document.downloadUrl ? (
        <span className="flex flex-none items-center gap-3">
          <a
            href={document.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-semibold text-[var(--accent)] hover:underline"
          >
            Anzeigen
          </a>
          <a
            href={`${document.downloadUrl}?download=1`}
            className="text-[13px] font-semibold text-[var(--accent)] hover:underline"
          >
            Herunterladen
          </a>
        </span>
      ) : (
        <span className="text-[12.5px] text-[var(--faint)]">Datei folgt</span>
      )}
      {onDelete && document.uploadedByRole === "CUSTOMER" && (
        <Button size="sm" variant="ghost" onClick={() => onDelete(document)}>
          Löschen
        </Button>
      )}
    </li>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[var(--faint)]">{label}</dt>
      <dd className="num mt-1 text-[14px] font-medium text-[var(--ink)]">{value}</dd>
    </div>
  )
}

function Headline({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[12.5px] text-[var(--muted)]">{label}</p>
      <p
        className={`num mt-1 text-[24px] font-semibold leading-none tracking-tight ${
          accent ? "text-[var(--accent)]" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3">
      <dt className="text-[13px] text-[var(--muted)]">{label}</dt>
      <dd className="num text-[13.5px] font-medium text-[var(--ink)]">{value}</dd>
    </div>
  )
}
