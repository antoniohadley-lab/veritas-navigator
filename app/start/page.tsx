'use client';

/**
 * /start — STAND onboarding entry point (Section 4)
 *
 * StandOnboarding renders the four-screen intake flow:
 *   Screen 1  What happened? → POST /api/extract-timeline (Haiku)
 *   Screen 2  Who did this to you? (opponent selection)
 *   Screen 3  What did they tell you? → POST /api/verify (Rule Store)
 *   Screen 4  Verification result (evidence-grammar badges)
 *   Step 5    Account gate (email capture — AFTER Verification Check, never before)
 */

import StandOnboarding from './components/StandOnboarding';

export default function StartPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a1628',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <StandHeader />
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '48px 16px',
        }}
      >
        <StandOnboarding />
      </main>
      <StandFooter />
    </div>
  );
}

function StandHeader() {
  return (
    <header
      style={{
        background: '#0d2040',
        borderBottom: '1px solid #1e3a5f',
        padding: '14px 24px',
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <span
            style={{ fontSize: 18, fontWeight: 700, color: '#f0f4ff', letterSpacing: '-0.01em' }}
          >
            STAND
          </span>
          <span
            style={{ fontSize: 11, color: '#8ba3c7', marginLeft: 10 }}
          >
            by Veritas Systems &amp; Technologies LLC
          </span>
        </div>
        <nav style={{ display: 'flex', gap: 20 }}>
          <a
            href="/pricing"
            style={{ fontSize: 13, color: '#8ba3c7', textDecoration: 'none' }}
          >
            Pricing
          </a>
          <a
            href="/navigator"
            style={{ fontSize: 13, color: '#8ba3c7', textDecoration: 'none' }}
          >
            Triage chat
          </a>
        </nav>
      </div>
    </header>
  );
}

function StandFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid #1e3a5f',
        background: '#0d2040',
        padding: '14px 24px',
      }}
    >
      <p
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: '#8ba3c7',
          margin: 0,
        }}
      >
        STAND is not a law firm and does not provide legal advice. This is an organization and
        verification tool.{' '}
        <a href="/pricing" style={{ color: '#14b8a6', textDecoration: 'none' }}>
          See plans
        </a>
      </p>
    </footer>
  );
}
