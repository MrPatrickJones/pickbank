import { writeAudit } from "@/server/audit"
import { clientIp, handleError, json } from "@/server/http"
import { destroySession, readSession } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const session = await readSession()
    if (session) {
      await writeAudit(
        { id: session.user.id, role: session.user.role, label: `${session.user.fullName} (${session.user.email})` },
        clientIp(request),
        { action: "Abmeldung", description: "Sitzung beendet.", customerId: session.user.customerId },
      )
    }
    await destroySession()
    return json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
