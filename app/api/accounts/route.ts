import { handleError, json } from "@/server/http"
import { listAllAccounts, toAccountDto } from "@/server/repositories/accounts"
import { requireStaff } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    await requireStaff()
    const params = new URL(request.url).searchParams
    const rows = await listAllAccounts({
      status: params.get("status") ?? undefined,
      search: params.get("search") ?? undefined,
      limit: Number(params.get("limit") ?? 200),
    })

    return json({
      accounts: rows.map((row) => ({
        ...toAccountDto(row),
        customer: {
          id: row.customer_id,
          firstName: row.first_name,
          lastName: row.last_name,
          customerNumber: row.customer_number,
        },
      })),
    })
  } catch (error) {
    return handleError(error)
  }
}
