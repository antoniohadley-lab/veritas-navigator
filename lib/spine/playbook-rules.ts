/** Pure playbook state derivation, safe in the browser. */

export interface Evidence { matter_ref: string; event_sha256: string; result: string; note?: string }

export interface PlaybookRule {
  proposal_event_sha256: string
  rule: string
  domain: string
  evidence: Evidence[]
  status: 'proposed' | 'adopted' | 'retired'
  adopted_event_sha256: string | null
  retired_reason: string | null
}

type Ev = { event_type: string; event_sha256: string; payload_canonical: string }

/** Rules as the signed record says they stand. */
export function deriveRules(events: Ev[]): PlaybookRule[] {
  const rules = new Map<string, PlaybookRule>(), byAdoption = new Map<string, string>()
  for (const e of events) {
    const p = JSON.parse(e.payload_canonical)
    if (e.event_type === 'rule_proposed')
      rules.set(e.event_sha256, { proposal_event_sha256: e.event_sha256, rule: p.rule, domain: p.domain, evidence: p.evidence ?? [], status: 'proposed', adopted_event_sha256: null, retired_reason: null })
    else if (e.event_type === 'rule_adopted') {
      const r = rules.get(p.proposal_event_sha256)
      if (r) { r.status = 'adopted'; r.adopted_event_sha256 = e.event_sha256; byAdoption.set(e.event_sha256, r.proposal_event_sha256) }
    } else if (e.event_type === 'rule_retired') {
      const r = rules.get(byAdoption.get(p.rule_event_sha256) ?? '')
      if (r) { r.status = 'retired'; r.retired_reason = p.reason }
    }
  }
  return [...rules.values()]
}

