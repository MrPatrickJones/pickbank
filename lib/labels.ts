import type {
  AccountStatus,
  CustomerStatus,
  DocumentCategory,
  InterestMethod,
  KycStatus,
  Role,
} from "@/lib/types"

export const customerStatusLabels: Record<CustomerStatus, string> = {
  ACTIVE: "Aktiv",
  INACTIVE: "Inaktiv",
  PENDING: "Ausstehend",
  BLOCKED: "Gesperrt",
}

export const kycLabels: Record<KycStatus, string> = {
  OPEN: "Offen",
  SUBMITTED: "Eingereicht",
  VERIFIED: "Geprüft",
  REJECTED: "Abgelehnt",
}

export const accountStatusLabels: Record<AccountStatus, string> = {
  PENDING: "Vorgemerkt",
  ACTIVE: "Aktiv",
  MATURED: "Fällig",
  CLOSED: "Beendet",
  CANCELLED: "Storniert",
}

export const interestMethodLabels: Record<InterestMethod, string> = {
  AT_MATURITY: "Endfällig",
  ANNUAL: "Jährlich",
  QUARTERLY: "Quartalsweise",
  MONTHLY: "Monatlich",
}

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  IDENTIFICATION: "Identifikation",
  CONTRACTS: "Verträge",
  CONFIRMATIONS: "Anlagebestätigungen",
  STATEMENTS: "Kontoauszüge",
  CORRESPONDENCE: "Kommunikation",
  OTHER: "Sonstige",
}

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  STAFF: "Mitarbeiter",
  CUSTOMER: "Kunde",
}

export const customerStatusOptions = (Object.keys(customerStatusLabels) as CustomerStatus[]).map((value) => ({
  value,
  label: customerStatusLabels[value],
}))

export const kycStatusOptions = (Object.keys(kycLabels) as KycStatus[]).map((value) => ({
  value,
  label: kycLabels[value],
}))

export const accountStatusOptions = (Object.keys(accountStatusLabels) as AccountStatus[]).map((value) => ({
  value,
  label: accountStatusLabels[value],
}))

export const interestMethodOptions = (Object.keys(interestMethodLabels) as InterestMethod[]).map((value) => ({
  value,
  label: interestMethodLabels[value],
}))

export const documentCategoryOptions = (Object.keys(documentCategoryLabels) as DocumentCategory[]).map((value) => ({
  value,
  label: documentCategoryLabels[value],
}))
