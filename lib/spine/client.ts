/**
 * Veritas spine client (server side).
 *
 * STAND is a customer of the Veritas platform: it records Matters on the platform's
 * verified engine through the same public API any other customer uses. Nothing here
 * bypasses the engine's rules; the server re-checks every event with the shared rules.mjs.
 *
 * Env:
 *   SPINE_API_URL              default: the Veritas project's spine-api function
 *   SPINE_ANON_KEY             Supabase publishable (anon) key for that project
 *   SPINE_STEWARD_ACTOR_ID     STAND's actor id on the platform      (scripts/spine-steward.mjs)
 *   SPINE_STEWARD_KEY_ID       STAND's key id on the platform
 *   SPINE_STEWARD_PRIVATE_KEY  STAND's Ed25519 private key, PKCS8 DER, base64. Secret.
 */
import { createHash, createPrivateKey, createPublicKey, sign as edSign, type KeyObject } from 'crypto'
import { canonical, eventHeader, protocolEnvelope } from './rules.mjs'

export const SPINE_API =
  process.env.SPINE_API_URL ?? 'https://gjwfwtwgtbolyzjqkial.supabase.co/functions/v1/spine-api'

export const sha256Hex = (d: string | Uint8Array) => createHash('sha256').update(d).digest('hex')

export interface Signer {
  actorId: string
  keyId: string
  /** Raw 32-byte Ed25519 public key, base64 (what the platform stores) */
  publicKeyB64: string
  /** Ed25519 signature over the UTF-8 message, base64 */
  sign(message: string): string
}

export function signerFromPkcs8(actorId: string, keyId: string, pkcs8B64: string): Signer {
  const key: KeyObject = createPrivateKey({ key: Buffer.from(pkcs8B64, 'base64'), format: 'der', type: 'pkcs8' })
  const spki = createPublicKey(key).export({ format: 'der', type: 'spki' }) as Buffer
  return { actorId, keyId, publicKeyB64: spki.subarray(-32).toString('base64'), sign: (m) => edSign(null, Buffer.from(m, 'utf8'), key).toString('base64') }
}

export function stewardFromEnv(): Signer {
  const { SPINE_STEWARD_ACTOR_ID: a, SPINE_STEWARD_KEY_ID: k, SPINE_STEWARD_PRIVATE_KEY: p } = process.env
  if (!a || !k || !p) throw new Error('STAND steward key is not configured (run scripts/spine-steward.mjs)')
  return signerFromPkcs8(a, k, p)
}

export class SpineError extends Error {}

export async function call<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const anon = process.env.SPINE_ANON_KEY
  const res = await fetch(SPINE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {}) },
    body: JSON.stringify({ action, ...body }),
  })
  const out = await res.json().catch(() => ({ error: `spine-api returned ${res.status}` }))
  if (!res.ok || out.error) throw new SpineError(out.error ?? `spine-api returned ${res.status}`)
  return out as T
}

const now = () => new Date().toISOString()

function signedRead(s: Signer, action: string, sessionId: string) {
  const t = now()
  return { actor_id: s.actorId, key_id: s.keyId, session_id: sessionId, client_time_iso: t, signature: s.sign(['read', action, sessionId, t].join('|')) }
}

export interface ProtocolRow { id: string; namespace: string; name: string; version: string; status: string; definition: any; definition_sha256: string }

export async function findProtocol(namespace: string, name: string, version: string): Promise<ProtocolRow> {
  const { protocols } = await call<{ protocols: ProtocolRow[] }>('protocols')
  const p = protocols.find((x) => x.namespace === namespace && x.name === name && x.version === version)
  if (!p) throw new SpineError(`rulebook ${namespace}/${name} v${version} is not available on the platform`)
  return p
}

/** SHA-256 of the protocol envelope: what a witness pins so the rulebook cannot be swapped later. */
export const envelopeSha = (p: Pick<ProtocolRow, 'namespace' | 'name' | 'version' | 'definition_sha256'>) =>
  sha256Hex(protocolEnvelope(p))

export async function openSession(s: Signer, protocolId: string, subject: unknown): Promise<string> {
  const t = now()
  const { session_id } = await call<{ session_id: string }>('open_session', {
    actor_id: s.actorId, key_id: s.keyId, protocol_id: protocolId, subject, client_time_iso: t,
    signature: s.sign(['open', protocolId, canonical(subject), t].join('|')),
  })
  return session_id
}

export interface SessionState {
  session: { id: string; status: string; subject: unknown }
  protocol: Omit<ProtocolRow, 'id'>
  events: { seq: number; event_type: string; role: string; actor_id: string; event_sha256: string; payload_canonical: string; client_time_iso: string; display_name?: string }[]
  next_seq: number
  prev_event_sha256: string | null
}

export const state = (s: Signer, sessionId: string) => call<SessionState>('state', signedRead(s, 'state', sessionId))
export const exportPackage = (s: Signer, sessionId: string) => call<any>('export', signedRead(s, 'export', sessionId))

export interface AppendInput {
  event_type: string
  role: string
  payload: Record<string, unknown>
  evidence?: { bytes: Uint8Array; media_type: string }
}

/**
 * Signs and appends one event at the current head of the chain.
 * If someone else appended first (seq gap / broken chain), it re-reads the head and tries again.
 */
export async function append(s: Signer, sessionId: string, input: AppendInput, attempts = 3): Promise<{ event_sha256: string; seq: number }> {
  const payload = { ...input.payload }
  if (input.evidence) {
    payload.evidence_sha256 = sha256Hex(input.evidence.bytes)
    payload.media_type ??= input.evidence.media_type
  }
  for (let i = 0; ; i++) {
    let seq = 1, prev: string | null = null
    try {
      const st = await state(s, sessionId)
      seq = st.next_seq; prev = st.prev_event_sha256
    } catch (e) {
      // Before the first event only the opener can read, and state() allows it; any other failure is real.
      if (!(e instanceof SpineError) || !/waiting for the session to open/.test(e.message)) throw e
    }
    const e = { seq, event_type: input.event_type, actor_id: s.actorId, role: input.role, prev_event_sha256: prev, client_time_iso: now() }
    const eventSha = sha256Hex(eventHeader(sessionId, e, sha256Hex(canonical(payload))))
    try {
      return await call('append', {
        session_id: sessionId, ...e, key_id: s.keyId, payload, event_sha256: eventSha, signature: s.sign(eventSha),
        ...(input.evidence ? { evidence: { base64: Buffer.from(input.evidence.bytes).toString('base64'), media_type: input.evidence.media_type } } : {}),
      })
    } catch (err) {
      const raced = err instanceof SpineError && /seq gap|broken chain|duplicate key/.test(err.message)
      if (!raced || i + 1 >= attempts) throw err
    }
  }
}

export async function enroll(code: string, displayName: string, publicKeyB64: string, kind: 'person' | 'service' = 'person') {
  return call<{ actor_id: string; key_id: string }>('enroll', { code, display_name: displayName, public_key: publicKeyB64, kind })
}
