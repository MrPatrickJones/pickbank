"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

import { cloneSeed } from "@/lib/seed"
import { formatDate, formatEuro, formatPercent } from "@/lib/format"
import type {
  Activity,
  Customer,
  CustomerStatus,
  Database,
  DocumentCategory,
  Investment,
  Message,
  PortalDocument,
} from "@/lib/types"

const STORAGE_KEY = "ptb.portal.db.v1"

/**
 * Single source of truth for the prototype. Every mutating action writes an
 * activity entry, so the audit trail can never fall behind the data.
 * The module is deliberately the only place that touches storage – swapping it
 * for an API client later means changing this file alone.
 */

type NewCustomerInput = Omit<Customer, "id" | "customerNumber" | "createdAt" | "updatedAt"> & {
  customerNumber?: string
}

type NewInvestmentInput = Omit<
  Investment,
  "id" | "investmentNumber" | "customerId" | "currency" | "createdAt" | "updatedAt"
> & { investmentNumber?: string }

type DataContextValue = {
  ready: boolean
  customers: Customer[]
  investments: Investment[]
  documents: PortalDocument[]
  activities: Activity[]
  messages: Message[]
  actor: string
  setActor: (name: string) => void
  customerById: (id: string) => Customer | undefined
  investmentsOf: (customerId: string) => Investment[]
  documentsOf: (customerId: string) => PortalDocument[]
  activitiesOf: (customerId: string) => Activity[]
  messagesOf: (customerId: string) => Message[]
  nextCustomerNumber: () => string
  nextInvestmentNumber: () => string
  createCustomer: (input: NewCustomerInput, investment?: NewInvestmentInput, files?: PendingFile[]) => Customer
  updateCustomer: (id: string, patch: Partial<Customer>) => void
  setCustomerStatus: (id: string, status: CustomerStatus) => void
  createInvestment: (customerId: string, input: NewInvestmentInput) => Investment
  updateInvestment: (id: string, patch: Partial<Investment>) => void
  addDocument: (customerId: string, file: PendingFile) => void
  removeDocument: (id: string) => void
  sendMessage: (customerId: string, subject: string, body: string) => void
  markMessageRead: (id: string) => void
  resetDemoData: () => void
}

export type PendingFile = {
  filename: string
  category: DocumentCategory
  sizeKb: number
  investmentId?: string | null
}

const DataContext = createContext<DataContextValue | null>(null)

const emptyDb: Database = { customers: [], investments: [], documents: [], activities: [], messages: [] }

let sequence = 0
const makeId = (prefix: string) => {
  sequence += 1
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}`
}

/** Labels and formatters for the audit trail, so a diff reads like a sentence. */
const customerFields: Partial<Record<keyof Customer, { label: string; format?: (value: unknown) => string }>> = {
  firstName: { label: "Vorname" },
  lastName: { label: "Nachname" },
  dateOfBirth: { label: "Geburtsdatum", format: (value) => formatDate(String(value)) },
  nationality: { label: "Nationalität" },
  address: { label: "Adresse" },
  postalCode: { label: "PLZ" },
  city: { label: "Ort" },
  country: { label: "Land" },
  email: { label: "E-Mail" },
  phone: { label: "Telefon" },
  mobile: { label: "Mobiltelefon" },
  status: { label: "Status", format: (value) => customerStatusLabel(value as CustomerStatus) },
  kycStatus: { label: "KYC-Status" },
  identifiedAt: { label: "Identifikationsdatum", format: (value) => formatDate(String(value)) },
  identificationType: { label: "Ausweisart" },
}

const investmentFields: Partial<Record<keyof Investment, { label: string; format?: (value: unknown) => string }>> = {
  principal: { label: "Anlagebetrag", format: (value) => formatEuro(Number(value)) },
  currency: { label: "Währung" },
  interestRate: { label: "Zinssatz", format: (value) => formatPercent(Number(value)) },
  term: { label: "Laufzeit", format: (value) => `${value} Monate` },
  startDate: { label: "Startdatum", format: (value) => formatDate(String(value)) },
  maturityDate: { label: "Enddatum", format: (value) => formatDate(String(value)) },
  interestPayment: { label: "Zinszahlung" },
  payoutDate: { label: "Auszahlungsdatum", format: (value) => formatDate(String(value)) },
  status: { label: "Status" },
  referenceAccount: { label: "Referenzkonto" },
  notes: { label: "Interne Notizen" },
  productType: { label: "Anlageart" },
}

export function customerStatusLabel(status: CustomerStatus) {
  return { aktiv: "Aktiv", pruefung: "In Prüfung", ausstehend: "Ausstehend", inaktiv: "Inaktiv" }[status]
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database>(emptyDb)
  const [ready, setReady] = useState(false)
  const [actor, setActor] = useState("Patrick Jones")
  const actorRef = useRef(actor)
  actorRef.current = actor

  useEffect(() => {
    let loaded: Database | null = null
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Database
        if (parsed?.customers?.length) loaded = parsed
      }
    } catch {
      // corrupted or blocked storage – fall back to the seed
    }
    setDb(loaded ?? cloneSeed())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch {
      // storage blocked – the prototype keeps working in memory
    }
  }, [db, ready])

  const logEntry = useCallback(
    (
      customerId: string | null,
      action: string,
      description: string,
      previousValue: string | null = null,
      newValue: string | null = null,
    ): Activity => ({
      id: makeId("a"),
      customerId,
      user: actorRef.current,
      action,
      description,
      timestamp: new Date().toISOString(),
      previousValue,
      newValue,
    }),
    [],
  )

  const nextCustomerNumber = useCallback(() => {
    const numbers = db.customers
      .map((customer) => Number(customer.customerNumber.replace(/\D/g, "")))
      .filter((value) => Number.isFinite(value))
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1
    return `PTB-${String(next).padStart(6, "0")}`
  }, [db.customers])

  const nextInvestmentNumber = useCallback(() => {
    const numbers = db.investments
      .map((investment) => Number(investment.investmentNumber.replace(/\D/g, "")))
      .filter((value) => Number.isFinite(value))
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1
    return `PTB-FT-${String(next).padStart(4, "0")}`
  }, [db.investments])

  const createCustomer = useCallback<DataContextValue["createCustomer"]>(
    (input, investment, files) => {
      const now = new Date().toISOString()
      const customer: Customer = {
        ...input,
        id: makeId("c"),
        customerNumber: input.customerNumber?.trim() || "",
        createdAt: now,
        updatedAt: now,
      }

      setDb((current) => {
        const numbers = current.customers
          .map((entry) => Number(entry.customerNumber.replace(/\D/g, "")))
          .filter((value) => Number.isFinite(value))
        const fallback = `PTB-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(6, "0")}`
        const withNumber: Customer = { ...customer, customerNumber: customer.customerNumber || fallback }

        const entries: Activity[] = [
          logEntry(
            withNumber.id,
            "Kunde angelegt",
            `Kunde ${withNumber.firstName} ${withNumber.lastName} (${withNumber.customerNumber}) angelegt.`,
          ),
        ]

        const investments = [...current.investments]
        if (investment && investment.principal > 0) {
          const investmentNumbers = current.investments
            .map((entry) => Number(entry.investmentNumber.replace(/\D/g, "")))
            .filter((value) => Number.isFinite(value))
          const number =
            investment.investmentNumber?.trim() ||
            `PTB-FT-${String((investmentNumbers.length ? Math.max(...investmentNumbers) : 0) + 1).padStart(4, "0")}`
          const record: Investment = {
            ...investment,
            id: makeId("i"),
            investmentNumber: number,
            customerId: withNumber.id,
            currency: "EUR",
            createdAt: now,
            updatedAt: now,
          }
          investments.push(record)
          entries.push(
            logEntry(
              withNumber.id,
              "Anlage erstellt",
              `Anlage ${number} über ${formatEuro(record.principal)} angelegt.`,
              null,
              formatEuro(record.principal),
            ),
          )
        }

        const documents = [...current.documents]
        for (const file of files ?? []) {
          documents.push({
            id: makeId("d"),
            customerId: withNumber.id,
            investmentId: file.investmentId ?? null,
            filename: file.filename,
            category: file.category,
            sizeKb: file.sizeKb,
            uploadedBy: actorRef.current,
            uploadedAt: now,
          })
          entries.push(
            logEntry(
              withNumber.id,
              "Dokument hochgeladen",
              `Dokument „${file.filename}“ hochgeladen.`,
              null,
              file.filename,
            ),
          )
        }

        customer.customerNumber = withNumber.customerNumber
        return {
          ...current,
          customers: [withNumber, ...current.customers],
          investments,
          documents,
          activities: [...entries, ...current.activities],
        }
      })

      return customer
    },
    [logEntry],
  )

  const updateCustomer = useCallback<DataContextValue["updateCustomer"]>(
    (id, patch) => {
      setDb((current) => {
        const existing = current.customers.find((customer) => customer.id === id)
        if (!existing) return current

        const entries: Activity[] = []
        for (const [key, value] of Object.entries(patch) as [keyof Customer, unknown][]) {
          const field = customerFields[key]
          if (!field) continue
          const before = existing[key]
          if (before === value) continue
          const formatValue = field.format ?? ((raw: unknown) => String(raw ?? "–"))
          entries.push(
            logEntry(
              id,
              `${field.label} geändert`,
              `${field.label} von „${formatValue(before)}“ auf „${formatValue(value)}“ geändert.`,
              formatValue(before),
              formatValue(value),
            ),
          )
        }

        return {
          ...current,
          customers: current.customers.map((customer) =>
            customer.id === id ? { ...customer, ...patch, updatedAt: new Date().toISOString() } : customer,
          ),
          activities: [...entries, ...current.activities],
        }
      })
    },
    [logEntry],
  )

  const setCustomerStatus = useCallback<DataContextValue["setCustomerStatus"]>(
    (id, status) => updateCustomer(id, { status }),
    [updateCustomer],
  )

  const createInvestment = useCallback<DataContextValue["createInvestment"]>(
    (customerId, input) => {
      const now = new Date().toISOString()
      const record: Investment = {
        ...input,
        id: makeId("i"),
        investmentNumber: input.investmentNumber?.trim() || "",
        customerId,
        currency: "EUR",
        createdAt: now,
        updatedAt: now,
      }

      setDb((current) => {
        const numbers = current.investments
          .map((entry) => Number(entry.investmentNumber.replace(/\D/g, "")))
          .filter((value) => Number.isFinite(value))
        const number =
          record.investmentNumber ||
          `PTB-FT-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(4, "0")}`
        record.investmentNumber = number

        return {
          ...current,
          investments: [{ ...record, investmentNumber: number }, ...current.investments],
          activities: [
            logEntry(
              customerId,
              "Anlage erstellt",
              `Anlage ${number} über ${formatEuro(record.principal)} angelegt.`,
              null,
              formatEuro(record.principal),
            ),
            ...current.activities,
          ],
        }
      })

      return record
    },
    [logEntry],
  )

  const updateInvestment = useCallback<DataContextValue["updateInvestment"]>(
    (id, patch) => {
      setDb((current) => {
        const existing = current.investments.find((investment) => investment.id === id)
        if (!existing) return current

        const entries: Activity[] = []
        for (const [key, value] of Object.entries(patch) as [keyof Investment, unknown][]) {
          const field = investmentFields[key]
          if (!field) continue
          const before = existing[key]
          if (before === value) continue
          const formatValue = field.format ?? ((raw: unknown) => String(raw ?? "–"))
          entries.push(
            logEntry(
              existing.customerId,
              `${field.label} geändert`,
              `${field.label} der Anlage ${existing.investmentNumber} von „${formatValue(before)}“ auf „${formatValue(
                value,
              )}“ geändert.`,
              formatValue(before),
              formatValue(value),
            ),
          )
        }

        return {
          ...current,
          investments: current.investments.map((investment) =>
            investment.id === id ? { ...investment, ...patch, updatedAt: new Date().toISOString() } : investment,
          ),
          activities: [...entries, ...current.activities],
        }
      })
    },
    [logEntry],
  )

  const addDocument = useCallback<DataContextValue["addDocument"]>(
    (customerId, file) => {
      setDb((current) => ({
        ...current,
        documents: [
          {
            id: makeId("d"),
            customerId,
            investmentId: file.investmentId ?? null,
            filename: file.filename,
            category: file.category,
            sizeKb: file.sizeKb,
            uploadedBy: actorRef.current,
            uploadedAt: new Date().toISOString(),
          },
          ...current.documents,
        ],
        activities: [
          logEntry(customerId, "Dokument hochgeladen", `Dokument „${file.filename}“ hochgeladen.`, null, file.filename),
          ...current.activities,
        ],
      }))
    },
    [logEntry],
  )

  const removeDocument = useCallback<DataContextValue["removeDocument"]>(
    (id) => {
      setDb((current) => {
        const document = current.documents.find((entry) => entry.id === id)
        if (!document) return current
        return {
          ...current,
          documents: current.documents.filter((entry) => entry.id !== id),
          activities: [
            logEntry(
              document.customerId,
              "Dokument gelöscht",
              `Dokument „${document.filename}“ gelöscht.`,
              document.filename,
              null,
            ),
            ...current.activities,
          ],
        }
      })
    },
    [logEntry],
  )

  const sendMessage = useCallback<DataContextValue["sendMessage"]>(
    (customerId, subject, body) => {
      setDb((current) => ({
        ...current,
        messages: [
          {
            id: makeId("m"),
            customerId,
            direction: "an-kunde",
            subject,
            body,
            sentBy: actorRef.current,
            sentAt: new Date().toISOString(),
            read: false,
          },
          ...current.messages,
        ],
        activities: [
          logEntry(customerId, "Nachricht versendet", `Nachricht „${subject}“ an den Kunden versendet.`, null, subject),
          ...current.activities,
        ],
      }))
    },
    [logEntry],
  )

  const markMessageRead = useCallback<DataContextValue["markMessageRead"]>((id) => {
    setDb((current) => ({
      ...current,
      messages: current.messages.map((message) => (message.id === id ? { ...message, read: true } : message)),
    }))
  }, [])

  const resetDemoData = useCallback(() => setDb(cloneSeed()), [])

  const value = useMemo<DataContextValue>(
    () => ({
      ready,
      customers: db.customers,
      investments: db.investments,
      documents: db.documents,
      activities: db.activities,
      messages: db.messages,
      actor,
      setActor,
      customerById: (id) => db.customers.find((customer) => customer.id === id),
      investmentsOf: (customerId) => db.investments.filter((investment) => investment.customerId === customerId),
      documentsOf: (customerId) => db.documents.filter((document) => document.customerId === customerId),
      activitiesOf: (customerId) => db.activities.filter((activity) => activity.customerId === customerId),
      messagesOf: (customerId) => db.messages.filter((message) => message.customerId === customerId),
      nextCustomerNumber,
      nextInvestmentNumber,
      createCustomer,
      updateCustomer,
      setCustomerStatus,
      createInvestment,
      updateInvestment,
      addDocument,
      removeDocument,
      sendMessage,
      markMessageRead,
      resetDemoData,
    }),
    [
      ready,
      db,
      actor,
      nextCustomerNumber,
      nextInvestmentNumber,
      createCustomer,
      updateCustomer,
      setCustomerStatus,
      createInvestment,
      updateInvestment,
      addDocument,
      removeDocument,
      sendMessage,
      markMessageRead,
      resetDemoData,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error("useData must be used inside DataProvider")
  return context
}
