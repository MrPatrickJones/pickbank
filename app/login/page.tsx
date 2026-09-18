"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Icon } from "@/components/admin/icons"
import { Button } from "@/components/ui/primitives"
import { Field, TextInput } from "@/components/ui/form"
import { ApiRequestError, api } from "@/lib/api"
import { useSession } from "@/lib/session"

export default function LoginPage() {
  const router = useRouter()
  const { user, ready, signIn, signOutReason } = useSession()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    if (ready && user) router.replace(user.role === "CUSTOMER" ? "/portal" : "/admin")
  }, [ready, user, router])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrors({})
    setSubmitting(true)
    try {
      const signedIn = await signIn(email, password)
      router.replace(signedIn.role === "CUSTOMER" ? "/portal" : "/admin")
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setErrors({ ...caught.details, form: Object.keys(caught.details).length ? undefined : caught.message })
      } else {
        setErrors({ form: "Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut." })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrors({})
    setSubmitting(true)
    try {
      await api.post("/api/auth/password-reset", { email })
      setResetSent(true)
    } catch (caught) {
      setErrors({ form: caught instanceof ApiRequestError ? caught.message : "Anfrage fehlgeschlagen." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-[380px]">
        <div className="text-center">
          <a
            href="https://www.pickthebank.eu"
            target="_blank"
            rel="noopener noreferrer"
            title="www.pickthebank.eu"
            className="inline-flex rounded-md transition-opacity hover:opacity-80"
          >
            <Image
              src="/logo.png"
              alt="Pick The Bank – zur Website"
              width={280}
              height={56}
              priority
              className="h-[42px] w-auto"
            />
          </a>
          <p className="mt-3 text-[13px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
            Festgeldanlagen · Kundenportal
          </p>
        </div>

        <h1 className="mt-10 text-center text-[24px] font-semibold tracking-tight text-[var(--ink)]">
          {resetMode ? "Passwort zurücksetzen" : "Anmelden"}
        </h1>

        {signOutReason === "expired" && !resetMode && (
          <p className="mt-5 rounded-lg bg-[var(--warn-soft)] px-4 py-3 text-center text-[13px] font-medium text-[var(--warn)]">
            Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.
          </p>
        )}

        {resetMode ? (
          resetSent ? (
            <div className="mt-7 space-y-4">
              <p className="rounded-lg bg-[var(--good-soft)] px-4 py-3 text-[13.5px] font-medium text-[var(--good)]">
                Wenn ein Zugang zu dieser Adresse besteht, ist der Link unterwegs.
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  setResetMode(false)
                  setResetSent(false)
                }}
              >
                Zurück zur Anmeldung
              </Button>
            </div>
          ) : (
            <form onSubmit={requestReset} className="mt-7 space-y-4" noValidate>
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
              {errors.form && (
                <p role="alert" className="rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-[13px] font-medium text-[var(--danger)]">
                  {errors.form}
                </p>
              )}
              <Button type="submit" variant="primary" disabled={submitting} className="w-full">
                {submitting ? "Wird gesendet …" : "Link anfordern"}
              </Button>
              <Button type="button" className="w-full" onClick={() => setResetMode(false)}>
                Abbrechen
              </Button>
            </form>
          )
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            <Field label="E-Mail-Adresse" required error={errors.email}>
              <TextInput
                id="email"
                type="email"
                autoComplete="username"
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
              </p>
            )}

            <Button type="submit" variant="primary" disabled={submitting} className="w-full">
              {submitting ? "Wird geprüft …" : "Anmelden"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setResetMode(true)
                setErrors({})
              }}
              className="w-full text-center text-[13px] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Passwort vergessen?
            </button>
          </form>
        )}

        <p className="mt-10 text-center text-[12px] leading-relaxed text-[var(--faint)]">
          Zugänge vergibt ausschließlich Pick The Bank.
        </p>
      </div>
    </main>
  )
}
