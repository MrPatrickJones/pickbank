"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Icon } from "@/components/admin/icons"
import { DashboardView } from "@/components/admin/dashboard-view"
import { CustomersView } from "@/components/admin/customers-view"
import { CustomerDetail } from "@/components/admin/customer-detail"
import { ActivitiesView, DocumentsView, InvestmentsView, MessagesView, PayoutsView } from "@/components/admin/list-views"
import { SettingsView } from "@/components/admin/settings-view"
import { NewCustomerWizard } from "@/components/admin/new-customer-wizard"
import { Badge } from "@/components/ui/primitives"
import { formatDate, formatEuro, initialsOf } from "@/lib/format"
import { daysToMaturity, effectiveStatus } from "@/lib/finance"
import { roleLabel, useSession } from "@/lib/session"
import { useData } from "@/lib/store"

type ViewId =
  | "dashboard"
  | "customers"
  | "customer"
  | "investments"
  | "deposits"
  | "documents"
  | "payouts"
  | "activities"
  | "messages"
  | "settings"

const navItems: { id: ViewId; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "customers", label: "Kunden", icon: "customers" },
  { id: "investments", label: "Anlagen", icon: "investments" },
  { id: "deposits", label: "Festgeldkonten", icon: "deposits" },
  { id: "documents", label: "Dokumente", icon: "documents" },
  { id: "payouts", label: "Auszahlungen", icon: "payouts" },
  { id: "activities", label: "Aktivitäten", icon: "activities" },
  { id: "messages", label: "Nachrichten", icon: "messages" },
  { id: "settings", label: "Einstellungen", icon: "settings" },
]

const mobileItems: ViewId[] = ["dashboard", "customers", "investments", "payouts", "messages"]

export function AdminShell() {
  const router = useRouter()
  const { user, signOut, can } = useSession()
  const { customers, investments, messages, setActor } = useData()

  const [view, setView] = useState<ViewId>("dashboard")
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [noticesOpen, setNoticesOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user?.name) setActor(user.name)
  }, [user?.name, setActor])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setSearchOpen(false)
    }
    window.addEventListener("mousedown", onClick)
    return () => window.removeEventListener("mousedown", onClick)
  }, [])

  const results = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (term.length < 2) return { customers: [], investments: [] }
    return {
      customers: customers
        .filter((customer) =>
          `${customer.firstName} ${customer.lastName} ${customer.customerNumber} ${customer.email}`.toLowerCase().includes(term),
        )
        .slice(0, 5),
      investments: investments
        .filter((investment) => `${investment.investmentNumber} ${investment.referenceAccount}`.toLowerCase().includes(term))
        .slice(0, 4),
    }
  }, [search, customers, investments])

  const notifications = useMemo(() => {
    const unread = messages.filter((message) => !message.read)
    const due = investments.filter(
      (investment) => effectiveStatus(investment) !== "beendet" && daysToMaturity(investment) <= 30,
    )
    return { unread, due }
  }, [messages, investments])

  const openCustomer = (id: string) => {
    setCustomerId(id)
    setView("customer")
    setNavOpen(false)
    setSearchOpen(false)
    setSearch("")
    window.scrollTo({ top: 0 })
  }

  const go = (next: string) => {
    if (next === "customers:new") {
      setView("customers")
      setWizardOpen(true)
    } else {
      setView(next as ViewId)
    }
    setNavOpen(false)
    setNoticesOpen(false)
    window.scrollTo({ top: 0 })
  }

  const current = navItems.find((item) => item.id === (view === "customer" ? "customers" : view))

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      {navOpen && <button type="button" aria-label="Menü schließen" onClick={() => setNavOpen(false)} className="fixed inset-0 z-30 bg-[rgba(11,29,58,.5)] lg:hidden" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-[var(--navy)] text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 pb-7 pt-7">
          <a
            href="https://www.pickthebank.eu"
            target="_blank"
            rel="noopener noreferrer"
            title="www.pickthebank.eu"
            className="inline-flex rounded-md transition-opacity hover:opacity-80"
          >
            <Image src="/logo.png" alt="Pick The Bank – zur Website" width={230} height={46} priority className="h-[38px] w-auto brightness-0 invert" />
          </a>
          <button type="button" onClick={() => setNavOpen(false)} aria-label="Menü schließen" className="rounded-lg p-1.5 text-white/60 hover:text-white lg:hidden">
            <Icon name="menu" className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto scroll-thin px-3">
          {navItems.map((item) => {
            const active = item.id === (view === "customer" ? "customers" : view)
            if (item.id === "settings" && !can("settings.manage")) return null
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                aria-current={active}
                className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-[14px] transition-colors ${
                  active ? "bg-white/[0.12] font-semibold text-white" : "font-medium text-white/70 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <Icon name={item.icon} className={`h-[18px] w-[18px] ${active ? "text-white" : "text-white/55"}`} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-white/15 text-[12px] font-semibold">
              {user ? initialsOf(user.name.split(" ")[0] ?? "P", user.name.split(" ")[1] ?? "J") : "PT"}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-semibold">{user?.name}</div>
              <div className="truncate text-[12px] text-white/60">{user ? roleLabel[user.role] : ""}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              signOut("manual")
              router.replace("/login")
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 py-2 text-[13px] font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white"
          >
            <Icon name="logout" className="h-4 w-4" />
            Abmelden
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-white px-4 py-3 sm:px-6">
          <button type="button" onClick={() => setNavOpen(true)} aria-label="Menü öffnen" className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-sunken)] lg:hidden">
            <Icon name="menu" className="h-5 w-5" />
          </button>

          <div ref={searchRef} className="relative min-w-[200px] flex-1 sm:max-w-[420px]">
            <label className="flex h-10 items-center gap-2.5 rounded-lg border border-[var(--line)] bg-white px-3.5">
              <Icon name="search" className="h-4 w-4 flex-none text-[var(--faint)]" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Kunde, Kundennummer, E-Mail oder Anlage-ID"
                className="w-full min-w-0 border-0 bg-transparent text-[14px] outline-none"
              />
            </label>

            {searchOpen && search.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-12 z-30 max-h-[380px] overflow-y-auto scroll-thin rounded-xl border border-[var(--line)] bg-white p-2 shadow-lift">
                {results.customers.length === 0 && results.investments.length === 0 && (
                  <p className="px-3 py-3 text-[13px] text-[var(--muted)]">Keine Treffer für „{search}“.</p>
                )}

                {results.customers.length > 0 && (
                  <>
                    <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--faint)]">Kunden</p>
                    {results.customers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => openCustomer(customer.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-sunken)]"
                      >
                        <span>
                          <span className="block text-[13.5px] font-semibold text-[var(--ink)]">
                            {customer.firstName} {customer.lastName}
                          </span>
                          <span className="num block text-[12px] text-[var(--muted)]">
                            {customer.customerNumber} · {customer.email}
                          </span>
                        </span>
                        <Icon name="back" className="h-4 w-4 rotate-180 text-[var(--faint)]" />
                      </button>
                    ))}
                  </>
                )}

                {results.investments.length > 0 && (
                  <>
                    <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--faint)]">Anlagen</p>
                    {results.investments.map((investment) => {
                      const owner = customers.find((entry) => entry.id === investment.customerId)
                      return (
                        <button
                          key={investment.id}
                          type="button"
                          onClick={() => openCustomer(investment.customerId)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-sunken)]"
                        >
                          <span>
                            <span className="num block text-[13.5px] font-semibold text-[var(--ink)]">{investment.investmentNumber}</span>
                            <span className="block text-[12px] text-[var(--muted)]">
                              {owner ? `${owner.firstName} ${owner.lastName}` : "–"} · {formatEuro(investment.principal, 0)}
                            </span>
                          </span>
                          <Icon name="back" className="h-4 w-4 rotate-180 text-[var(--faint)]" />
                        </button>
                      )
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNoticesOpen((open) => !open)}
                aria-label="Benachrichtigungen"
                className="relative grid h-10 w-10 place-items-center rounded-lg border border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
              >
                <Icon name="bell" />
                {(notifications.unread.length > 0 || notifications.due.length > 0) && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--danger)]" />
                )}
              </button>

              {noticesOpen && (
                <div className="absolute right-0 top-12 z-30 w-[320px] rounded-xl border border-[var(--line)] bg-white p-2 shadow-lift">
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--faint)]">Benachrichtigungen</p>
                  {notifications.due.slice(0, 3).map((investment) => {
                    const owner = customers.find((entry) => entry.id === investment.customerId)
                    return (
                      <button
                        key={investment.id}
                        type="button"
                        onClick={() => openCustomer(investment.customerId)}
                        className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-sunken)]"
                      >
                        <span className="block text-[13px] font-medium text-[var(--ink)]">
                          {investment.investmentNumber} wird am {formatDate(investment.maturityDate)} fällig
                        </span>
                        <span className="block text-[12px] text-[var(--muted)]">{owner ? `${owner.firstName} ${owner.lastName}` : ""}</span>
                      </button>
                    )
                  })}
                  {notifications.unread.slice(0, 3).map((message) => (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => openCustomer(message.customerId)}
                      className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-sunken)]"
                    >
                      <span className="block text-[13px] font-medium text-[var(--ink)]">{message.subject}</span>
                      <span className="block text-[12px] text-[var(--muted)]">Vom Kunden noch nicht gelesen</span>
                    </button>
                  ))}
                  {notifications.due.length === 0 && notifications.unread.length === 0 && (
                    <p className="px-3 py-3 text-[13px] text-[var(--muted)]">Keine offenen Hinweise.</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 rounded-lg border border-[var(--line)] py-1 pl-1 pr-3">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--navy)] text-[11px] font-semibold text-white">
                {user ? initialsOf(user.name.split(" ")[0] ?? "P", user.name.split(" ")[1] ?? "J") : "PT"}
              </span>
              <span className="hidden text-[13px] font-semibold text-[var(--ink)] sm:block">{user?.name}</span>
              <Badge tone="neutral">{user ? roleLabel[user.role] : ""}</Badge>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 px-4 pt-5 text-[12.5px] text-[var(--faint)] sm:px-6">
          <span>Pick The Bank</span>
          <span>/</span>
          <span className="font-semibold text-[var(--ink)]">{view === "customer" ? "Kundenakte" : current?.label}</span>
          <span className="ml-1 rounded-full bg-[var(--surface-sunken)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
            Demodaten
          </span>
        </div>

        <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-10">
          {view === "dashboard" && <DashboardView onOpenCustomer={openCustomer} onNavigate={go} />}
          {view === "customers" && <CustomersView onOpenCustomer={openCustomer} onNewCustomer={() => setWizardOpen(true)} />}
          {view === "customer" && customerId && <CustomerDetail customerId={customerId} onBack={() => setView("customers")} />}
          {view === "investments" && <InvestmentsView onOpenCustomer={openCustomer} />}
          {view === "deposits" && <InvestmentsView onOpenCustomer={openCustomer} fixedTermOnly />}
          {view === "documents" && <DocumentsView onOpenCustomer={openCustomer} />}
          {view === "payouts" && <PayoutsView onOpenCustomer={openCustomer} />}
          {view === "activities" && <ActivitiesView onOpenCustomer={openCustomer} />}
          {view === "messages" && <MessagesView onOpenCustomer={openCustomer} />}
          {view === "settings" && <SettingsView />}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[var(--line)] bg-white lg:hidden">
          {mobileItems.map((id) => {
            const item = navItems.find((entry) => entry.id === id)
            if (!item) return null
            const active = id === (view === "customer" ? "customers" : view)
            return (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
                  active ? "text-[var(--accent)]" : "text-[var(--muted)]"
                }`}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      <NewCustomerWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={(id) => {
          setWizardOpen(false)
          openCustomer(id)
        }}
      />
    </div>
  )
}
