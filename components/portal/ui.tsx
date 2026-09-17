import type React from "react"

import type { StatusTone } from "@/lib/portfolio"

const toneClasses: Record<StatusTone, string> = {
  good: "bg-[#E9F8F0] text-[#12805C]",
  info: "bg-[#EDF2FF] text-[#2C61E8]",
  warning: "bg-[#FFF6E6] text-[#9A6400]",
  critical: "bg-[#FDECEC] text-[#B42318]",
  neutral: "bg-[#F1F4FF] text-[#506392]",
}

const dotClasses: Record<StatusTone, string> = {
  good: "bg-[#12805C]",
  info: "bg-[#326BFF]",
  warning: "bg-[#D08700]",
  critical: "bg-[#D92D20]",
  neutral: "bg-[#93A1C9]",
}

export function StatusBadge({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[tone]}`} />
      {children}
    </span>
  )
}

export function Panel({
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={`rounded-2xl border border-[#E7EBF7] bg-white shadow-[0_1px_2px_rgba(0,24,85,0.04)] ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF0FA] px-5 py-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-[#001855]">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-[#93A1C9]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

/** The four figures the portfolio report leads with. */
export function StatTile({
  label,
  value,
  unit,
  accent = "ink",
}: {
  label: string
  value: string
  unit: string
  accent?: "ink" | "brand" | "profit"
}) {
  const accentClass =
    accent === "profit" ? "text-[#12805C]" : accent === "brand" ? "text-[#326BFF]" : "text-[#001855]"

  return (
    <div className="rounded-2xl border border-[#E7EBF7] bg-white px-5 py-5 text-center shadow-[0_1px_2px_rgba(0,24,85,0.04)]">
      <div className="text-[13px] font-medium text-[#506392]">{label}</div>
      <div className={`mt-2 text-[26px] font-bold leading-none tracking-tight ${accentClass}`}>{value}</div>
      <div className="mt-2 text-[12px] font-medium text-[#93A1C9]">{unit}</div>
    </div>
  )
}

export function TableShell({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#EDF0FA]">
            {headers.map((header, index) => (
              <th
                key={`${header}-${index}`}
                className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#93A1C9]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-[#93A1C9]">
        {label}
      </td>
    </tr>
  )
}

export function ViewHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[#001855]">{title}</h1>
      <p className="mt-1.5 text-sm text-[#506392]">{subtitle}</p>
    </div>
  )
}

export const cellClass = "px-5 py-4 text-sm text-[#506392]"
export const cellStrongClass = "px-5 py-4 text-sm font-semibold text-[#001855]"
export const rowClass = "border-b border-[#F2F5FD] last:border-0 transition-colors hover:bg-[#F8FAFF]"
