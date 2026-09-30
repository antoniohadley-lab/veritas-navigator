/**
 * GET  /api/playbook → the playbook's rules as the signed record stands (operator)
 * POST /api/playbook → open the playbook once; returns a one-time Chairman link (/playbook?t=<token>) (operator)
 */
import { playbook } from '@/lib/spine'
import { operatorDenied, fail } from '@/lib/spine/guard'

export async function GET(req: Request) {
  const denied = operatorDenied(req); if (denied) return denied
  try { const v = await playbook().view(); return Response.json({ rules: v.rules, events: v.events.length }) } catch (e) { return fail(e) }
}

export async function POST(req: Request) {
  const denied = operatorDenied(req); if (denied) return denied
  try { return Response.json(await playbook().open()) } catch (e) { return fail(e) }
}
