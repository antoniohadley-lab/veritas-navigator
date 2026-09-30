/**
 * POST /api/matters/:caseId/outcome {decisionEventSha, result, whatHappened}
 * STAND records an outcome it observed on a move the person chose. (The person records their own from their page.)
 */
import { matters } from '@/lib/spine'
import { operatorDenied, fail } from '@/lib/spine/guard'

const RESULTS = ['worked', 'partial', 'stalled', 'failed'] as const

export async function POST(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const denied = operatorDenied(req); if (denied) return denied
  const { caseId } = await params
  try {
    const b = (await req.json()) as { decisionEventSha?: string; result?: (typeof RESULTS)[number]; whatHappened?: string }
    if (!b.decisionEventSha || !b.result || !RESULTS.includes(b.result) || !b.whatHappened?.trim())
      return fail(new Error(`decisionEventSha, result (${RESULTS.join(', ')}) and whatHappened are required`))
    return Response.json(await matters().recordOutcome(caseId, b.decisionEventSha, b.result, b.whatHappened.trim()))
  } catch (e) { return fail(e) }
}
