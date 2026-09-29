/**
 * GET  /api/matters/:caseId          → the Matter record as the platform holds it (operator)
 * POST /api/matters/:caseId {title}  → open the Matter for this Case (operator). Returns a one-time
 *                                      holderLinkToken; send the person /matters/:caseId?t=<token>.
 */
import { matters } from '@/lib/spine'
import { operatorDenied, fail } from '@/lib/spine/guard'

type Ctx = { params: Promise<{ caseId: string }> }

export async function GET(req: Request, { params }: Ctx) {
  const denied = operatorDenied(req); if (denied) return denied
  const { caseId } = await params
  try {
    const record = await matters().view(caseId)
    return record ? Response.json(record) : Response.json({ error: 'this case has no Matter yet' }, { status: 404 })
  } catch (e) { return fail(e) }
}

export async function POST(req: Request, { params }: Ctx) {
  const denied = operatorDenied(req); if (denied) return denied
  const { caseId } = await params
  try {
    const { title } = (await req.json()) as { title?: string }
    if (!title?.trim()) return fail(new Error('title is required'))
    return Response.json(await matters().open(caseId, title.trim()))
  } catch (e) { return fail(e) }
}
