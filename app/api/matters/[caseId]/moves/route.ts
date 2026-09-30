/**
 * GET  /api/matters/:caseId/moves  → the person's moves as the signed record stands (operator)
 * POST /api/matters/:caseId/moves  {move, rationale, governingRule, rank?, deadline?, dependsOn?, unlocks?}
 *      STAND proposes a move. Every move names the governing rule it rests on. Only the person decides.
 */
import { matters } from '@/lib/spine'
import { operatorDenied, fail } from '@/lib/spine/guard'

type Ctx = { params: Promise<{ caseId: string }> }

export async function GET(req: Request, { params }: Ctx) {
  const denied = operatorDenied(req); if (denied) return denied
  const { caseId } = await params
  try {
    const moves = await matters().moves(caseId)
    return moves ? Response.json({ moves }) : Response.json({ error: 'this case has no Matter yet' }, { status: 404 })
  } catch (e) { return fail(e) }
}

export async function POST(req: Request, { params }: Ctx) {
  const denied = operatorDenied(req); if (denied) return denied
  const { caseId } = await params
  try {
    const b = (await req.json()) as { move?: string; rationale?: string; governingRule?: string; rank?: number; deadline?: string; dependsOn?: string[]; unlocks?: string[] }
    if (!b.move?.trim() || !b.rationale?.trim() || !b.governingRule?.trim())
      return fail(new Error('move, rationale and governingRule are required: every move names the rule it rests on'))
    const r = await matters().proposeMove(caseId, {
      move: b.move.trim(), rationale: b.rationale.trim(), governing_rule: b.governingRule.trim(),
      rank: typeof b.rank === 'number' ? b.rank : undefined, deadline: b.deadline, depends_on: b.dependsOn, unlocks: b.unlocks,
    })
    return Response.json(r)
  } catch (e) { return fail(e) }
}
