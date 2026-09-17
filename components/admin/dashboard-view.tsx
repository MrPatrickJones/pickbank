"use client"

import { useMemo } from "react"

import { Icon } from "@/components/admin/icons"
import {
  Badge,
  Button,
  Card,
  CustomerStatusBadge,
  EmptyState,
  Kpi,
  PageHeader,
  Table,
  cell,
  cellRight,
  cellStrong,
  rowClass,
} from "@/components/ui/primitives"
import { formatDate, formatDateTime, formatEuro, formatPercent } from "@/lib/format"
import { TODAY, daysToMaturity, effectiveStatus, portfolioKpis } from "@/lib/finance"
import { useData } from "@/lib/store"
import { useSession } from "@/lib/session"

export function DashboardView({ onOpenCustomer, onNavigate }: { onOpenCustomer: (id: string) => void; onNavigate: (view: string) => void }) {
  const { customers, investments, activities } = useData()
  const { user } = useSession()

  const kpis = useMemo(() => portfolioKpis(customers, investments), [customers, investments])

  const maturing = useMemo(
    () =>
      investments
        .filter((investment) => {
          const days = daysToMaturity(investment)
          return effectiveStatus(investment) !== "beendet" && days >= -30 && days <= 90
        })
        .sort((a, b) => a.maturityDate.localeCompare(b.maturityDate))
        .slice(0, 6),
    [investments],
  )

  const openTasks = useMemo(
    () => customers.filter((customer) => customer.status === "pruefung" || customer.status === "ausstehend").slice(0, 5),
    [customers],
  )

  const firstName = user?.name.split(" ")[0] ?? ""

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Guten Tag, ${firstName}`}
        subtitle="Übersicht über Kunden, Anlagen und aktuelle Aktivitäten."
        actions={
          <>
            <Button onClick={() => onNavigate("activities")}>Aktivitäten</Button>
            <Button variant="primary" onClick={() => onNavigate("customers:new")}>
              <Icon name="plus" className="h-4 w-4" />
              Neuer Kunde
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Kpi label="Kunden" value={String(kpis.customerCount)} hint={`${kpis.activeCustomers} aktiv`} />
        <Kpi label="Aktive Anlagen" value={String(kpis.activeInvestments)} hint="laufende Verträge" />
        <Kpi label="Anlagevolumen" value={formatEuro(kpis.volume, 0)} tone="accent" hint="verwaltetes Kapital" />
        <Kpi
          label="Fällige Anlagen"
          value={String(kpis.maturingSoon)}
          tone="warn"
          hint={`${formatEuro(kpis.maturingVolume, 0)} in 60 Tagen`}
        />
        <Kpi label="Ausstehende Aktionen" value={String(kpis.openActions)} tone="warn" hint="Prüfungen und Fälligkeiten" />
        <Kpi label="Neue Kunden" value={String(kpis.newCustomers)} hint="letzte 90 Tage" />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Anstehende Fälligkeiten"
          subtitle="Nächste 90 Tage – inklusive bereits fälliger Anlagen"
          action={
            <Button size="sm" onClick={() => onNavigate("payouts")}>
              Auszahlungen
            </Button>
          }
        >
          {maturing.length === 0 ? (
            <EmptyState title="Keine Fälligkeiten im Zeitraum" />
          ) : (
            <Table
              minWidth={860}
              headers={[
                "Kunde",
                "Anlage",
                { label: "Betrag", align: "right" },
                { label: "Zins", align: "right" },
                "Fälligkeit",
                "Status",
              ]}
            >
              {maturing.map((investment) => {
                const customer = customers.find((entry) => entry.id === investment.customerId)
                const days = daysToMaturity(investment)
                return (
                  <tr key={investment.id} className={`${rowClass} cursor-pointer`} onClick={() => onOpenCustomer(investment.customerId)}>
                    <td className={cellStrong}>{customer ? `${customer.firstName} ${customer.lastName}` : "–"}</td>
                    <td className={cell}>{investment.investmentNumber}</td>
                    <td className={cellRight}>{formatEuro(investment.principal, 0)}</td>
                    <td className={cellRight}>{formatPercent(investment.interestRate)}</td>
                    <td className={`${cell} whitespace-nowrap`}>
                      <span className="num">{formatDate(investment.maturityDate)}</span>
                      <span className="ml-2 text-[12px] text-[var(--faint)]">
                        {days < 0 ? `${Math.abs(days)} Tage überfällig` : `in ${days} Tagen`}
                      </span>
                    </td>
                    <td className={cell}>
                      {days < 0 ? <Badge tone="warn">Fällig</Badge> : <Badge tone="good">Aktiv</Badge>}
                    </td>
                  </tr>
                )
              })}
            </Table>
          )}
        </Card>

        <Card title="Letzte Aktivitäten" subtitle={`Stand ${formatDate(TODAY)}`} action={<Button size="sm" onClick={() => onNavigate("activities")}>Alle</Button>}>
          <ul className="divide-y divide-[var(--line-soft)]">
            {activities.slice(0, 6).map((activity) => (
              <li key={activity.id} className="px-5 py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-semibold text-[var(--ink)]">{activity.action}</span>
                  <span className="num flex-none text-[12px] text-[var(--faint)]">{formatDateTime(activity.timestamp)}</span>
                </div>
                <p className="mt-1 text-[13px] leading-snug text-[var(--body)]">{activity.description}</p>
                <p className="mt-1 text-[12px] text-[var(--faint)]">{activity.user}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        title="Ausstehende Aktionen"
        subtitle="Kunden in Prüfung oder mit offener Legitimation"
        action={
          <Button size="sm" onClick={() => onNavigate("customers")}>
            Alle Kunden
          </Button>
        }
      >
        {openTasks.length === 0 ? (
          <EmptyState title="Keine offenen Vorgänge" hint="Alle Kunden sind vollständig geprüft." />
        ) : (
          <ul className="divide-y divide-[var(--line-soft)]">
            {openTasks.map((customer) => (
              <li key={customer.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-[var(--ink)]">
                    {customer.firstName} {customer.lastName}
                    <span className="num ml-2 text-[12.5px] font-normal text-[var(--faint)]">{customer.customerNumber}</span>
                  </div>
                  <div className="text-[12.5px] text-[var(--muted)]">
                    {customer.kycStatus === "geprueft" ? "Legitimation abgeschlossen" : "Legitimationsprüfung offen"} ·{" "}
                    {customer.country}
                  </div>
                </div>
                <CustomerStatusBadge status={customer.status} />
                <Button size="sm" onClick={() => onOpenCustomer(customer.id)}>
                  Öffnen
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
