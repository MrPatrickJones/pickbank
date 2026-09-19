import { handleError, json } from "@/server/http"
import { listAccountsOfCustomer, toAccountDto } from "@/server/repositories/accounts"
import { customerTotals, requireCustomerById } from "@/server/repositories/customers"
import {
  countDocumentsPerAccount,
  documentCounts,
  listDocuments,
  listMessages,
  toDocumentDto,
  toMessageDto,
} from "@/server/repositories/misc"
import { getCustomerLogin } from "@/server/auth-service"
import { requireCustomer } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Die vollständige Akte eines angemeldeten Kunden – Stammdaten, Anlagen samt
 * Bank, Dokumente und Nachrichten. Die Kundennummer stammt aus der Sitzung, es
 * wird keine ID aus der Anfrage übernommen.
 */
export async function GET() {
  try {
    const session = await requireCustomer()
    const customerId = session.customerId

    const [customer, accounts, documents, messages, totals, counts, perAccount, login] = await Promise.all([
      requireCustomerById(customerId),
      listAccountsOfCustomer(customerId),
      listDocuments({ customerId }),
      listMessages({ customerId }),
      customerTotals(customerId),
      documentCounts(customerId),
      countDocumentsPerAccount(customerId),
      getCustomerLogin(customerId),
    ])

    return json({
      customer: {
        id: customer.id,
        customerNumber: customer.customerNumber,
        firstName: customer.firstName,
        lastName: customer.lastName,
        companyName: customer.companyName,
        email: customer.email,
        mobile: customer.mobile,
        phone: customer.phone,
        dateOfBirth: customer.dateOfBirth,
        nationality: customer.nationality,
        address: customer.address,
        postalCode: customer.postalCode,
        city: customer.city,
        country: customer.country,
        customerStatus: customer.customerStatus,
        kycStatus: customer.kycStatus,
        identifiedAt: customer.identifiedAt,
        identificationType: customer.identificationType,
        createdAt: customer.createdAt,
      },
      totals,
      // Interne Notizen bleiben aussen vor (zweites Argument false).
      accounts: accounts.map((row) => ({
        ...toAccountDto(row, false),
        documentCount: perAccount.get(row.id) ?? 0,
      })),
      documents: documents.map(toDocumentDto),
      documentCounts: counts,
      messages: messages.map(toMessageDto),
      login: login ? { mustChangePassword: login.mustChangePassword, lastLoginAt: login.lastLoginAt } : null,
    })
  } catch (error) {
    return handleError(error)
  }
}
