"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Icon } from "@/components/admin/icons"
import {
  Badge,
  Button,
  Card,
  EmptyState,
  InvestmentStatusBadge,
  Kpi,
  Table,
  Tabs,
  cell,
  cellRight,
  cellStrong,
  rowClass,
} from "@/components/ui/primitives"
import { Modal, useToast } from "@/components/ui/overlays"
import { Field, TextInput } from "@/components/ui/form"
import { formatDate, formatDateTime, formatEuro, formatFileSize, formatPercent, initialsOf } from "@/lib/format"
import { currentValue, customerTotals, daysToMaturity, effectiveStatus, interestAtMaturity } from "@/lib/finance"
import { useData } from "@/lib/store"
import { useSession } from "@/lib/session"
import { documentCategoryLabels as categoryLabels, interestPaymentLabels, productLabels } from "@/lib/labels"



export function CustomerDashboard() {
  const router = useRouter()
  const { user, signOut } = useSession()
  const { customerById, investmentsOf, documentsOf, messagesOf, markMessageRead, accountOf, changeOwnPassword } =
    useData()
  const toast = useToast()
  const [tab, setTab] = useState("overview")
  const [passwordOpen, setPasswordOpen] = useState(false)

  // The session carries exactly one customer id – nothing else is reachable.
  const customerId = user?.customerId ?? ""
  const customer = customerById(customerId)
  const investments = useMemo(() => investmentsOf(customerId), [investmentsOf, customerId])
  const documents = useMemo(() => documentsOf(customerId), [documentsOf, customerId])
  const messages = useMemo(() => messagesOf(customerId), [messagesOf, customerId])
  const totals = useMemo(() => customerTotals(investments), [investments])
  const account = accountOf(customerId)

  if (!customer) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Card>
          <EmptyState title="Kein Kundenkonto verknüpft" hint="Bitte wenden Sie sich an Ihre Betreuung." />
        </Card>
      </div>
    )
  }

  const main = [...investments]
    .filter((investment) => effectiveStatus(investment) !== "beendet")
    .sort((a, b) => b.principal - a.principal)[0]

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <a
            href="https://www.pickthebank.eu"
            target="_blank"
            rel="noopener noreferrer"
            title="www.pickthebank.eu"
            className="inline-flex rounded-md transition-opacity hover:opacity-80"
          >
            <Image src="/logo.png" alt="Pick The Bank – zur Website" width={230} height={46} priority className="h-[36px] w-auto" />
          </a>
          <div className="ml-auto flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--navy)] text-[12px] font-semibold text-white">
              {initialsOf(customer.firstName, customer.lastName)}
            </span>
            <div className="hidden sm:block">
              <div className="text-[13.5px] font-semibold text-[var(--ink)]">
                {customer.firstName} {customer.lastName}
              </div>
              <div className="num text-[12px] text-[var(--muted)]">{customer.customerNumber}</div>
            </div>
            <Button size="sm" onClick={() => setPasswordOpen(true)}>
              Passwort ändern
            </Button>
            <Button
              size="sm"
              onClick={() => {
                signOut("manual")
                router.replace("/login")
              }}
            >
              <Icon name="logout" className="h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] space-y-5 px-4 py-6 sm:px-6">
        {account?.mustChangePassword && (
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
          <h1 className="text-[27px] font-semibold tracking-tight text-[var(--ink)]">Willkommen, {customer.firstName}</h1>
          <p className="mt-1.5 text-sm text-[var(--muted)]">Ihre Anlagen bei Pick The Bank auf einen Blick.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Gesamtanlage" value={formatEuro(totals.principal, 0)} tone="accent" hint={`${investments.length} Verträge`} />
          <Kpi label="Aktiver Zinssatz" value={formatPercent(totals.averageRate)} hint="gewichteter Durchschnitt" />
          <Kpi label="Nächste Fälligkeit" value={totals.nextMaturity ? formatDate(totals.nextMaturity) : "–"} hint="nächste auslaufende Anlage" />
          <Kpi label="Voraussichtlicher Zinsertrag" value={formatEuro(totals.expectedInterest, 0)} tone="good" hint="bei Laufzeitende" />
        </div>

        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "overview", label: "Meine Anlagen" },
            { id: "documents", label: "Dokumente", count: documents.length },
            { id: "messages", label: "Nachrichten", count: messages.length },
            { id: "profile", label: "Meine Daten" },
          ]}
        />

        {tab === "overview" && (
          <div className="space-y-5">
            {main && (
              <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4 bg-[var(--navy)] px-6 py-5 text-white">
                  <div>
                    <p className="text-[12.5px] uppercase tracking-[0.1em] text-white/60">
                      {productLabels[main.productType]}anlage
                    </p>
                    <p className="num mt-1.5 text-[32px] font-semibold leading-none tracking-tight">{formatEuro(main.principal, 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="num text-[24px] font-semibold leading-none">{formatPercent(main.interestRate)}</p>
                    <p className="mt-1 text-[12.5px] text-white/60">p. a.</p>
                  </div>
                </div>

                <dl className="grid gap-x-6 gap-y-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Laufzeit", `${main.term} Monate`],
                    ["Zeitraum", `${formatDate(main.startDate)} → ${formatDate(main.maturityDate)}`],
                    ["Zinszahlung", interestPaymentLabels[main.interestPayment]],
                    ["Zinsertrag bei Laufzeitende", formatEuro(interestAtMaturity(main))],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[var(--faint)]">{label}</dt>
                      <dd className="num mt-1 text-[14px] font-medium text-[var(--ink)]">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-soft)] px-6 py-4">
                  <div className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
                    Status: <InvestmentStatusBadge status={effectiveStatus(main)} />
                    <span className="num">
                      {daysToMaturity(main) >= 0 ? `noch ${daysToMaturity(main)} Tage` : `${Math.abs(daysToMaturity(main))} Tage über Fälligkeit`}
                    </span>
                  </div>
                  <span className="num text-[12.5px] text-[var(--faint)]">Referenzkonto: {main.referenceAccount}</span>
                </div>
              </section>
            )}

            <Card title="Alle Anlagen" subtitle="Ihre Verträge bei Pick The Bank">
              {investments.length === 0 ? (
                <EmptyState title="Noch keine Anlagen" hint="Ihre Betreuung meldet sich bei Ihnen." />
              ) : (
                <Table
                  minWidth={820}
                  headers={[
                    "Anlage",
                    { label: "Betrag", align: "right" },
                    { label: "Zinssatz", align: "right" },
                    "Laufzeit",
                    "Start",
                    "Fälligkeit",
                    { label: "Aktueller Wert", align: "right" },
                    "Status",
                  ]}
                >
                  {investments.map((investment) => (
                    <tr key={investment.id} className={rowClass}>
                      <td className={`${cellStrong} num`}>{investment.investmentNumber}</td>
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
        )}

        {tab === "documents" && (
          <Card title="Meine Dokumente" subtitle="Verträge, Bestätigungen und Nachweise">
            {documents.length === 0 ? (
              <EmptyState title="Keine Dokumente" hint="Sobald Unterlagen vorliegen, erscheinen sie hier." />
            ) : (
              <ul className="divide-y divide-[var(--line-soft)]">
                {documents.map((document) => (
                  <li key={document.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Icon name="documents" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-[var(--ink)]">{document.filename}</div>
                      <div className="text-[12.5px] text-[var(--muted)]">
                        {categoryLabels[document.category]} · {formatDate(document.uploadedAt.slice(0, 10))} ·{" "}
                        <span className="num">{formatFileSize(document.sizeKb)}</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => toast("Download ist im Prototyp nicht hinterlegt.", "info")}>
                      <Icon name="download" className="h-4 w-4" />
                      Herunterladen
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {tab === "messages" && (
          <Card title="Nachrichten" subtitle="Mitteilungen von Pick The Bank">
            {messages.length === 0 ? (
              <EmptyState title="Keine Nachrichten" />
            ) : (
              <ul className="divide-y divide-[var(--line-soft)]">
                {messages.map((message) => (
                  <li key={message.id} className="px-5 py-4" onMouseEnter={() => !message.read && markMessageRead(message.id)}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[14px] font-semibold text-[var(--ink)]">{message.subject}</span>
                      <span className="num text-[12.5px] text-[var(--faint)]">{formatDateTime(message.sentAt)}</span>
                    </div>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--body)]">{message.body}</p>
                    <p className="mt-2 flex items-center gap-2 text-[12.5px] text-[var(--faint)]">
                      Pick The Bank · {message.sentBy}
                      {!message.read && <Badge tone="info">Neu</Badge>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {tab === "profile" && (
          <Card title="Meine Daten" subtitle="Änderungen nimmt Ihre Betreuung nach Legitimationsprüfung vor.">
            <dl className="divide-y divide-[var(--line-soft)]">
              {[
                ["Name", `${customer.firstName} ${customer.lastName}`],
                ["Kundennummer", customer.customerNumber],
                ["E-Mail", customer.email],
                ["Mobiltelefon", customer.mobile || "–"],
                ["Adresse", `${customer.address}, ${customer.postalCode} ${customer.city}, ${customer.country}`],
                ["Kunde seit", formatDate(customer.createdAt.slice(0, 10))],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3.5">
                  <dt className="text-[13px] text-[var(--muted)]">{label}</dt>
                  <dd className="text-[13.5px] font-medium text-[var(--ink)]">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        <p className="pb-6 text-[12.5px] leading-relaxed text-[var(--faint)]">
          Sie haben Lesezugriff auf Ihre eigenen Daten. Änderungen an Stammdaten und Anlagen nimmt ausschließlich Pick
          The Bank nach Legitimationsprüfung vor. Ihr Passwort können Sie jederzeit selbst ändern.
          <br />
          Prototyp mit Demodaten · Alle Beträge werden aus Anlagebetrag, Zinssatz und Laufzeit berechnet.
        </p>

        <ChangePasswordModal
          open={passwordOpen}
          accountId={account?.id ?? null}
          onClose={() => setPasswordOpen(false)}
          onSubmit={changeOwnPassword}
          onDone={() => toast("Ihr Passwort wurde geändert.")}
        />
      </main>
    </div>
  )
}

function ChangePasswordModal({
  open,
  accountId,
  onClose,
  onSubmit,
  onDone,
}: {
  open: boolean
  accountId: string | null
  onClose: () => void
  onSubmit: (accountId: string, currentPassword: string, newPassword: string) => Promise<boolean>
  onDone: () => void
}) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [repeat, setRepeat] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const found: Record<string, string> = {}
    if (!current) found.current = "Bitte geben Sie Ihr aktuelles Passwort ein."
    if (next.trim().length < 10) found.next = "Das neue Passwort muss mindestens 10 Zeichen haben."
    if (next !== repeat) found.repeat = "Die Eingaben stimmen nicht überein."
    setErrors(found)
    if (Object.keys(found).length || !accountId) return

    setBusy(true)
    const ok = await onSubmit(accountId, current, next)
    setBusy(false)

    if (!ok) {
      setErrors({ current: "Das aktuelle Passwort ist nicht korrekt." })
      return
    }

    setCurrent("")
    setNext("")
    setRepeat("")
    onDone()
    onClose()
  }

  return (
    <Modal
      open={open}
      title="Passwort ändern"
      subtitle="Ihr Passwort kennt nur Sie – Pick The Bank kann es lediglich neu vergeben."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" disabled={busy} onClick={() => void save()}>
            {busy ? "Wird gespeichert …" : "Passwort speichern"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Aktuelles Passwort" required error={errors.current}>
          <TextInput
            type="password"
            autoComplete="current-password"
            value={current}
            invalid={Boolean(errors.current)}
            onChange={(event) => setCurrent(event.target.value)}
          />
        </Field>
        <Field label="Neues Passwort" required error={errors.next} hint="Mindestens 10 Zeichen">
          <TextInput
            type="password"
            autoComplete="new-password"
            value={next}
            invalid={Boolean(errors.next)}
            onChange={(event) => setNext(event.target.value)}
          />
        </Field>
        <Field label="Neues Passwort wiederholen" required error={errors.repeat}>
          <TextInput
            type="password"
            autoComplete="new-password"
            value={repeat}
            invalid={Boolean(errors.repeat)}
            onChange={(event) => setRepeat(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}
