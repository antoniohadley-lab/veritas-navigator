import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getSurface,
  VERIFICATION_SURFACES,
  type VerificationSurface,
} from '@/lib/verification-surfaces';

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return VERIFICATION_SURFACES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const surface = getSurface(params.slug);
  if (!surface) return { title: 'STAND' };
  return {
    title: `${surface.heading} — STAND`,
    description: surface.subheading,
  };
}

const JURISDICTION_LABEL: Record<VerificationSurface['jurisdiction'], string> = {
  michigan: 'Michigan',
  federal: 'Federal',
};

export default function VerificationSurfacePage({ params }: Props) {
  const surface = getSurface(params.slug);
  if (!surface) notFound();

  const ctaHref = `/start?surface=${params.slug}${surface.opponentType ? `&opponent=${encodeURIComponent(surface.opponentType)}` : ''}`;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0F172A',
        color: '#F1F5F9',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(56,189,248,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <a
          href="/start"
          style={{
            color: '#38BDF8',
            fontWeight: 700,
            fontSize: '1.125rem',
            textDecoration: 'none',
            letterSpacing: '-0.02em',
          }}
        >
          STAND
        </a>
        <span
          style={{
            fontSize: '0.6875rem',
            color: '#475569',
            letterSpacing: '0.04em',
          }}
        >
          by Veritas Systems &amp; Technologies LLC
        </span>
      </header>

      {/* Main */}
      <main
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: 'clamp(2.5rem, 8vw, 5rem) 1.5rem',
        }}
      >
        {/* Eyebrow */}
        <p
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#38BDF8',
            marginBottom: '1rem',
          }}
        >
          Verification Check &mdash; {JURISDICTION_LABEL[surface.jurisdiction]}
        </p>

        {/* Heading */}
        <h1
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
            fontWeight: 700,
            lineHeight: 1.2,
            color: '#F1F5F9',
            marginBottom: '1.125rem',
          }}
        >
          {surface.heading}
        </h1>

        {/* Subheading */}
        <p
          style={{
            fontSize: '1.0625rem',
            color: '#94A3B8',
            lineHeight: 1.65,
            marginBottom: '2.5rem',
          }}
        >
          {surface.subheading}
        </p>

        {/* What STAND does — three-line value statement */}
        <div
          style={{
            backgroundColor: 'rgba(56,189,248,0.06)',
            border: '1px solid rgba(56,189,248,0.14)',
            borderRadius: '0.75rem',
            padding: '1.25rem 1.5rem',
            marginBottom: '2.5rem',
          }}
        >
          <p
            style={{
              fontSize: '0.8125rem',
              color: '#7DD3FC',
              fontWeight: 600,
              marginBottom: '0.625rem',
              letterSpacing: '0.02em',
            }}
          >
            How this works
          </p>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {[
              'Tell us what happened, in your own words.',
              'We check your claim against the verified statute — not a summary, the actual text.',
              'You see the source, the date it was last checked, and whether your claim matches.',
            ].map((line) => (
              <li
                key={line}
                style={{
                  fontSize: '0.875rem',
                  color: '#CBD5E1',
                  display: 'flex',
                  gap: '0.625rem',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ color: '#38BDF8', flexShrink: 0, marginTop: '0.1em' }}>→</span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <a
          href={ctaHref}
          style={{
            display: 'inline-block',
            backgroundColor: '#38BDF8',
            color: '#0F172A',
            fontWeight: 700,
            padding: '0.9375rem 2.25rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontSize: '0.9375rem',
            letterSpacing: '-0.01em',
          }}
        >
          Let&apos;s check this →
        </a>

        <p
          style={{
            marginTop: '1rem',
            fontSize: '0.75rem',
            color: '#334155',
          }}
        >
          Free. No account required before you see the result.
        </p>

        {/* Disclaimer */}
        <div
          style={{
            marginTop: '4rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              color: '#334155',
              lineHeight: 1.6,
            }}
          >
            STAND is not a law firm and does not provide legal advice. This is a verification and
            document-organization tool. For legal representation, consult a licensed Michigan
            attorney or contact{' '}
            <a
              href="https://michiganlegalhelp.org"
              style={{ color: '#334155', textDecoration: 'underline' }}
              target="_blank"
              rel="noopener noreferrer"
            >
              Michigan Legal Help
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
