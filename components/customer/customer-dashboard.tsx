"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Icon } from "@/components/admin/icons"
import { ChangePasswordModal } from "@/components/admin/settings-view"
import { CustomerDocuments } from "@/components/customer/documents-view"
import { InvestmentDetail, InvestmentList } from "@/components/customer/investments"
import { CustomerProfile } from "@/components/customer/profile-view"
import { Button, Card, ErrorState, LoadingState } from "@/components/ui/primitives"
import { useToast } from "@/components/ui/overlays"
import { api } from "@/lib/api"
import { daysUntil, formatAmount, formatDate, formatDateTime, formatPercent } from "@/lib/format"
import { documentCategoryLabels, documentCategoryOptions } from "@/lib/labels"
import { useSession } from "@/lib/session"
import { useResource } from "@/lib/use-resource"
import type { Account, CustomerPortalData } from "@/lib/types"

type View = "overview" | "investments" | "documents" | "profile" | "messages"

const NAV: { id: View; label: string }[] = [
  { id: "overview", label: "Übersicht" },
  { id: "investments", label: "Meine Festgeldanlagen" },
  { id: "documents", label: "Meine Dokumente" },
  { id: "profile", label: "Meine Daten" },
  { id: "messages", label: "Nachrichten" },
]

/**
 * Die digitale Kundenakte. Alles, was der Kunde sieht, gehört ihm – die Daten
 * kommen aus /api/me, das ausschliesslich die eigene Akte ausliefert. Ändern
 * kann der Kunde nur sein Passwort und seine eigenen Dokumente.
 */
export function CustomerDashboard() {
  const router = useRouter()
  const { signOut } = useSession()
  const toast = useToast()

  const [view, setView] = useState<View>("overview")
  const [openAccount, setOpenAccount] = useState<Account | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const { data, loading, error, reload } = useResource<CustomerPortalData>(() => api.get<CustomerPortalData>("/api/me"))

  const go = (next: View) => {
    setView(next)
    setOpenAccount(null)
    window.scrollTo({ top: 0 })
  }

  const unread = data?.messages.filter((message) => !message.readAt).length ?? 0

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
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

        <nav className="mx-auto flex max-w-[1100px] gap-1 overflow-x-auto px-2 sm:px-4">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              aria-current={view === item.id}
              className={`flex-none whitespace-nowrap border-b-2 px-3 py-3 text-[13.5px] transition-colors ${
                view === item.id
                  ? "border-[var(--accent)] font-semibold text-[var(--accent)]"
                  : "border-transparent font-medium text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {item.label}
              {item.id === "messages" && unread > 0 && (
                <span className="num ml-1.5 rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                  {unread}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 px-4 py-8 sm:px-6">
        {loading && !data && (
          <Card>
            <LoadingState />
          </Card>
        )}
        {error && (
          <Card>
            <ErrorState message={error} onRetry={reload} />
          </Card>
        )}

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

            {view === "overview" && (
              <Overview
                data={data}
                onOpenAccount={(account) => {
                  setView("investments")
                  setOpenAccount(account)
                }}
                onNavigate={go}
              />
            )}

            {view === "investments" &&
              (openAccount ? (
                <InvestmentDetail
                  account={data.accounts.find((entry) => entry.id === openAccount.id) ?? openAccount}
                  documents={data.documents}
                  onBack={() => setOpenAccount(null)}
                />
              ) : (
                <>
                  <div>
                    <h2 className="text-[18px] font-semibold text-[var(--ink)]">Meine Festgeldanlagen</h2>
                    <p className="mt-1 text-[13.5px] text-[var(--muted)]">
                      {data.accounts.length === 1
                        ? "Eine Anlage in Ihrer Akte."
                        : `${data.accounts.length} Anlagen in Ihrer Akte.`}
                    </p>
                  </div>
                  <InvestmentList accounts={data.accounts} onOpen={setOpenAccount} />
                </>
              ))}

            {view === "documents" && (
              <CustomerDocuments documents={data.documents} accounts={data.accounts} onChanged={reload} />
            )}

            {view === "profile" && <CustomerProfile customer={data.customer} />}

            {view === "messages" && <Messages data={data} />}

            <section className="rounded-2xl border border-[var(--line)] bg-white px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-[13px] leading-relaxed text-[var(--muted)]">
                  <p className="font-semibold text-[var(--ink)]">
                    {data.customer.firstName} {data.customer.lastName}
                    <span className="num ml-2 font-normal text-[var(--muted)]">
                      Kundennummer {data.customer.customerNumber}
                    </span>
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

/** Die Startseite der Akte: wenige Zahlen, die nächste Fälligkeit, die Unterlagen. */
function Overview({
  data,
  onOpenAccount,
  onNavigate,
}: {
  data: CustomerPortalData
  onOpenAccount: (account: Account) => void
  onNavigate: (view: View) => void
}) {
  const next = [...data.accounts]
    .filter((account) => daysUntil(account.maturityDate) >= 0)
    .sort((a, b) => a.maturityDate.localeCompare(b.maturityDate))[0]

  return (
    <>
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-[var(--ink)]">
          Guten Tag, {data.customer.firstName}
        </h1>
        <p className="mt-1.5 text-[14.5px] text-[var(--muted)]">Ihre Festgeldanlagen bei Pick The Bank.</p>
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-white px-6 py-6 shadow-card">
        <p className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Ihre Anlagesumme</p>
        <p className="num mt-2 text-[40px] font-semibold leading-none tracking-tight text-[var(--ink)]">
          {formatAmount(data.totals.principal, "EUR", 0)}
        </p>
        <dl className="mt-6 grid gap-5 border-t border-[var(--line-soft)] pt-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "Anlagen",
              data.totals.accountCount === 1 ? "1 Anlage" : `${data.totals.accountCount} Anlagen`,
            ],
            ["Durchschnittlicher Zinssatz", formatPercent(data.totals.averageRate)],
            ["Nächste Fälligkeit", data.totals.nextMaturity ? formatDate(data.totals.nextMaturity) : "–"],
            ["Erwartete Gesamtzinsen", formatAmount(data.totals.expectedInterest, "EUR", 0)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[12.5px] text-[var(--muted)]">{label}</dt>
              <dd className="num mt-1 text-[18px] font-semibold text-[var(--ink)]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {next && (
        <Card title="Nächste Fälligkeit">
          <button
            type="button"
            onClick={() => onOpenAccount(next)}
            className="flex w-full flex-wrap items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--surface-sunken)]"
          >
            <div>
              <p className="text-[14.5px] font-semibold text-[var(--ink)]">{next.bank?.name ?? next.productName}</p>
              <p className="num mt-1 text-[13px] text-[var(--muted)]">
                {formatAmount(next.principalAmount, next.currency, 0)} · {formatPercent(next.interestRate)} ·{" "}
                {next.termMonths} Monate
              </p>
            </div>
            <div className="text-right">
              <p className="num text-[16px] font-semibold text-[var(--ink)]">{formatDate(next.maturityDate)}</p>
              <p className="num mt-1 text-[12.5px] text-[var(--muted)]">in {daysUntil(next.maturityDate)} Tagen</p>
            </div>
          </button>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-[var(--ink)]">
            {data.accounts.length === 1 ? "Ihre Anlage" : "Ihre Anlagen"}
          </h2>
          {data.accounts.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate("investments")}
              className="text-[13px] font-semibold text-[var(--accent)] hover:underline"
            >
              Alle ansehen
            </button>
          )}
        </div>
        <InvestmentList accounts={data.accounts} onOpen={onOpenAccount} />
      </section>

      <Card
        title="Meine Dokumente"
        subtitle={
          data.documentCounts.total === 1
            ? "1 Dokument in Ihrer Akte"
            : `${data.documentCounts.total} Dokumente in Ihrer Akte`
        }
        action={
          <Button size="sm" onClick={() => onNavigate("documents")}>
            Öffnen
          </Button>
        }
      >
        <ul className="grid gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
          {documentCategoryOptions.map((option) => (
            <li key={option.value} className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="text-[var(--muted)]">{documentCategoryLabels[option.value]}</span>
              <span className="num font-semibold text-[var(--ink)]">
                {data.documentCounts.byCategory[option.value] ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

function Messages({ data }: { data: CustomerPortalData }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[18px] font-semibold text-[var(--ink)]">Nachrichten</h2>
        <p className="mt-1 text-[13.5px] text-[var(--muted)]">Mitteilungen von Pick The Bank an Sie.</p>
      </div>

      {data.messages.length === 0 ? (
        <Card>
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-semibold text-[var(--ink)]">Keine Nachrichten</p>
            <p className="mt-1.5 text-[13px] text-[var(--muted)]">Sobald wir Ihnen schreiben, erscheint es hier.</p>
          </div>
        </Card>
      ) : (
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
      )}
    </div>
  )
}
