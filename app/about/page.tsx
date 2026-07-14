import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How STAND Works — Veritas Systems & Technologies',
  description:
    'STAND verifies your claims against the actual statute — not a summary, not a guess. Every output shows what was checked, where it came from, and when it was last verified.',
};

const NAVY = '#0F172A';
const NAVY_SURFACE = '#1E293B';
const STEEL = '#38BDF8';
const MUTED = '#94A3B8';
const DIM = '#475569';

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: NAVY, color: '#F1F5F9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{ padding: '1rem 1.5rem', borderBottom: `1px solid rgba(56,189,248,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <a href="/start" style={{ color: STEEL, fontWeight: 700, fontSize: '1.125rem', textDecoration: 'none', letterSpacing: '-0.02em' }}>
            STAND
          </a>
          <span style={{ marginLeft: '0.75rem', fontSize: '0.6875rem', color: DIM, letterSpacing: '0.02em' }}>
            by Veritas Systems &amp; Technologies LLC
          </span>
        </div>
        <nav style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="/pricing" style={{ fontSize: '0.875rem', color: MUTED, textDecoration: 'none' }}>Pricing</a>
          <a href="/start" style={{ fontSize: '0.875rem', color: STEEL, textDecoration: 'none', fontWeight: 600 }}>Get started</a>
        </nav>
      </header>

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: 'clamp(3rem, 8vw, 5rem) 1.5rem' }}>

        {/* The locked promise — load-bearing, verbatim */}
        <div style={{
          backgroundColor: NAVY_SURFACE,
          border: `1.5px solid ${STEEL}`,
          borderRadius: '0.875rem',
          padding: '2rem',
          marginBottom: '3.5rem',
        }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: STEEL, marginBottom: '0.875rem' }}>
            The STAND promise
          </p>
          <p style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'clamp(1.25rem, 3.5vw, 1.625rem)', fontWeight: 700, lineHeight: 1.3, color: '#F1F5F9', margin: 0 }}>
            &ldquo;If STAND says it verified something, I know exactly what it verified, where it came from, and when that source was last checked.&rdquo;
          </p>
        </div>

        {/* Thesis */}
        <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: STEEL, marginBottom: '0.75rem' }}>
          What STAND is
        </p>
        <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 700, lineHeight: 1.2, color: '#F1F5F9', marginBottom: '1.25rem' }}>
          They&rsquo;re not smarter than you.<br />They&rsquo;re just organized.
        </h1>
        <p style={{ fontSize: '1.0625rem', color: MUTED, lineHeight: 1.7, marginBottom: '3rem' }}>
          STAND is a verification and document-organization tool for people navigating disputes,
          government processes, and business formation steps — without a lawyer in the room.
          It does not give legal advice. It does not predict outcomes. It checks your claims
          against the actual statute text, shows you the source, and organizes what you know
          into a structured record you control.
        </p>

        {/* Founder origin — "not as marketing, as fact" (Master Bible §1) */}
        <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: STEEL, marginBottom: '1.25rem' }}>
          Why this exists
        </p>
        <div style={{ backgroundColor: NAVY_SURFACE, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.75rem', padding: '1.75rem', marginBottom: '3rem' }}>
          <p style={{ fontSize: '1.0625rem', color: '#E2E8F0', lineHeight: 1.75, margin: 0 }}>
            The founder of this company was served with foreclosure papers he claims he never
            received — and had no way to prove it. Then it happened again in a separate matter.
            Twice, the legal system moved against him through a process he could not verify or
            disprove. He didn&rsquo;t build a verification company because he thought it was a good
            business. He built it because he learned firsthand what it costs when proof doesn&rsquo;t
            exist.
          </p>
          <p style={{ fontSize: '1.0625rem', color: '#E2E8F0', lineHeight: 1.75, marginTop: '1.25rem', marginBottom: 0 }}>
            Every person STAND and VROS serves has that same vulnerability. That&rsquo;s not a
            backstory — it&rsquo;s the thesis.
          </p>
        </div>

        {/* How it works — six steps */}
        <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: STEEL, marginBottom: '1.25rem' }}>
          How a Verification Check works
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '3rem' }}>
          {[
            {
              label: 'You tell us what happened',
              body: 'In your own words. No forms, no checkboxes. A landlord sent a notice, a debt collector called, a FOIA request was ignored. Whatever it is.',
            },
            {
              label: 'We extract a structured timeline',
              body: 'Dates, parties, documents, deadlines — pulled from what you wrote, labeled SYSTEM-DERIVED so you always know what came from you vs. what the system inferred.',
            },
            {
              label: 'You tell us what they claimed',
              body: 'The specific fact you want checked: "they said I had 7 days," "they said the deposit was already spent," "they said I had to pay $300 to get an EIN." One factual claim at a time.',
            },
            {
              label: 'We check it against the verified rule',
              body: 'Not a summary. Not what a model remembered. The actual text of the Michigan statute, the federal code, or the court rule — pulled from a table of verified entries, each with a source URL and a date it was last checked.',
            },
            {
              label: 'You see the result with full provenance',
              body: 'Match, mismatch, or cannot verify — never a guess. The exact rule text. The citation. The date it was last verified. If the entry is stale, we say cannot verify rather than serve you outdated text.',
            },
            {
              label: 'Then we ask if you want an account',
              body: 'Not before. Your claim is checked, you\'ve seen the result. Only then do we offer to save it. Value before commitment — always in that order.',
            },
          ].map((step, i) => (
            <div key={step.label} style={{ display: 'flex', gap: '1.25rem', paddingBottom: '1.75rem', borderBottom: i < 5 ? `1px solid rgba(255,255,255,0.06)` : 'none', marginBottom: i < 5 ? '1.75rem' : 0 }}>
              <div style={{ flexShrink: 0, width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: 'rgba(56,189,248,0.1)', border: `1px solid rgba(56,189,248,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: STEEL, marginTop: '0.125rem' }}>
                {i + 1}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#E2E8F0', marginBottom: '0.375rem' }}>{step.label}</p>
                <p style={{ fontSize: '0.875rem', color: MUTED, lineHeight: 1.65, margin: 0 }}>{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Evidence grammar */}
        <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: STEEL, marginBottom: '1.25rem' }}>
          Every output is labeled by source
        </p>
        <div style={{ backgroundColor: NAVY_SURFACE, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.875rem', color: MUTED, lineHeight: 1.65, marginBottom: '1.25rem' }}>
            Nothing in STAND mixes sources without labeling them. Every piece of information carries a tag:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {[
              { tag: 'USER ENTERED', color: '#6366F1', desc: 'Exactly what you typed. No inference, no rewording.' },
              { tag: 'SYSTEM-DERIVED FROM SOURCE', color: STEEL, desc: 'Extracted by the system from a verified statutory source.' },
              { tag: 'AI-SUGGESTED REWRITE', color: '#F59E0B', desc: 'A model suggestion. Review it yourself before using it. Never treated as verified.' },
            ].map(({ tag, color, desc }) => (
              <div key={tag} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', backgroundColor: `${color}22`, color, border: `1px solid ${color}44`, marginTop: '0.1rem', whiteSpace: 'nowrap' }}>
                  {tag}
                </span>
                <p style={{ fontSize: '0.875rem', color: MUTED, margin: 0, lineHeight: 1.55 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rule Store */}
        <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: STEEL, marginBottom: '1.25rem' }}>
          A bounded, verified rule store — not the open web
        </p>
        <p style={{ fontSize: '1rem', color: MUTED, lineHeight: 1.7, marginBottom: '1rem' }}>
          STAND checks claims against a curated table of statutory text — each entry sourced
          directly from the Michigan Legislature, federal code, or Michigan Court Rules, with
          the exact text, source URL, and a date it was last verified. No AI generates day-counts
          or deadline numbers at runtime. If the entry is older than its staleness threshold,
          the result is <strong style={{ color: '#94A3B8' }}>cannot verify</strong> — not a guess.
        </p>
        <p style={{ fontSize: '1rem', color: MUTED, lineHeight: 1.7, marginBottom: '3rem' }}>
          A new case type only ships when every rule source it depends on is verified. Not most
          of them — all of them. One unverified entry blocks the entire vertical. This is the
          discipline that makes the promise above cost something to make.
        </p>

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <a
            href="/start"
            style={{ display: 'inline-block', backgroundColor: STEEL, color: NAVY, fontWeight: 700, padding: '0.9375rem 2.5rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.9375rem', letterSpacing: '-0.01em' }}
          >
            Start your Verification Check →
          </a>
          <p style={{ marginTop: '0.875rem', fontSize: '0.75rem', color: DIM }}>
            Free. No account required before you see the result.
          </p>
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: '4rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: '0.75rem', color: DIM, lineHeight: 1.65, textAlign: 'center' }}>
            STAND is not a law firm and does not provide legal advice. This is a verification and
            document-organization tool. For legal representation, consult a licensed Michigan attorney
            or contact{' '}
            <a href="https://michiganlegalhelp.org" style={{ color: DIM, textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">
              Michigan Legal Help
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
