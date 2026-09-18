import "server-only"
import { z } from "zod"

import { addMonths, parseAmountInput, SUPPORTED_CURRENCIES } from "@/server/money"

/** Every payload is validated on the server before it reaches the database. */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte geben Sie ein gültiges Datum im Format JJJJ-MM-TT ein.")

const trimmed = (max: number) => z.string().trim().max(max)

const amount = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    try {
      const parsed = parseAmountInput(value)
      if (parsed.startsWith("-")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Der Betrag darf nicht negativ sein." })
        return z.NEVER
      }
      return parsed
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bitte geben Sie einen gültigen Betrag ein." })
      return z.NEVER
    }
  })

const interestRate = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    const raw = typeof value === "number" ? value : Number(String(value).replace(",", "."))
    if (!Number.isFinite(raw)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bitte geben Sie einen gültigen Zinssatz ein." })
      return z.NEVER
    }
    if (raw < 0 || raw > 25) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Der Zinssatz muss zwischen 0 % und 25 % liegen.",
      })
      return z.NEVER
    }
    return raw.toFixed(4)
  })

export const loginSchema = z.object({
  email: z.string().trim().email("Bitte geben Sie eine gültige E-Mail-Adresse ein.").max(190),
  password: z.string().min(1, "Bitte geben Sie Ihr Passwort ein.").max(200),
})

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Bitte geben Sie Ihr aktuelles Passwort ein.").max(200),
    newPassword: z.string().min(10, "Das neue Passwort muss mindestens 10 Zeichen haben.").max(200),
    repeatPassword: z.string().max(200),
  })
  .refine((data) => data.newPassword === data.repeatPassword, {
    path: ["repeatPassword"],
    message: "Die Eingaben stimmen nicht überein.",
  })

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email("Bitte geben Sie eine gültige E-Mail-Adresse ein.").max(190),
})

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(20).max(200),
  newPassword: z.string().min(10, "Das neue Passwort muss mindestens 10 Zeichen haben.").max(200),
})

export const customerStatusSchema = z.enum(["ACTIVE", "INACTIVE", "PENDING", "BLOCKED"])
export const kycStatusSchema = z.enum(["OPEN", "SUBMITTED", "VERIFIED", "REJECTED"])
export const accountStatusSchema = z.enum(["PENDING", "ACTIVE", "MATURED", "CLOSED", "CANCELLED"])
export const interestMethodSchema = z.enum(["AT_MATURITY", "ANNUAL", "QUARTERLY", "MONTHLY"])
export const documentCategorySchema = z.enum([
  "IDENTIFICATION",
  "CONTRACTS",
  "CONFIRMATIONS",
  "STATEMENTS",
  "CORRESPONDENCE",
  "OTHER",
])

export const customerCreateSchema = z.object({
  customerNumber: trimmed(32).optional(),
  firstName: trimmed(100).min(1, "Bitte geben Sie den Vornamen ein."),
  lastName: trimmed(100).min(1, "Bitte geben Sie den Nachnamen ein."),
  companyName: trimmed(160).optional().nullable(),
  email: z.string().trim().toLowerCase().email("Bitte geben Sie eine gültige E-Mail-Adresse ein.").max(190),
  phone: trimmed(40).optional().nullable(),
  mobile: trimmed(40).optional().nullable(),
  dateOfBirth: isoDate.optional().nullable(),
  address: trimmed(190).optional().nullable(),
  postalCode: trimmed(20).optional().nullable(),
  city: trimmed(120).min(1, "Bitte geben Sie den Ort ein."),
  country: trimmed(80).min(1, "Bitte geben Sie das Land ein."),
  nationality: trimmed(80).optional().nullable(),
  customerStatus: customerStatusSchema.default("PENDING"),
  kycStatus: kycStatusSchema.default("OPEN"),
  identifiedAt: isoDate.optional().nullable(),
  identificationType: trimmed(60).optional().nullable(),
  createLogin: z.boolean().default(false),
})

export const customerUpdateSchema = customerCreateSchema
  .omit({ createLogin: true, customerNumber: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "Es wurden keine Änderungen übermittelt." })

export const accountCreateSchema = z
  .object({
    accountNumber: trimmed(32).optional(),
    productName: trimmed(120).min(1, "Bitte geben Sie einen Produktnamen ein."),
    principalAmount: amount,
    currency: z.enum(SUPPORTED_CURRENCIES).default("EUR"),
    interestRate,
    termMonths: z.coerce
      .number()
      .int("Die Laufzeit wird in ganzen Monaten angegeben.")
      .min(1, "Die Laufzeit muss mindestens einen Monat betragen.")
      .max(120, "Die Laufzeit darf höchstens 120 Monate betragen."),
    startDate: isoDate,
    maturityDate: isoDate.optional(),
    status: accountStatusSchema.default("PENDING"),
    interestPaymentMethod: interestMethodSchema.default("AT_MATURITY"),
    payoutDate: isoDate.optional().nullable(),
    referenceAccount: trimmed(64).optional().nullable(),
    notes: trimmed(2000).optional().nullable(),
  })
  .transform((data) => ({
    ...data,
    // The server owns the maturity date: derived unless explicitly provided.
    maturityDate: data.maturityDate ?? addMonths(data.startDate, data.termMonths),
  }))
  .refine((data) => data.maturityDate > data.startDate, {
    path: ["maturityDate"],
    message: "Das Fälligkeitsdatum muss nach dem Startdatum liegen.",
  })
  .refine((data) => !data.payoutDate || data.payoutDate >= data.maturityDate, {
    path: ["payoutDate"],
    message: "Die Auszahlung darf nicht vor der Fälligkeit liegen.",
  })

export const accountUpdateSchema = z.object({
  productName: trimmed(120).min(1).optional(),
  principalAmount: amount.optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  interestRate: interestRate.optional(),
  termMonths: z.coerce.number().int().min(1).max(120).optional(),
  startDate: isoDate.optional(),
  maturityDate: isoDate.optional(),
  status: accountStatusSchema.optional(),
  interestPaymentMethod: interestMethodSchema.optional(),
  payoutDate: isoDate.optional().nullable(),
  referenceAccount: trimmed(64).optional().nullable(),
  notes: trimmed(2000).optional().nullable(),
  /** Recalculate the maturity date from start date and term. */
  recalculateMaturity: z.boolean().optional(),
})

export const documentCreateSchema = z.object({
  filename: trimmed(255).min(1, "Bitte geben Sie einen Dateinamen an."),
  category: documentCategorySchema.default("OTHER"),
  sizeKb: z.coerce.number().int().min(0).max(50_000).default(0),
  accountId: z.coerce.number().int().positive().optional().nullable(),
})

export const messageCreateSchema = z.object({
  subject: trimmed(190).min(1, "Bitte geben Sie einen Betreff ein."),
  body: trimmed(5000).min(5, "Bitte formulieren Sie eine Nachricht."),
})

export const customerListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: customerStatusSchema.optional(),
  kycStatus: kycStatusSchema.optional(),
  country: z.string().trim().max(80).optional(),
  minVolume: z.coerce.number().min(0).optional(),
  maturityBefore: isoDate.optional(),
  createdAfter: isoDate.optional(),
  termMonths: z.coerce.number().int().min(1).max(120).optional(),
  sort: z.enum(["name", "customerNumber", "volume", "created", "updated", "maturity"]).default("name"),
  direction: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>

/** Turns a Zod error into field → message for the form. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form"
    if (!result[key]) result[key] = issue.message
  }
  return result
}
