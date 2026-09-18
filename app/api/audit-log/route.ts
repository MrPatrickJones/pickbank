import { handleError, json } from "@/server/http"
import { listAuditLog } from "@/server/repositories/misc"
import { requireStaff } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Internal history – staff only, never exposed to customers. */
export async function GET(request: Request) {
  try {
    await requireStaff()
    const params = new URL(request.url).searchParams
    const customerId = params.get("customerId")
    return json({
      entries: await listAuditLog({
        customerId: customerId ? Number(customerId) : undefined,
        action: params.get("action") ?? undefined,
        search: params.get("search") ?? undefined,
        limit: Number(params.get("limit") ?? 100),
      }),
    })
  } catch (error) {
    return handleError(error)
  }
}
