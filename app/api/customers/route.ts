import { actorOf, writeAudit } from "@/server/audit"
import { createCustomerLogin } from "@/server/auth-service"
import { assertCsrf, clientIp, handleError, json, readJson } from "@/server/http"
import { insertCustomer, listCustomers, nextCustomerNumber, requireCustomerById } from "@/server/repositories/customers"
import { requireStaff } from "@/server/session"
import { customerCreateSchema, customerListQuerySchema } from "@/server/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    await requireStaff()
    const params = customerListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams))
    return json(await listCustomers(params))
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStaff()
    assertCsrf(request, session)

    const body = customerCreateSchema.parse(await readJson(request))
    const customerNumber = body.customerNumber?.trim() || (await nextCustomerNumber())

    const id = await insertCustomer({ ...body, customerNumber })
    const customer = await requireCustomerById(id)
    const ip = clientIp(request)

    await writeAudit(actorOf(session.user), ip, {
      action: "Kunde angelegt",
      description: `Kunde ${customer.firstName} ${customer.lastName} (${customer.customerNumber}) angelegt.`,
      customerId: id,
    })

    let initialPassword: string | undefined
    if (body.createLogin) {
      initialPassword = await createCustomerLogin(
        id,
        customer.email,
        `${customer.firstName} ${customer.lastName}`,
        { id: session.user.id, role: session.user.role, label: `${session.user.fullName} (${session.user.email})` },
        ip,
      )
    }

    return json({ customer, login: initialPassword ? { email: customer.email, password: initialPassword } : null }, 201)
  } catch (error) {
    return handleError(error)
  }
}
