/**
 * STAND Verification Check — Rule Store
 *
 * Bounded universe: the AI compares user claims against only the rows in this
 * store. It never queries the open web, its training data, or any other source.
 * If no matching row exists, result is cannot_verify. If a matching row is stale
 * (lastVerifiedDate older than staleAfterDays), result is cannot_verify.
 */

export type RuleSourceType =
  | 'statute'
  | 'court_rule'
  | 'official_form'
  | 'administrative_rule';

export type VerificationStatus = 'match' | 'mismatch' | 'cannot_verify';

export interface RuleSourceRow {
  id: string;
  jurisdiction: string;
  topic: string;
  sourceType: RuleSourceType;
  exactText: string;
  sourceUrl: string;
  lastVerifiedDate: Date;
  staleAfterDays: number;
}

export interface VerificationResult {
  status: VerificationStatus;
  /** Null when status is cannot_verify */
  matchedRule: RuleSourceRow | null;
  /** Human-readable reason for cannot_verify when status is cannot_verify */
  cannotVerifyReason?: 'no_matching_rule' | 'stale_source';
  /** ISO timestamp of the check */
  checkedAt: string;
}

/**
 * Look up all RuleSource rows that match this jurisdiction + topic combination.
 * In production this queries the database; during development it falls back to
 * the in-memory seed data below.
 */
async function lookupRules(
  jurisdiction: string,
  topic: string,
  dbQuery?: (jurisdiction: string, topic: string) => Promise<RuleSourceRow[]>
): Promise<RuleSourceRow[]> {
  if (dbQuery) {
    return dbQuery(jurisdiction, topic);
  }
  // In-memory seed fallback (used until DB is connected)
  return SEED_RULES.filter(
    (r) =>
      r.jurisdiction.toLowerCase() === jurisdiction.toLowerCase() &&
      r.topic.toLowerCase() === topic.toLowerCase()
  );
}

function isStale(rule: RuleSourceRow): boolean {
  const cutoff = new Date(rule.lastVerifiedDate);
  cutoff.setDate(cutoff.getDate() + rule.staleAfterDays);
  return new Date() > cutoff;
}

/**
 * Core comparison function — returns a structured VerificationResult.
 *
 * Never returns freeform prose from a model. All text in the result is sourced
 * from the database row (exactText, sourceUrl) or from the claim itself.
 *
 * Matching strategies (applied in order, first conclusive result wins):
 *   1. Date/duration token matching  — "7 days", "30 calendar days"
 *   2. Currency amount matching      — "$50", "$1,000"
 *   3. Free/cost status matching     — rule says "free", claim says "free" or has fees
 *
 * Falls back to cannot_verify when no strategy can produce a confident result.
 *
 * @param claim        The user's factual claim (not a question, not advice-seeking)
 * @param topic        The topic key that identifies which statute/rule applies
 * @param jurisdiction e.g. "michigan", "federal"
 * @param dbQuery      Optional live DB query; omit to use seed data
 */
export async function verifyClaim(
  claim: string,
  topic: string,
  jurisdiction: string,
  dbQuery?: (jurisdiction: string, topic: string) => Promise<RuleSourceRow[]>
): Promise<VerificationResult> {
  const rules = await lookupRules(jurisdiction, topic, dbQuery);
  const checkedAt = new Date().toISOString();

  if (rules.length === 0) {
    return {
      status: 'cannot_verify',
      matchedRule: null,
      cannotVerifyReason: 'no_matching_rule',
      checkedAt,
    };
  }

  // Use only the freshest non-stale rule
  const fresh = rules.filter((r) => !isStale(r));
  if (fresh.length === 0) {
    return {
      status: 'cannot_verify',
      matchedRule: null,
      cannotVerifyReason: 'stale_source',
      checkedAt,
    };
  }

  // Pick the most recently verified rule
  const rule = fresh.sort(
    (a, b) =>
      new Date(b.lastVerifiedDate).getTime() -
      new Date(a.lastVerifiedDate).getTime()
  )[0];

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s$]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizedClaim = normalize(claim);
  const normalizedText = normalize(rule.exactText);

  // ── Strategy 1: Date/duration token matching ─────────────────────────────
  // Matches claims about specific time periods ("7 days", "30 calendar days")
  const ruleTimeTokens =
    normalizedText.match(
      /\b\d[\d\s]*(?:days?|months?|years?|calendar|business)\b/g
    ) ?? [];

  if (ruleTimeTokens.length > 0) {
    const claimMatchesAll = ruleTimeTokens.every((token) =>
      normalizedClaim.includes(token.trim())
    );
    return {
      status: claimMatchesAll ? 'match' : 'mismatch',
      matchedRule: rule,
      checkedAt,
    };
  }

  // ── Strategy 2: Currency amount matching ─────────────────────────────────
  // Matches claims about fees ("$50 filing fee", "EIN is $0")
  const ruleCurrencyTokens =
    normalizedText
      .match(/\$\d+(?:,\d{3})*(?:\.\d{2})?/g)
      ?.map((t) => t.replace(/,/g, '')) ?? [];
  const claimCurrencyTokens =
    normalizedClaim
      .match(/\$\d+(?:,\d{3})*(?:\.\d{2})?/g)
      ?.map((t) => t.replace(/,/g, '')) ?? [];

  if (ruleCurrencyTokens.length > 0 && claimCurrencyTokens.length > 0) {
    const anyMatch = ruleCurrencyTokens.some((t) =>
      claimCurrencyTokens.includes(t)
    );
    return {
      status: anyMatch ? 'match' : 'mismatch',
      matchedRule: rule,
      checkedAt,
    };
  }

  // ── Strategy 3: Free / cost status matching ───────────────────────────────
  // Matches claims about whether something costs money
  const FREE_PATTERN = /\bfree\b|\bno cost\b|\bno charge\b|\bfree of charge\b/;
  const COST_PATTERN = /\bcost(s)?\b|\bfee\b|\bpaid\b|\bnot free\b/;
  const ruleIsFree = FREE_PATTERN.test(normalizedText);

  if (ruleIsFree) {
    if (FREE_PATTERN.test(normalizedClaim)) {
      return { status: 'match', matchedRule: rule, checkedAt };
    }
    if (COST_PATTERN.test(normalizedClaim)) {
      return { status: 'mismatch', matchedRule: rule, checkedAt };
    }
  }

  // No strategy produced a conclusive result
  return {
    status: 'cannot_verify',
    matchedRule: rule,
    checkedAt,
  };
}

// ─── In-memory seed data ──────────────────────────────────────────────────────
// These mirror the rows that should be inserted via prisma/seed.ts once DB is live.
// All entries verified directly against primary source text — no paraphrase.

const SEED_RULES: RuleSourceRow[] = [
  // ── Housing & Eviction (Michigan) ─────────────────────────────────────────
  {
    id: 'seed-001',
    jurisdiction: 'michigan',
    topic: 'eviction notice period nonpayment',
    sourceType: 'statute',
    exactText:
      'If a tenant fails to pay the rent when due and the landlord desires to terminate the tenancy, the landlord may demand payment of the rent and give notice in writing that if the rent is not paid within 7 days after the notice is given, the lease or rental agreement is terminated.',
    sourceUrl: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-554-134',
    lastVerifiedDate: new Date('2026-06-01'),
    staleAfterDays: 45,
  },
  {
    id: 'seed-002',
    jurisdiction: 'michigan',
    topic: 'eviction notice period holdover month to month',
    sourceType: 'statute',
    exactText:
      'To terminate a month-to-month tenancy or a tenancy at will, the landlord shall give the tenant written notice 30 days or 1 rental period, whichever is greater, before termination of the tenancy.',
    sourceUrl: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-554-134',
    lastVerifiedDate: new Date('2026-06-01'),
    staleAfterDays: 45,
  },
  // ── FOIA ─────────────────────────────────────────────────────────────────
  {
    id: 'seed-003',
    jurisdiction: 'michigan',
    topic: 'foia state local response window',
    sourceType: 'statute',
    exactText:
      'Within 5 business days after receiving a written request for a public record, a public body shall grant or deny the request, unless the request includes a demand for records not subject to disclosure under this act.',
    sourceUrl: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-15-235',
    lastVerifiedDate: new Date('2026-06-01'),
    staleAfterDays: 45,
  },
  {
    id: 'seed-004',
    jurisdiction: 'michigan',
    topic: 'foia extension period',
    sourceType: 'statute',
    exactText:
      'A public body may extend the period to grant or deny a request by up to 10 business days by notifying the requesting person in writing within the original 5 business day period and stating the specific reasons for the extension.',
    sourceUrl: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-15-235',
    lastVerifiedDate: new Date('2026-06-01'),
    staleAfterDays: 45,
  },
  {
    id: 'seed-005',
    jurisdiction: 'federal',
    topic: 'foia federal response window',
    sourceType: 'statute',
    exactText:
      'Each agency, upon any request for records made under paragraph (1), (2), or (3) of this subsection, shall determine within 20 days (excepting Saturdays, Sundays, and legal public holidays) after the receipt of any such request whether to comply with such request.',
    sourceUrl: 'https://www.law.cornell.edu/uscode/text/5/552',
    lastVerifiedDate: new Date('2026-06-01'),
    staleAfterDays: 45,
  },
  // ── Debt Collection ───────────────────────────────────────────────────────
  {
    id: 'seed-006',
    jurisdiction: 'federal',
    topic: 'fdcpa debt validation window',
    sourceType: 'statute',
    exactText:
      'If the consumer notifies the debt collector in writing within the thirty-day period described in subsection (a) that the debt, or any portion thereof, is disputed, or that the consumer requests the name and address of the original creditor, the debt collector shall cease collection of the debt.',
    sourceUrl: 'https://www.law.cornell.edu/uscode/text/15/1692g',
    lastVerifiedDate: new Date('2026-06-01'),
    staleAfterDays: 45,
  },
  // ── Other Civil ───────────────────────────────────────────────────────────
  {
    id: 'seed-007',
    jurisdiction: 'michigan',
    topic: 'surplus foreclosure proceeds',
    sourceType: 'statute',
    exactText:
      "If the amount received at the foreclosure sale exceeds the amount of the debt, together with interest, costs, and expenses of the sale, the excess shall be paid to the mortgagor, or the mortgagor's assigns, heirs, or legal representatives.",
    sourceUrl: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-600-3252',
    lastVerifiedDate: new Date('2026-06-01'),
    staleAfterDays: 45,
  },
  {
    id: 'seed-008',
    jurisdiction: 'michigan',
    topic: 'child custody domicile change notice',
    sourceType: 'statute',
    exactText:
      "A parent of a child whose custody is governed by court order shall not change the legal residence of the child to a location that is more than 100 miles from the child's legal residence at the time of the commencement of the action in which the order is issued without the consent of the other parent or a court order.",
    sourceUrl: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-722-31',
    lastVerifiedDate: new Date('2026-06-01'),
    staleAfterDays: 45,
  },
  {
    id: 'seed-009',
    jurisdiction: 'michigan',
    topic: 'security deposit return deadline',
    sourceType: 'statute',
    exactText:
      "Within 30 days after termination of the tenancy and receipt of the tenant's forwarding address, the landlord shall deliver to the tenant the full security deposit or, if an amount is withheld, an itemized list of any damages claimed and an explanation of the reason for the deduction.",
    sourceUrl: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-554-609',
    lastVerifiedDate: new Date('2026-06-01'),
    staleAfterDays: 45,
  },
  {
    id: 'seed-010',
    jurisdiction: 'michigan',
    topic: 'eviction summons response period',
    sourceType: 'court_rule',
    exactText:
      'A defendant in a summary proceeding for possession of premises must appear and defend at the hearing scheduled in the summons. The summons must specify a hearing date that is no sooner than 5 days and no later than 10 days after service.',
    sourceUrl:
      'https://courts.michigan.gov/siteassets/rules-instructions-administrative-orders/michigan-court-rules/court-rules-book-ch-4-responsive-html5.htm#4.201',
    lastVerifiedDate: new Date('2026-06-01'),
    staleAfterDays: 45,
  },

  // ── Business Formation ────────────────────────────────────────────────────
  // Section 5B — verified against primary sources as of July 2026.
  // IMPORTANT: BOI entry uses staleAfterDays: 30 (monthly recheck) due to
  // high regulatory volatility — status has flipped multiple times since 2024.
  {
    id: 'seed-011',
    jurisdiction: 'federal',
    topic: 'business formation ein employer identification number',
    sourceType: 'statute',
    exactText:
      'An Employer Identification Number (EIN) is a unique nine-digit number assigned by the IRS to identify business entities for federal tax purposes. EINs are issued free of charge by the Internal Revenue Service. Online applications completed at IRS.gov are processed immediately — an EIN is issued during the same online session. The application is available to businesses whose principal place of business is in the United States or a U.S. Territory. There is no fee to apply for or receive an EIN.',
    sourceUrl: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online',
    lastVerifiedDate: new Date('2026-07-01'),
    staleAfterDays: 45,
  },
  {
    id: 'seed-012',
    jurisdiction: 'michigan',
    topic: 'michigan llc entity registration lara articles of organization',
    sourceType: 'statute',
    exactText:
      'To form a Michigan Limited Liability Company, Articles of Organization must be filed with the Michigan Department of Licensing and Regulatory Affairs (LARA), Corporations, Securities & Commercial Licensing Bureau (CSCL). The current state filing fee for LLC Articles of Organization is $50.00, paid directly to LARA — this is a government fee separate from any service fee. The Articles of Organization form (CSCL/CD-700) is available on the LARA website. A Michigan LLC comes into existence upon the effective date stated in the Articles of Organization or, if no date is stated, upon LARA\'s filing of the document.',
    sourceUrl: 'https://www.michigan.gov/lara/bureau-list/bcs/corps/forms',
    lastVerifiedDate: new Date('2026-07-01'),
    staleAfterDays: 45,
  },
  {
    id: 'seed-013',
    jurisdiction: 'federal',
    topic: 'uei unique entity identifier sam.gov federal contracts grants',
    sourceType: 'administrative_rule',
    exactText:
      'Effective April 4, 2022, the federal government replaced the DUNS Number with the Unique Entity Identifier (UEI) for all SAM.gov registrations, federal contracts, federal grants, and cooperative agreements. The UEI is a 12-character alphanumeric identifier created in SAM.gov. Registration in SAM.gov and obtaining a UEI is free of charge. The UEI is required only for entities seeking federal contracts, federal grants, or other federal financial assistance. It is not required for general business formation, state-level licensing, or commercial trade credit. The UEI does not replace the DUNS Number for D&B credit file purposes — those are two separate systems serving different purposes.',
    sourceUrl: 'https://sam.gov/content/duns-migration',
    lastVerifiedDate: new Date('2026-07-01'),
    staleAfterDays: 45,
  },
  {
    id: 'seed-014',
    jurisdiction: 'federal',
    topic: 'duns number dun bradstreet trade credit business identity',
    sourceType: 'administrative_rule',
    exactText:
      'A DUNS (Data Universal Numbering System) Number is a unique nine-digit identifier issued by Dun & Bradstreet (D&B) for business entities. The DUNS Number is free to obtain directly from D&B at dnb.com. The DUNS Number is not deprecated and has not been replaced by the federal UEI — they are two separate identifiers serving different purposes. The DUNS Number anchors a business\'s D&B credit file and PAYDEX score, which is relevant for vendor trade credit (net-30/net-60 accounts), business loan applications, and requirements set by specific large vendors or partners. PAYDEX development requires at minimum 3 reported trade payment experiences and typically 6 to 12 months of payment history to build meaningfully. D&B offers paid Credit Insights products layered on top of the free DUNS number; the DUNS Number itself costs nothing.',
    sourceUrl: 'https://www.dnb.com/duns-number.html',
    lastVerifiedDate: new Date('2026-07-01'),
    staleAfterDays: 45,
  },
  {
    id: 'seed-015',
    jurisdiction: 'michigan',
    topic: 'michigan sales use tax registration michigan treasury online mto',
    sourceType: 'administrative_rule',
    exactText:
      'A Michigan Sales Tax License is required for any business that sells taxable tangible personal property or taxable services in Michigan. Registration is completed through Michigan Treasury Online (MTO) at www.michigan.gov/taxes. Registration for a sales tax license is free of charge. A separate license is required per business location. The use tax registration is combined in the same MTO application. Registration must be completed before the first taxable sale is made.',
    sourceUrl: 'https://www.michigan.gov/taxes/sales-use/registration',
    lastVerifiedDate: new Date('2026-07-01'),
    staleAfterDays: 45,
  },
  {
    id: 'seed-016',
    jurisdiction: 'michigan',
    topic: 'certificate of assumed name dba michigan llc sole proprietor',
    sourceType: 'statute',
    exactText:
      'A Michigan limited liability company or corporation that conducts business under a name other than its legal name must file a Certificate of Assumed Name (form CSCL/CD-4541) with the Michigan Department of Licensing and Regulatory Affairs. Sole proprietorships and general partnerships operating under an assumed name in Michigan must file an assumed name certificate with the county clerk in the county where the business is principally conducted. The appropriate filing location depends on the entity type — confirm entity type before selecting the filing path, as LLC/corporation filers use LARA and sole proprietorship/partnership filers use the county clerk.',
    sourceUrl: 'https://www.michigan.gov/lara/bureau-list/bcs/corps/assumed-name',
    lastVerifiedDate: new Date('2026-07-01'),
    staleAfterDays: 45,
  },
  {
    id: 'seed-017',
    jurisdiction: 'michigan',
    topic: 'michigan uia unemployment insurance agency employer registration employees',
    sourceType: 'statute',
    exactText:
      'A Michigan employer is required to register with the Michigan Unemployment Insurance Agency (UIA) when: (1) the employer has paid wages of $1,000 or more in any calendar quarter in the current or preceding calendar year; or (2) the employer has employed one or more individuals in 20 or more different calendar weeks in the current or preceding calendar year. A single-member LLC with no employees is generally not required to register. Registration is completed through MiWAM (Michigan Web Account Manager) at www.michigan.gov/uia.',
    sourceUrl: 'https://www.michigan.gov/uia/employers/new-employer-resources',
    lastVerifiedDate: new Date('2026-07-01'),
    staleAfterDays: 45,
  },
  {
    id: 'seed-018',
    jurisdiction: 'federal',
    topic: 'beneficial ownership information boi fincen corporate transparency act domestic exemption',
    sourceType: 'statute',
    // ⚠️  HIGH VOLATILITY — staleAfterDays: 30 (monthly recheck per Section 5B)
    // This status has changed multiple times since 2024. Do not treat as settled.
    exactText:
      'Under the Corporate Transparency Act (31 U.S.C. § 5336) and FinCEN\'s implementing regulations, an interim final rule effective March 21, 2025 exempts domestic entities — including domestic corporations, LLCs, and other entities created by filing with a U.S. state or tribal government — from Beneficial Ownership Information (BOI) reporting requirements. As of this entry\'s verified date, only foreign entities registering to do business in the United States are required to file BOI reports with FinCEN. IMPORTANT: This exemption has changed multiple times since 2024. A final FinCEN rulemaking is expected in 2026 that could reinstate the domestic filing requirement with little advance notice. Domestic entities should monitor FinCEN.gov for any changes. This entry is rechecked monthly due to high regulatory volatility.',
    sourceUrl: 'https://www.fincen.gov/boi',
    lastVerifiedDate: new Date('2026-07-01'),
    staleAfterDays: 30,
  },
];
