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
  DRAFT: "Entwurf",
  KYC_PENDING: "KYC ausstehend",
  DOCS_PENDING: "Unterlagen ausstehend",
  IN_PROGRESS: "In Bearbeitung",
  PENDING: "Vorgemerkt",
  ACTIVE: "Aktiv",
  MATURED: "Fällig",
  PAID_OUT: "Ausgezahlt",
  CLOSED: "Geschlossen",
  CANCELLED: "Storniert",
}

/** Status, bei denen das Kapital als angelegt gilt. */
export const liveAccountStatuses: AccountStatus[] = ["ACTIVE", "MATURED", "PENDING", "IN_PROGRESS"]

export const interestMethodLabels: Record<InterestMethod, string> = {
  AT_MATURITY: "Endfällig",
  ANNUAL: "Jährlich",
  QUARTERLY: "Quartalsweise",
  MONTHLY: "Monatlich",
}

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  IDENTITY: "Identität",
  KYC: "KYC",
  CONTRACTS: "Verträge",
  BANK_DOCUMENTS: "Bankunterlagen",
  OTHER: "Sonstige Dokumente",
}

export const documentCategoryHints: Record<DocumentCategory, string> = {
  IDENTITY: "Ausweis, Reisepass, Führerschein",
  KYC: "Identitätsprüfung, Adressnachweis, Steuerinformationen",
  CONTRACTS: "Festgeldvertrag, Anlagevertrag, Kundenvertrag",
  BANK_DOCUMENTS: "Anlage- und Zinsbestätigungen, Bankkorrespondenz",
  OTHER: "Alles Weitere",
}

/** Feste Unterarten je Kategorie – ausgewählt statt frei getippt. */
export const documentTypesByCategory: Record<DocumentCategory, { value: string; label: string }[]> = {
  IDENTITY: [
    { value: "ID_CARD", label: "Personalausweis" },
    { value: "PASSPORT", label: "Reisepass" },
    { value: "DRIVING_LICENCE", label: "Führerschein" },
    { value: "OTHER_ID", label: "Sonstiger Identitätsnachweis" },
  ],
  KYC: [
    { value: "KYC_FORM", label: "KYC-Unterlagen" },
    { value: "IDENTITY_CHECK", label: "Identitätsprüfung" },
    { value: "ADDRESS_PROOF", label: "Adressnachweis" },
    { value: "TAX_INFORMATION", label: "Steuerinformationen" },
    { value: "OTHER_KYC", label: "Weitere KYC-Dokumente" },
  ],
  CONTRACTS: [
    { value: "DEPOSIT_CONTRACT", label: "Festgeldvertrag" },
    { value: "INVESTMENT_CONTRACT", label: "Anlagevertrag" },
    { value: "CUSTOMER_CONTRACT", label: "Kundenvertrag" },
    { value: "BROKERAGE_CONTRACT", label: "Vermittlungsvertrag" },
    { value: "OTHER_CONTRACT", label: "Sonstiger Vertrag" },
  ],
  BANK_DOCUMENTS: [
    { value: "INVESTMENT_CONFIRMATION", label: "Anlagebestätigung" },
    { value: "ACCOUNT_OPENING", label: "Kontoeröffnungsbestätigung" },
    { value: "INTEREST_CONFIRMATION", label: "Zinsbestätigung" },
    { value: "PAYMENT_CONFIRMATION", label: "Zahlungsbestätigung" },
    { value: "BANK_CORRESPONDENCE", label: "Bankkorrespondenz" },
  ],
  OTHER: [{ value: "OTHER_DOCUMENT", label: "Sonstige Unterlagen" }],
}

const allDocumentTypes = Object.values(documentTypesByCategory).flat()

export function documentTypeLabel(value: string | null) {
  if (!value) return null
  return allDocumentTypes.find((entry) => entry.value === value)?.label ?? value
}

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  STAFF: "Mitarbeiter",
  CUSTOMER: "Kunde",
}

export const uploaderRoleLabels: Record<Role | "SYSTEM", string> = {
  ...roleLabels,
  SYSTEM: "System",
}

const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))

export const customerStatusOptions = toOptions(customerStatusLabels)
export const kycStatusOptions = toOptions(kycLabels)
export const accountStatusOptions = toOptions(accountStatusLabels)
export const interestMethodOptions = toOptions(interestMethodLabels)
export const documentCategoryOptions = toOptions(documentCategoryLabels)
