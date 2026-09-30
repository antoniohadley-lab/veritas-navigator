/**
 * STAND's Playbook on the Veritas platform (rulebook stand/stand-playbook v0.1).
 *
 * This is how STAND learns without guessing:
 *   1. Matters record moves, the holder's decisions, and outcomes (see moves.ts).
 *   2. STAND proposes a rule, citing the outcome events it rests on.
 *   3. Only the Chairman, signing from their own device, adopts or retires a rule.
 * The engine refuses a rule adopted by anyone else, so the playbook can't drift on its own.
 *
 * STAND keeps its own copy of every playbook event it signed (its witness file), the same way it does for Matters.
 */
import { createHash, randomBytes } from 'crypto'
import * as spine from './client'
import type { Signer } from './client'

export const PLAYBOOK_RULEBOOK = { namespace: 'stand', name: 'stand-playbook', version: '0.1' } as const

export interface PlaybookFields {
  sessionId: string | null
  protocolSha256: string | null
  headSha256: string | null
  chairmanActorId: string | null
  chairmanKeyId: string | null
  chairmanLinkTokenHash: string | null
}

export interface PlaybookStore {
  get(): Promise<PlaybookFields | null>
  save(data: Partial<PlaybookFields>): Promise<void>
  logEvent(row: { eventType: string; roleType: string; actorId: string; spineEventSha: string }): Promise<void>
  signedEventShas(actorId: string): Promise<string[]>
}

import { deriveRules, type Evidence } from './playbook-rules'
export { deriveRules, type Evidence, type PlaybookRule } from './playbook-rules'

const sha = (s: string) => createHash('sha256').update(s).digest('hex')

export class PlaybookBridge {
  constructor(private store: PlaybookStore, private steward: Signer) {}

  private async require() {
    const p = await this.store.get()
    if (!p?.sessionId) throw new Error('the playbook has not been opened yet')
    return p as PlaybookFields & { sessionId: string }
  }

  private async write(sessionId: string, input: spine.AppendInput) {
    const r = await spine.append(this.steward, sessionId, input)
    await this.store.logEvent({ eventType: `spine:${input.event_type}`, roleType: input.role, actorId: this.steward.actorId, spineEventSha: r.event_sha256 })
    await this.store.save({ headSha256: r.event_sha256 })
    return r
  }

  /** Opens the playbook once and returns a one-time link for the Chairman's device. */
  async open(): Promise<{ sessionId: string; chairmanLinkToken: string | null }> {
    const cur = await this.store.get()
    if (cur?.sessionId) return { sessionId: cur.sessionId, chairmanLinkToken: null }
    const p = await spine.findProtocol(PLAYBOOK_RULEBOOK.namespace, PLAYBOOK_RULEBOOK.name, PLAYBOOK_RULEBOOK.version)
    const subject = { playbook: 'STAND' }
    const sessionId = await spine.openSession(this.steward, p.id, subject)
    const token = randomBytes(24).toString('base64url')
    await this.store.save({ sessionId, protocolSha256: spine.envelopeSha(p), chairmanLinkTokenHash: sha(token) })
    await this.write(sessionId, { event_type: 'session_opened', role: 'steward', payload: { subject } })
    return { sessionId, chairmanLinkToken: token }
  }

  async linkChairman(linkToken: string, publicKeyB64: string, displayName: string, enrollCode: string) {
    const p = await this.require()
    if (p.chairmanActorId) throw new Error('a Chairman device is already linked')
    if (!p.chairmanLinkTokenHash || sha(linkToken) !== p.chairmanLinkTokenHash) throw new Error('that link is not valid')
    const { actor_id, key_id } = await spine.enroll(enrollCode, displayName, publicKeyB64, 'person')
    await this.store.save({ chairmanActorId: actor_id, chairmanKeyId: key_id, chairmanLinkTokenHash: null })
    await this.write(p.sessionId, { event_type: 'participant_added', role: 'steward', payload: { actor_id, role: 'chairman' } })
    return { actorId: actor_id, keyId: key_id, sessionId: p.sessionId }
  }

  /** STAND proposes a rule. It must cite at least one recorded outcome; a rule with no evidence is a guess. */
  async propose(rule: string, domain: string, evidence: Evidence[]) {
    if (!rule.trim() || !domain.trim()) throw new Error('rule and domain are required')
    if (!evidence.length || evidence.some((e) => !e.matter_ref || !/^[0-9a-f]{64}$/.test(e.event_sha256) || !e.result))
      throw new Error('a rule must cite at least one recorded outcome (matter_ref, event_sha256, result)')
    const p = await this.require()
    return this.write(p.sessionId, { event_type: 'rule_proposed', role: 'steward', payload: { rule: rule.trim(), domain: domain.trim(), evidence } })
  }

  async view() {
    const p = await this.require()
    const st = await spine.state(this.steward, p.sessionId)
    return { ...st, rules: deriveRules(st.events) }
  }

  async proof() {
    const p = await this.require()
    const pkg = await spine.exportPackage(this.steward, p.sessionId)
    const witness = {
      format: 'veritas-witness/v1', session_id: p.sessionId, witnessed_by: 'STAND (steward)',
      expected_protocol_sha256: p.protocolSha256,
      trusted_keys: [{ id: this.steward.keyId, actor_id: this.steward.actorId, public_key: this.steward.publicKeyB64 }],
      seen_event_sha256s: await this.store.signedEventShas(this.steward.actorId),
      final_head_sha256: p.headSha256,
    }
    return { package: pkg, witness }
  }
}
