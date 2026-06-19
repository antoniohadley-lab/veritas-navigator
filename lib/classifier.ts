import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Regex patterns for prompt injection — deterministic, cannot be bypassed by phrasing
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /forget\s+(everything|all|your\s+previous|the\s+above)/i,
  /you\s+are\s+now\s+(going\s+to\s+)?(be\s+|act\s+as\s+)?(?!Veritas|an?\s+assistant|an?\s+AI\s+assistant)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(?!Veritas|an?\s+assistant)/i,
  /act\s+as\s+(if\s+you\s+are\s+)?(?!Veritas|an?\s+assistant)/i,
  /roleplay\s+as/i,
  /your\s+(true\s+|real\s+|new\s+)?(instructions?|role|persona|purpose)\s+(is|are)/i,
  /jailbreak/i,
  /override\s+(your\s+)?(previous\s+)?(instructions?|rules?|guidelines?)/i,
  /disregard\s+(all\s+)?(previous\s+)?(instructions?|guidelines?|rules?)/i,
  /in\s+(this\s+)?(hypothetical|fictional|alternate|imaginary)\s+(scenario|situation|world)/i,
  /\[system\]/i,
  /<\/?system>/i,
  /human:\s*ignore/i,
];

export interface ClassifierResult {
  blocked: boolean;
  blockMessage?: string;
  tokens: {
    targetEntity: string;
    actionType: string;
    timelineMarkers: string[];
    documentType: string;
  };
  safeSummary: string;
}

const EMPTY_TOKENS: ClassifierResult['tokens'] = {
  targetEntity: '',
  actionType: '',
  timelineMarkers: [],
  documentType: '',
};

export async function classifyInput(input: string): Promise<ClassifierResult> {
  // 1. Fast regex injection check — runs synchronously, cannot be fooled by rephrasing
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return {
        blocked: true,
        blockMessage:
          'Your message could not be processed. Please describe your situation in plain terms.',
        tokens: EMPTY_TOKENS,
        safeSummary: '',
      };
    }
  }

  // 2. Haiku call for factual token extraction — fast, cheap, no emotional drift
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Extract factual tokens from this legal situation description. Return valid JSON only — no markdown, no explanation, no other text:
{
  "targetEntity": "who sent the notice or took the action (e.g. landlord, court, debt collector, hospital)",
  "actionType": "what action was taken or what document was received (e.g. eviction notice, summons, billing statement)",
  "timelineMarkers": ["any specific dates, deadlines, or timeframes mentioned"],
  "documentType": "exact document name if explicitly stated, else empty string",
  "safeSummary": "one sentence factual summary with no emotional language"
}

Input: ${input.slice(0, 600)}`,
        },
      ],
    });

    const raw = res.content[0].type === 'text' ? res.content[0].text.trim() : '';
    // Strip markdown code fences if the model wraps the JSON
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    return {
      blocked: false,
      tokens: {
        targetEntity: String(parsed.targetEntity ?? ''),
        actionType: String(parsed.actionType ?? ''),
        timelineMarkers: Array.isArray(parsed.timelineMarkers)
          ? (parsed.timelineMarkers as unknown[]).map(String)
          : [],
        documentType: String(parsed.documentType ?? ''),
      },
      safeSummary: String(parsed.safeSummary ?? input.slice(0, 200)),
    };
  } catch {
    // Classifier failure is non-blocking — Navigator still receives the message
    return {
      blocked: false,
      tokens: EMPTY_TOKENS,
      safeSummary: input.slice(0, 200),
    };
  }
}

export function buildStructuredContext(result: ClassifierResult): string {
  const { tokens } = result;
  const lines: string[] = ['[Structured intake]'];
  if (tokens.targetEntity) lines.push(`Sender/entity: ${tokens.targetEntity}`);
  if (tokens.actionType) lines.push(`Action/document: ${tokens.actionType}`);
  if (tokens.timelineMarkers.length > 0)
    lines.push(`Timeline: ${tokens.timelineMarkers.join('; ')}`);
  if (tokens.documentType) lines.push(`Document type: ${tokens.documentType}`);
  // Only return the context block if we actually extracted something
  return lines.length > 1 ? lines.join('\n') : '';
}
