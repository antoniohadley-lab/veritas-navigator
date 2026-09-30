/**
 * POST /api/playbook/chairman {linkToken, publicKey, displayName}
 * Binds the Chairman's own device (key made on the device). Gated by the one-time link, not the operator token.
 */
import { playbook } from '@/lib/spine'
import { SPINE_API } from '@/lib/spine/client'
import { fail } from '@/lib/spine/guard'

export async function POST(req: Request) {
  try {
    const { linkToken, publicKey, displayName } = (await req.json()) as { linkToken?: string; publicKey?: string; displayName?: string }
    if (!linkToken || !publicKey || !displayName?.trim()) return fail(new Error('linkToken, publicKey and displayName are required'))
    if (!/^[A-Za-z0-9+/]{43}=$/.test(publicKey)) return fail(new Error('publicKey must be a raw Ed25519 key, base64'))
    const code = process.env.SPINE_HOLDER_ENROLL_CODE
    if (!code) return fail(new Error('device enrollment is not configured'), 503)
    return Response.json({ ...(await playbook().linkChairman(linkToken, publicKey, displayName.trim(), code)), api: SPINE_API })
  } catch (e) { return fail(e) }
}
