/**
 * STAND Matters on the Veritas platform.
 *
 * Every STAND Case can carry a verified Matter record (rulebook stand/stand-matter v0.1):
 *   - STAND (steward) records what the person said, what was attached, what was checked
 *     against which published source, and what deadlines were noted.
 *   - The person (holder) binds their own device key and confirms or rejects what STAND recorded,
 *     or records statements in their own name. Anything STAND recorded stays STAND's work until then.
 *   - Witnesses attest to specific facts from their own knowledge.
 *
 * STAND keeps its own copy of every event hash it signed (VerificationEvent.spineEventSha) and the
 * last head it saw (Case.spineHeadSha256). That copy is STAND's witness file: an outside checker can
 * compare it with the platform's export, so neither side can quietly rewrite the record.
 *
 * All writes are optional mirrors: if the platform is unreachable or SPINE_ENABLED is not "1",
 * STAND keeps working and the Matter simply isn't extended. Use `mirror()` for that behavior.
 */
import { createHash, randomBytes } from 'crypto'
import * as spine from './client'
import type { Signer } from './client'

export const MATTER_RULEBOOK = { namespace: 'stand', name: 'stand-matter', version: '0.1' } as const

export interface CaseSpineFields {
  id: string
  spineSessionId: string | null
  spineProtocolSha256: string | null
  spineHeadSha256: string | null
  holderActorId: string | null
  holderKeyId: string | null
  holderLinkTokenHash: string | null
}

/** Storage STAND uses for its side of the record. Prisma in the app; in-memory in tests. */
export interface MatterStore {
  getCase(caseId: string): Promise<CaseSpineFields | null>
  updateCase(caseId: string, data: Partial<Omit<CaseSpineFields, 'id'>>): Promise<void>
  logEvent(row: { caseId: string; eventType: string; roleType: string; actorId: string; spineEventSha: string; evidenceHash?: string; notes?: string }): Promise<void>
  signedEventShas(caseId: string, actorId: string): Promise<string[]>
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex')

export class MatterBridge {
  constructor(private store: MatterStore, private steward: Signer) {}

  private async requireCase(caseId: string) {
    const c = await this.store.getCase(caseId)
    if (!c) throw new Error('unknown case')
    return c
  }

  /**
   * Opens the Matter for a Case (once) and returns a one-time holder link token.
   * The token is shown once; only its hash is kept.
   */
  async open(caseId: string, title: string): Promise<{ sessionId: string; holderLinkToken: string | null }> {
    const c = await this.requireCase(caseId)
    if (c.spineSessionId) return { sessionId: c.spineSessionId, holderLinkToken: null }
    const p = await spine.findProtocol(MATTER_RULEBOOK.namespace, MATTER_RULEBOOK.name, MATTER_RULEBOOK.version)
    const subject = { matter_ref: caseId, title }
    const sessionId = await spine.openSession(this.steward, p.id, subject)
    const token = randomBytes(24).toString('base64url')
    await this.store.updateCase(caseId, { spineSessionId: sessionId, spineProtocolSha256: spine.envelopeSha(p), holderLinkTokenHash: sha(token) })
    await this.write(caseId, sessionId, { event_type: 'session_opened', role: 'steward', payload: { subject } })
    return { sessionId, holderLinkToken: token }
  }

  /** New one-time link token (e.g. the person lost the first one). Invalidates the old one. */
  async reissueHolderLink(caseId: string): Promise<string> {
    const c = await this.requireCase(caseId)
    if (!c.spineSessionId) throw new Error('this case has no Matter yet')
    if (c.holderActorId) throw new Error('a device is already linked for this person')
    const token = randomBytes(24).toString('base64url')
    await this.store.updateCase(caseId, { holderLinkTokenHash: sha(token) })
    return token
  }

  /** The person binds a key generated on their own device. The private key never leaves that device. */
  async linkHolder(caseId: string, linkToken: string, publicKeyB64: string, displayName: string, enrollCode: string) {
    const c = await this.requireCase(caseId)
    if (!c.spineSessionId) throw new Error('this case has no Matter yet')
    if (c.holderActorId) throw new Error('a device is already linked for this person')
    if (!c.holderLinkTokenHash || sha(linkToken) !== c.holderLinkTokenHash) throw new Error('that link is not valid')
    const { actor_id, key_id } = await spine.enroll(enrollCode, displayName, publicKeyB64, 'person')
    await this.store.updateCase(caseId, { holderActorId: actor_id, holderKeyId: key_id, holderLinkTokenHash: null })
    await this.write(caseId, c.spineSessionId, { event_type: 'participant_added', role: 'steward', payload: { actor_id, role: 'holder' } })
    return { actorId: actor_id, keyId: key_id, sessionId: c.spineSessionId }
  }

  /** Appends one steward event to the Case's Matter and keeps STAND's own witness copy of it. */
  async record(caseId: string, input: spine.AppendInput) {
    const c = await this.requireCase(caseId)
    if (!c.spineSessionId) throw new Error('this case has no Matter yet')
    return this.write(caseId, c.spineSessionId, input)
  }

  private async write(caseId: string, sessionId: string, input: spine.AppendInput) {
    const r = await spine.append(this.steward, sessionId, input)
    await this.store.logEvent({
      caseId, eventType: `spine:${input.event_type}`, roleType: input.role, actorId: this.steward.actorId, spineEventSha: r.event_sha256,
      evidenceHash: input.evidence ? spine.sha256Hex(input.evidence.bytes) : undefined,
    })
    await this.store.updateCase(caseId, { spineHeadSha256: r.event_sha256 })
    return r
  }

  // ---- Typed helpers for what STAND records ----

  statement(caseId: string, text: string, entry_source: 'typed_by_holder' | 'spoken_by_holder' | 'transcribed_by_steward') {
    return this.record(caseId, { event_type: 'statement_recorded', role: 'steward', payload: { text, entry_source } })
  }
  document(caseId: string, bytes: Uint8Array, media_type: string, title: string) {
    return this.record(caseId, { event_type: 'document_attached', role: 'steward', payload: { title }, evidence: { bytes, media_type } })
  }
  fact(caseId: string, statement: string, source_event_sha256: string, date?: string) {
    return this.record(caseId, { event_type: 'fact_logged', role: 'steward', payload: { statement, source_event_sha256, ...(date ? { date } : {}) } })
  }
  /** A claim checked against a published source. STAND reports the comparison; it does not give advice. */
  claimCheck(caseId: string, c: { claim: string; result: 'confirmed' | 'contradicted' | 'cannot_verify'; source_title: string; source_url: string; source_text: string }) {
    return this.record(caseId, { event_type: 'claim_checked', role: 'steward', payload: {
      claim: c.claim, result: c.result, source_title: c.source_title, source_url: c.source_url, source_text_sha256: spine.sha256Hex(c.source_text) } })
  }
  deadline(caseId: string, description: string, due: string, controlling_source: string) {
    return this.record(caseId, { event_type: 'deadline_noted', role: 'steward', payload: { description, due, controlling_source } })
  }

  // ---- Reading and proof ----

  async view(caseId: string) {
    const c = await this.requireCase(caseId)
    if (!c.spineSessionId) return null
    return spine.state(this.steward, c.spineSessionId)
  }

  /**
   * Proof Package plus STAND's own witness file, built from STAND's database rather than the export,
   * so the two can be checked against each other by the independent verifier.
   */
  async proof(caseId: string) {
    const c = await this.requireCase(caseId)
    if (!c.spineSessionId) throw new Error('this case has no Matter yet')
    const pkg = await spine.exportPackage(this.steward, c.spineSessionId)
    const witness = {
      format: 'veritas-witness/v1',
      session_id: c.spineSessionId,
      witnessed_by: 'STAND (steward)',
      expected_protocol_sha256: c.spineProtocolSha256,
      // STAND's key comes from STAND's own configuration, never from the package being checked.
      trusted_keys: [{ id: this.steward.keyId, actor_id: this.steward.actorId, public_key: this.steward.publicKeyB64 }],
      seen_event_sha256s: await this.store.signedEventShas(caseId, this.steward.actorId),
      final_head_sha256: c.spineHeadSha256,
    }
    return { package: pkg, witness }
  }
}

/** Runs a Matter write without ever breaking the STAND flow around it. */
export async function mirror<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  if (process.env.SPINE_ENABLED !== '1') return null
  try {
    return await fn()
  } catch (err) {
    const msg = (err as Error).message
    if (msg === 'this case has no Matter yet') return null
    console.error(`[spine] ${label} not recorded:`, msg)
    return null
  }
}
