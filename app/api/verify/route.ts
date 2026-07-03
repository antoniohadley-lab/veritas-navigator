/**
 * POST /api/verify
 * STAND Verification Check endpoint — Section 3 + Section 4.
 *
 * Takes a user claim, checks it against the Rule Store, returns a structured
 * VerificationResult. Never returns freeform AI-generated prose.
 */
import { isAdviceRequest } from '@/lib/upl-guardrails';
import { verifyClaim } from '@/lib/rule-store';

export interface VerifyRequest {
  claim: string;
  topic: string;
  jurisdiction: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VerifyRequest;
    const { claim, topic, jurisdiction } = body;

    if (!claim || !topic || !jurisdiction) {
      return Response.json(
        { error: 'claim, topic, and jurisdiction are required' },
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

    const result = await verifyClaim(claim, topic, jurisdiction);

    return Response.json(result);
  } catch (err) {
    console.error('[/api/verify] error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
