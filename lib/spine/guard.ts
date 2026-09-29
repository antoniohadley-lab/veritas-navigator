/**
 * STAND has no user accounts yet. Until it does, the routes that let STAND write to a Matter
 * are operator-only: the caller must send `Authorization: Bearer <STAND_OPERATOR_TOKEN>`.
 * Without that env var set, they are refused in production and allowed in local development.
 * The holder's own route is gated separately, by the one-time link token.
 */
import { timingSafeEqual } from 'crypto'

export function operatorDenied(req: Request): Response | null {
  const want = process.env.STAND_OPERATOR_TOKEN
  if (!want) return process.env.NODE_ENV === 'production'
    ? Response.json({ error: 'STAND_OPERATOR_TOKEN is not configured' }, { status: 503 })
    : null
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const a = Buffer.from(got), b = Buffer.from(want)
  return a.length === b.length && timingSafeEqual(a, b) ? null : Response.json({ error: 'not authorized' }, { status: 401 })
}

export const fail = (err: unknown, status = 400) =>
  Response.json({ error: (err as Error)?.message ?? 'failed' }, { status })
