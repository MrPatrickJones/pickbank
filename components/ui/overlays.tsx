"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/primitives"

/* ---------------- Modal ---------------- */

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  footer,
  size = "md",
  children,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  footer?: React.ReactNode
  size?: "md" | "lg"
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[rgba(11,29,58,.45)] p-0 sm:items-start sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`rise my-0 w-full rounded-t-2xl bg-white shadow-lift sm:my-8 sm:rounded-2xl ${
          size === "lg" ? "sm:max-w-[820px]" : "sm:max-w-[560px]"
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--line-soft)] px-5 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--ink)]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-[var(--muted)]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-lg p-1.5 text-[var(--faint)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto scroll-thin px-5 py-5">{children}</div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line-soft)] px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

/* ---------------- Confirmation ---------------- */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Speichern",
  tone = "primary",
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  tone?: "primary" | "danger"
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>Abbrechen</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[14px] leading-relaxed text-[var(--body)]">{message}</p>
    </Modal>
  )
}

/* ---------------- Toasts ---------------- */

type Toast = { id: number; message: string; tone: "success" | "error" | "info" }

const ToastContext = createContext<{ toast: (message: string, tone?: Toast["tone"]) => void } | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((entry) => entry.id !== id)), 4000)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
        {toasts.map((entry) => (
          <div
            key={entry.id}
            role="status"
            className={`rise pointer-events-auto rounded-xl border px-4 py-3 text-[13.5px] font-medium shadow-lift ${
              entry.tone === "error"
                ? "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]"
                : entry.tone === "info"
                  ? "border-[var(--line)] bg-white text-[var(--ink)]"
                  : "border-[var(--good)] bg-[var(--good-soft)] text-[var(--good)]"
            }`}
          >
            {entry.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used inside ToastProvider")
  return context.toast
}

/* ---------------- File upload ---------------- */

export function FileDrop({
  onFiles,
  hint = "PDF, JPG oder PNG bis 10 MB",
}: {
  onFiles: (files: { filename: string; sizeKb: number }[]) => void
  hint?: string
}) {
  const [over, setOver] = useState(false)

  const handle = (list: FileList | null) => {
    if (!list?.length) return
    onFiles(Array.from(list).map((file) => ({ filename: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)) })))
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        handle(event.dataTransfer.files)
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-5 py-8 text-center transition-colors ${
        over ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--surface-sunken)]"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6 text-[var(--muted)]">
        <path d="M12 16V4m0 0 4 4m-4-4-4 4" />
        <path d="M5 20h14" />
      </svg>
      <span className="text-[13.5px] font-semibold text-[var(--ink)]">Datei auswählen oder hierher ziehen</span>
      <span className="text-[12.5px] text-[var(--muted)]">{hint}</span>
      <input type="file" multiple className="hidden" onChange={(event) => handle(event.target.files)} />
    </label>
  )
}
