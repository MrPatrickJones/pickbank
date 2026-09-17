"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  PiggyBank,
  Receipt,
  Search,
  UserRound,
} from "lucide-react"

import { createT } from "@/components/portal/copy"
import { PortalSidebar, type NavItem } from "@/components/portal/sidebar"
import { DashboardView } from "@/components/portal/views/dashboard-view"
import { BanksView, DocumentsView, HoldingsView, TransactionsView } from "@/components/portal/views/list-views"
import { ProfileView, SupportView } from "@/components/portal/views/account-views"
import { useLocale } from "@/lib/i18n"
import { clearSession, getSession, type PortalSession } from "@/lib/auth"
import { customer, notifications, pick } from "@/lib/portfolio"

export default function PortalPage() {
  const router = useRouter()
  const { locale, setLocale } = useLocale()
  const t = createT(locale)

  const [session, setSession] = useState<PortalSession | null>(null)
  const [checked, setChecked] = useState(false)
  const [view, setView] = useState("dashboard")
  const [query, setQuery] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  // Client-side guard: without a session the portal sends the visitor to the login.
  useEffect(() => {
    const existing = getSession()
    if (!existing) {
      router.replace("/login")
      return
    }
    setSession(existing)
    setChecked(true)
  }, [router])

  const navItems: NavItem[] = useMemo(
    () => [
      { id: "dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
      { id: "holdings", label: t("nav.holdings"), icon: PiggyBank },
      { id: "transactions", label: t("nav.transactions"), icon: Receipt },
      { id: "documents", label: t("nav.documents"), icon: FileText },
      { id: "banks", label: t("nav.banks"), icon: Building2 },
      { id: "profile", label: t("nav.profile"), icon: UserRound },
      { id: "support", label: t("nav.support"), icon: LifeBuoy },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  )

  const handleSelect = (id: string) => {
    setView(id)
    setQuery("")
    setMobileOpen(false)
    setNotificationsOpen(false)
  }

  const handleLogout = () => {
    clearSession()
    router.replace("/login")
  }

  if (!checked || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm font-medium text-[#506392]">
        {t("shell.loading")}
      </div>
    )
  }

  const activeItem = navItems.find((item) => item.id === view)

  return (
    <div className="flex min-h-screen">
      <PortalSidebar
        items={navItems}
        active={view}
        onSelect={handleSelect}
        session={session}
        onLogout={handleLogout}
        t={t}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="ptb-no-print sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-[#E7EBF7] bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label={t("shell.menu")}
            className="rounded-lg p-2 text-[#506392] transition-colors hover:bg-[#F4F7FF] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#E7EBF7] px-4 sm:max-w-[420px]">
            <Search className="h-[18px] w-[18px] flex-none text-[#93A1C9]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("shell.search")}
              className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-[#001855] outline-none placeholder:text-[#9AA6B8]"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-full border border-[#E7EBF7] p-1 sm:flex">
              {(["de", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLocale(code)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase transition-colors ${
                    locale === code ? "bg-[#001855] text-white" : "text-[#506392] hover:text-[#001855]"
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-label={t("shell.notifications")}
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#E7EBF7] text-[#506392] transition-colors hover:border-[#C7D2F0]"
              >
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#D92D20]" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-30 w-[320px] rounded-2xl border border-[#E7EBF7] bg-white p-2 shadow-xl">
                  <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#93A1C9]">
                    {t("shell.notifications")}
                  </div>
                  {notifications.map((item) => (
                    <div key={item.id} className="rounded-xl px-3 py-2.5 transition-colors hover:bg-[#F8FAFF]">
                      <div className="text-[13.5px] font-medium leading-snug text-[#001855]">
                        {pick(item.title, locale)}
                      </div>
                      <div className="mt-0.5 text-[12px] text-[#93A1C9]">{pick(item.time, locale)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-[#E7EBF7] py-1 pl-1 pr-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#001855] text-xs font-semibold text-white">
                {customer.initials}
              </span>
              <span className="hidden text-[13px] font-semibold text-[#001855] sm:block">{customer.name}</span>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 px-4 pt-5 text-[13px] text-[#93A1C9] sm:px-6">
          <span>{t("shell.portal")}</span>
          <span>/</span>
          <span className="font-semibold text-[#001855]">{activeItem?.label}</span>
          <span className="ml-2 rounded-full bg-[#F1F4FF] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#506392]">
            {t("shell.demoBadge")}
          </span>
        </div>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {view === "dashboard" && <DashboardView locale={locale} t={t} onNavigate={handleSelect} />}
          {view === "holdings" && <HoldingsView locale={locale} t={t} query={query} />}
          {view === "transactions" && <TransactionsView locale={locale} t={t} query={query} />}
          {view === "documents" && <DocumentsView locale={locale} t={t} query={query} />}
          {view === "banks" && <BanksView locale={locale} t={t} query={query} />}
          {view === "profile" && <ProfileView locale={locale} t={t} session={session} />}
          {view === "support" && <SupportView locale={locale} t={t} />}
        </main>
      </div>
    </div>
  )
}
