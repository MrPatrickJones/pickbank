import { requestPasswordReset } from "@/server/auth-service"
import { env } from "@/server/env"
import { clientIp, handleError, json, readJson } from "@/server/http"
import { assertLoginRateLimit, recordLoginAttempt } from "@/server/rate-limit"
import { passwordResetRequestSchema } from "@/server/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = passwordResetRequestSchema.parse(await readJson(request))
    const ip = clientIp(request)
    await assertLoginRateLimit(body.email, ip)
    const token = await requestPasswordReset(body.email, ip)
    await recordLoginAttempt(body.email, ip, false)

    // The same answer either way, so the endpoint cannot be used to probe addresses.
    const payload: { ok: true; token?: string } = { ok: true }
    if (token && !env.isProduction) payload.token = token
    return json(payload)
  } catch (error) {
    return handleError(error)
  }
}
