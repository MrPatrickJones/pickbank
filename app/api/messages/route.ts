import { handleError, json } from "@/server/http"
import { listMessages, toMessageDto } from "@/server/repositories/misc"
import { requireStaff } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    await requireStaff()
    const params = new URL(request.url).searchParams
    const rows = await listMessages({ search: params.get("search") ?? undefined })
    return json({
      messages: rows.map((row) => ({
        ...toMessageDto(row),
        customer: { id: row.customer_id, firstName: row.first_name, lastName: row.last_name },
      })),
    })
  } catch (error) {
    return handleError(error)
  }
}
