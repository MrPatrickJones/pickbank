"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Icon } from "@/components/admin/icons"
import { Badge, Button } from "@/components/ui/primitives"
import { Field, TextInput, isEmail } from "@/components/ui/form"
import { IDLE_TIMEOUT_MINUTES, roleLabel, staffAccounts, useSession } from "@/lib/session"
import { useData } from "@/lib/store"

type Mode = "kunde" | "team"

export default function LoginPage() {
  const router = useRouter()
  const { user, ready, signIn, signOutReason, clearSignOutReason } = useSession()
  const { ready: dataReady, signInCustomer } = useData()

  const [mode, setMode] = useState<Mode>("kunde")

  // Customer login
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [attempts, setAttempts] = useState(0)

  // Staff login
  const [staffIndex, setStaffIndex] = useState(0)
  const [staffEmail, setStaffEmail] = useState(staffAccounts[0].email)
  const [staffPassword, setStaffPassword] = useState("")
  const [staffErrors, setStaffErrors] = useState<{ email?: string; password?: string }>({})

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (ready && user) router.replace(user.role === "kunde" ? "/portal" : "/admin")
  }, [ready, user, router])

  const submitCustomer = async (event: React.FormEvent) => {
    event.preventDefault()
    const found: typeof errors = {}
    if (!isEmail(email)) found.email = "Bitte geben Sie eine gültige E-Mail-Adresse ein."
    if (!password) found.password = "Bitte geben Sie Ihr Passwort ein."
    setErrors(found)
    if (Object.keys(found).length) return

    setSubmitting(true)
    clearSignOutReason()
    const result = await signInCustomer(email, password)
    setSubmitting(false)

    if (!result.ok) {
      setAttempts((value) => value + 1)
      setErrors({
        form:
          result.reason === "locked"
            ? "Dieser Zugang ist gesperrt. Bitte wenden Sie sich an Ihre Betreuung."
            : "E-Mail-Adresse oder Passwort ist nicht korrekt.",
      })
      return
    }

    setAttempts(0)
    signIn({
      name: `${result.customer.firstName} ${result.customer.lastName}`,
      email: result.account.loginEmail,
      role: "kunde",
      customerId: result.customer.id,
    })
    router.replace("/portal")
  }

  const submitStaff = (event: React.FormEvent) => {
    event.preventDefault()
    const found: typeof staffErrors = {}
    if (!isEmail(staffEmail)) found.email = "Bitte geben Sie eine gültige E-Mail-Adresse ein."
    if (staffPassword.trim().length < 8) found.password = "Das Passwort muss mindestens 8 Zeichen haben."
    setStaffErrors(found)
    if (Object.keys(found).length) return

    setSubmitting(true)
    clearSignOutReason()
    const account = staffAccounts[staffIndex]
    window.setTimeout(() => {
      signIn({ name: account.name, email: staffEmail.trim().toLowerCase(), role: account.role })
      router.replace("/admin")
    }, 400)
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col justify-center px-4 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-[440px]">
          <a
            href="https://www.pickthebank.eu"
            target="_blank"
            rel="noopener noreferrer"
            title="www.pickthebank.eu"
            className="inline-flex rounded-md transition-opacity hover:opacity-80"
          >
            <Image src="/logo.png" alt="Pick The Bank – zur Website" width={260} height={52} priority className="h-[40px] w-auto" />
          </a>

          <h1 className="mt-9 text-[32px] font-semibold tracking-tight text-[var(--ink)]">
            {mode === "kunde" ? "Kundenlogin" : "Mitarbeiterzugang"}
          </h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--muted)]">
            {mode === "kunde"
              ? "Melden Sie sich mit den Zugangsdaten an, die Sie von Pick The Bank erhalten haben."
              : "Zugang zur Kundenverwaltung für Mitarbeiterinnen und Mitarbeiter."}
          </p>

          {signOutReason === "timeout" && (
            <p className="mt-5 rounded-lg bg-[var(--warn-soft)] px-4 py-3 text-[13px] font-medium text-[var(--warn)]">
              Sie wurden nach {IDLE_TIMEOUT_MINUTES} Minuten Inaktivität automatisch abgemeldet.
            </p>
          )}

          <div className="mt-7 flex rounded-xl border border-[var(--line)] p-1">
            {(
              [
                { id: "kunde", label: "Kundenlogin" },
                { id: "team", label: "Mitarbeiter" },
              ] as { id: Mode; label: string }[]
            ).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setMode(entry.id)}
                aria-pressed={mode === entry.id}
                className={`flex-1 rounded-lg px-4 py-2 text-[13.5px] font-semibold transition-colors ${
                  mode === entry.id ? "bg-[var(--navy)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {mode === "kunde" ? (
            <form onSubmit={submitCustomer} className="mt-6 space-y-4" noValidate>
              <Field label="E-Mail-Adresse" required error={errors.email}>
                <TextInput
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="ihre@email.de"
                  value={email}
                  invalid={Boolean(errors.email)}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>

              <Field label="Passwort" required error={errors.password}>
                <div className="relative">
                  <TextInput
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    invalid={Boolean(errors.password)}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--faint)] hover:text-[var(--ink)]"
                  >
                    <Icon name={showPassword ? "shield" : "check"} className="h-4 w-4" />
                  </button>
                </div>
              </Field>

              {errors.form && (
                <p role="alert" className="rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-[13px] font-medium text-[var(--danger)]">
                  {errors.form}
                  {attempts >= 3 && " Nach mehreren Fehlversuchen hilft Ihre Betreuung mit einem neuen Passwort weiter."}
                </p>
              )}

              <Button type="submit" variant="primary" disabled={submitting || !dataReady} className="w-full">
                {submitting ? "Wird geprüft …" : "Anmelden"}
              </Button>

              <p className="text-[12.5px] leading-relaxed text-[var(--faint)]">
                Zugänge werden ausschließlich von Pick The Bank vergeben. Ihre Daten können Sie einsehen und
                herunterladen – Änderungen nimmt Ihre Betreuung nach Legitimationsprüfung vor.
              </p>
              <p className="rounded-lg bg-[var(--surface-sunken)] px-4 py-3 text-[12.5px] text-[var(--muted)]">
                Demozugang: <strong className="text-[var(--ink)]">max@example.com</strong> ·{" "}
                <strong className="text-[var(--ink)]">PTB-Demo-2026</strong>
              </p>
            </form>
          ) : (
            <form onSubmit={submitStaff} className="mt-6 space-y-4" noValidate>
              <div>
                <p className="mb-2 text-[12.5px] font-semibold text-[var(--body)]">Zugang wählen</p>
                <div className="grid gap-2">
                  {staffAccounts.map((account, index) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => {
                        setStaffIndex(index)
                        setStaffEmail(account.email)
                        setStaffErrors({})
                      }}
                      aria-pressed={index === staffIndex}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                        index === staffIndex
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--line)] bg-white hover:border-[var(--accent)]"
                      }`}
                    >
                      <span
                        className={`grid h-9 w-9 flex-none place-items-center rounded-lg text-[12px] font-semibold ${
                          index === staffIndex ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-sunken)] text-[var(--muted)]"
                        }`}
                      >
                        {account.name
                          .split(" ")
                          .map((part) => part.charAt(0))
                          .join("")
                          .slice(0, 2)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--ink)]">
                          {account.name}
                          <Badge tone="neutral">{roleLabel[account.role]}</Badge>
                        </span>
                        <span className="block truncate text-[12.5px] text-[var(--muted)]">{account.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <Field label="E-Mail-Adresse" required error={staffErrors.email}>
                <TextInput
                  id="staff-email"
                  type="email"
                  autoComplete="email"
                  value={staffEmail}
                  invalid={Boolean(staffErrors.email)}
                  onChange={(event) => setStaffEmail(event.target.value)}
                />
              </Field>

              <Field label="Passwort" required error={staffErrors.password} hint="Demo: beliebiges Passwort mit mindestens 8 Zeichen">
                <TextInput
                  id="staff-password"
                  type="password"
                  autoComplete="current-password"
                  value={staffPassword}
                  invalid={Boolean(staffErrors.password)}
                  onChange={(event) => setStaffPassword(event.target.value)}
                />
              </Field>

              <Button type="submit" variant="primary" disabled={submitting} className="w-full">
                {submitting ? "Wird geprüft …" : "Anmelden"}
              </Button>
              <button
                type="button"
                onClick={() => setStaffPassword("pickthebank2026")}
                className="w-full rounded-lg border border-[var(--line)] py-2.5 text-[13.5px] font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
              >
                Demo-Passwort einsetzen
              </button>
            </form>
          )}

          <p className="mt-6 text-[12.5px] leading-relaxed text-[var(--faint)]">
            Prototyp mit Demodaten. Kundenpasswörter werden als Hash mit Zufallssalz gespeichert; im Produktivbetrieb
            erfolgt die Prüfung serverseitig mit starker Kundenauthentifizierung.
          </p>
        </div>
      </div>

      <aside className="relative hidden flex-col justify-center overflow-hidden bg-[var(--navy)] px-12 py-16 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.06]" />
        <div className="absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-white/[0.04]" />
        <div className="relative z-10 max-w-[440px]">
          <p className="text-[12.5px] uppercase tracking-[0.14em] text-white/50">Kundenportal</p>
          <h2 className="mt-4 text-[30px] font-semibold leading-tight tracking-tight">
            Zugänge vergeben wir. Einsehen können Sie jederzeit selbst.
          </h2>
          <ul className="mt-9 space-y-4">
            {[
              "Pick The Bank legt Kunden an und vergibt den persönlichen Zugang.",
              "Kunden melden sich eigenständig an und sehen Anlagen, Dokumente und Nachrichten.",
              "Änderungen an Stammdaten und Anlagen nimmt ausschließlich Pick The Bank vor.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3 text-[15px] leading-relaxed text-white/80">
                <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-white/10">
                  <Icon name="check" className="h-3.5 w-3.5" />
                </span>
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-[12.5px] font-medium text-white/45">
            Rollenbasierter Zugriff · Aktivitätsprotokoll · automatische Abmeldung
          </p>
        </div>
      </aside>
    </main>
  )
}
