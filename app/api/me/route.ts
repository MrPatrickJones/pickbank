import { handleError, json } from "@/server/http"
import { listAccountsOfCustomer, toAccountDto } from "@/server/repositories/accounts"
import { customerTotals, requireCustomerById } from "@/server/repositories/customers"
import { listDocuments, listMessages, toDocumentDto, toMessageDto } from "@/server/repositories/misc"
import { getCustomerLogin } from "@/server/auth-service"
import { requireCustomer } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Everything a signed-in customer may see – scoped by the session, so no
 * customer id from the request is involved at all.
 */
export async function GET() {
  try {
    const session = await requireCustomer()
    const customerId = session.customerId

    const [customer, accounts, documents, messages, totals, login] = await Promise.all([
      requireCustomerById(customerId),
      listAccountsOfCustomer(customerId),
      listDocuments({ customerId }),
      listMessages({ customerId }),
      customerTotals(customerId),
      getCustomerLogin(customerId),
    ])

    return json({
      customer: {
        id: customer.id,
        customerNumber: customer.customerNumber,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        mobile: customer.mobile,
        phone: customer.phone,
        address: customer.address,
        postalCode: customer.postalCode,
        city: customer.city,
        country: customer.country,
        customerStatus: customer.customerStatus,
        createdAt: customer.createdAt,
      },
      totals,
      accounts: accounts.map((row) => toAccountDto(row, false)),
      documents: documents.map(toDocumentDto),
      messages: messages.map(toMessageDto),
      login: login ? { mustChangePassword: login.mustChangePassword, lastLoginAt: login.lastLoginAt } : null,
    })
  } catch (error) {
    return handleError(error)
  }
}
