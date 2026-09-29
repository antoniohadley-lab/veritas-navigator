/**
 * POST /api/verify
 * STAND Verification Check endpoint — Section 3 + Section 4.
 *
 * Accepts a user claim and either:
 *   - An explicit `topic` (direct Rule Store lookup), or
 *   - An `opponentType` (mapped to candidate topics via OPPONENT_TOPICS)
 *
 * Returns a structured VerificationResult. Never returns freeform AI-generated prose.
 */
import { isAdviceRequest } from '@/lib/upl-guardrails';
import { verifyClaim, type VerificationResult } from '@/lib/rule-store';
import { matters, mirror } from '@/lib/spine';

export interface VerifyRequest {
  claim: string;
  topic?: string;          // explicit Rule Store topic key
  opponentType?: string;   // infer topics from opponent type when topic is absent
  jurisdiction: string;
  caseId?: string;         // when given, the check is recorded on that Case's verified Matter
}

// Records a finished check on the Case's Matter (if any). The record states what was compared
// against which published text; it never states advice or who is right.
async function recordCheck(caseId: string | undefined, claim: string, r: VerificationResult) {
  if (!caseId) return;
  const rule = r.matchedRule;
  await mirror('claim check', () => matters().claimCheck(caseId, {
    claim,
    result: r.status === 'match' ? 'confirmed' : r.status === 'mismatch' ? 'contradicted' : 'cannot_verify',
    source_title: rule ? `${rule.jurisdiction} ${rule.sourceType}: ${rule.topic}` : 'No current verified source on file',
    source_url: rule?.sourceUrl ?? 'none',
    source_text: rule?.exactText ?? '',
  }));
}

// Maps each opponent type to the Rule Store topic keys most likely to apply.
// Topics are tried in order — first non-cannot_verify result wins.
// Empty array = honest cannot_verify (no rules loaded for that opponent type yet).
const OPPONENT_TOPICS: Record<string, string[]> = {
  'Landlord / property manager': [
    'eviction notice period nonpayment',
    'eviction notice period holdover month to month',
    'eviction summons response period',
    'security deposit return deadline',
  ],
  'City or county': [
    'foia state local response window',
    'foia extension period',
  ],
  'Debt collector / creditor': [
    'fdcpa debt validation window',
  ],
  // Business formation (Launch Floor) — topics queried by dedicated UI, not opponent type
  'Government agency / licensing body': [
    'business formation ein employer identification number',
    'michigan llc entity registration lara articles of organization',
    'uei unique entity identifier sam.gov federal contracts grants',
    'duns number dun bradstreet trade credit business identity',
    'michigan sales use tax registration michigan treasury online mto',
    'certificate of assumed name dba michigan llc sole proprietor',
    'michigan uia unemployment insurance agency employer registration employees',
    'beneficial ownership information boi fincen corporate transparency act domestic exemption',
  ],
  'Employer': [],
  'Police / criminal court': [],
  'Other': [],
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VerifyRequest;
    const { claim, topic, opponentType, jurisdiction, caseId } = body;

    if (!claim || !jurisdiction) {
      return Response.json(
        { error: 'claim and jurisdiction are required' },
        { status: 400 }
      );
    }

    // UPL Section 6 gate: advice requests must be refused before hitting the Rule Store.
    const adviceCheck = isAdviceRequest(claim);
    if (adviceCheck.isAdvice) {
      return Response.json(
        { error: adviceCheck.redirectMessage, type: 'advice_request' },
        { status: 400 }
      );
    }

    // Determine which topics to try
    let topicsToTry: string[] = [];

    if (topic) {
      topicsToTry = [topic];
    } else if (opponentType) {
      topicsToTry = OPPONENT_TOPICS[opponentType] ?? [];
    }

    // No applicable topics for this opponent type — return cannot_verify immediately
    if (topicsToTry.length === 0) {
      const result: VerificationResult = {
        status: 'cannot_verify',
        matchedRule: null,
        cannotVerifyReason: 'no_matching_rule',
        checkedAt: new Date().toISOString(),
      };
      await recordCheck(caseId, claim, result);
      return Response.json(result);
    }

    // Try topics in order; return the first match or mismatch.
    // Fall back to the first cannot_verify if none match.
    let firstCannotVerify: VerificationResult | null = null;

    for (const t of topicsToTry) {
      const result = await verifyClaim(claim, t, jurisdiction);
      if (result.status !== 'cannot_verify') {
        await recordCheck(caseId, claim, result);
        return Response.json(result);
      }
      if (!firstCannotVerify) {
        firstCannotVerify = result;
      }
    }

    if (firstCannotVerify) await recordCheck(caseId, claim, firstCannotVerify);
    return Response.json(firstCannotVerify);
  } catch (err) {
    console.error('[/api/verify] error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
