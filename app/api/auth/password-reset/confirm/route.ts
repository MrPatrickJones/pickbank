import { confirmPasswordReset } from "@/server/auth-service"
import { clientIp, handleError, json, readJson } from "@/server/http"
import { passwordResetConfirmSchema } from "@/server/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = passwordResetConfirmSchema.parse(await readJson(request))
    await confirmPasswordReset(body.token, body.newPassword, clientIp(request))
    return json({ ok: true })
  } catch (error) {
    return handleError(error)
  }
}
