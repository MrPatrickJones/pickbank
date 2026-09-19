import { actorOf, writeAudit } from "@/server/audit"
import { assertCsrf, clientIp, handleError, json, readJson } from "@/server/http"
import { insertBank, listBanks, toBankDto } from "@/server/repositories/banks"
import { requireSession, requireStaff } from "@/server/session"
import { bankCreateSchema } from "@/server/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Die Bankenliste dürfen auch Kunden lesen – sie enthält keine Kundendaten und
 * liefert die Namen und Logos, die an den Anlagen hängen. Interne Notizen
 * bleiben dabei aussen vor.
 */
export async function GET(request: Request) {
  try {
    const session = await requireSession()
    const isStaff = session.user.role !== "CUSTOMER"
    const search = new URL(request.url).searchParams.get("search") ?? undefined

    const rows = await listBanks(search)
    return json({
      banks: rows.map((row) =>
        toBankDto(row, {
          includeInternal: isStaff,
          ...(isStaff ? { accountCount: Number(row.account_count) } : {}),
        }),
      ),
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStaff()
    assertCsrf(request, session)

    const body = bankCreateSchema.parse(await readJson(request))
    const id = await insertBank(body)

    await writeAudit(actorOf(session.user), clientIp(request), {
      action: "Bank angelegt",
      description: `Bank „${body.name}" (${body.country}) angelegt.`,
      bankId: id,
      newValue: body.name,
    })

    return json({ id }, 201)
  } catch (error) {
    return handleError(error)
  }
}
