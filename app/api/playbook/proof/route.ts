/** GET /api/playbook/proof → { package, witness }: the playbook's Proof Package plus STAND's own witness file (operator). */
import { playbook } from '@/lib/spine'
import { operatorDenied, fail } from '@/lib/spine/guard'

export async function GET(req: Request) {
  const denied = operatorDenied(req); if (denied) return denied
  try { return Response.json(await playbook().proof()) } catch (e) { return fail(e) }
}
