"use client"

import type React from "react"

import type { CustomerStatus, InvestmentStatus, KycStatus } from "@/lib/types"

/* ---------------- Buttons ---------------- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "md" | "sm"
}

export function Button({ variant = "secondary", size = "md", className = "", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
  const sizes = { md: "h-10 px-4 text-sm", sm: "h-8 px-3 text-[13px]" }
  const variants = {
    primary: "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]",
    secondary: "border border-[var(--line)] bg-white text-[var(--body)] hover:border-[var(--accent)] hover:text-[var(--ink)]",
    ghost: "text-[var(--muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]",
    danger: "border border-[var(--danger)] bg-white text-[var(--danger)] hover:bg-[var(--danger-soft)]",
  }
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />
}

/* ---------------- Surfaces ---------------- */

export function Card({
  title,
  subtitle,
  action,
  className = "",
  bodyClass = "",
  children,
}: {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
  bodyClass?: string
  children?: React.ReactNode
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-[var(--line)] bg-white shadow-card ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line-soft)] px-5 py-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-[var(--ink)]">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-[var(--muted)]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-[var(--ink)]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ---------------- KPI ---------------- */

export function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string
  hint?: string
  tone?: "default" | "accent" | "good" | "warn"
}) {
  const valueTone = {
    default: "text-[var(--ink)]",
    accent: "text-[var(--accent)]",
    good: "text-[var(--good)]",
    warn: "text-[var(--warn)]",
  }[tone]

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white px-5 py-[18px] shadow-card">
      <div className="text-[12.5px] font-medium uppercase tracking-[0.06em] text-[var(--muted)]">{label}</div>
      <div className={`num mt-2.5 text-[25px] font-semibold leading-none tracking-tight ${valueTone}`}>{value}</div>
      {hint && <div className="mt-2.5 text-[12.5px] leading-snug text-[var(--faint)]">{hint}</div>}
    </div>
  )
}

/* ---------------- Badges ---------------- */

type Tone = "good" | "warn" | "danger" | "info" | "neutral"

const toneClass: Record<Tone, string> = {
  good: "bg-[var(--good-soft)] text-[var(--good)]",
  warn: "bg-[var(--warn-soft)] text-[var(--warn)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  info: "bg-[var(--accent-soft)] text-[var(--accent)]",
  neutral: "bg-[var(--surface-sunken)] text-[var(--muted)]",
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${toneClass[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}

const customerStatusMap: Record<CustomerStatus, { label: string; tone: Tone }> = {
  aktiv: { label: "Aktiv", tone: "good" },
  pruefung: { label: "In Prüfung", tone: "info" },
  ausstehend: { label: "Ausstehend", tone: "warn" },
  inaktiv: { label: "Inaktiv", tone: "neutral" },
}

const investmentStatusMap: Record<InvestmentStatus, { label: string; tone: Tone }> = {
  aktiv: { label: "Aktiv", tone: "good" },
  faellig: { label: "Fällig", tone: "warn" },
  beendet: { label: "Beendet", tone: "neutral" },
  vorgemerkt: { label: "Vorgemerkt", tone: "info" },
}

const kycStatusMap: Record<KycStatus, { label: string; tone: Tone }> = {
  offen: { label: "KYC offen", tone: "warn" },
  eingereicht: { label: "KYC eingereicht", tone: "info" },
  geprueft: { label: "KYC geprüft", tone: "good" },
  abgelehnt: { label: "KYC abgelehnt", tone: "danger" },
}

export const customerStatusOptions = Object.entries(customerStatusMap).map(([value, entry]) => ({
  value: value as CustomerStatus,
  label: entry.label,
}))

export const investmentStatusOptions = Object.entries(investmentStatusMap).map(([value, entry]) => ({
  value: value as InvestmentStatus,
  label: entry.label,
}))

export const kycStatusOptions = Object.entries(kycStatusMap).map(([value, entry]) => ({
  value: value as KycStatus,
  label: entry.label.replace("KYC ", ""),
}))

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const entry = customerStatusMap[status]
  return <Badge tone={entry.tone}>{entry.label}</Badge>
}

export function InvestmentStatusBadge({ status }: { status: InvestmentStatus }) {
  const entry = investmentStatusMap[status]
  return <Badge tone={entry.tone}>{entry.label}</Badge>
}

export function KycBadge({ status }: { status: KycStatus }) {
  const entry = kycStatusMap[status]
  return <Badge tone={entry.tone}>{entry.label}</Badge>
}

/* ---------------- Table ---------------- */

export function Table({
  headers,
  children,
  minWidth = 860,
}: {
  headers: (string | { label: string; align?: "left" | "right" })[]
  children: React.ReactNode
  minWidth?: number
}) {
  return (
    <div className="w-full max-w-full overflow-x-auto scroll-thin">
      <table className="w-full border-collapse text-left" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-[var(--line-soft)]">
            {headers.map((header, index) => {
              const entry = typeof header === "string" ? { label: header, align: "left" as const } : header
              return (
                <th
                  key={`${entry.label}-${index}`}
                  className={`whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--faint)] ${
                    entry.align === "right" ? "text-right" : ""
                  }`}
                >
                  {entry.label}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export const rowClass = "border-b border-[var(--line-soft)] last:border-0 transition-colors hover:bg-[var(--surface-sunken)]"
export const cell = "px-5 py-3.5 text-[13.5px] text-[var(--body)]"
export const cellStrong = "px-5 py-3.5 text-[13.5px] font-semibold text-[var(--ink)]"
export const cellRight = `${cell} text-right num whitespace-nowrap`

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-5 py-14 text-center">
      <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
      {hint && <p className="mt-1.5 text-[13px] text-[var(--muted)]">{hint}</p>}
    </div>
  )
}

/* ---------------- Tabs ---------------- */

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--line)]">
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={isActive}
            className={`-mb-px border-b-2 px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
              isActive
                ? "border-[var(--accent)] text-[var(--ink)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span className="ml-2 rounded-full bg-[var(--surface-sunken)] px-2 py-0.5 text-[11px] text-[var(--muted)]">
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------- Search & pagination ---------------- */

export function SearchInput({
  value,
  onChange,
  placeholder = "Suchen …",
  className = "",
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <label className={`flex h-10 items-center gap-2.5 rounded-lg border border-[var(--line)] bg-white px-3.5 ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 flex-none text-[var(--faint)]">
        <circle cx="11" cy="11" r="7" />
        <path d="m16.5 16.5 4.5 4.5" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 border-0 bg-transparent text-[14px] text-[var(--ink)] outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Suche leeren"
          className="text-[var(--faint)] hover:text-[var(--ink)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </label>
  )
}

export function Pagination({
  page,
  pageCount,
  total,
  onChange,
}: {
  page: number
  pageCount: number
  total: number
  onChange: (page: number) => void
}) {
  if (pageCount <= 1) {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-[var(--line-soft)] px-5 py-3 text-[13px] text-[var(--muted)]">
        <span>
          {total} {total === 1 ? "Eintrag" : "Einträge"}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-soft)] px-5 py-3">
      <span className="text-[13px] text-[var(--muted)]">
        Seite {page} von {pageCount} · {total} Einträge
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          Zurück
        </Button>
        <Button size="sm" onClick={() => onChange(page + 1)} disabled={page >= pageCount}>
          Weiter
        </Button>
      </div>
    </div>
  )
}
