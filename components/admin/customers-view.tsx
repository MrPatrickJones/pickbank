"use client"

import { useMemo, useState } from "react"

import { Icon } from "@/components/admin/icons"
import {
  Button,
  Card,
  CustomerStatusBadge,
  EmptyState,
  ErrorState,
  KycBadge,
  LoadingState,
  PageHeader,
  Pagination,
  SearchInput,
  Table,
  cell,
  cellRight,
  cellStrong,
  rowClass,
} from "@/components/ui/primitives"
import { Field, Select, TextInput } from "@/components/ui/form"
import { ConfirmDialog, useToast } from "@/components/ui/overlays"
import { ApiRequestError, api, buildQuery } from "@/lib/api"
import { formatAmount, formatDate, parseAmountInput } from "@/lib/format"
import { customerStatusOptions, kycStatusOptions } from "@/lib/labels"
import { useSession } from "@/lib/session"
import { useResource } from "@/lib/use-resource"
import type { CustomerListItem } from "@/lib/types"

type ListResponse = {
  items: CustomerListItem[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

const PAGE_SIZE = 10

export function CustomersView({
  onOpenCustomer,
  onNewCustomer,
}: {
  onOpenCustomer: (id: number) => void
  onNewCustomer: () => void
}) {
  const { can } = useSession()
  const toast = useToast()

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [kycStatus, setKycStatus] = useState("")
  const [country, setCountry] = useState("")
  const [minVolume, setMinVolume] = useState("")
  const [termMonths, setTermMonths] = useState("")
  const [maturityBefore, setMaturityBefore] = useState("")
  const [createdAfter, setCreatedAfter] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort] = useState<"name" | "volume" | "maturity" | "updated" | "created">("name")
  const [direction, setDirection] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [deactivate, setDeactivate] = useState<CustomerListItem | null>(null)

  const query = buildQuery({
    search,
    status,
    kycStatus,
    country,
    minVolume: minVolume ? parseAmountInput(minVolume) : undefined,
    termMonths,
    maturityBefore,
    createdAfter,
    sort,
    direction,
    page,
    pageSize: PAGE_SIZE,
  })

  // Search, filters, sorting and pagination all run in the database.
  const { data, loading, error, reload } = useResource<ListResponse>(
    () => api.get<ListResponse>(`/api/customers${query}`),
    [query],
  )

  const countries = useMemo(
    () => Array.from(new Set((data?.items ?? []).map((item) => item.country).filter(Boolean))) as string[],
    [data],
  )

  const activeFilters = [status, kycStatus, country, minVolume, termMonths, maturityBefore, createdAfter].filter(Boolean)
    .length

  const toggleSort = (key: typeof sort) => {
    if (sort === key) setDirection((value) => (value === "asc" ? "desc" : "asc"))
    else {
      setSort(key)
      setDirection("asc")
    }
    setPage(1)
  }

  const sortButton = (key: typeof sort, label: string) => (
    <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-[var(--ink)]">
      {label}
      <span className={sort === key ? "text-[var(--accent)]" : "text-[var(--faint)] opacity-40"}>
        {sort === key && direction === "desc" ? "▾" : "▴"}
      </span>
    </button>
  )

  const resetFilters = () => {
    setStatus("")
    setKycStatus("")
    setCountry("")
    setMinVolume("")
    setTermMonths("")
    setMaturityBefore("")
    setCreatedAfter("")
    setPage(1)
  }

  const deactivateCustomer = async (customer: CustomerListItem) => {
    try {
      await api.patch(`/api/customers/${customer.id}`, { customerStatus: "INACTIVE" })
      toast(`${customer.firstName} ${customer.lastName} wurde deaktiviert.`)
      await reload()
    } catch (caught) {
      toast(caught instanceof ApiRequestError ? caught.message : "Aktion fehlgeschlagen.", "error")
    } finally {
      setDeactivate(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kunden"
        subtitle={data ? `${data.total} Kunden in der aktuellen Auswahl` : "Kundenverwaltung"}
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
            value={search}
            onChange={(value) => {
              setSearch(value)
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
          <div className="grid gap-4 border-b border-[var(--line-soft)] bg-white px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <Field label="KYC-Status">
              <Select value={kycStatus} onChange={(event) => { setKycStatus(event.target.value); setPage(1) }}>
                <option value="">Alle</option>
                {kycStatusOptions.map((option) => (
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
            <Field label="Anlagevolumen ab">
              <TextInput
                value={minVolume}
                inputMode="decimal"
                placeholder="z. B. 50.000"
                onChange={(event) => { setMinVolume(event.target.value); setPage(1) }}
              />
            </Field>
            <Field label="Laufzeit">
              <Select value={termMonths} onChange={(event) => { setTermMonths(event.target.value); setPage(1) }}>
                <option value="">Alle</option>
                {[3, 6, 12, 18, 24, 36, 48, 60].map((months) => (
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

        {loading && !data && <LoadingState />}
        {error && <ErrorState message={error} onRetry={reload} />}

        {data && data.items.length === 0 && !loading && (
          <EmptyState title="Keine Kunden gefunden" hint="Passen Sie Suche oder Filter an." />
        )}

        {data && data.items.length > 0 && (
          <>
            <Table
              minWidth={1180}
              headers={[
                "Kunde",
                "Kundennummer",
                "E-Mail",
                "Status",
                { label: "Konten", align: "right" },
                { label: "Gesamtbetrag", align: "right" },
                "Nächste Fälligkeit",
                "Erstellt",
                "Letzte Änderung",
                { label: "Aktionen", align: "right" },
              ]}
            >
              {data.items.map((customer) => (
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
                  <td className={cell}>
                    <CustomerStatusBadge status={customer.customerStatus} />
                  </td>
                  <td className={cellRight}>
                    {customer.accountCount}
                    <span className="ml-1 text-[12px] text-[var(--faint)]">({customer.activeAccounts} aktiv)</span>
                  </td>
                  <td className={cellRight}>{formatAmount(customer.totalPrincipal, "EUR", 0)}</td>
                  <td className={`${cell} num`}>{customer.nextMaturity ? formatDate(customer.nextMaturity) : "–"}</td>
                  <td className={`${cell} num`}>{formatDate(customer.createdAt.slice(0, 10))}</td>
                  <td className={`${cell} num`}>{formatDate(customer.updatedAt.slice(0, 10))}</td>
                  <td className={`${cell} text-right`}>
                    <div className="inline-flex items-center gap-2">
                      <Button size="sm" onClick={() => onOpenCustomer(customer.id)}>
                        Öffnen
                      </Button>
                      {can("customers.write") && customer.customerStatus !== "INACTIVE" && (
                        <Button size="sm" variant="ghost" onClick={() => setDeactivate(customer)}>
                          Deaktivieren
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onChange={setPage} />
          </>
        )}
      </Card>

      <p className="text-[12.5px] text-[var(--faint)]">
        Sortierung: {sortButton("name", "Name")} · {sortButton("volume", "Volumen")} · {sortButton("maturity", "Fälligkeit")} ·{" "}
        {sortButton("updated", "Letzte Änderung")} · {sortButton("created", "Erstellt")}
      </p>

      <ConfirmDialog
        open={Boolean(deactivate)}
        title="Kunden deaktivieren"
        message={
          deactivate
            ? `Möchten Sie ${deactivate.firstName} ${deactivate.lastName} (${deactivate.customerNumber}) wirklich deaktivieren? Bestehende Konten bleiben erhalten, der Zugang wird gesperrt.`
            : ""
        }
        confirmLabel="Deaktivieren"
        tone="danger"
        onCancel={() => setDeactivate(null)}
        onConfirm={() => deactivate && void deactivateCustomer(deactivate)}
      />
    </div>
  )
}
