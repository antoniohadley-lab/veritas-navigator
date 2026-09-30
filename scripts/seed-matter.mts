// Opens real Matters from a private seed file and records their opening statement and moves.
// Seed files hold real case content and stay OUT of git (*.local.json; this repo is public).
//
// Usage (with STAND's server environment loaded: DATABASE_URL, SPINE_* keys):
//   npx tsx scripts/seed-matter.mts case-0001.local.json
//
// Seed file shape:
// { "owner_email": "...", "matters": [ { "key": "case-0001", "title": "...",
//     "statement": { "text": "...", "entry_source": "transcribed_by_steward" },
//     "moves": [ { "move": "...", "rationale": "...", "governing_rule": "...", "rank": 1,
//                  "deadline": "...", "depends_on": ["..."], "unlocks": ["..."] } ] } ] }
//
// Safe to re-run: a Matter that already exists is reused and nothing is recorded twice.
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { prisma } from '../lib/prisma'
import { matters } from '../lib/spine'

type Seed = {
  owner_email: string
  matters: { key: string; title: string; statement?: { text: string; entry_source: 'typed_by_holder' | 'spoken_by_holder' | 'transcribed_by_steward' }
    moves: { move: string; rationale: string; governing_rule: string; rank?: number; deadline?: string; depends_on?: string[]; unlocks?: string[] }[] }[]
}

const file = process.argv[2]
if (!file) { console.error('usage: npx tsx scripts/seed-matter.mts <seed.local.json>'); process.exit(1) }
const seed = JSON.parse(readFileSync(file, 'utf8')) as Seed

const user = await prisma.user.upsert({
  where: { email: seed.owner_email }, update: {},
  // No password login exists yet; this placeholder can never match a real password hash.
  create: { email: seed.owner_email, passwordHash: `unset:${randomBytes(16).toString('hex')}` },
})

for (const m of seed.matters) {
  const c = await prisma.case.upsert({ where: { id: m.key }, update: {}, create: { id: m.key, userId: user.id } })
  const opened = await matters().open(c.id, m.title)
  const existing = (await matters().view(c.id))?.events ?? []
  const has = (type: string, field: string, value: string) =>
    existing.some((e) => e.event_type === type && JSON.parse(e.payload_canonical)[field] === value)

  if (m.statement && !has('statement_recorded', 'text', m.statement.text)) {
    await prisma.narrativeEntry.create({ data: { caseId: c.id, rawText: m.statement.text } })
    await matters().statement(c.id, m.statement.text, m.statement.entry_source)
  }
  let added = 0
  for (const mv of m.moves) if (!has('move_proposed', 'move', mv.move)) { await matters().proposeMove(c.id, mv); added++ }

  console.log(`${m.key}: Matter ${opened.sessionId}; ${added} move(s) added`)
  if (opened.holderLinkToken) console.log(`  holder link (shown once, keep private): /matters/${c.id}?t=${opened.holderLinkToken}`)
}
await prisma.$disconnect()
