/** Domain model of the Pick The Bank portal. */

export type CustomerStatus = "aktiv" | "pruefung" | "ausstehend" | "inaktiv"
export type KycStatus = "offen" | "eingereicht" | "geprueft" | "abgelehnt"
export type InvestmentStatus = "aktiv" | "faellig" | "beendet" | "vorgemerkt"
export type InterestPayment = "endfaellig" | "jaehrlich" | "quartalsweise" | "monatlich"
export type ProductType = "festgeld" | "tagesgeld" | "stufenzins"
export type DocumentCategory =
  | "identifikation"
  | "vertraege"
  | "anlagebestaetigungen"
  | "kontoauszuege"
  | "kommunikation"
  | "sonstige"
export type Role = "admin" | "mitarbeiter" | "kunde"

export type Customer = {
  id: string
  customerNumber: string
  firstName: string
  lastName: string
  dateOfBirth: string
  nationality: string
  address: string
  postalCode: string
  city: string
  country: string
  email: string
  phone: string
  mobile: string
  status: CustomerStatus
  kycStatus: KycStatus
  identifiedAt: string
  identificationType: string
  createdAt: string
  updatedAt: string
}

export type Investment = {
  id: string
  investmentNumber: string
  customerId: string
  productType: ProductType
  principal: number
  currency: "EUR"
  interestRate: number
  /** Term in months. */
  term: number
  startDate: string
  maturityDate: string
  interestPayment: InterestPayment
  payoutDate: string
  status: InvestmentStatus
  referenceAccount: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type PortalDocument = {
  id: string
  customerId: string
  investmentId: string | null
  filename: string
  category: DocumentCategory
  sizeKb: number
  uploadedBy: string
  uploadedAt: string
}

export type Activity = {
  id: string
  customerId: string | null
  user: string
  action: string
  description: string
  timestamp: string
  previousValue: string | null
  newValue: string | null
}

export type Message = {
  id: string
  customerId: string
  direction: "an-kunde" | "von-kunde"
  subject: string
  body: string
  sentBy: string
  sentAt: string
  read: boolean
}

export type Database = {
  customers: Customer[]
  investments: Investment[]
  documents: PortalDocument[]
  activities: Activity[]
  messages: Message[]
}

export type SessionUser = {
  name: string
  email: string
  role: Role
  /** Set for role "kunde": the customer record this login may see. */
  customerId?: string
}
