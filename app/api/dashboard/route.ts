import { handleError, json } from "@/server/http"
import { listAllAccounts, portfolioSummary, toAccountDto } from "@/server/repositories/accounts"
import { listCustomers } from "@/server/repositories/customers"
import { listAuditLog } from "@/server/repositories/misc"
import { requireStaff } from "@/server/session"
import { customerListQuerySchema } from "@/server/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await requireStaff()

    const summary = await portfolioSummary()
    const recentCustomers = await listCustomers(
      customerListQuerySchema.parse({ sort: "created", direction: "desc", pageSize: "5" }),
    )
    const accounts = await listAllAccounts({ limit: 200 })
    const today = new Date().toISOString().slice(0, 10)

    const maturing = accounts
      .filter((row) => row.status === "ACTIVE" || row.status === "PENDING")
      .filter((row) => row.maturity_date >= today || row.status === "ACTIVE")
      .slice(0, 8)
      .map((row) => ({
        ...toAccountDto(row),
        customer: {
          id: row.customer_id,
          firstName: row.first_name,
          lastName: row.last_name,
          customerNumber: row.customer_number,
        },
      }))

    return json({
      summary,
      recentCustomers: recentCustomers.items,
      maturingAccounts: maturing,
      recentActivities: await listAuditLog({ limit: 8 }),
    })
  } catch (error) {
    return handleError(error)
  }
}
