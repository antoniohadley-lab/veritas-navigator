// End-to-end test of the STAND ↔ Veritas bridge, against the platform's in-memory server (same rules.mjs).
// Usage:  VERITAS_PLATFORM=../veritas-spine npx tsx scripts/test-matter-bridge.mts
// It opens a Matter the way STAND does, links a holder, records, exports, and runs the independent
// verifier with STAND's witness file (from STAND's own store) and the holder's.
import { generateKeyPairSync, createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'

const platform = resolve(process.env.VERITAS_PLATFORM ?? '../veritas-spine')
const { start } = await import(pathToFileURL(`${platform}/tools/mock-spine.mjs`).href)
const { verifyPackage } = await import(pathToFileURL(`${platform}/verify.mjs`).href)
const mock = await start(8791)
process.env.SPINE_API_URL = mock.url
process.env.SPINE_ENABLED = '1'

const spine = await import('../lib/spine/client.ts')
const { MatterBridge, mirror } = await import('../lib/spine/matter.ts')
type Store = import('../lib/spine/matter.ts').MatterStore

let failures = 0
const check = (ok: boolean, what: string) => { console.log(`${ok ? '  ok  ' : '  BAD '} ${what}`); if (!ok) failures++ }
const expectError = async (p: Promise<unknown>, re: RegExp, what: string) => {
  try { await p; check(false, `${what} (was accepted)`) } catch (e) { check(re.test((e as Error).message), `${what}: "${(e as Error).message}"`) }
}

// ---- STAND's side: an in-memory store standing in for Prisma ----
const cases = new Map<string, any>()
const log: any[] = []
const store: Store = {
  async getCase(id) { return cases.get(id) ?? null },
  async updateCase(id, data) { Object.assign(cases.get(id), data) },
  async logEvent(r) { log.push(r) },
  async signedEventShas(caseId, actorId) { return log.filter((r) => r.caseId === caseId && r.actorId === actorId).map((r) => r.spineEventSha) },
}
const newCase = (id: string) => cases.set(id, { id, spineSessionId: null, spineProtocolSha256: null, spineHeadSha256: null, holderActorId: null, holderKeyId: null, holderLinkTokenHash: null })

const mkSigner = async (name: string, kind: 'person' | 'service') => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const pub = (publicKey.export({ format: 'der', type: 'spki' }) as Buffer).subarray(-32).toString('base64')
  const { actor_id, key_id } = await spine.enroll('TESTCODE', name, pub, kind)
  return spine.signerFromPkcs8(actor_id, key_id, (privateKey.export({ format: 'der', type: 'pkcs8' }) as Buffer).toString('base64'))
}

console.log('\nSTAND ↔ VERITAS BRIDGE')
const steward = await mkSigner('STAND', 'service')
const stand = new MatterBridge(store, steward)

// 1. Case with no Matter: STAND keeps working, nothing is recorded
newCase('case-0000')
check((await mirror('x', () => stand.statement('case-0000', 'hello', 'typed_by_holder'))) === null, 'a Case without a Matter is left alone (STAND flow not broken)')

// 2. Open a Matter
newCase('case-0001')
const opened = await stand.open('case-0001', 'Case 0001: housing notice and furnace')
check(!!opened.sessionId && !!opened.holderLinkToken, 'Matter opened; one-time holder link issued')
check((await stand.open('case-0001', 'again')).holderLinkToken === null, 'opening twice returns the same Matter and no second link')

// 3. STAND records
const st = await stand.statement('case-0001', 'A notice was taped to my door on the 3rd. The furnace has been out since the 1st.', 'transcribed_by_steward')
const photo = Buffer.concat([Buffer.from('JPEG-'), Buffer.from(createHash('sha256').update('notice').digest())])
const doc = await stand.document('case-0001', photo, 'image/jpeg', 'Photo of the notice')
const fact = await stand.fact('case-0001', 'Notice received on the 3rd', st.event_sha256, '2026-10-03')
const chk = await stand.claimCheck('case-0001', { claim: 'The notice gives 7 days to pay', result: 'confirmed', source_title: 'michigan statute: eviction notice period nonpayment', source_url: 'https://legislature.mi.gov/', source_text: 'exact statutory text' })
const dl = await stand.deadline('case-0001', 'Earliest filing date if unpaid', '2026-10-10', 'MCL 600.5714')
check(log.filter((r) => r.caseId === 'case-0001').length === 6, 'STAND kept its own copy of all 6 event hashes it signed')

// 4. The engine's rules hold for STAND too
await expectError(stand.record('case-0001', { event_type: 'record_confirmed', role: 'holder', payload: { event_sha256s: [fact.event_sha256], confirmation: 'accurate' } }),
  /without having been granted|only holder/, 'STAND cannot confirm on the person\'s behalf')
await expectError(stand.record('case-0001', { event_type: 'claim_checked', role: 'steward', payload: { claim: 'x', result: 'you_will_win', source_title: 's', source_url: 'u', source_text_sha256: 'h' } }),
  /not an allowed result/, 'a check outside the boundary ("you_will_win") is refused')
await expectError(stand.record('case-0001', { event_type: 'witness_attested', role: 'witness', payload: { event_sha256: doc.event_sha256, statement: 'x' } }),
  /without having been granted|only witness/, 'STAND cannot pose as a witness')

// 5. Holder links a device (key made on the device; here, a Node key standing in for the phone)
const { publicKey: hp, privateKey: hk } = generateKeyPairSync('ed25519')
const holderPub = (hp.export({ format: 'der', type: 'spki' }) as Buffer).subarray(-32).toString('base64')
await expectError(stand.linkHolder('case-0001', 'wrong-token', holderPub, 'Tony', 'TESTCODE'), /not valid/, 'a wrong link token is refused')
const linked = await stand.linkHolder('case-0001', opened.holderLinkToken!, holderPub, 'Tony', 'TESTCODE')
const holder = spine.signerFromPkcs8(linked.actorId, linked.keyId, (hk.export({ format: 'der', type: 'pkcs8' }) as Buffer).toString('base64'))
await expectError(stand.linkHolder('case-0001', opened.holderLinkToken!, holderPub, 'Someone else', 'TESTCODE'), /already linked/, 'the link cannot be used twice')

// 6. Holder confirms, corrects, adds in their own words (their device's witness copy kept alongside)
const holderSeen: string[] = []
const h = async (event_type: string, payload: Record<string, unknown>) => { const r = await spine.append(holder, opened.sessionId, { event_type, role: 'holder', payload }); holderSeen.push(r.event_sha256); return r }
await h('record_confirmed', { event_sha256s: [st.event_sha256, fact.event_sha256, dl.event_sha256], confirmation: 'accurate' })
await h('record_confirmed', { event_sha256s: [chk.event_sha256], confirmation: 'inaccurate', note: 'The notice said 30 days, not 7.' })
await h('statement_recorded', { text: 'I called the landlord twice about the furnace.', entry_source: 'typed_by_holder' })
const last = await h('action_taken', { action: 'Left a voicemail for the landlord.' })
check(true, 'holder confirmed 3 items, flagged 1 as inaccurate, and added 2 entries in their own name')

// 7. Proof: export + STAND's witness (from STAND's store) + holder's witness (from the device)
const env = spine.envelopeSha((await spine.findProtocol('stand', 'stand-matter', '0.1')))
const { package: pkg, witness: standWitness } = await stand.proof('case-0001')
const holderWitness = { format: 'veritas-witness/v1', session_id: opened.sessionId, witnessed_by: 'Holder device', expected_protocol_sha256: env,
  trusted_keys: [{ id: holder.keyId, actor_id: holder.actorId, public_key: holder.publicKeyB64 }], seen_event_sha256s: holderSeen, final_head_sha256: last.event_sha256 }
const dir = mkdtempSync(`${tmpdir()}/matter-`); mkdirSync(`${dir}/evidence`)
writeFileSync(`${dir}/evidence/${createHash('sha256').update(photo).digest('hex')}`, photo)
const verify = (p: any, w: any[]) => verifyPackage(JSON.parse(JSON.stringify(p)), `${dir}/evidence`, w)

let r = verify(pkg, [standWitness, holderWitness])
check(r.status === 'INTERIM', `open Matter verifies as INTERIM through event ${pkg.events.length}`)
console.log(`         ${r.summary.split('.')[0]}.`)

// 8. Tampering is caught
{ const p = JSON.parse(JSON.stringify(pkg)); p.events.splice(-1); check(verify(p, [standWitness, holderWitness]).status === 'FAIL', 'dropping the holder\'s last entry is caught by the holder\'s witness') }
{ const p = JSON.parse(JSON.stringify(pkg)); const e = p.events.find((x: any) => x.event_type === 'claim_checked'); e.payload_canonical = e.payload_canonical.replace('confirmed', 'contradicted'); check(verify(p, [standWitness, holderWitness]).status === 'FAIL', 'editing STAND\'s check after the fact is caught') }
check(verify(pkg, []).status === 'UNANCHORED', 'without witness files the record is only UNANCHORED (never PASS)')

// 9. Close the Matter: the record becomes complete
await spine.append(holder, opened.sessionId, { event_type: 'session_closed', role: 'holder', payload: { reason: 'resolved' } }).then((x) => { holderWitness.seen_event_sha256s.push(x.event_sha256); holderWitness.final_head_sha256 = x.event_sha256 })
const closed = await stand.proof('case-0001')
r = verify(closed.package, [closed.witness, holderWitness])
check(r.status === 'PASS', 'closed Matter verifies as PASS')
await expectError(stand.statement('case-0001', 'late', 'typed_by_holder'), /already ended|not open/, 'nothing can be added after the Matter is closed')

mock.close()
console.log(failures ? `\n${failures} FAILURE(S)` : '\nBRIDGE: ALL EXPECTATIONS MET')
writeFileSync(`${dir}/proof-package.json`, JSON.stringify(closed.package, null, 2))
writeFileSync(`${dir}/witness-stand.json`, JSON.stringify(closed.witness, null, 2))
writeFileSync(`${dir}/witness-holder.json`, JSON.stringify(holderWitness, null, 2))
console.log(`Sample package written to ${dir}`)
process.exit(failures ? 1 : 0)
