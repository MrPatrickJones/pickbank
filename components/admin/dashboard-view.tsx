"use client"

import { Icon } from "@/components/admin/icons"
import {
  AccountStatusBadge,
  Button,
  Card,
  CustomerStatusBadge,
  EmptyState,
  ErrorState,
  Kpi,
  LoadingState,
  PageHeader,
  Table,
  cell,
  cellRight,
  cellStrong,
  rowClass,
} from "@/components/ui/primitives"
import { api } from "@/lib/api"
import { daysUntil, formatAmount, formatDate, formatDateTime, formatPercent } from "@/lib/format"
import { useSession } from "@/lib/session"
import { useResource } from "@/lib/use-resource"
import type { DashboardData } from "@/lib/types"

export function DashboardView({
  onOpenCustomer,
  onNavigate,
}: {
  onOpenCustomer: (id: number) => void
  onNavigate: (view: string) => void
}) {
  const { user } = useSession()
  const { data, loading, error, reload } = useResource<DashboardData>(() => api.get<DashboardData>("/api/dashboard"))

  const firstName = user?.fullName.split(" ")[0] ?? ""

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Guten Tag, ${firstName}`}
        subtitle="Übersicht über Kunden, Festgeldkonten und aktuelle Aktivitäten."
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

      {loading && !data && <Card><LoadingState /></Card>}
      {error && <Card><ErrorState message={error} onRetry={reload} /></Card>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <Kpi label="Kunden" value={String(data.summary.customers.total)} hint={`${data.summary.customers.active} aktiv`} />
            <Kpi
              label="Ausstehende Kunden"
              value={String(data.summary.customers.pending)}
              tone="warn"
              hint="Legitimation offen"
            />
            <Kpi label="Aktive Konten" value={String(data.summary.accounts.active)} hint={`${data.summary.accounts.total} gesamt`} />
            <Kpi label="Anlagevolumen" value={formatAmount(data.summary.accounts.volume, "EUR", 0)} tone="accent" hint="verwaltetes Kapital" />
            <Kpi
              label="Fällige Konten"
              value={String(data.summary.accounts.maturingSoon)}
              tone="warn"
              hint={`${formatAmount(data.summary.accounts.maturingVolume, "EUR", 0)} in 60 Tagen`}
            />
            <Kpi label="Neue Kunden" value={String(data.summary.customers.recent)} hint="letzte 90 Tage" />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <Card
              className="xl:col-span-2"
              title="Anstehende Fälligkeiten"
              subtitle="Konten mit der nächsten Fälligkeit"
              action={
                <Button size="sm" onClick={() => onNavigate("payouts")}>
                  Auszahlungen
                </Button>
              }
            >
              {data.maturingAccounts.length === 0 ? (
                <EmptyState title="Keine Fälligkeiten" hint="Derzeit laufen keine Konten aus." />
              ) : (
                <Table
                  minWidth={860}
                  headers={[
                    "Kunde",
                    "Konto",
                    { label: "Betrag", align: "right" },
                    { label: "Zins", align: "right" },
                    "Fälligkeit",
                    "Status",
                  ]}
                >
                  {data.maturingAccounts.map((account) => {
                    const days = daysUntil(account.maturityDate)
                    return (
                      <tr
                        key={account.id}
                        className={`${rowClass} cursor-pointer`}
                        onClick={() => onOpenCustomer(account.customer.id)}
                      >
                        <td className={cellStrong}>
                          {account.customer.firstName} {account.customer.lastName}
                        </td>
                        <td className={`${cell} num`}>{account.accountNumber}</td>
                        <td className={cellRight}>{formatAmount(account.principalAmount, account.currency, 0)}</td>
                        <td className={cellRight}>{formatPercent(account.interestRate)}</td>
                        <td className={`${cell} whitespace-nowrap`}>
                          <span className="num">{formatDate(account.maturityDate)}</span>
                          <span className="ml-2 text-[12px] text-[var(--faint)]">
                            {days < 0 ? `${Math.abs(days)} Tage überfällig` : `in ${days} Tagen`}
                          </span>
                        </td>
                        <td className={cell}>
                          <AccountStatusBadge status={account.status} />
                        </td>
                      </tr>
                    )
                  })}
                </Table>
              )}
            </Card>

            <Card
              title="Letzte Aktivitäten"
              action={
                <Button size="sm" onClick={() => onNavigate("activities")}>
                  Alle
                </Button>
              }
            >
              {data.recentActivities.length === 0 ? (
                <EmptyState title="Noch keine Aktivitäten" />
              ) : (
                <ul className="divide-y divide-[var(--line-soft)]">
                  {data.recentActivities.map((activity) => (
                    <li key={activity.id} className="px-5 py-3.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[13px] font-semibold text-[var(--ink)]">{activity.action}</span>
                        <span className="num flex-none text-[12px] text-[var(--faint)]">
                          {formatDateTime(activity.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] leading-snug text-[var(--body)]">{activity.description}</p>
                      <p className="mt-1 text-[12px] text-[var(--faint)]">{activity.user}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card
            title="Zuletzt angelegte Kunden"
            action={
              <Button size="sm" onClick={() => onNavigate("customers")}>
                Alle Kunden
              </Button>
            }
          >
            {data.recentCustomers.length === 0 ? (
              <EmptyState title="Noch keine Kunden" hint="Legen Sie den ersten Kunden an." />
            ) : (
              <ul className="divide-y divide-[var(--line-soft)]">
                {data.recentCustomers.map((customer) => (
                  <li key={customer.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold text-[var(--ink)]">
                        {customer.firstName} {customer.lastName}
                        <span className="num ml-2 text-[12.5px] font-normal text-[var(--faint)]">
                          {customer.customerNumber}
                        </span>
                      </div>
                      <div className="text-[12.5px] text-[var(--muted)]">
                        {customer.accountCount} Konten · {formatAmount(customer.totalPrincipal, "EUR", 0)} ·{" "}
                        {formatDate(customer.createdAt.slice(0, 10))}
                      </div>
                    </div>
                    <CustomerStatusBadge status={customer.customerStatus} />
                    <Button size="sm" onClick={() => onOpenCustomer(customer.id)}>
                      Öffnen
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
