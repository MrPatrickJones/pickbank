"use client"

import { useMemo, useState } from "react"

import { Icon } from "@/components/admin/icons"
import {
  Button,
  Card,
  CustomerStatusBadge,
  EmptyState,
  KycBadge,
  PageHeader,
  Pagination,
  SearchInput,
  Table,
  cell,
  cellRight,
  cellStrong,
  customerStatusOptions,
  kycStatusOptions,
  rowClass,
} from "@/components/ui/primitives"
import { Field, Select, TextInput, parseAmount } from "@/components/ui/form"
import { ConfirmDialog, useToast } from "@/components/ui/overlays"
import { formatDate, formatEuro } from "@/lib/format"
import { customerTotals } from "@/lib/finance"
import { useData } from "@/lib/store"
import { useSession } from "@/lib/session"
import type { Customer } from "@/lib/types"

type SortKey = "name" | "volume" | "maturity" | "updated" | "created"

const PAGE_SIZE = 8

export function CustomersView({
  onOpenCustomer,
  onNewCustomer,
}: {
  onOpenCustomer: (id: string) => void
  onNewCustomer: () => void
}) {
  const { customers, investments, setCustomerStatus } = useData()
  const { can } = useSession()
  const toast = useToast()

  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [country, setCountry] = useState("")
  const [kyc, setKyc] = useState("")
  const [minVolume, setMinVolume] = useState("")
  const [term, setTerm] = useState("")
  const [maturityBefore, setMaturityBefore] = useState("")
  const [createdAfter, setCreatedAfter] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort] = useState<SortKey>("name")
  const [direction, setDirection] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [deactivate, setDeactivate] = useState<Customer | null>(null)

  const countries = useMemo(
    () => Array.from(new Set(customers.map((customer) => customer.country))).sort(),
    [customers],
  )

  const rows = useMemo(() => {
    const enriched = customers.map((customer) => {
      const own = investments.filter((investment) => investment.customerId === customer.id)
      const totals = customerTotals(own)
      return { customer, totals, investments: own }
    })

    const filtered = enriched.filter(({ customer, totals, investments: own }) => {
      const haystack = [
        customer.firstName,
        customer.lastName,
        customer.customerNumber,
        customer.email,
        customer.city,
        customer.country,
      ]
        .join(" ")
        .toLowerCase()
      if (query && !haystack.includes(query.trim().toLowerCase())) return false
      if (status && customer.status !== status) return false
      if (country && customer.country !== country) return false
      if (kyc && customer.kycStatus !== kyc) return false
      if (minVolume) {
        const min = parseAmount(minVolume)
        if (Number.isFinite(min) && totals.principal < min) return false
      }
      if (term && !own.some((investment) => String(investment.term) === term)) return false
      if (maturityBefore) {
        const next = totals.nextMaturity
        if (!next || next > maturityBefore) return false
      }
      if (createdAfter && customer.createdAt.slice(0, 10) < createdAfter) return false
      return true
    })

    const factor = direction === "asc" ? 1 : -1
    return filtered.sort((a, b) => {
      switch (sort) {
        case "volume":
          return (a.totals.principal - b.totals.principal) * factor
        case "maturity":
          return ((a.totals.nextMaturity ?? "9999") > (b.totals.nextMaturity ?? "9999") ? 1 : -1) * factor
        case "updated":
          return (a.customer.updatedAt > b.customer.updatedAt ? 1 : -1) * factor
        case "created":
          return (a.customer.createdAt > b.customer.createdAt ? 1 : -1) * factor
        default:
          return (
            `${a.customer.lastName}${a.customer.firstName}`.localeCompare(
              `${b.customer.lastName}${b.customer.firstName}`,
            ) * factor
          )
      }
    })
  }, [customers, investments, query, status, country, kyc, minVolume, term, maturityBefore, createdAfter, sort, direction])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const activeFilters = [status, country, kyc, minVolume, term, maturityBefore, createdAfter].filter(Boolean).length

  const toggleSort = (key: SortKey) => {
    if (sort === key) {
      setDirection((value) => (value === "asc" ? "desc" : "asc"))
    } else {
      setSort(key)
      setDirection("asc")
    }
    setPage(1)
  }

  const sortLabel = (key: SortKey, label: string) => (
    <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-[var(--ink)]">
      {label}
      <span className={sort === key ? "text-[var(--accent)]" : "text-[var(--faint)] opacity-40"}>
        {sort === key && direction === "desc" ? "▾" : "▴"}
      </span>
    </button>
  )

  const resetFilters = () => {
    setStatus("")
    setCountry("")
    setKyc("")
    setMinVolume("")
    setTerm("")
    setMaturityBefore("")
    setCreatedAfter("")
    setPage(1)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kunden"
        subtitle={`${customers.length} Kunden · ${rows.length} in der aktuellen Auswahl`}
        actions={
          can("customers.write") ? (
            <Button variant="primary" onClick={onNewCustomer}>
              <Icon name="plus" className="h-4 w-4" />
              Neuer Kunde
            </Button>
          ) : null
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line-soft)] px-5 py-4">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            placeholder="Name, Kundennummer, E-Mail oder Ort"
            className="min-w-[240px] flex-1"
          />
          <Button onClick={() => setShowFilters((value) => !value)}>
            Filter
            {activeFilters > 0 && (
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                {activeFilters}
              </span>
            )}
          </Button>
          {activeFilters > 0 && (
            <Button variant="ghost" onClick={resetFilters}>
              Zurücksetzen
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid gap-4 border-b border-[var(--line-soft)] bg-[var(--surface-sunken)] px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Status">
              <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
                <option value="">Alle</option>
                {customerStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Land">
              <Select value={country} onChange={(event) => { setCountry(event.target.value); setPage(1) }}>
                <option value="">Alle</option>
                {countries.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="KYC-Status">
              <Select value={kyc} onChange={(event) => { setKyc(event.target.value); setPage(1) }}>
                <option value="">Alle</option>
                {kycStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Anlagevolumen ab">
              <TextInput
                value={minVolume}
                inputMode="decimal"
                placeholder="z. B. 50.000"
                onChange={(event) => { setMinVolume(event.target.value); setPage(1) }}
              />
            </Field>
            <Field label="Laufzeit">
              <Select value={term} onChange={(event) => { setTerm(event.target.value); setPage(1) }}>
                <option value="">Alle</option>
                {[3, 6, 12, 18, 24, 36].map((months) => (
                  <option key={months} value={String(months)}>
                    {months} Monate
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fälligkeit bis">
              <TextInput type="date" value={maturityBefore} onChange={(event) => { setMaturityBefore(event.target.value); setPage(1) }} />
            </Field>
            <Field label="Kunde angelegt ab">
              <TextInput type="date" value={createdAfter} onChange={(event) => { setCreatedAfter(event.target.value); setPage(1) }} />
            </Field>
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState title="Keine Kunden gefunden" hint="Passen Sie Suche oder Filter an." />
        ) : (
          <>
            <Table
              minWidth={1180}
              headers={[
                { label: "Kunde" },
                { label: "Kundennummer" },
                { label: "E-Mail" },
                { label: "Telefon" },
                { label: "Land" },
                { label: "Status" },
                { label: "Anlagevolumen", align: "right" },
                { label: "Aktive Anlagen", align: "right" },
                { label: "Nächste Fälligkeit" },
                { label: "Aktualisiert" },
                { label: "Aktionen", align: "right" },
              ]}
            >
              {visible.map(({ customer, totals }) => (
                <tr key={customer.id} className={rowClass}>
                  <td className={cellStrong}>
                    <button type="button" className="text-left hover:text-[var(--accent)]" onClick={() => onOpenCustomer(customer.id)}>
                      {customer.firstName} {customer.lastName}
                    </button>
                    <div className="mt-0.5">
                      <KycBadge status={customer.kycStatus} />
                    </div>
                  </td>
                  <td className={`${cell} num`}>{customer.customerNumber}</td>
                  <td className={cell}>{customer.email}</td>
                  <td className={`${cell} num`}>{customer.phone}</td>
                  <td className={cell}>{customer.country}</td>
                  <td className={cell}>
                    <CustomerStatusBadge status={customer.status} />
                  </td>
                  <td className={cellRight}>{formatEuro(totals.principal, 0)}</td>
                  <td className={cellRight}>{totals.activeCount}</td>
                  <td className={`${cell} num`}>{totals.nextMaturity ? formatDate(totals.nextMaturity) : "–"}</td>
                  <td className={`${cell} num`}>{formatDate(customer.updatedAt.slice(0, 10))}</td>
                  <td className={`${cell} text-right`}>
                    <div className="inline-flex items-center gap-2">
                      <Button size="sm" onClick={() => onOpenCustomer(customer.id)}>
                        Öffnen
                      </Button>
                      {can("customers.deactivate") && customer.status !== "inaktiv" && (
                        <Button size="sm" variant="ghost" onClick={() => setDeactivate(customer)}>
                          Deaktivieren
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination page={currentPage} pageCount={pageCount} total={rows.length} onChange={setPage} />
          </>
        )}
      </Card>

      <p className="text-[12.5px] text-[var(--faint)]">
        Sortierung: {sortLabel("name", "Name")} · {sortLabel("volume", "Volumen")} · {sortLabel("maturity", "Fälligkeit")} ·{" "}
        {sortLabel("updated", "Aktualisierung")} · {sortLabel("created", "Anlagedatum")}
      </p>

      <ConfirmDialog
        open={Boolean(deactivate)}
        title="Kunden deaktivieren"
        message={
          deactivate
            ? `Möchten Sie ${deactivate.firstName} ${deactivate.lastName} (${deactivate.customerNumber}) wirklich deaktivieren? Bestehende Anlagen bleiben erhalten, der Zugang wird gesperrt.`
            : ""
        }
        confirmLabel="Deaktivieren"
        tone="danger"
        onCancel={() => setDeactivate(null)}
        onConfirm={() => {
          if (deactivate) {
            setCustomerStatus(deactivate.id, "inaktiv")
            toast(`${deactivate.firstName} ${deactivate.lastName} wurde deaktiviert.`)
          }
          setDeactivate(null)
        }}
      />
    </div>
  )
}
