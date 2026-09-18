import { createCustomerLogin, getCustomerLogin, resetCustomerPassword, setLoginStatus } from "@/server/auth-service"
import { badRequest } from "@/server/errors"
import { assertCsrf, clientIp, handleError, json, parseId, readJson } from "@/server/http"
import { requireCustomerById } from "@/server/repositories/customers"
import { requireStaff } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Customer logins are issued by staff only – customers never reach this route. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff()
    const id = parseId((await context.params).id)
    return json({ login: await getCustomerLogin(id) })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireStaff()
    assertCsrf(request, session)

    const id = parseId((await context.params).id)
    const customer = await requireCustomerById(id)
    const actor = {
      id: session.user.id,
      role: session.user.role,
      label: `${session.user.fullName} (${session.user.email})`,
    }

    const body = (await readJson<{ action?: string }>(request)) ?? {}
    const action = body.action ?? "create"

    if (action === "create") {
      const password = await createCustomerLogin(
        id,
        customer.email,
        `${customer.firstName} ${customer.lastName}`,
        actor,
        clientIp(request),
      )
      return json({ login: await getCustomerLogin(id), password }, 201)
    }

    if (action === "reset") {
      const password = await resetCustomerPassword(id, actor, clientIp(request))
      return json({ login: await getCustomerLogin(id), password })
    }

    if (action === "lock" || action === "unlock") {
      await setLoginStatus(id, action === "lock" ? "DISABLED" : "ACTIVE", actor, clientIp(request))
      return json({ login: await getCustomerLogin(id) })
    }

    throw badRequest("Unbekannte Aktion.")
  } catch (error) {
    return handleError(error)
  }
}
