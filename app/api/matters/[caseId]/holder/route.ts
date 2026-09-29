/**
 * POST /api/matters/:caseId/holder {linkToken, publicKey, displayName}
 * The person binds a key made on their own device (the private key never leaves it).
 * Gated by the one-time link token from opening the Matter, not by the operator token.
 */
import { matters } from '@/lib/spine'
import { SPINE_API } from '@/lib/spine/client'
import { fail } from '@/lib/spine/guard'

export async function POST(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  try {
    const { linkToken, publicKey, displayName } = (await req.json()) as { linkToken?: string; publicKey?: string; displayName?: string }
    if (!linkToken || !publicKey || !displayName?.trim()) return fail(new Error('linkToken, publicKey and displayName are required'))
    if (!/^[A-Za-z0-9+/]{43}=$/.test(publicKey)) return fail(new Error('publicKey must be a raw Ed25519 key, base64'))
    const code = process.env.SPINE_HOLDER_ENROLL_CODE
    if (!code) return fail(new Error('holder enrollment is not configured'), 503)
    const linked = await matters().linkHolder(caseId, linkToken, publicKey, displayName.trim(), code)
    return Response.json({ ...linked, api: SPINE_API })
  } catch (e) { return fail(e) }
}
