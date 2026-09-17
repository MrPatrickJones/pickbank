import type { DocumentCategory, InterestPayment, KycStatus, ProductType, Role } from "@/lib/types"

/** German labels for the stored enum values – used wherever data is displayed. */

export const kycLabels: Record<KycStatus, string> = {
  offen: "Offen",
  eingereicht: "Eingereicht",
  geprueft: "Geprüft",
  abgelehnt: "Abgelehnt",
}

export const productLabels: Record<ProductType, string> = {
  festgeld: "Festgeld",
  tagesgeld: "Tagesgeld",
  stufenzins: "Stufenzins",
}

export const interestPaymentLabels: Record<InterestPayment, string> = {
  endfaellig: "Endfällig",
  jaehrlich: "Jährlich",
  quartalsweise: "Quartalsweise",
  monatlich: "Monatlich",
}

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  identifikation: "Identifikation",
  vertraege: "Verträge",
  anlagebestaetigungen: "Anlagebestätigungen",
  kontoauszuege: "Kontoauszüge",
  kommunikation: "Kommunikation",
  sonstige: "Sonstige",
}

export const roleLabels: Record<Role, string> = {
  admin: "Administrator",
  mitarbeiter: "Mitarbeiter",
  kunde: "Kunde",
}
