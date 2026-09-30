/**
 * Moves: the options a person has, the one they chose, and what happened.
 * Derived only from signed Matter events (rulebook stand-matter v0.2), so the list the
 * person sees is exactly what the verified record says. Pure functions; safe in browser and server.
 */

export type MoveStatus = 'open' | 'chosen' | 'deferred' | 'declined' | 'worked' | 'partial' | 'stalled' | 'failed'

export interface Move {
  event_sha256: string
  seq: number
  move: string
  rationale: string
  governing_rule: string
  rank: number | null
  deadline: string | null
  depends_on: string[]
  unlocks: string[]
  proposed_by_role: string
  decision: { event_sha256: string; decision: 'chosen' | 'declined' | 'deferred'; reason: string | null; at: string } | null
  outcomes: { event_sha256: string; result: 'worked' | 'partial' | 'stalled' | 'failed'; what_happened: string; at: string }[]
  status: MoveStatus
}

type Ev = { seq: number; event_type: string; role: string; event_sha256: string; payload_canonical: string; client_time_iso: string }

const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : [])

export function deriveMoves(events: Ev[]): Move[] {
  const moves = new Map<string, Move>()
  const decisionToMove = new Map<string, string>()
  for (const e of events) {
    const p = JSON.parse(e.payload_canonical)
    if (e.event_type === 'move_proposed') {
      moves.set(e.event_sha256, {
        event_sha256: e.event_sha256, seq: e.seq, move: p.move, rationale: p.rationale, governing_rule: p.governing_rule,
        rank: typeof p.rank === 'number' ? p.rank : null, deadline: p.deadline ?? null,
        depends_on: list(p.depends_on), unlocks: list(p.unlocks), proposed_by_role: e.role,
        decision: null, outcomes: [], status: 'open',
      })
    } else if (e.event_type === 'move_decided') {
      const m = moves.get(p.move_event_sha256)
      if (!m) continue
      // The latest decision stands: a deferred move can be chosen later.
      m.decision = { event_sha256: e.event_sha256, decision: p.decision, reason: p.reason ?? null, at: e.client_time_iso }
      decisionToMove.set(e.event_sha256, m.event_sha256)
    } else if (e.event_type === 'move_outcome') {
      const m = moves.get(decisionToMove.get(p.decision_event_sha256) ?? '')
      if (m) m.outcomes.push({ event_sha256: e.event_sha256, result: p.result, what_happened: p.what_happened, at: e.client_time_iso })
    }
  }
  for (const m of moves.values()) {
    const last = m.outcomes.at(-1)
    m.status = last ? last.result : m.decision ? m.decision.decision : 'open'
  }
  const order: MoveStatus[] = ['chosen', 'open', 'deferred', 'stalled', 'partial', 'failed', 'worked', 'declined']
  return [...moves.values()].sort((a, b) =>
    order.indexOf(a.status) - order.indexOf(b.status) || (a.rank ?? 999) - (b.rank ?? 999) || a.seq - b.seq)
}

/**
 * Outcomes as evidence: each finished move with the rule it rested on and what happened.
 * This is what STAND reads when it proposes a playbook rule; the Chairman decides what becomes one.
 */
export function outcomeEvidence(matterRef: string, events: Ev[]) {
  return deriveMoves(events).flatMap((m) => m.outcomes.map((o) => ({
    matter_ref: matterRef, move: m.move, governing_rule: m.governing_rule, result: o.result,
    what_happened: o.what_happened, event_sha256: o.event_sha256,
  })))
}

export const STATUS_LABEL: Record<MoveStatus, string> = {
  open: 'Open', chosen: 'In progress', deferred: 'Later', declined: 'Not taking',
  worked: 'Worked', partial: 'Partly worked', stalled: 'Stalled', failed: "Didn't work",
}
