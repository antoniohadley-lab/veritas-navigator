/**
 * A person's own signing device for STAND records (a holder on a Matter, or the Chairman on the Playbook),
 * running in their browser.
 * The signing key is created here as non-extractable and kept in IndexedDB: it cannot be copied
 * out of this device, and STAND's servers never see it. This device also keeps its own witness
 * record (every event hash it signed, and the last head it saw) for independent verification.
 */
import { canonical, eventHeader } from './rules.mjs'

export const SPINE_API_DEFAULT =
  process.env.NEXT_PUBLIC_SPINE_API_URL ?? 'https://gjwfwtwgtbolyzjqkial.supabase.co/functions/v1/spine-api'
const ANON = process.env.NEXT_PUBLIC_SPINE_ANON_KEY

export interface HolderDevice {
  caseId: string          // storage key: the Case id, or 'playbook'
  role: 'holder' | 'chairman'
  sessionId: string
  actorId: string
  keyId: string
  publicKeyB64: string
  api: string
  seen: string[]          // event hashes this device signed
  head: string | null     // last head this device saw
  protocolSha256: string | null
  privateKey: CryptoKey
}

const enc = new TextEncoder()
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))
export async function sha256Hex(d: string | ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', typeof d === 'string' ? enc.encode(d) : d)
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ---- IndexedDB, one record per case ----
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('stand-matters', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('devices', { keyPath: 'caseId' })
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
  })
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db()
  return new Promise((res, rej) => { const q = fn(d.transaction('devices', mode).objectStore('devices')); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error) })
}
export const loadDevice = (caseId: string) => tx<HolderDevice | undefined>('readonly', (s) => s.get(caseId))
const saveDevice = (d: HolderDevice) => tx('readwrite', (s) => s.put(d))

export async function newKey() {
  const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify'])) as CryptoKeyPair
  return { privateKey: pair.privateKey, publicKeyB64: b64(await crypto.subtle.exportKey('raw', pair.publicKey)) }
}

const sign = async (d: HolderDevice, msg: string) => b64(await crypto.subtle.sign({ name: 'Ed25519' }, d.privateKey, enc.encode(msg)))

async function call<T = any>(api: string, action: string, body: object): Promise<T> {
  const r = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(ANON ? { apikey: ANON, Authorization: `Bearer ${ANON}` } : {}) }, body: JSON.stringify({ action, ...body }) })
  const out = await r.json().catch(() => ({ error: `server returned ${r.status}` }))
  if (!r.ok || out.error) throw new Error(out.error ?? `server returned ${r.status}`)
  return out
}

async function link(storeKey: string, role: HolderDevice['role'], url: string, linkToken: string, displayName: string): Promise<HolderDevice> {
  const { privateKey, publicKeyB64 } = await newKey()
  const r = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linkToken, publicKey: publicKeyB64, displayName }),
  })
  const out = await r.json()
  if (!r.ok) throw new Error(out.error ?? 'could not link this device')
  const d: HolderDevice = { caseId: storeKey, role, sessionId: out.sessionId, actorId: out.actorId, keyId: out.keyId, publicKeyB64, api: out.api ?? SPINE_API_DEFAULT, seen: [], head: null, protocolSha256: null, privateKey }
  await saveDevice(d)
  return d
}

/** Creates this device's key and binds it to the Matter using the one-time link. */
export const linkThisDevice = (caseId: string, linkToken: string, displayName: string) =>
  link(caseId, 'holder', `/api/matters/${encodeURIComponent(caseId)}/holder`, linkToken, displayName)

/** Binds this device as the Chairman of STAND's Playbook. */
export const linkChairmanDevice = (linkToken: string, displayName: string) =>
  link('playbook', 'chairman', '/api/playbook/chairman', linkToken, displayName)

async function signedRead(d: HolderDevice, action: string) {
  const t = new Date().toISOString()
  return { actor_id: d.actorId, key_id: d.keyId, session_id: d.sessionId, client_time_iso: t, signature: await sign(d, ['read', action, d.sessionId, t].join('|')) }
}

export async function readRecord(d: HolderDevice) {
  const st = await call(d.api, 'state', await signedRead(d, 'state'))
  const p = st.protocol
  const env = await sha256Hex(canonical({ namespace: p.namespace, name: p.name, version: p.version, definition_sha256: p.definition_sha256 }))
  if (!d.protocolSha256) d.protocolSha256 = env                 // pin the rulebook the first time this device sees it
  else if (d.protocolSha256 !== env) throw new Error('The rulebook for this record changed since this device last saw it. Do not rely on it.')
  // Anything this device signed must still be there.
  const hashes = new Set(st.events.map((e: any) => e.event_sha256))
  const missing = d.seen.filter((h) => !hashes.has(h))
  if (missing.length) throw new Error(`${missing.length} event(s) this device signed are missing from the record. Do not rely on it.`)
  d.head = st.prev_event_sha256; await saveDevice(d)
  return st
}

/** Signs and appends one event, in this device's role, at the current head. */
export async function appendAsHolder(d: HolderDevice, event_type: string, payload: Record<string, unknown>) {
  for (let i = 0; i < 3; i++) {
    const st = await readRecord(d)
    const e = { seq: st.next_seq, event_type, actor_id: d.actorId, role: d.role ?? 'holder', prev_event_sha256: st.prev_event_sha256, client_time_iso: new Date().toISOString() }
    const eventSha = await sha256Hex(eventHeader(d.sessionId, e, await sha256Hex(canonical(payload))))
    try {
      const r = await call(d.api, 'append', { session_id: d.sessionId, ...e, key_id: d.keyId, payload, event_sha256: eventSha, signature: await sign(d, eventSha) })
      d.seen.push(r.event_sha256); d.head = r.event_sha256; await saveDevice(d)
      return r
    } catch (err) {
      if (!/seq gap|broken chain|duplicate key/.test((err as Error).message) || i === 2) throw err
    }
  }
}

export async function exportWithWitness(d: HolderDevice) {
  const pkg = await call(d.api, 'export', await signedRead(d, 'export'))
  const witness = {
    format: 'veritas-witness/v1', session_id: d.sessionId, witnessed_by: d.role === 'chairman' ? 'Chairman device' : 'Holder device',
    expected_protocol_sha256: d.protocolSha256,
    trusted_keys: [{ id: d.keyId, actor_id: d.actorId, public_key: d.publicKeyB64 }],
    seen_event_sha256s: d.seen, final_head_sha256: d.head,
  }
  return { pkg, witness }
}

export const appendAs = appendAsHolder
