"use client"

import type React from "react"

/** Form controls with inline validation, used by every form in the portal. */

export function Field({
  label,
  required,
  error,
  hint,
  className = "",
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-center gap-1 text-[12.5px] font-semibold text-[var(--body)]">
        {label}
        {required && <span className="text-[var(--danger)]">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[12.5px] font-medium text-[var(--danger)]">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12.5px] text-[var(--faint)]">{hint}</span>
      ) : null}
    </label>
  )
}

const controlBase =
  "h-10 w-full rounded-lg border bg-white px-3 text-[14px] text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"

export function TextInput({
  invalid,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      className={`${controlBase} ${invalid ? "border-[var(--danger)]" : "border-[var(--line)]"} ${className}`}
    />
  )
}

export function Select({
  invalid,
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      {...props}
      className={`${controlBase} cursor-pointer appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7a96' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-[length:18px] bg-[right_10px_center] bg-no-repeat pr-9 ${
        invalid ? "border-[var(--danger)]" : "border-[var(--line)]"
      } ${className}`}
    >
      {children}
    </select>
  )
}

export function Textarea({
  invalid,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border bg-white px-3 py-2.5 text-[14px] leading-relaxed text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 ${
        invalid ? "border-[var(--danger)]" : "border-[var(--line)]"
      } ${className}`}
    />
  )
}

/** Amounts are entered in plain German notation and parsed leniently. */
export function parseAmount(value: string) {
  const normalised = value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.\-]/g, "")
  const parsed = Number(normalised)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export function parseRate(value: string) {
  const parsed = Number(value.replace(",", ".").replace(/[^0-9.\-]/g, ""))
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
export const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
