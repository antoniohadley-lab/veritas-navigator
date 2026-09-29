/**
 * GET /api/matters/:caseId/proof → { package, witness }
 * The platform's Proof Package, plus STAND's own witness file built from STAND's database.
 * Check with the independent verifier:  node verify.mjs package.json evidence/ --anchors witness.json
 */
import { matters } from '@/lib/spine'
import { operatorDenied, fail } from '@/lib/spine/guard'

export async function GET(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const denied = operatorDenied(req); if (denied) return denied
  const { caseId } = await params
  try { return Response.json(await matters().proof(caseId)) } catch (e) { return fail(e) }
}
