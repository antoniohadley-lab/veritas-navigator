/**
 * VROS QR Verification Landing Page — /verify/[id]
 *
 * Accessed when someone scans a QR code placed on a lawful notice,
 * a delivered document, or a field assignment report.
 *
 * Three types of QR usage in VROS (Master Bible §9):
 *
 *   1. Internal Assignment QR — operator scans to check in, upload photos,
 *      complete notes. Not this page.
 *
 *   2. Client Verification QR — on final report. Shows assignment status,
 *      completion date, archive status. Does not expose private documents.
 *      This is this page when `type=client`.
 *
 *   3. Recipient Interaction QR — placed on a lawful notice. Logs time, IP,
 *      device/browser metadata, and link activity when scanned.
 *      This is this page when `type=recipient` (or default).
 *
 * CRITICAL scope correction from Bible §9:
 *   Scanning does NOT automatically prove who scanned it. The correct claim is:
 *   "A unique delivery link was accessed at this date and time from this
 *   technical connection." — NOT "we caught them."
 *
 * The mandatory disclaimer below is verbatim from Master Bible §9.
 */

import type { Metadata } from 'next';
import { parseAssignmentId } from '@/lib/vros/assignment-id';

interface Props {
  params: { id: string };
  searchParams: { type?: string };
}

export function generateMetadata({ params }: Props): Metadata {
  return {
    title: `Verification Record — ${params.id}`,
    description:
      'Field assignment verification record. Access to this page may be logged for security, fraud prevention, delivery verification, and recordkeeping.',
    robots: { index: false, follow: false },
  };
}

const NAVY = '#0F172A';
const STEEL = '#38BDF8';
const MUTED = '#94A3B8';
const DIM = '#475569';

export default function VerifyPage({ params, searchParams }: Props) {
  const parsed = parseAssignmentId(params.id);
  const isValidFormat = parsed !== null;
  const isClientView = searchParams.type === 'client';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: NAVY,
        color: '#F1F5F9',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Minimal header — no nav, intentionally stripped */}
      <header
        style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(56,189,248,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <span style={{ color: STEEL, fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>
          STAND
        </span>
        <span style={{ color: DIM, fontSize: '0.75rem' }}>
          by Veritas Systems &amp; Technologies LLC — Field Verification
        </span>
      </header>

      <main
        style={{
          flex: 1,
          maxWidth: '560px',
          margin: '0 auto',
          padding: 'clamp(2.5rem, 8vw, 4rem) 1.5rem',
          width: '100%',
        }}
      >
        {/* Assignment ID */}
        <p
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: STEEL,
            marginBottom: '0.75rem',
          }}
        >
          {isClientView ? 'Assignment Verification Record' : 'Document Delivery Record'}
        </p>

        <h1
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(1.375rem, 4vw, 1.875rem)',
            fontWeight: 700,
            lineHeight: 1.25,
            color: '#F1F5F9',
            marginBottom: '0.5rem',
          }}
        >
          {isValidFormat ? params.id : 'Invalid Record ID'}
        </h1>

        {!isValidFormat ? (
          <p style={{ fontSize: '0.9375rem', color: MUTED, lineHeight: 1.65 }}>
            This link does not match a valid VROS assignment ID format. If you received this
            link in error or believe it may have been tampered with, do not share it further.
          </p>
        ) : isClientView ? (
          /* Client verification view — shows assignment metadata, not private documents */
          <div>
            <p style={{ fontSize: '0.9375rem', color: MUTED, lineHeight: 1.65, marginBottom: '1.5rem' }}>
              This record confirms that a VROS field assignment with this ID exists and has been
              archived. To access the full report, log in to your STAND account or contact the
              Veritas Field Services team directly.
            </p>
            <div
              style={{
                backgroundColor: '#1E293B',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '0.75rem',
                padding: '1.25rem 1.5rem',
              }}
            >
              <p style={{ fontSize: '0.8125rem', color: MUTED, margin: 0 }}>
                Assignment ID: <strong style={{ color: '#E2E8F0' }}>{params.id}</strong>
                <br />
                Year: <strong style={{ color: '#E2E8F0' }}>{parsed?.year}</strong>
                <br />
                Sequence: <strong style={{ color: '#E2E8F0' }}>#{parsed?.sequence.toLocaleString()}</strong>
              </p>
            </div>
          </div>
        ) : (
          /* Recipient interaction view — document delivery verification */
          <p style={{ fontSize: '0.9375rem', color: MUTED, lineHeight: 1.65 }}>
            You are viewing a document delivery verification record for the assignment referenced
            above. This page is associated with a lawful document delivery or field verification
            assignment completed by Veritas Field Services LLC.
          </p>
        )}

        {/* Mandatory disclaimer — verbatim from Master Bible §9 */}
        <div
          style={{
            marginTop: '2.5rem',
            padding: '1.25rem 1.5rem',
            backgroundColor: 'rgba(56,189,248,0.05)',
            border: '1px solid rgba(56,189,248,0.12)',
            borderRadius: '0.75rem',
          }}
        >
          <p
            style={{
              fontSize: '0.8125rem',
              color: '#94A3B8',
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            Access to this page may be logged for security, fraud prevention, delivery
            verification, and recordkeeping. This page does not provide legal advice. If you
            received legal documents, read them carefully and contact the court or an attorney.
          </p>
        </div>

        {/* Scope correction — internal discipline, surfaced plainly */}
        {!isClientView && (
          <p
            style={{
              marginTop: '1.25rem',
              fontSize: '0.75rem',
              color: DIM,
              lineHeight: 1.6,
            }}
          >
            Access to this page is logged by date, time, and technical connection information.
            Access does not automatically identify the person who scanned this code.
          </p>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.6875rem', color: DIM, margin: 0 }}>
          Veritas Field Services LLC — Veritas Systems &amp; Technologies LLC &mdash;{' '}
          <a href="/about" style={{ color: DIM, textDecoration: 'underline' }}>
            About STAND
          </a>
        </p>
      </footer>
    </div>
  );
}
