import { handleError, json } from "@/server/http"
import { readSession } from "@/server/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** The client asks the server who it is – the session cookie is http-only. */
export async function GET() {
  try {
    const session = await readSession()
    if (!session) return json({ user: null })
    return json({ user: session.user, csrfToken: session.csrfToken })
  } catch (error) {
    return handleError(error)
  }
}
