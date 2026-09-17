"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Icon } from "@/components/admin/icons"
import { Badge, Button } from "@/components/ui/primitives"
import { Field, TextInput, isEmail } from "@/components/ui/form"
import { IDLE_TIMEOUT_MINUTES, demoAccounts, roleLabel, useSession } from "@/lib/session"

export default function LoginPage() {
  const router = useRouter()
  const { user, ready, signIn, signOutReason, clearSignOutReason } = useSession()

  const [accountIndex, setAccountIndex] = useState(0)
  const [email, setEmail] = useState(demoAccounts[0].email)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (ready && user) router.replace(user.role === "kunde" ? "/portal" : "/admin")
  }, [ready, user, router])

  const selectAccount = (index: number) => {
    setAccountIndex(index)
    setEmail(demoAccounts[index].email)
    setErrors({})
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const found: { email?: string; password?: string } = {}
    if (!isEmail(email)) found.email = "Bitte geben Sie eine gültige E-Mail-Adresse ein."
    if (password.trim().length < 8) found.password = "Das Passwort muss mindestens 8 Zeichen haben."
    setErrors(found)
    if (Object.keys(found).length) return

    setSubmitting(true)
    clearSignOutReason()

    // Prototype: the account is chosen above; a real deployment verifies the
    // credentials on the server and returns the role with the session cookie.
    const account = demoAccounts[accountIndex]
    window.setTimeout(() => {
      signIn({ name: account.name, email: email.trim().toLowerCase(), role: account.role, customerId: account.customerId })
      router.replace(account.role === "kunde" ? "/portal" : "/admin")
    }, 450)
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

          <h1 className="mt-10 text-[32px] font-semibold tracking-tight text-[var(--ink)]">Anmeldung</h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-[var(--muted)]">
            Zugang zum Kundenportal und zur Kundenverwaltung von Pick The Bank.
          </p>

          {signOutReason === "timeout" && (
            <p className="mt-5 rounded-lg bg-[var(--warn-soft)] px-4 py-3 text-[13px] font-medium text-[var(--warn)]">
              Sie wurden nach {IDLE_TIMEOUT_MINUTES} Minuten Inaktivität automatisch abgemeldet.
            </p>
          )}

          <div className="mt-7">
            <p className="mb-2 text-[12.5px] font-semibold text-[var(--body)]">Zugang wählen</p>
            <div className="grid gap-2">
              {demoAccounts.map((account, index) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => selectAccount(index)}
                  aria-pressed={index === accountIndex}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    index === accountIndex
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] bg-white hover:border-[var(--accent)]"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 flex-none place-items-center rounded-lg text-[12px] font-semibold ${
                      index === accountIndex ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-sunken)] text-[var(--muted)]"
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
                      <Badge tone={account.role === "kunde" ? "good" : "neutral"}>{roleLabel[account.role]}</Badge>
                    </span>
                    <span className="block truncate text-[12.5px] text-[var(--muted)]">{account.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <Field label="E-Mail-Adresse" required error={errors.email}>
              <TextInput
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                invalid={Boolean(errors.email)}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>

            <Field label="Passwort" required error={errors.password} hint="Demo: beliebiges Passwort mit mindestens 8 Zeichen">
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

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-[13.5px] font-medium text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Angemeldet bleiben
              </label>
              <span className="text-[12.5px] text-[var(--faint)]">Abmeldung nach {IDLE_TIMEOUT_MINUTES} Min. Inaktivität</span>
            </div>

            <Button type="submit" variant="primary" disabled={submitting} className="w-full">
              {submitting ? "Wird geprüft …" : "Anmelden"}
            </Button>

            <button
              type="button"
              onClick={() => setPassword("pickthebank2026")}
              className="w-full rounded-lg border border-[var(--line)] py-2.5 text-[13.5px] font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
            >
              Demo-Passwort einsetzen
            </button>
          </form>

          <p className="mt-6 text-[12.5px] leading-relaxed text-[var(--faint)]">
            Prototyp mit Demodaten. Die Anmeldung prüft nur das Eingabeformat – im Produktivbetrieb erfolgt die
            Authentifizierung serverseitig mit starker Kundenauthentifizierung.
          </p>
        </div>
      </div>

      <aside className="relative hidden flex-col justify-center overflow-hidden bg-[var(--navy)] px-12 py-16 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.06]" />
        <div className="absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-white/[0.04]" />
        <div className="relative z-10 max-w-[440px]">
          <p className="text-[12.5px] uppercase tracking-[0.14em] text-white/50">Kundenportal</p>
          <h2 className="mt-4 text-[30px] font-semibold leading-tight tracking-tight">
            Kunden, Anlagen und Nachweise in einem System.
          </h2>
          <ul className="mt-9 space-y-4">
            {[
              "Kundenakte mit Stammdaten, Anlagen, Dokumenten und lückenlosem Protokoll.",
              "Festgeldanlagen anlegen, ändern und Fälligkeiten im Blick behalten.",
              "Kunden sehen ausschließlich ihre eigenen Anlagen und Unterlagen.",
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
