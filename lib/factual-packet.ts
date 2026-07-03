/**
 * STAND Factual Packet — export service
 *
 * Builds the structured data for a Factual Packet PDF export.
 * The packet consists of two layers:
 *
 *   1. Cover / transmittal page (this file's primary output)
 *      — Contains: Packet ID, verification status summary, exhibit index,
 *        timestamp, and the Intake Docket referral.
 *      — NEVER embedded in filed pleadings or affidavit pages.
 *        Court formatting rules reject non-standard headers, footers,
 *        and QR codes on documents intended for filing.
 *
 *   2. Case event pages (appended after the cover)
 *      — All VerificationEvent rows for the Case, ordered by timestamp.
 *      — Charged at $75 flat, regardless of page count.
 *
 * ⚠️  COUNSEL REVIEW REQUIRED before shipping to users:
 *      Company branding on a party's court filing is adjacent to
 *      solicitation concerns in Michigan. Bundle this review with the
 *      audit-trail discoverability question flagged in Section 0.
 *
 * PDF rendering:
 *      This service produces structured data ready for a PDF library.
 *      Install `@react-pdf/renderer` or `pdfkit` (not yet in package.json)
 *      and wire the renderer in `app/api/factual-packet/route.ts`.
 */

export interface PacketEvent {
  id: string;
  timestamp: string;
  eventType: string;
  origin: string;
  verificationStatus?: string;
  notes?: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

export interface ExhibitEntry {
  index: number;
  label: string;
  eventId: string;
  evidenceUri?: string;
  evidenceHash?: string;
}

export interface PacketCoverPage {
  /** Unique identifier for this packet — display on every page */
  packetId: string;
  /** The linked Case id */
  caseId: string;
  /** ISO timestamp of export generation */
  generatedAt: string;
  /** Overall verification status summary */
  verificationSummary: {
    totalEvents: number;
    matchCount: number;
    mismatchCount: number;
    cannotVerifyCount: number;
    hasAiSuggestedContent: boolean;
  };
  /** Ordered exhibit index */
  exhibits: ExhibitEntry[];
  /** Attribution line — goes on the cover, never on filed pages */
  attribution: string;
  /** Professional review room offer — for institutional recipients */
  intakeDocketReferral: {
    text: string;
    url: string;
  };
}

export interface FactualPacket {
  coverPage: PacketCoverPage;
  events: PacketEvent[];
}

/**
 * Generate a Factual Packet data structure from a list of events.
 *
 * In production: pass events queried from the database for `caseId`.
 * The PDF renderer then takes this output and renders the two-layer PDF.
 */
export function buildFactualPacket(
  caseId: string,
  events: PacketEvent[],
  exhibits: ExhibitEntry[],
  baseUrl: string
): FactualPacket {
  const packetId = `PKT-${caseId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const generatedAt = new Date().toISOString();

  const matchCount = events.filter((e) => e.verificationStatus === 'match').length;
  const mismatchCount = events.filter((e) => e.verificationStatus === 'mismatch').length;
  const cannotVerifyCount = events.filter((e) => e.verificationStatus === 'cannot_verify').length;
  const hasAiSuggestedContent = events.some((e) => e.origin === 'ai_suggested_rewrite');

  const coverPage: PacketCoverPage = {
    packetId,
    caseId,
    generatedAt,
    verificationSummary: {
      totalEvents: events.length,
      matchCount,
      mismatchCount,
      cannotVerifyCount,
      hasAiSuggestedContent,
    },
    exhibits,
    // Attribution line — on cover page only, never embedded in filed documents
    attribution:
      'Prepared through STAND. Timeline, exhibits, and verification history available in structured review format.',
    intakeDocketReferral: {
      // For institutional recipients (attorneys, clerks, nonprofit intake staff) —
      // not a pitch to opposing parties. Target: whoever processes many messy packets
      // and might want a cleaner intake format.
      text: 'Professional review room available — Intake Docket provides structured digital access to this packet for attorneys, court staff, and nonprofit intake organizations.',
      url: `${baseUrl}/intake`,
    },
  };

  return { coverPage, events };
}

/**
 * Format a cover page as plain text (for preview / non-PDF environments).
 * Replace this with a proper PDF renderer once a library is chosen.
 */
export function renderCoverPageText(cover: PacketCoverPage): string {
  const date = new Date(cover.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines = [
    '═══════════════════════════════════════════════════',
    'STAND — FACTUAL PACKET',
    `Packet ID: ${cover.packetId}`,
    `Generated: ${date}`,
    '═══════════════════════════════════════════════════',
    '',
    'VERIFICATION STATUS SUMMARY',
    `  Total events:       ${cover.verificationSummary.totalEvents}`,
    `  Confirmed match:    ${cover.verificationSummary.matchCount}`,
    `  Mismatch:           ${cover.verificationSummary.mismatchCount}`,
    `  Cannot verify:      ${cover.verificationSummary.cannotVerifyCount}`,
    `  AI-assisted:        ${cover.verificationSummary.hasAiSuggestedContent ? 'Yes — see AI-suggested rewrite labels in the event log' : 'No'}`,
    '',
    'EXHIBIT INDEX',
    ...cover.exhibits.map(
      (ex) =>
        `  Exhibit ${ex.index}: ${ex.label}${ex.evidenceHash ? ` [hash: ${ex.evidenceHash.slice(0, 12)}…]` : ''}`
    ),
    '',
    '───────────────────────────────────────────────────',
    cover.attribution,
    '',
    cover.intakeDocketReferral.text,
    cover.intakeDocketReferral.url,
    '───────────────────────────────────────────────────',
    '',
    'STAND is not a law firm and does not provide legal advice.',
    'This packet is an organization and verification tool.',
    'For legal representation, consult a licensed attorney.',
  ];

  return lines.join('\n');
}
