"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { Icon } from "@/components/admin/icons"
import { DashboardView } from "@/components/admin/dashboard-view"
import { CustomersView } from "@/components/admin/customers-view"
import { CustomerDetail } from "@/components/admin/customer-detail"
import { BanksView } from "@/components/admin/banks-view"
import { AccountsView, ActivitiesView, DocumentsView, MessagesView, PayoutsView } from "@/components/admin/list-views"
import { SettingsView } from "@/components/admin/settings-view"
import { NewCustomerWizard } from "@/components/admin/new-customer-wizard"
import { Badge } from "@/components/ui/primitives"
import { api, buildQuery } from "@/lib/api"
import { formatAmount, initialsOf } from "@/lib/format"
import { roleLabel, useSession } from "@/lib/session"
import type { AccountWithCustomer, CustomerListItem } from "@/lib/types"

type ViewId =
  | "dashboard"
  | "customers"
  | "customer"
  | "accounts"
  | "banks"
  | "deposits"
  | "documents"
  | "payouts"
  | "activities"
  | "messages"
  | "settings"

const navItems: { id: ViewId; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "customers", label: "Kunden", icon: "customers" },
  { id: "accounts", label: "Festgeldkonten", icon: "deposits" },
  { id: "banks", label: "Banken", icon: "bank" },
  { id: "payouts", label: "Auszahlungen", icon: "payouts" },
  { id: "documents", label: "Dokumente", icon: "documents" },
  { id: "messages", label: "Nachrichten", icon: "messages" },
  { id: "activities", label: "Aktivitäten", icon: "activities" },
  { id: "settings", label: "Einstellungen", icon: "settings" },
]

const mobileItems: ViewId[] = ["dashboard", "customers", "accounts", "payouts", "messages"]

export function AdminShell() {
  const router = useRouter()
  const { user, signOut } = useSession()

  const [view, setView] = useState<ViewId>("dashboard")
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [results, setResults] = useState<{ customers: CustomerListItem[]; accounts: AccountWithCustomer[] }>({
    customers: [],
    accounts: [],
  })
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setSearchOpen(false)
    }
    window.addEventListener("mousedown", onClick)
    return () => window.removeEventListener("mousedown", onClick)
  }, [])

  // Global search: results come from the server while typing.
  useEffect(() => {
    const term = search.trim()
    if (term.length < 2) {
      setResults({ customers: [], accounts: [] })
      return
    }
    const timer = window.setTimeout(async () => {
      try {
        const [customers, accounts] = await Promise.all([
          api.get<{ items: CustomerListItem[] }>(`/api/customers${buildQuery({ search: term, pageSize: 5 })}`),
          api.get<{ accounts: AccountWithCustomer[] }>(`/api/accounts${buildQuery({ search: term, limit: 4 })}`),
        ])
        setResults({ customers: customers.items, accounts: accounts.accounts.slice(0, 4) })
      } catch {
        setResults({ customers: [], accounts: [] })
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const openCustomer = (id: number) => {
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
    window.scrollTo({ top: 0 })
  }

  const current = useMemo(
    () => navItems.find((item) => item.id === (view === "customer" ? "customers" : view)),
    [view],
  )

  const initials = user ? initialsOf(user.fullName.split(" ")[0] ?? "P", user.fullName.split(" ")[1] ?? "B") : "PT"

  return (
    <div className="flex min-h-screen bg-white">
      {navOpen && (
        <button
          type="button"
          aria-label="Menü schließen"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-[rgba(15,29,51,.28)] lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-[var(--line)] bg-white text-[var(--ink)] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 pb-6 pt-7">
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
              width={230}
              height={46}
              priority
              className="h-[38px] w-auto"
            />
          </a>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            aria-label="Menü schließen"
            className="rounded-lg p-1.5 text-[var(--faint)] hover:text-[var(--ink)] lg:hidden"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
        </div>

        <p className="px-6 pb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--faint)]">
          Verwaltung · Festgeldanlagen
        </p>

        <nav className="flex-1 space-y-0.5 overflow-y-auto scroll-thin px-3">
          {navItems.map((item) => {
            const active = item.id === (view === "customer" ? "customers" : view)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                aria-current={active}
                className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-[14px] transition-colors ${
                  active
                    ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                    : "font-medium text-[var(--body)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]"
                }`}
              >
                <Icon name={item.icon} className={`h-[18px] w-[18px] ${active ? "text-[var(--accent)]" : "text-[var(--faint)]"}`} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-[var(--line)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--accent-soft)] text-[12px] font-semibold text-[var(--accent)]">
              {initials}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-semibold">{user?.fullName}</div>
              <div className="truncate text-[12px] text-[var(--muted)]">{user ? roleLabel[user.role] : ""}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut()
              router.replace("/login")
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white py-2 text-[13px] font-semibold text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
          >
            <Icon name="logout" className="h-4 w-4" />
            Abmelden
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Menü öffnen"
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-sunken)] lg:hidden"
          >
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
                placeholder="Kunde, Kundennummer, E-Mail oder Kontonummer"
                className="w-full min-w-0 border-0 bg-transparent text-[14px] outline-none"
              />
            </label>

            {searchOpen && search.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-12 z-30 max-h-[380px] overflow-y-auto scroll-thin rounded-xl border border-[var(--line)] bg-white p-2 shadow-lift">
                {results.customers.length === 0 && results.accounts.length === 0 && (
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

                {results.accounts.length > 0 && (
                  <>
                    <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--faint)]">Festgeldkonten</p>
                    {results.accounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => openCustomer(account.customer.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-sunken)]"
                      >
                        <span>
                          <span className="num block text-[13.5px] font-semibold text-[var(--ink)]">{account.accountNumber}</span>
                          <span className="block text-[12px] text-[var(--muted)]">
                            {account.customer.firstName} {account.customer.lastName} ·{" "}
                            {formatAmount(account.principalAmount, account.currency, 0)}
                          </span>
                        </span>
                        <Icon name="back" className="h-4 w-4 rotate-180 text-[var(--faint)]" />
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2.5 rounded-lg border border-[var(--line)] py-1 pl-1 pr-3">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--accent-soft)] text-[11px] font-semibold text-[var(--accent)]">
              {initials}
            </span>
            <span className="hidden text-[13px] font-semibold text-[var(--ink)] sm:block">{user?.fullName}</span>
            <Badge tone="neutral">{user ? roleLabel[user.role] : ""}</Badge>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 px-4 pt-5 text-[12.5px] text-[var(--faint)] sm:px-6">
          <span>Pick The Bank</span>
          <span>/</span>
          <span className="font-semibold text-[var(--ink)]">{view === "customer" ? "Kundenakte" : current?.label}</span>
        </div>

        <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-10">
          {view === "dashboard" && <DashboardView onOpenCustomer={openCustomer} onNavigate={go} />}
          {view === "customers" && <CustomersView onOpenCustomer={openCustomer} onNewCustomer={() => setWizardOpen(true)} />}
          {view === "customer" && customerId && <CustomerDetail customerId={customerId} onBack={() => setView("customers")} />}
          {view === "accounts" && <AccountsView onOpenCustomer={openCustomer} />}
          {view === "banks" && <BanksView />}
          {view === "documents" && <DocumentsView onOpenCustomer={openCustomer} />}
          {view === "payouts" && <PayoutsView onOpenCustomer={openCustomer} />}
          {view === "activities" && <ActivitiesView onOpenCustomer={openCustomer} />}
          {view === "messages" && <MessagesView onOpenCustomer={openCustomer} />}
          {view === "settings" && <SettingsView />}
        </main>

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
