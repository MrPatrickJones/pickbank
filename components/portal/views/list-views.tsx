"use client"

import { Download, ShieldCheck } from "lucide-react"

import {
  EmptyRow,
  Panel,
  StatusBadge,
  TableShell,
  ViewHeader,
  cellClass,
  cellStrongClass,
  rowClass,
} from "@/components/portal/ui"
import {
  customer,
  documents,
  formatEuro,
  formatPercent,
  holdingStatus,
  partnerBanks,
  pick,
  transactions,
  valueOf,
  type Locale,
} from "@/lib/portfolio"

const matches = (query: string, ...values: string[]) =>
  query.trim().length === 0 || values.join(" ").toLowerCase().includes(query.trim().toLowerCase())

export function HoldingsView({ locale, t, query }: { locale: Locale; t: (key: string) => string; query: string }) {
  const rows = customer.holdings.filter((holding) =>
    matches(query, holding.bank, pick(holding.product, locale), holding.id, pick(holding.country, locale)),
  )

  return (
    <div className="ptb-in space-y-5">
      <ViewHeader title={t("holdings.title")} subtitle={t("holdings.subtitle")} />
      <Panel>
        <TableShell
          headers={[
            t("col.bank"),
            t("col.product"),
            t("col.country"),
            t("col.amount"),
            t("col.rate"),
            t("col.term"),
            t("col.maturity"),
            t("col.value"),
            t("col.profit"),
            t("col.status"),
          ]}
        >
          {rows.length === 0 ? (
            <EmptyRow colSpan={10} label={t("table.empty")} />
          ) : (
            rows.map((holding) => {
              const { value, profit } = valueOf(holding)
              const status = holdingStatus(holding)
              return (
                <tr key={holding.id} className={rowClass}>
                  <td className={cellStrongClass}>{holding.bank}</td>
                  <td className={cellClass}>{pick(holding.product, locale)}</td>
                  <td className={cellClass}>{pick(holding.country, locale)}</td>
                  <td className={cellClass}>{formatEuro(holding.amount, 0)}</td>
                  <td className={cellClass}>{formatPercent(holding.rate)}</td>
                  <td className={cellClass}>
                    {holding.term} {t("col.months")}
                  </td>
                  <td className={cellClass}>{holding.maturity}</td>
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
    </div>
  )
}

export function TransactionsView({ locale, t, query }: { locale: Locale; t: (key: string) => string; query: string }) {
  const rows = transactions.filter((entry) =>
    matches(query, entry.id, entry.bank, pick(entry.kind, locale), entry.date),
  )

  return (
    <div className="ptb-in space-y-5">
      <ViewHeader title={t("transactions.title")} subtitle={t("transactions.subtitle")} />
      <Panel>
        <TableShell
          headers={[t("col.date"), t("col.bank"), t("col.kind"), t("col.amount"), t("col.status")]}
        >
          {rows.length === 0 ? (
            <EmptyRow colSpan={5} label={t("table.empty")} />
          ) : (
            rows.map((entry) => (
              <tr key={entry.id} className={rowClass}>
                <td className={cellClass}>{entry.date}</td>
                <td className={cellStrongClass}>{entry.bank}</td>
                <td className={cellClass}>{pick(entry.kind, locale)}</td>
                <td className={cellStrongClass}>{formatEuro(entry.amount)}</td>
                <td className={cellClass}>
                  <StatusBadge tone={entry.tone}>{pick(entry.status, locale)}</StatusBadge>
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </Panel>
    </div>
  )
}

export function DocumentsView({ locale, t, query }: { locale: Locale; t: (key: string) => string; query: string }) {
  const rows = documents.filter((entry) =>
    matches(query, entry.id, pick(entry.title, locale), pick(entry.detail, locale), entry.date),
  )

  return (
    <div className="ptb-in space-y-5">
      <ViewHeader title={t("documents.title")} subtitle={t("documents.subtitle")} />
      <Panel>
        <TableShell headers={[t("col.document"), t("col.date"), ""]}>
          {rows.length === 0 ? (
            <EmptyRow colSpan={3} label={t("table.empty")} />
          ) : (
            rows.map((entry) => (
              <tr key={entry.id} className={rowClass}>
                <td className="px-5 py-4">
                  <div className="text-sm font-semibold text-[#001855]">{pick(entry.title, locale)}</div>
                  <div className="mt-0.5 text-[13px] text-[#506392]">{pick(entry.detail, locale)}</div>
                </td>
                <td className={cellClass}>{entry.date}</td>
                <td className={cellClass}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7EBF7] px-3 py-1.5 text-xs font-semibold text-[#506392] transition-colors hover:border-[#001855] hover:text-[#001855]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t("table.download")}
                  </button>
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </Panel>
    </div>
  )
}

export function BanksView({ locale, t, query }: { locale: Locale; t: (key: string) => string; query: string }) {
  const rows = partnerBanks.filter((bank) => matches(query, bank.name, pick(bank.country, locale)))

  return (
    <div className="ptb-in space-y-5">
      <ViewHeader title={t("banks.title")} subtitle={t("banks.subtitle")} />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.length === 0 ? (
          <p className="text-sm text-[#93A1C9]">{t("table.empty")}</p>
        ) : (
          rows.map((bank) => (
            <Panel key={bank.id}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#001855]">{bank.name}</h2>
                    <p className="mt-0.5 text-[13px] text-[#506392]">{pick(bank.country, locale)}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[22px] font-bold leading-none text-[#326BFF]">{formatPercent(bank.rate)}</div>
                    <div className="mt-1 text-[12px] text-[#93A1C9]">{t("banks.rate")}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-[13px] text-[#506392]">
                  <ShieldCheck className="h-4 w-4 text-[#12805C]" />
                  {pick(bank.guarantee, locale)}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[13px] text-[#506392]">
                    {t("banks.term")}: <strong className="text-[#001855]">{pick(bank.term, locale)}</strong>
                  </span>
                  <button
                    type="button"
                    className="rounded-full bg-[#326BFF] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2C61E8]"
                  >
                    {t("banks.invest")}
                  </button>
                </div>
              </div>
            </Panel>
          ))
        )}
      </div>
    </div>
  )
}
