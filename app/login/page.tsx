"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react"

import { createT } from "@/components/portal/copy"
import { useLocale } from "@/lib/i18n"
import { DEMO_CREDENTIALS, getSession, isValidEmail, saveSession } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const { locale, setLocale } = useLocale()
  const t = createT(locale)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<"login" | "reset">("login")
  const [resetSent, setResetSent] = useState(false)

  // A running session goes straight to the portal.
  useEffect(() => {
    if (getSession()) router.replace("/portal")
  }, [router])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValidEmail(email)) {
      setError(t("login.errorEmail"))
      return
    }
    if (password.trim().length < 8) {
      setError(t("login.errorPassword"))
      return
    }

    setError(null)
    setSubmitting(true)
    // Prototype: the delay stands in for the round trip to the backend.
    window.setTimeout(() => {
      saveSession({ email: email.trim().toLowerCase(), loginAt: new Date().toISOString() }, remember)
      router.push("/portal")
    }, 600)
  }

  const handleReset = (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValidEmail(email)) {
      setError(t("login.errorEmail"))
      return
    }
    setError(null)
    setResetSent(true)
  }

  const inputClass =
    "w-full rounded-xl border border-[#D6DDF2] bg-white py-3 pl-11 pr-11 text-[15px] font-medium text-[#001855] outline-none transition-colors placeholder:font-normal placeholder:text-[#9AA6B8] focus:border-[#326BFF] focus:ring-2 focus:ring-[#326BFF]/20"

  return (
    <main className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-2">
      <div className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-[460px]">
          <div className="mb-10 flex items-center justify-between">
            <a href="https://www.pickthebank.eu" target="_blank" rel="noopener noreferrer">
              <Image src="/logo.png" alt="PickTheBank" width={168} height={34} className="h-[34px] w-auto" priority />
            </a>
            <div className="flex items-center gap-1 rounded-full border border-[#E7EBF7] p-1">
              {(["de", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLocale(code)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase transition-colors ${
                    locale === code ? "bg-[#001855] text-white" : "text-[#506392] hover:text-[#001855]"
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full bg-[#EDF2FF] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#326BFF]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("login.badge")}
          </span>

          {mode === "login" ? (
            <>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#001855] sm:text-4xl">{t("login.title")}</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[#506392]">{t("login.subtitle")}</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="mb-2 block text-[13px] font-semibold text-[#506392]">
                    {t("login.email")}
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9AA6B8]" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={t("login.emailPlaceholder")}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-[13px] font-semibold text-[#506392]">
                    {t("login.password")}
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9AA6B8]" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#9AA6B8] transition-colors hover:text-[#001855]"
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#506392]">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="h-4 w-4 rounded border-[#D6DDF2] accent-[#326BFF]"
                    />
                    {t("login.remember")}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset")
                      setError(null)
                    }}
                    className="text-sm font-semibold text-[#326BFF] hover:underline"
                  >
                    {t("login.forgot")}
                  </button>
                </div>

                {error && (
                  <p role="alert" className="rounded-xl bg-[#FDECEC] px-4 py-3 text-sm font-medium text-[#B42318]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#326BFF] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2C61E8] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? t("login.submitting") : t("login.submit")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail(DEMO_CREDENTIALS.email)
                    setPassword(DEMO_CREDENTIALS.password)
                    setError(null)
                  }}
                  className="w-full rounded-full border border-[#D6DDF2] px-6 py-3 text-sm font-semibold text-[#506392] transition-colors hover:border-[#001855] hover:text-[#001855]"
                >
                  {t("login.demoButton")}
                </button>

                <p className="text-[13px] leading-relaxed text-[#93A1C9]">{t("login.demoHint")}</p>
              </form>

              <div className="my-6 h-px bg-[#EDF0FA]" />

              <p className="text-sm font-medium text-[#506392]">
                {t("login.noAccount")}{" "}
                <a
                  href="https://www.pickthebank.eu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#326BFF] hover:underline"
                >
                  {t("login.openAccount")}
                </a>
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#001855]">{t("login.resetTitle")}</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[#506392]">{t("login.resetText")}</p>

              {resetSent ? (
                <div className="mt-8 flex items-start gap-3 rounded-xl bg-[#E9F8F0] px-4 py-4 text-sm font-medium text-[#12805C]">
                  <Check className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{t("login.resetSent")}</span>
                </div>
              ) : (
                <form onSubmit={handleReset} className="mt-8 space-y-4" noValidate>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9AA6B8]" />
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={t("login.emailPlaceholder")}
                      className={inputClass}
                    />
                  </div>
                  {error && (
                    <p role="alert" className="rounded-xl bg-[#FDECEC] px-4 py-3 text-sm font-medium text-[#B42318]">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="w-full rounded-full bg-[#326BFF] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2C61E8]"
                  >
                    {t("login.resetSubmit")}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setMode("login")
                  setResetSent(false)
                  setError(null)
                }}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#506392] transition-colors hover:text-[#001855]"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("login.resetBack")}
              </button>
            </>
          )}

          <a
            href="https://www.pickthebank.eu"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#93A1C9] transition-colors hover:text-[#001855]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("login.backHome")}
          </a>
        </div>
      </div>

      <div className="relative hidden flex-col justify-center overflow-hidden bg-gradient-to-br from-[#001855] via-[#1C3A9E] to-[#326BFF] px-12 py-16 lg:flex">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/5" />

        <div className="relative z-10 max-w-[460px]">
          <h2 className="text-[30px] font-bold leading-tight tracking-tight text-white">{t("login.uspTitle")}</h2>

          <ul className="mt-8 space-y-4">
            {[t("login.usp1"), t("login.usp2"), t("login.usp3")].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-white/15 text-xs font-bold text-white">
                  ✓
                </span>
                <span className="text-[15px] font-medium leading-relaxed text-[#DDE4FA]">{item}</span>
              </li>
            ))}
          </ul>

          <p className="mt-10 text-[13px] font-semibold text-[#A9B6E4]">{t("login.security")}</p>
        </div>
      </div>
    </main>
  )
}
