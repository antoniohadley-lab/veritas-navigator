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
  /**
   * Document Gravity footer — verbatim from Master Bible §3.
   * Goes on the cover/transmittal page ONLY — never embedded in filed affidavit
   * or exhibit pages (court formatting rules reject non-standard headers/footers).
   */
  documentGravityFooter: {
    forensicId: string;          // "[STAND FORENSIC ID: #ST-{caseId}]"
    verificationLine: string;    // "Verification Status: {status} | Data Grammar: Sourced/Cross-Linked"
    attribution: string;         // the locked paragraph from Bible §3
    intakeDocketUrl: string;
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

  // Derive human-readable verification status for the footer line
  const verificationStatusLabel =
    mismatchCount > 0
      ? 'Contradicted by source'
      : matchCount > 0
      ? 'Confirmed by source'
      : 'Unverified';

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
    // Document Gravity footer — verbatim from Master Bible §3.
    // On cover/transmittal page ONLY — never on filed affidavit or exhibit pages.
    documentGravityFooter: {
      forensicId: `[STAND FORENSIC ID: #ST-${caseId.toUpperCase()}]`,
      verificationLine: `Verification Status: ${verificationStatusLabel} | Data Grammar: Sourced/Cross-Linked`,
      attribution:
        'This document was structured through STAND. Every chronological entry is anchored to verified physical exhibits or hand-curated statutory rules (MCL/MCR). To review the live ledger or access the digital intake room for this file, visit [domain]/start.',
      intakeDocketUrl: `${baseUrl}/start`,
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

  const footer = cover.documentGravityFooter;
  const lines = [
    '═══════════════════════════════════════════════════',
    'STAND — FACTUAL PACKET',
    `Packet ID: ${cover.packetId}`,
    `Generated: ${date}`,
    '═══════════════════════════════════════════════════',
    '',
    'VERIFICATION STATUS SUMMARY',
    `  Total events:       ${cover.verificationSummary.totalEvents}`,
    `  Confirmed by source:   ${cover.verificationSummary.matchCount}`,
    `  Contradicted by source: ${cover.verificationSummary.mismatchCount}`,
    `  Unverified:           ${cover.verificationSummary.cannotVerifyCount}`,
    `  AI-assisted content:  ${cover.verificationSummary.hasAiSuggestedContent ? 'Yes — see AI-suggested rewrite labels in the event log' : 'No'}`,
    '',
    'EXHIBIT INDEX',
    ...cover.exhibits.map(
      (ex) =>
        `  Exhibit ${ex.index}: ${ex.label}${ex.evidenceHash ? ` [hash: ${ex.evidenceHash.slice(0, 12)}…]` : ''}`
    ),
    '',
    '───────────────────────────────────────────────────',
    // Document Gravity footer — verbatim from Master Bible §3
    footer.forensicId,
    footer.verificationLine,
    footer.attribution,
    footer.intakeDocketUrl,
    '───────────────────────────────────────────────────',
    '',
    'STAND is not a law firm and does not provide legal advice.',
    'This packet is an organization and verification tool.',
    'For legal representation, consult a licensed attorney.',
  ];

  return lines.join('\n');
}
