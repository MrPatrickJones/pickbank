/** Shapes returned by the API. Mirrors the server DTOs. */

export type Role = "ADMIN" | "STAFF" | "CUSTOMER"
export type CustomerStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "BLOCKED"
export type KycStatus = "OPEN" | "SUBMITTED" | "VERIFIED" | "REJECTED"
export type AccountStatus = "PENDING" | "ACTIVE" | "MATURED" | "CLOSED" | "CANCELLED"
export type InterestMethod = "AT_MATURITY" | "ANNUAL" | "QUARTERLY" | "MONTHLY"
export type DocumentCategory =
  | "IDENTIFICATION"
  | "CONTRACTS"
  | "CONFIRMATIONS"
  | "STATEMENTS"
  | "CORRESPONDENCE"
  | "OTHER"

export type SessionUser = {
  id: number
  email: string
  role: Role
  fullName: string
  customerId: number | null
  mustChangePassword: boolean
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
}

export type AccountWithCustomer = Account & {
  customer: { id: number; firstName: string; lastName: string; customerNumber: string }
}

export type PortalDocument = {
  id: number
  customerId: number
  accountId: number | null
  filename: string
  category: DocumentCategory
  sizeKb: number
  uploadedBy: string | null
  uploadedAt: string
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
    | "email"
    | "mobile"
    | "phone"
    | "address"
    | "postalCode"
    | "city"
    | "country"
    | "customerStatus"
    | "createdAt"
  >
  totals: CustomerTotals
  accounts: Account[]
  documents: PortalDocument[]
  messages: Message[]
  login: { mustChangePassword: boolean; lastLoginAt: string | null } | null
}
