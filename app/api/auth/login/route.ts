import { NextResponse } from "next/server"

import { login } from "@/server/auth-service"
import { clientIp, handleError, json, readJson } from "@/server/http"
import { loginSchema } from "@/server/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await readJson(request))
    const result = await login(
      body.email,
      body.password,
      clientIp(request),
      request.headers.get("user-agent"),
    )
    return json({ user: result.user, csrfToken: result.csrfToken })
  } catch (error) {
    return handleError(error)
  }
}

export function GET() {
  return NextResponse.json({ error: { code: "METHOD_NOT_ALLOWED", message: "Methode nicht erlaubt." } }, { status: 405 })
}
