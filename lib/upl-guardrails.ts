/**
 * STAND UPL Guardrails — Section 6
 *
 * Two deterministic checks that must run before any user input reaches
 * the Verification Check or the AI triage flow:
 *
 * 1. isAdviceRequest — detects advice-seeking input ("what should I file",
 *    "will I win") and refuses before the claim hits the Rule Store.
 * 2. grepUplPhrases — finds prohibited phrases in any string (used in CI
 *    or dev-time audits of UI copy).
 */

// Phrases that indicate the user is seeking legal advice, not making a claim.
// These inputs must be refused and redirected — never processed as a claim.
const ADVICE_PATTERNS = [
  /\bwhat\s+(should|can|must|do)\s+i\b/i,
  /\bshould\s+i\b/i,
  /\bwill\s+i\s+win\b/i,
  /\bdo\s+i\s+have\s+a\s+(case|claim|chance)\b/i,
  /\bwhat('?s|\s+is)\s+(my\s+)?(best|next)\s+(move|step|option)\b/i,
  /\bam\s+i\s+(going\s+to|likely\s+to)?\s*(win|lose)\b/i,
  /\badvise\s+me\b/i,
  /\bwhat\s+(are\s+)?my\s+(options|chances)\b/i,
  /\bwhat\s+would\s+you\s+(do|recommend)\b/i,
  /\bcan\s+i\s+win\b/i,
  /\bhow\s+do\s+i\s+beat\b/i,
  /\bwhat\s+argument\s+(should|can|must|do)\s+i\b/i,
];

// Phrases that must not appear in any user-facing string.
// Used for build-time or dev-time auditing.
const PROHIBITED_UI_PHRASES = [
  'you should',
  'i recommend',
  "i'd recommend",
  'we recommend',
  'your best move',
  'your best option',
  'you will win',
  "you'll win",
  'you have a strong case',
  'you have a good case',
  'veritas recommends',
  'stand recommends',
];

export interface AdviceCheckResult {
  isAdvice: boolean;
  redirectMessage: string;
}

/**
 * Check whether a user input is advice-seeking rather than a factual claim.
 * If so, return isAdvice: true with a redirect message.
 *
 * This check must run BEFORE the input reaches the Rule Store (Section 3)
 * or the AI triage (Section 4). Never bypass this gate.
 */
export function isAdviceRequest(input: string): AdviceCheckResult {
  const trimmed = input.trim();

  for (const pattern of ADVICE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isAdvice: true,
        redirectMessage:
          'STAND can verify factual claims against official sources. ' +
          'It cannot tell you what to do, predict outcomes, or give legal advice. ' +
          'For strategic or legal guidance, contact a licensed Michigan attorney ' +
          'or Michigan Legal Help at michiganlegalhelp.org.',
      };
    }
  }

  return { isAdvice: false, redirectMessage: '' };
}

export interface UplAuditResult {
  hasViolation: boolean;
  violations: Array<{ phrase: string; context: string }>;
}

/**
 * Scan a string for prohibited UI phrases.
 * Use this in tests, CI, or dev-time linting of UI copy.
 */
export function auditForUplPhrases(text: string): UplAuditResult {
  const lower = text.toLowerCase();
  const violations: Array<{ phrase: string; context: string }> = [];

  for (const phrase of PROHIBITED_UI_PHRASES) {
    const idx = lower.indexOf(phrase);
    if (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + phrase.length + 40);
      violations.push({
        phrase,
        context: text.slice(start, end),
      });
    }
  }

  return { hasViolation: violations.length > 0, violations };
}
