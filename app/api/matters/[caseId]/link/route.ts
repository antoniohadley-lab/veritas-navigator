/** POST /api/matters/:caseId/link → a fresh one-time holder link token (operator). The old one stops working. */
import { matters } from '@/lib/spine'
import { operatorDenied, fail } from '@/lib/spine/guard'

export async function POST(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const denied = operatorDenied(req); if (denied) return denied
  const { caseId } = await params
  try { return Response.json({ holderLinkToken: await matters().reissueHolderLink(caseId) }) } catch (e) { return fail(e) }
}
