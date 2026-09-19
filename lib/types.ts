/** Shapes returned by the API. Mirrors the server DTOs. */

export type Role = "ADMIN" | "STAFF" | "CUSTOMER"
export type CustomerStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "BLOCKED"
export type KycStatus = "OPEN" | "SUBMITTED" | "VERIFIED" | "REJECTED"
export type AccountStatus =
  | "DRAFT"
  | "KYC_PENDING"
  | "DOCS_PENDING"
  | "IN_PROGRESS"
  | "PENDING"
  | "ACTIVE"
  | "MATURED"
  | "PAID_OUT"
  | "CLOSED"
  | "CANCELLED"
export type InterestMethod = "AT_MATURITY" | "ANNUAL" | "QUARTERLY" | "MONTHLY"
export type DocumentCategory = "IDENTITY" | "KYC" | "CONTRACTS" | "BANK_DOCUMENTS" | "OTHER"

export type SessionUser = {
  id: number
  email: string
  role: Role
  fullName: string
  customerId: number | null
  mustChangePassword: boolean
}

export type Bank = {
  id: number
  name: string
  legalName: string | null
  country: string
  city: string | null
  address: string | null
  postalCode: string | null
  website: string | null
  bic: string | null
  hasLogo: boolean
  logoUrl: string | null
  notes?: string | null
  accountCount?: number
  createdAt: string
  updatedAt: string
}

/** Kurzform der Bank, wie sie an jeder Anlage hängt. */
export type BankRef = {
  id: number
  name: string
  country: string
  city: string | null
  website: string | null
  bic: string | null
  address: string | null
  logoUrl: string | null
}

export type Customer = {
  id: number
  customerNumber: string
  firstName: string
  lastName: string
  companyName: string | null
  email: string
  phone: string | null
  mobile: string | null
  dateOfBirth: string | null
  address: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  nationality: string | null
  customerStatus: CustomerStatus
  kycStatus: KycStatus
  identifiedAt: string | null
  identificationType: string | null
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

export type CustomerListItem = Customer & {
  accountCount: number
  activeAccounts: number
  totalPrincipal: string
  nextMaturity: string | null
}

export type CustomerTotals = {
  principal: string
  accruedInterest: string
  expectedInterest: string
  accountCount: number
  activeAccounts: number
  averageRate: string
  nextMaturity: string | null
}

export type Account = {
  id: number
  customerId: number
  bank: BankRef | null
  accountNumber: string
  productName: string
  principalAmount: string
  currency: string
  interestRate: string
  termMonths: number
  startDate: string
  maturityDate: string
  status: AccountStatus
  interestPaymentMethod: InterestMethod
  payoutDate: string | null
  referenceAccount: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  accruedInterest: string
  interestAtMaturity: string
  /** Anlagebetrag zuzüglich erwarteter Zinsen. */
  expectedTotal: string
  documentCount?: number
}

export type AccountWithCustomer = Account & {
  customer: { id: number; firstName: string; lastName: string; customerNumber: string }
}

export type PortalDocument = {
  id: number
  customerId: number
  accountId: number | null
  title: string
  filename: string
  category: DocumentCategory
  docType: string | null
  mimeType: string | null
  sizeBytes: number
  /** Nur gesetzt, wenn tatsächlich eine Datei hinterlegt ist. */
  hasFile: boolean
  downloadUrl: string | null
  uploadedBy: string | null
  uploadedByRole: Role | "SYSTEM"
  uploadedAt: string
  account?: { id: number; accountNumber: string; bankName: string | null } | null
  customer?: { id: number; firstName: string; lastName: string }
}

export type Message = {
  id: number
  customerId: number
  subject: string
  body: string
  sentBy: string | null
  sentAt: string
  readAt: string | null
  customer?: { id: number; firstName: string; lastName: string }
}

export type AuditEntry = {
  id: number
  user: string
  userRole: string
  action: string
  description: string
  customerId: number | null
  accountId: number | null
  changedField: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: string
}

export type CustomerLogin = {
  id: number
  email: string
  status: "ACTIVE" | "LOCKED" | "DISABLED"
  mustChangePassword: boolean
  lastLoginAt: string | null
  passwordChangedAt: string
  createdAt: string
  createdBy: string | null
}

export type DocumentCounts = { total: number; byCategory: Record<DocumentCategory, number> }

export type CustomerFile = {
  customer: Customer
  totals: CustomerTotals
  accounts: Account[]
  documents: PortalDocument[]
  messages: Message[]
  activities: AuditEntry[]
  login: CustomerLogin | null
}

export type DashboardData = {
  summary: {
    customers: { total: number; active: number; pending: number; blocked: number; recent: number }
    accounts: {
      total: number
      active: number
      volume: string
      maturingSoon: number
      maturingVolume: string
      overdue: number
    }
  }
  recentCustomers: CustomerListItem[]
  maturingAccounts: AccountWithCustomer[]
  recentActivities: AuditEntry[]
}

export type CustomerPortalData = {
  customer: Pick<
    Customer,
    | "id"
    | "customerNumber"
    | "firstName"
    | "lastName"
    | "companyName"
    | "email"
    | "mobile"
    | "phone"
    | "dateOfBirth"
    | "nationality"
    | "address"
    | "postalCode"
    | "city"
    | "country"
    | "customerStatus"
    | "kycStatus"
    | "identifiedAt"
    | "identificationType"
    | "createdAt"
  >
  totals: CustomerTotals
  accounts: Account[]
  documents: PortalDocument[]
  documentCounts: DocumentCounts
  messages: Message[]
  login: { mustChangePassword: boolean; lastLoginAt: string | null } | null
}
