/**
 * POST /api/playbook/rules {rule, domain, evidence: [{matter_ref, event_sha256, result, note?}]}
 * STAND proposes a rule from recorded outcomes. It becomes a rule only when the Chairman adopts it.
 */
import { playbook } from '@/lib/spine'
import type { Evidence } from '@/lib/spine/playbook'
import { operatorDenied, fail } from '@/lib/spine/guard'

export async function POST(req: Request) {
  const denied = operatorDenied(req); if (denied) return denied
  try {
    const b = (await req.json()) as { rule?: string; domain?: string; evidence?: Evidence[] }
    return Response.json(await playbook().propose(b.rule ?? '', b.domain ?? '', b.evidence ?? []))
  } catch (e) { return fail(e) }
}
