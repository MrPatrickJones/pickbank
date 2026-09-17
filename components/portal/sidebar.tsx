"use client"

import type React from "react"
import Image from "next/image"
import { ChevronRight, ExternalLink, LogOut, X } from "lucide-react"

import { customer, formatEuro, totals } from "@/lib/portfolio"
import type { PortalSession } from "@/lib/auth"

export type NavItem = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function PortalSidebar({
  items,
  active,
  onSelect,
  session,
  onLogout,
  t,
  mobileOpen,
  onCloseMobile,
}: {
  items: NavItem[]
  active: string
  onSelect: (id: string) => void
  session: PortalSession
  onLogout: () => void
  t: (key: string) => string
  mobileOpen: boolean
  onCloseMobile: () => void
}) {
  const summary = totals()

  return (
    <>
      {mobileOpen && (
        <div role="presentation" onClick={onCloseMobile} className="fixed inset-0 z-30 bg-[#001855]/40 lg:hidden" />
      )}

      <aside
        className={`ptb-no-print fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-[#E7EBF7] bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 pb-7 pt-6">
          <Image src="/logo.png" alt="PickTheBank" width={148} height={30} className="h-[30px] w-auto" priority />
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-[#93A1C9] transition-colors hover:text-[#001855] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4">
          {items.map((item) => {
            const isActive = item.id === active
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-[15px] transition-colors ${
                  isActive
                    ? "bg-[#EDF2FF] font-semibold text-[#001855]"
                    : "font-medium text-[#506392] hover:bg-[#F4F7FF] hover:text-[#001855]"
                }`}
              >
                <item.icon className={`h-[18px] w-[18px] ${isActive ? "text-[#326BFF]" : "text-[#93A1C9]"}`} />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="h-4 w-4 opacity-40" />
              </button>
            )
          })}
        </nav>

        <div className="mx-4 mb-4 rounded-2xl bg-[#F4F7FF] px-4 py-3">
          <div className="text-[13px] font-semibold text-[#001855]">{formatEuro(summary.value, 0)}</div>
          <div className="mt-0.5 text-[12.5px] font-medium text-[#506392]">
            {summary.count} {t("kpi.count")} · {summary.weightedRate.toFixed(2).replace(".", ",")} % Ø
          </div>
        </div>

        <div className="border-t border-[#EDF0FA] px-6 py-5">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-[#93A1C9]">{t("shell.loggedInAs")}</div>
          <div className="mt-2 truncate text-sm font-semibold text-[#001855]">{customer.name}</div>
          <div className="mt-0.5 truncate text-[12.5px] text-[#506392]">{session.email}</div>
          <div className="mt-0.5 text-[12.5px] text-[#93A1C9]">
            {t("shell.customerNo")} #{customer.customerNo}
          </div>

          <a
            href="https://www.pickthebank.eu"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E7EBF7] text-[13.5px] font-semibold text-[#506392] transition-colors hover:border-[#C7D2F0] hover:text-[#001855]"
          >
            <ExternalLink className="h-4 w-4" />
            {t("shell.website")}
          </a>

          <button
            type="button"
            onClick={onLogout}
            className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#E7EBF7] text-[13.5px] font-semibold text-[#506392] transition-colors hover:border-[#C7D2F0] hover:text-[#001855]"
          >
            <LogOut className="h-4 w-4" />
            {t("shell.logout")}
          </button>
        </div>
      </aside>
    </>
  )
}
