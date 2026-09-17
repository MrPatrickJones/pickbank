"use client"

import { CalendarClock, Mail, Phone, ShieldCheck } from "lucide-react"

import { Panel, ViewHeader } from "@/components/portal/ui"
import { customer, pick, totals, type Locale } from "@/lib/portfolio"
import type { PortalSession } from "@/lib/auth"

export function ProfileView({
  locale,
  t,
  session,
}: {
  locale: Locale
  t: (key: string) => string
  session: PortalSession
}) {
  const summary = totals()

  const fields = [
    { label: t("profile.name"), value: customer.name },
    { label: t("report.email"), value: session.email },
    { label: t("report.phone"), value: customer.phone },
    { label: t("report.address"), value: pick(customer.address, locale) },
    { label: t("report.customerNo"), value: customer.customerNo },
    { label: t("profile.advisor"), value: customer.advisor },
  ]

  const lastLogin = new Date(session.loginAt).toLocaleString(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    <div className="ptb-in space-y-5">
      <ViewHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />

      <Panel>
        <div className="flex flex-wrap items-center gap-4 border-b border-[#EDF0FA] px-5 py-5">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-[#001855] text-lg font-semibold text-white">
            {customer.initials}
          </div>
          <div>
            <div className="text-[17px] font-semibold text-[#001855]">{customer.name}</div>
            <div className="mt-0.5 text-[13px] text-[#506392]">
              {t("shell.customerNo")} #{customer.customerNo} · {pick(customer.since, locale)} · {summary.count}{" "}
              {t("kpi.count")}
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#93A1C9]">{field.label}</div>
              <div className="mt-1.5 text-sm font-medium text-[#001855]">{field.value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF0FA] px-5 py-4">
          <p className="text-[13px] text-[#93A1C9]">{t("profile.editHint")}</p>
          <button
            type="button"
            className="rounded-full border border-[#D6DDF2] px-5 py-2 text-sm font-semibold text-[#506392] transition-colors hover:border-[#001855] hover:text-[#001855]"
          >
            {t("profile.editRequest")}
          </button>
        </div>
      </Panel>

      <Panel title={t("profile.security")}>
        <div className="space-y-4 px-5 py-5">
          <div className="flex items-center gap-3 text-sm font-medium text-[#001855]">
            <ShieldCheck className="h-[18px] w-[18px] text-[#12805C]" />
            {t("profile.twoFactor")}
          </div>
          <div className="flex items-center gap-3 text-sm text-[#506392]">
            <CalendarClock className="h-[18px] w-[18px] text-[#93A1C9]" />
            {t("profile.lastLogin")}: {lastLogin}
          </div>
          <button
            type="button"
            className="rounded-full bg-[#001855] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A2A7A]"
          >
            {t("profile.changePassword")}
          </button>
        </div>
      </Panel>
    </div>
  )
}

export function SupportView({ locale, t }: { locale: Locale; t: (key: string) => string }) {
  const cards = [
    {
      id: "phone",
      icon: Phone,
      title: t("support.call"),
      value: "+49 30 220 123 40",
      href: "tel:+493022012340",
    },
    {
      id: "mail",
      icon: Mail,
      title: t("support.email"),
      value: "service@pickthebank.eu",
      href: "mailto:service@pickthebank.eu",
    },
    {
      id: "advisor",
      icon: CalendarClock,
      title: t("support.advisor"),
      value: customer.advisor,
      href: "https://www.pickthebank.eu",
    },
  ]

  return (
    <div className="ptb-in space-y-5">
      <ViewHeader title={t("support.title")} subtitle={t("support.subtitle")} />

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <a
            key={card.id}
            href={card.href}
            target={card.href.startsWith("http") ? "_blank" : undefined}
            rel={card.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="rounded-2xl border border-[#E7EBF7] bg-white p-5 shadow-[0_1px_2px_rgba(0,24,85,0.04)] transition-colors hover:border-[#326BFF]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EDF2FF] text-[#326BFF]">
              <card.icon className="h-5 w-5" />
            </span>
            <div className="mt-4 text-[15px] font-semibold text-[#001855]">{card.title}</div>
            <div className="mt-1 text-sm text-[#506392]">{card.value}</div>
          </a>
        ))}
      </div>

      <p className="text-[13px] text-[#93A1C9]">
        {t("support.responseTime")} · {locale === "de" ? "Mo–Fr 9–17 Uhr" : "Mon–Fri 9am–5pm"}
      </p>
    </div>
  )
}
