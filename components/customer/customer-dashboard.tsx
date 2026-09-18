"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Icon } from "@/components/admin/icons"
import { ChangePasswordModal } from "@/components/admin/settings-view"
import { AccountStatusBadge, Button, Card, EmptyState, ErrorState, LoadingState } from "@/components/ui/primitives"
import { useToast } from "@/components/ui/overlays"
import { api } from "@/lib/api"
import { daysUntil, formatAmount, formatDate, formatDateTime, formatPercent } from "@/lib/format"
import { documentCategoryLabels, interestMethodLabels } from "@/lib/labels"
import { useSession } from "@/lib/session"
import { useResource } from "@/lib/use-resource"
import type { CustomerPortalData } from "@/lib/types"

/**
 * The customer view is deliberately plain: the deposits, the documents and the
 * messages – nothing else. Everything shown here is read-only.
 */
export function CustomerDashboard() {
  const router = useRouter()
  const { signOut } = useSession()
  const toast = useToast()
  const [passwordOpen, setPasswordOpen] = useState(false)

  const { data, loading, error, reload } = useResource<CustomerPortalData>(() => api.get<CustomerPortalData>("/api/me"))

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <a
            href="https://www.pickthebank.eu"
            target="_blank"
            rel="noopener noreferrer"
            title="www.pickthebank.eu"
            className="inline-flex rounded-md transition-opacity hover:opacity-80"
          >
            <Image src="/logo.png" alt="Pick The Bank" width={230} height={46} priority className="h-[34px] w-auto" />
          </a>
          <span className="hidden text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--faint)] sm:block">
            Festgeldanlagen
          </span>

          <Button
            size="sm"
            className="ml-auto"
            onClick={async () => {
              await signOut()
              router.replace("/login")
            }}
          >
            <Icon name="logout" className="h-4 w-4" />
            Abmelden
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] space-y-6 px-4 py-8 sm:px-6">
        {loading && !data && <Card><LoadingState /></Card>}
        {error && <Card><ErrorState message={error} onRetry={reload} /></Card>}

        {data && (
          <>
            {data.login?.mustChangePassword && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--warn)] bg-[var(--warn-soft)] px-5 py-4">
                <p className="text-[13.5px] font-medium text-[var(--warn)]">
                  Bitte vergeben Sie ein eigenes Passwort – Sie melden sich noch mit dem Startpasswort an.
                </p>
                <Button size="sm" onClick={() => setPasswordOpen(true)}>
                  Jetzt ändern
                </Button>
              </div>
            )}

            <div>
              <h1 className="text-[26px] font-semibold tracking-tight text-[var(--ink)]">
                Guten Tag, {data.customer.firstName}
              </h1>
              <p className="mt-1.5 text-[14.5px] text-[var(--muted)]">Ihre Festgeldanlagen bei Pick The Bank.</p>
            </div>

            {/* One headline figure, three facts – the whole summary. */}
            <section className="rounded-2xl border border-[var(--line)] bg-white px-6 py-6 shadow-card">
              <p className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Ihre Anlagesumme</p>
              <p className="num mt-2 text-[40px] font-semibold leading-none tracking-tight text-[var(--ink)]">
                {formatAmount(data.totals.principal, "EUR", 0)}
              </p>
              <dl className="mt-6 grid gap-5 border-t border-[var(--line-soft)] pt-5 sm:grid-cols-3">
                {[
                  ["Zinssatz", formatPercent(data.totals.averageRate)],
                  ["Nächste Fälligkeit", data.totals.nextMaturity ? formatDate(data.totals.nextMaturity) : "–"],
                  ["Zinsertrag bei Laufzeitende", formatAmount(data.totals.expectedInterest, "EUR", 0)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[12.5px] text-[var(--muted)]">{label}</dt>
                    <dd className="num mt-1 text-[18px] font-semibold text-[var(--ink)]">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="space-y-3">
              <h2 className="text-[15px] font-semibold text-[var(--ink)]">
                {data.accounts.length === 1 ? "Ihre Anlage" : "Ihre Anlagen"}
              </h2>

              {data.accounts.length === 0 ? (
                <Card>
                  <EmptyState title="Noch keine Anlage" hint="Ihre Betreuung meldet sich bei Ihnen." />
                </Card>
              ) : (
                data.accounts.map((account) => {
                  const days = daysUntil(account.maturityDate)
                  return (
                    <article key={account.id} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-card">
                      <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
                        <div>
                          <p className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                            {account.productName}
                          </p>
                          <p className="num mt-1.5 text-[28px] font-semibold leading-none tracking-tight text-[var(--ink)]">
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
                        {[
                          ["Laufzeit", `${account.termMonths} Monate`],
                          ["Zeitraum", `${formatDate(account.startDate)} – ${formatDate(account.maturityDate)}`],
                          ["Zinszahlung", interestMethodLabels[account.interestPaymentMethod]],
                          ["Zinsertrag bei Laufzeitende", formatAmount(account.interestAtMaturity, account.currency)],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[var(--faint)]">{label}</dt>
                            <dd className="num mt-1 text-[14px] font-medium text-[var(--ink)]">{value}</dd>
                          </div>
                        ))}
                      </dl>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-soft)] px-6 py-4">
                        <span className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
                          <AccountStatusBadge status={account.status} />
                          <span className="num">
                            {days > 0 ? `noch ${days} Tage` : days === 0 ? "heute fällig" : `${Math.abs(days)} Tage über Fälligkeit`}
                          </span>
                        </span>
                        <span className="num text-[12.5px] text-[var(--faint)]">
                          Konto {account.accountNumber}
                        </span>
                      </div>
                    </article>
                  )
                })
              )}
            </section>

            {data.documents.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[15px] font-semibold text-[var(--ink)]">Ihre Dokumente</h2>
                <Card>
                  <ul className="divide-y divide-[var(--line-soft)]">
                    {data.documents.map((document) => (
                      <li key={document.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                          <Icon name="documents" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold text-[var(--ink)]">{document.filename}</div>
                          <div className="text-[12.5px] text-[var(--muted)]">
                            {documentCategoryLabels[document.category]} · {formatDate(document.uploadedAt.slice(0, 10))}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => toast("Der Download wird über Ihre Betreuung bereitgestellt.", "info")}>
                          <Icon name="download" className="h-4 w-4" />
                          Öffnen
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            )}

            {data.messages.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[15px] font-semibold text-[var(--ink)]">Nachrichten</h2>
                <Card>
                  <ul className="divide-y divide-[var(--line-soft)]">
                    {data.messages.map((message) => (
                      <li key={message.id} className="px-5 py-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-[14px] font-semibold text-[var(--ink)]">{message.subject}</span>
                          <span className="num text-[12.5px] text-[var(--faint)]">{formatDateTime(message.sentAt)}</span>
                        </div>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--body)]">{message.body}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            )}

            <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface-sunken)] px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-[13px] leading-relaxed text-[var(--muted)]">
                  <p className="font-semibold text-[var(--ink)]">
                    {data.customer.firstName} {data.customer.lastName}
                    <span className="num ml-2 font-normal text-[var(--muted)]">Kundennummer {data.customer.customerNumber}</span>
                  </p>
                  <p className="mt-1">
                    Änderungen an Ihren Daten und Anlagen nimmt Pick The Bank vor. Ihr Passwort ändern Sie selbst.
                  </p>
                </div>
                <Button size="sm" onClick={() => setPasswordOpen(true)}>
                  Passwort ändern
                </Button>
              </div>
            </section>
          </>
        )}
      </main>

      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onDone={async () => {
          toast("Ihr Passwort wurde geändert.")
          await reload()
        }}
      />
    </div>
  )
}
