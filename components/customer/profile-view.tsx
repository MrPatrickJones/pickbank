"use client"

import { Card, CustomerStatusBadge, KycBadge } from "@/components/ui/primitives"
import { formatDate } from "@/lib/format"
import type { CustomerPortalData } from "@/lib/types"

/**
 * „Meine Daten": alles, was zur Person hinterlegt ist. Änderungen nimmt
 * ausschliesslich Pick The Bank vor – das steht auch so auf der Seite.
 */
export function CustomerProfile({ customer }: { customer: CustomerPortalData["customer"] }) {
  const address = [
    customer.address,
    [customer.postalCode, customer.city].filter(Boolean).join(" "),
    customer.country,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[18px] font-semibold text-[var(--ink)]">Meine Daten</h2>
        <p className="mt-1 text-[13.5px] text-[var(--muted)]">
          Stimmt etwas nicht? Schreiben Sie uns – wir korrigieren es für Sie.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Persönliche Daten">
          <dl className="divide-y divide-[var(--line-soft)]">
            <Row label="Vorname" value={customer.firstName} />
            <Row label="Nachname" value={customer.lastName} />
            {customer.companyName && <Row label="Firma" value={customer.companyName} />}
            <Row label="Geburtsdatum" value={customer.dateOfBirth ? formatDate(customer.dateOfBirth) : "–"} />
            <Row label="Staatsangehörigkeit" value={customer.nationality ?? "–"} />
            <Row label="Kundennummer" value={customer.customerNumber} />
            <Row label="Kunde seit" value={formatDate(customer.createdAt.slice(0, 10))} />
          </dl>
        </Card>

        <Card title="Kontaktdaten">
          <dl className="divide-y divide-[var(--line-soft)]">
            <Row label="E-Mail" value={customer.email} />
            <Row label="Mobiltelefon" value={customer.mobile ?? "–"} />
            <Row label="Telefon" value={customer.phone ?? "–"} />
            <Row label="Adresse" value={customer.address ?? "–"} />
            <Row label="PLZ" value={customer.postalCode ?? "–"} />
            <Row label="Ort" value={customer.city ?? "–"} />
            <Row label="Land" value={customer.country ?? "–"} />
          </dl>
        </Card>

        <Card title="Identifikation" className="lg:col-span-2">
          <dl className="divide-y divide-[var(--line-soft)]">
            <Row label="Kundenstatus" value={<CustomerStatusBadge status={customer.customerStatus} />} />
            <Row label="Legitimation" value={<KycBadge status={customer.kycStatus} />} />
            <Row label="Ausweisart" value={customer.identificationType ?? "–"} />
            <Row label="Identifiziert am" value={customer.identifiedAt ? formatDate(customer.identifiedAt) : "–"} />
            <Row label="Anschrift laut Akte" value={address || "–"} />
          </dl>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <dt className="text-[13px] text-[var(--muted)]">{label}</dt>
      <dd className="text-[13.5px] font-medium text-[var(--ink)]">{value}</dd>
    </div>
  )
}
