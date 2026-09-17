"use client"

import Image from "next/image"
import { Printer } from "lucide-react"

import { PortfolioChart } from "@/components/portal/portfolio-chart"
import { EmptyRow, Panel, StatTile, StatusBadge, TableShell, cellClass, cellStrongClass, rowClass } from "@/components/portal/ui"
import {
  activity,
  customer,
  formatEuro,
  formatPercent,
  holdingStatus,
  pick,
  reportDate,
  totals,
  valueOf,
  type Locale,
} from "@/lib/portfolio"

const dotTone: Record<string, string> = {
  good: "bg-[#12805C]",
  info: "bg-[#326BFF]",
  warning: "bg-[#D08700]",
  critical: "bg-[#D92D20]",
  neutral: "bg-[#93A1C9]",
}

export function DashboardView({
  locale,
  t,
  onNavigate,
}: {
  locale: Locale
  t: (key: string) => string
  onNavigate: (view: string) => void
}) {
  const summary = totals()
  const holdings = customer.holdings
  const byBank = holdings
    .map((holding) => ({ bank: holding.bank, value: valueOf(holding).value }))
    .sort((a, b) => b.value - a.value)
  const maxBankValue = Math.max(...byBank.map((entry) => entry.value))
  const maturities = [...holdings]
    .sort((a, b) => a.term - a.elapsed - (b.term - b.elapsed))
    .slice(0, 3)

  return (
    <div className="ptb-in space-y-5">
      {/* Report header, mirroring the printed portfolio report */}
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EDF0FA] px-6 py-5">
          <Image src="/logo.png" alt="PickTheBank" width={140} height={28} className="h-7 w-auto" />
          <div className="text-center">
            <h1 className="text-[19px] font-bold tracking-tight text-[#001855]">{t("report.title")}</h1>
            <p className="mt-0.5 text-[13px] text-[#93A1C9]">{t("report.subtitle")}</p>
          </div>
          <div className="text-right text-[13px] text-[#506392]">
            <div className="font-semibold text-[#001855]">{t("report.generated")}</div>
            <div className="mt-0.5">{pick(reportDate, locale)}</div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <h2 className="text-[20px] font-semibold text-[#001855]">{customer.name}</h2>
            <dl className="mt-4 grid gap-x-8 gap-y-2 text-[13.5px] sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="font-semibold text-[#506392]">{t("report.email")}:</dt>
                <dd className="truncate text-[#001855]">{customer.email}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-[#506392]">{t("report.address")}:</dt>
                <dd className="text-[#001855]">{pick(customer.address, locale)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-[#506392]">{t("report.phone")}:</dt>
                <dd className="text-[#001855]">{customer.phone}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-[#506392]">{t("report.customerNo")}:</dt>
                <dd className="text-[#001855]">{customer.customerNo}</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col items-start justify-center rounded-2xl bg-[#F4F7FF] px-5 py-5 lg:items-end lg:text-right">
            <div className="text-[13px] font-medium text-[#506392]">{t("report.portfolioValue")}</div>
            <div className="mt-1 text-[30px] font-bold leading-none tracking-tight text-[#326BFF]">
              {formatEuro(summary.value)}
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="ptb-no-print mt-4 inline-flex items-center gap-2 rounded-full border border-[#D6DDF2] px-4 py-2 text-[13px] font-semibold text-[#506392] transition-colors hover:border-[#001855] hover:text-[#001855]"
            >
              <Printer className="h-4 w-4" />
              {t("report.print")}
            </button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={t("kpi.invested")} value={formatEuro(summary.invested)} unit={t("kpi.euro")} />
        <StatTile label={t("kpi.value")} value={formatEuro(summary.value)} unit={t("kpi.euro")} accent="brand" />
        <StatTile label={t("kpi.profit")} value={formatEuro(summary.profit)} unit={t("kpi.euro")} accent="profit" />
        <StatTile label={t("kpi.count")} value={String(summary.count)} unit={t("kpi.banks")} accent="brand" />
      </div>

      <Panel
        title={t("holdings.title")}
        subtitle={t("details.basis")}
        action={
          <button
            type="button"
            onClick={() => onNavigate("holdings")}
            className="ptb-no-print text-[13px] font-semibold text-[#326BFF] hover:underline"
          >
            {t("common.viewAll")}
          </button>
        }
      >
        <TableShell
          headers={[
            t("col.bank"),
            t("col.product"),
            t("col.amount"),
            t("col.rate"),
            t("col.term"),
            t("col.value"),
            t("col.profit"),
            t("col.status"),
          ]}
        >
          {holdings.length === 0 ? (
            <EmptyRow colSpan={8} label={t("table.empty")} />
          ) : (
            holdings.map((holding) => {
              const { value, profit } = valueOf(holding)
              const status = holdingStatus(holding)
              return (
                <tr key={holding.id} className={rowClass}>
                  <td className={cellStrongClass}>
                    <span className="flex items-center gap-2.5">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#EDF2FF] text-[11px] font-bold text-[#326BFF]">
                        {holding.bank.charAt(0)}
                      </span>
                      {holding.bank}
                    </span>
                  </td>
                  <td className={cellClass}>
                    <span className="rounded-md bg-[#F1F4FF] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#506392]">
                      {pick(holding.product, locale)}
                    </span>
                  </td>
                  <td className={cellClass}>{formatEuro(holding.amount, 0)}</td>
                  <td className={cellClass}>{formatPercent(holding.rate)}</td>
                  <td className={cellClass}>
                    {holding.term} {t("col.months")}
                  </td>
                  <td className={cellStrongClass}>{formatEuro(value)}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-[#12805C]">+{formatEuro(profit)}</td>
                  <td className={cellClass}>
                    <StatusBadge tone={status.tone}>{pick(status.label, locale)}</StatusBadge>
                  </td>
                </tr>
              )
            })
          )}
        </TableShell>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t("summary.title")}>
          <dl className="divide-y divide-[#F2F5FD] px-5">
            {[
              { label: t("summary.invested"), value: formatEuro(summary.invested) },
              { label: t("summary.value"), value: formatEuro(summary.value) },
              { label: t("summary.expected"), value: formatEuro(summary.expected) },
              { label: t("summary.rate"), value: formatPercent(summary.weightedRate) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 py-3.5">
                <dt className="text-[13.5px] text-[#506392]">{row.label}</dt>
                <dd className="text-[13.5px] font-semibold text-[#001855]">{row.value}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 py-4">
              <dt className="text-[14px] font-semibold text-[#001855]">{t("summary.profit")}</dt>
              <dd className="text-[15px] font-bold text-[#12805C]">+{formatEuro(summary.profit)}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title={t("details.title")}>
          <dl className="divide-y divide-[#F2F5FD] px-5">
            {[
              { label: t("details.date"), value: pick(reportDate, locale) },
              { label: t("details.holdings"), value: `${summary.count} ${t("kpi.banks")}` },
              { label: t("details.currency"), value: "Euro" },
              { label: t("shell.customerNo"), value: `#${customer.customerNo}` },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 py-3.5">
                <dt className="text-[13.5px] text-[#506392]">{row.label}</dt>
                <dd className="text-[13.5px] font-semibold text-[#001855]">{row.value}</dd>
              </div>
            ))}
            <p className="py-4 text-[12.5px] leading-relaxed text-[#93A1C9]">{t("details.basis")}</p>
          </dl>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title={t("chart.title")} subtitle={t("chart.subtitle")}>
          <PortfolioChart seriesLabel={t("chart.value")} />
        </Panel>

        <Panel title={t("allocation.title")} subtitle={t("allocation.subtitle")}>
          <div className="space-y-4 px-5 py-5">
            {byBank.map((entry) => (
              <div key={entry.bank}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="font-medium text-[#506392]">{entry.bank}</span>
                  <span className="font-semibold text-[#001855]">
                    {formatEuro(entry.value, 0)}
                    <span className="ml-2 font-medium text-[#93A1C9]">
                      {Math.round((entry.value / summary.value) * 100)} %
                    </span>
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-[#EDF0FA]">
                  <div
                    className="h-2 rounded-full bg-[#326BFF]"
                    style={{ width: `${Math.round((entry.value / maxBankValue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title={t("maturities.title")}>
          <ul className="divide-y divide-[#F2F5FD]">
            {maturities.map((holding) => {
              const remaining = Math.max(holding.term - holding.elapsed, 0)
              const status = holdingStatus(holding)
              return (
                <li key={holding.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-[#EDF2FF] text-[12px] font-bold text-[#326BFF]">
                    {remaining === 0 ? "0" : remaining}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#001855]">
                      {holding.bank} · {pick(holding.product, locale)}
                    </div>
                    <div className="truncate text-[13px] text-[#506392]">
                      {remaining === 0
                        ? `${t("maturities.due")} · ${holding.maturity}`
                        : `${t("maturities.in")} ${remaining} ${t("maturities.months")} · ${holding.maturity}`}
                    </div>
                  </div>
                  <StatusBadge tone={status.tone}>{pick(status.label, locale)}</StatusBadge>
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title={t("activity.title")}>
          <ul className="space-y-4 px-5 py-5">
            {activity.map((item) => (
              <li key={item.id} className="flex gap-3">
                <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${dotTone[item.tone]}`} />
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold leading-snug text-[#001855]">
                    {pick(item.title, locale)}
                  </div>
                  <div className="mt-0.5 text-[13px] text-[#506392]">{pick(item.detail, locale)}</div>
                  <div className="mt-0.5 text-[12px] text-[#93A1C9]">{pick(item.time, locale)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
