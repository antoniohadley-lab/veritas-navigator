/**
 * Verification Surfaces — intake endpoint definitions.
 *
 * Architecture rule: one RuleSource entry supports many natural-language entry
 * points. Page count scales cheaply (templated front matter); verification labor
 * scales slowly and deliberately (one RuleSource ID per surface, gated by Section 0).
 *
 * Every surface opens into the same /start Screen 1 flow. No pre-population of
 * the claim or opponent — the surface param is passed as a URL hint for analytics.
 */

export interface VerificationSurface {
  /** URL slug: /go/[slug] */
  slug: string;
  /** Corresponds to a seed-XXX row in the RuleSource table */
  ruleSourceId: string;
  jurisdiction: 'michigan' | 'federal';
  topic: string;
  /** Short h1 — the natural-language phrasing a visitor arrives with */
  heading: string;
  /** One sentence: what STAND will check and why it matters */
  subheading: string;
  /** Pre-selects opponent type on Screen 2 when passed to /start */
  opponentType?: string;
}

export const VERIFICATION_SURFACES: VerificationSurface[] = [
  // ── Eviction: nonpayment (seed-001) ─────────────────────────────────────────
  {
    slug: 'landlord-gave-me-7-days',
    ruleSourceId: 'seed-001',
    jurisdiction: 'michigan',
    topic: 'eviction notice period nonpayment',
    heading: 'I got a 7-day notice from my landlord.',
    subheading:
      'Michigan law sets the minimum notice period before a landlord can file for eviction. Let\'s check what you received against the actual statute.',
    opponentType: 'Landlord / property manager',
  },
  {
    slug: 'eviction-notice-taped-to-door',
    ruleSourceId: 'seed-001',
    jurisdiction: 'michigan',
    topic: 'eviction notice period nonpayment',
    heading: 'There\'s a paper taped to my door saying I need to pay or leave.',
    subheading:
      'Before you do anything, let\'s verify what that notice actually requires and whether the timeline they gave you matches state law.',
    opponentType: 'Landlord / property manager',
  },
  {
    slug: 'can-they-make-me-leave-this-week',
    ruleSourceId: 'seed-001',
    jurisdiction: 'michigan',
    topic: 'eviction notice period nonpayment',
    heading: 'My landlord says I have to be out by the end of the week.',
    subheading:
      'In Michigan, a landlord can\'t begin the eviction process without proper written notice. Let\'s check whether what they told you is legal.',
    opponentType: 'Landlord / property manager',
  },
  {
    slug: 'behind-on-rent-landlord-said-7-days',
    ruleSourceId: 'seed-001',
    jurisdiction: 'michigan',
    topic: 'eviction notice period nonpayment',
    heading: 'I\'m behind on rent and my landlord said I have 7 days to pay or get out.',
    subheading:
      'Let\'s verify that timeline against Michigan law before you decide what to do next.',
    opponentType: 'Landlord / property manager',
  },

  // ── Eviction: holdover / month-to-month (seed-002) ───────────────────────
  {
    slug: 'landlord-not-renewing-wants-me-out',
    ruleSourceId: 'seed-002',
    jurisdiction: 'michigan',
    topic: 'eviction notice period holdover month to month',
    heading: 'My landlord told me they\'re not renewing and I need to leave.',
    subheading:
      'If you\'re on a month-to-month lease, Michigan law requires a minimum notice period before a landlord can require you to vacate.',
    opponentType: 'Landlord / property manager',
  },
  {
    slug: 'lease-ended-landlord-says-im-trespassing',
    ruleSourceId: 'seed-002',
    jurisdiction: 'michigan',
    topic: 'eviction notice period holdover month to month',
    heading: 'My lease ended and now my landlord says I\'m trespassing.',
    subheading:
      'Even after a lease ends, a landlord can\'t force you out without proper notice in Michigan. Let\'s check the requirement.',
    opponentType: 'Landlord / property manager',
  },

  // ── Security deposit (seed-009) ───────────────────────────────────────────
  {
    slug: 'landlord-wont-return-my-deposit',
    ruleSourceId: 'seed-009',
    jurisdiction: 'michigan',
    topic: 'security deposit return deadline',
    heading: 'My landlord is keeping my security deposit.',
    subheading:
      'Michigan law requires landlords to return security deposits within a specific deadline after you move out. Let\'s check whether they\'re in violation.',
    opponentType: 'Landlord / property manager',
  },
  {
    slug: 'moved-out-weeks-ago-no-deposit-back',
    ruleSourceId: 'seed-009',
    jurisdiction: 'michigan',
    topic: 'security deposit return deadline',
    heading: 'I moved out weeks ago and still haven\'t gotten my deposit back.',
    subheading:
      'Michigan landlords have a set deadline to return your deposit or provide an itemized deduction list. Let\'s check where the clock stands.',
    opponentType: 'Landlord / property manager',
  },

  // ── FOIA: state / local (seed-003) ───────────────────────────────────────
  {
    slug: 'foia-request-no-response',
    ruleSourceId: 'seed-003',
    jurisdiction: 'michigan',
    topic: 'foia state local response window',
    heading: 'I filed a public records request and haven\'t heard back.',
    subheading:
      'Michigan\'s FOIA law sets a specific response window for public bodies. Let\'s check whether they\'ve exceeded it.',
    opponentType: 'City or county',
  },
  {
    slug: 'city-ignored-my-records-request',
    ruleSourceId: 'seed-003',
    jurisdiction: 'michigan',
    topic: 'foia state local response window',
    heading: 'The city is ignoring my records request.',
    subheading:
      'Michigan public bodies are required by law to respond to FOIA requests within a set number of business days. Let\'s verify.',
    opponentType: 'City or county',
  },

  // ── Debt collection: FDCPA validation (seed-006) ─────────────────────────
  {
    slug: 'debt-collector-contacted-me',
    ruleSourceId: 'seed-006',
    jurisdiction: 'federal',
    topic: 'fdcpa debt validation window',
    heading: 'A debt collector contacted me about a debt I don\'t recognize.',
    subheading:
      'Federal law gives you the right to request validation of any debt within 30 days of first contact. Let\'s check where you stand.',
    opponentType: 'Debt collector / creditor',
  },
  {
    slug: 'received-collection-letter',
    ruleSourceId: 'seed-006',
    jurisdiction: 'federal',
    topic: 'fdcpa debt validation window',
    heading: 'I got a letter from a debt collection agency.',
    subheading:
      'The FDCPA gives you specific rights when a debt collector contacts you. Let\'s verify the timeline and what you can still do.',
    opponentType: 'Debt collector / creditor',
  },

  // ── Business formation: EIN (seed-011) ───────────────────────────────────
  {
    slug: 'how-to-get-an-ein',
    ruleSourceId: 'seed-011',
    jurisdiction: 'federal',
    topic: 'business formation ein employer identification number',
    heading: 'I need an EIN for my business. Do I have to pay for it?',
    subheading:
      'EINs are issued free by the IRS. Let\'s verify what\'s required and how to apply — there are services that charge for this that don\'t need to.',
    opponentType: 'Government agency / licensing body',
  },

  // ── Business formation: Michigan LLC (seed-012) ──────────────────────────
  {
    slug: 'register-llc-michigan',
    ruleSourceId: 'seed-012',
    jurisdiction: 'michigan',
    topic: 'michigan llc entity registration lara articles of organization',
    heading: 'I want to form an LLC in Michigan. What does it actually cost?',
    subheading:
      'Michigan LLC registration goes through LARA. Let\'s verify the current state filing fee and what\'s required — separate from any service fees.',
    opponentType: 'Government agency / licensing body',
  },

  // ── Business formation: BOI (seed-018) ───────────────────────────────────
  {
    slug: 'do-i-need-to-file-boi-report',
    ruleSourceId: 'seed-018',
    jurisdiction: 'federal',
    topic: 'beneficial ownership information boi fincen corporate transparency act domestic exemption',
    heading: 'Do I need to file a Beneficial Ownership report with FinCEN?',
    subheading:
      'BOI filing status for domestic LLCs has changed multiple times. Let\'s check the current verified status — this is a high-volatility entry we recheck monthly.',
    opponentType: 'Government agency / licensing body',
  },
];

export function getSurface(slug: string): VerificationSurface | undefined {
  return VERIFICATION_SURFACES.find((s) => s.slug === slug);
}

export function getSurfacesByRuleSource(ruleSourceId: string): VerificationSurface[] {
  return VERIFICATION_SURFACES.filter((s) => s.ruleSourceId === ruleSourceId);
}
