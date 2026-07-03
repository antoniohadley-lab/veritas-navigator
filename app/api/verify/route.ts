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

export interface VerifyRequest {
  claim: string;
  topic?: string;          // explicit Rule Store topic key
  opponentType?: string;   // infer topics from opponent type when topic is absent
  jurisdiction: string;
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
  'Employer': [],
  'Police / criminal court': [],
  'Other': [],
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VerifyRequest;
    const { claim, topic, opponentType, jurisdiction } = body;

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
      return Response.json(result);
    }

    // Try topics in order; return the first match or mismatch.
    // Fall back to the first cannot_verify if none match.
    let firstCannotVerify: VerificationResult | null = null;

    for (const t of topicsToTry) {
      const result = await verifyClaim(claim, t, jurisdiction);
      if (result.status !== 'cannot_verify') {
        return Response.json(result);
      }
      if (!firstCannotVerify) {
        firstCannotVerify = result;
      }
    }

    return Response.json(firstCannotVerify);
  } catch (err) {
    console.error('[/api/verify] error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
