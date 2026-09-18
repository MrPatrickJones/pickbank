import { changeOwnPassword } from "@/server/auth-service"
import { assertCsrf, clientIp, handleError, json, readJson } from "@/server/http"
import { requireSession } from "@/server/session"
import { passwordChangeSchema } from "@/server/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const session = await requireSession()
    assertCsrf(request, session)
    const body = passwordChangeSchema.parse(await readJson(request))
    await changeOwnPassword(session.user.id, body.currentPassword, body.newPassword, clientIp(request))
    return json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
