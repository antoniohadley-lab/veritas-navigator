'use client';

/**
 * StandOnboarding — 4-screen intake flow for STAND (Section 4 of STAND Build Brief)
 *
 * Screen 1 — Story: user describes what happened → POST /api/extract-timeline (Haiku)
 * Screen 2 — Opponent: select who did this
 * Screen 3 — Claim: enter what they told you → POST /api/verify
 * Screen 4 — Result: evidence-grammar display (origin + verificationStatus)
 * Step 5   — AccountGate: email capture (AFTER Verification Check — never before)
 *
 * Design: dark navy palette, inline styles (not Tailwind per brief)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;

interface TimelineEvent {
  id: string;
  text: string;
  date: string | null;
}

// Matches the JSON shape returned by /api/verify (dates are strings from JSON)
interface VerifyApiResult {
  status: 'match' | 'mismatch' | 'cannot_verify';
  matchedRule: {
    id: string;
    jurisdiction: string;
    topic: string;
    sourceType: string;
    exactText: string;
    sourceUrl: string;
    lastVerifiedDate: string;
    staleAfterDays: number;
  } | null;
  cannotVerifyReason?: 'no_matching_rule' | 'stale_source';
  checkedAt: string;
}

type OpponentType =
  | 'Landlord / property manager'
  | 'City or county'
  | 'Debt collector / creditor'
  | 'Employer'
  | 'Police / criminal court'
  | 'Other';

const OPPONENT_OPTIONS: OpponentType[] = [
  'Landlord / property manager',
  'City or county',
  'Debt collector / creditor',
  'Employer',
  'Police / criminal court',
  'Other',
];

// ── Color tokens ──────────────────────────────────────────────────────────────

const C = {
  bg: '#0a1628',
  card: '#132040',
  border: '#1e3a5f',
  fg: '#f0f4ff',
  fgMuted: '#8ba3c7',
  teal: '#14b8a6',
  tealDark: '#0f766e',
  green: '#22c55e',
  greenBg: '#052e16',
  red: '#f87171',
  redBg: '#450a0a',
  amber: '#fbbf24',
  amberBg: '#451a03',
} as const;

// ── Shared style helpers ──────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: C.card,
  borderRadius: 16,
  padding: 32,
  border: `1px solid ${C.border}`,
  width: '100%',
  boxSizing: 'border-box',
};

const backBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: C.fgMuted,
  fontSize: 13,
  cursor: 'pointer',
  marginBottom: 20,
  padding: 0,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: '12px 14px',
  color: C.fg,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

function primaryBtn(enabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    background: enabled ? C.teal : C.border,
    color: enabled ? '#fff' : C.fgMuted,
    border: 'none',
    borderRadius: 10,
    padding: '13px 0',
    fontSize: 15,
    fontWeight: 600,
    cursor: enabled ? 'pointer' : 'not-allowed',
    transition: 'background 0.15s',
  };
}

const disclosureStyle: React.CSSProperties = {
  fontSize: 11,
  color: C.fgMuted,
  textAlign: 'center',
  marginTop: 12,
};

// ── Main orchestrator ─────────────────────────────────────────────────────────

export default function StandOnboarding() {
  const [step, setStep] = useState<Step>(1);
  const [story, setStory] = useState('');
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [opponentType, setOpponentType] = useState<OpponentType | ''>('');
  const [verifyResult, setVerifyResult] = useState<VerifyApiResult | null>(null);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  return (
    <div style={{ width: '100%', maxWidth: 620, margin: '0 auto' }}>
      {step === 1 && (
        <Screen1
          story={story}
          timeline={timeline}
          onStoryChange={setStory}
          onTimelineExtracted={setTimeline}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <Screen2
          selected={opponentType}
          onSelect={(type) => {
            setOpponentType(type);
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <Screen3
          opponentType={opponentType as OpponentType}
          onResult={(result) => {
            setVerifyResult(result);
            setStep(4);
          }}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && verifyResult && (
        <Screen4
          result={verifyResult}
          onCreateAccount={() => setStep(5)}
          onBack={() => setStep(3)}
        />
      )}
      {step === 5 && (
        <AccountGate
          email={email}
          submitted={emailSubmitted}
          onEmailChange={setEmail}
          onSubmit={() => setEmailSubmitted(true)}
        />
      )}
    </div>
  );
}

// ── Screen 1 — Story ──────────────────────────────────────────────────────────

function Screen1({
  story,
  timeline,
  onStoryChange,
  onTimelineExtracted,
  onNext,
}: {
  story: string;
  timeline: TimelineEvent[];
  onStoryChange: (s: string) => void;
  onTimelineExtracted: (events: TimelineEvent[]) => void;
  onNext: () => void;
}) {
  const [extracting, setExtracting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const extractTimeline = useCallback(
    async (text: string) => {
      if (text.trim().length < 20) return;
      setExtracting(true);
      try {
        const res = await fetch('/api/extract-timeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ story: text }),
        });
        if (res.ok) {
          const data = (await res.json()) as { events: TimelineEvent[] };
          onTimelineExtracted(data.events);
        }
      } catch {
        // extraction is best-effort — silent failure
      } finally {
        setExtracting(false);
      }
    },
    [onTimelineExtracted]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      extractTimeline(story);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [story, extractTimeline]);

  const canContinue = story.trim().length >= 20;

  return (
    <div style={cardStyle}>
      {/* Hero — exact copy from STAND Build Brief */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: C.fg, lineHeight: 1.3, margin: 0 }}>
          You hit the right page. No question about it.
        </p>
        <p style={{ fontSize: 22, fontWeight: 700, color: C.teal, lineHeight: 1.3, margin: '4px 0 0' }}>
          Welcome to the Floor. Let&apos;s get busy.
        </p>
        <p style={{ fontSize: 13, color: C.fgMuted, fontStyle: 'italic', marginTop: 10, marginBottom: 0 }}>
          They&apos;re not smarter than you. They&apos;re just organized.
        </p>
      </div>

      {/* Story input */}
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="stand-story"
          style={{ display: 'block', fontSize: 14, fontWeight: 600, color: C.fg, marginBottom: 8 }}
        >
          What happened?
        </label>
        <textarea
          id="stand-story"
          value={story}
          onChange={(e) => onStoryChange(e.target.value)}
          placeholder="Tell us what happened — dates, who was involved, what documents you received…"
          rows={5}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        {extracting && (
          <p style={{ fontSize: 12, color: C.fgMuted, marginTop: 6, marginBottom: 0 }}>
            Extracting timeline…
          </p>
        )}
      </div>

      {/* Extracted timeline preview */}
      {timeline.length > 0 && (
        <div
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span
              style={{
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                padding: '2px 7px',
                fontSize: 10,
                fontWeight: 700,
                color: C.fgMuted,
                letterSpacing: '0.06em',
              }}
            >
              SYSTEM-DERIVED
            </span>
            <span style={{ fontSize: 12, color: C.fgMuted }}>
              Extracted from your description — not AI-generated advice
            </span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {timeline.map((ev) => (
              <li
                key={ev.id}
                style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}
              >
                <span
                  style={{ color: C.teal, fontWeight: 700, fontSize: 12, flexShrink: 0, marginTop: 2 }}
                >
                  ›
                </span>
                <div>
                  <span style={{ fontSize: 13, color: C.fg }}>{ev.text}</span>
                  {ev.date && (
                    <span style={{ fontSize: 11, color: C.fgMuted, marginLeft: 8 }}>
                      {ev.date}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={onNext} disabled={!canContinue} style={primaryBtn(canContinue)}>
        Continue →
      </button>

      <p style={disclosureStyle}>
        STAND is not a law firm and does not provide legal advice.
      </p>
    </div>
  );
}

// ── Screen 2 — Opponent ───────────────────────────────────────────────────────

function Screen2({
  selected,
  onSelect,
  onBack,
}: {
  selected: OpponentType | '';
  onSelect: (type: OpponentType) => void;
  onBack: () => void;
}) {
  return (
    <div style={cardStyle}>
      <button onClick={onBack} style={backBtnStyle}>
        ← Back
      </button>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.fg, marginBottom: 6, marginTop: 0 }}>
        Who did this to you?
      </h2>
      <p style={{ fontSize: 14, color: C.fgMuted, marginBottom: 24, marginTop: 0 }}>
        Select the type of person or organization you&apos;re dealing with.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {OPPONENT_OPTIONS.map((opt) => {
          const isSelected = selected === opt;
          return (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              style={{
                background: isSelected ? C.teal : C.bg,
                border: `1px solid ${isSelected ? C.teal : C.border}`,
                borderRadius: 10,
                padding: '14px 18px',
                color: C.fg,
                fontSize: 14,
                fontWeight: isSelected ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Screen 3 — Claim / Verification Check ────────────────────────────────────

function Screen3({
  opponentType,
  onResult,
  onBack,
}: {
  opponentType: OpponentType;
  onResult: (result: VerifyApiResult) => void;
  onBack: () => void;
}) {
  const [claim, setClaim] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adviceRedirect, setAdviceRedirect] = useState('');

  async function handleRun() {
    const trimmed = claim.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError('');
    setAdviceRedirect('');

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim: trimmed,
          opponentType,
          jurisdiction: 'michigan',
        }),
      });

      if (res.status === 400) {
        const body = (await res.json()) as { error: string; type?: string };
        if (body.type === 'advice_request') {
          setAdviceRedirect(body.error);
        } else {
          setError(body.error ?? 'Invalid request.');
        }
        return;
      }

      if (!res.ok) {
        setError('Verification check failed. Please try again.');
        return;
      }

      const result = (await res.json()) as VerifyApiResult;
      onResult(result);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const canRun = claim.trim().length > 0 && !loading;

  return (
    <div style={cardStyle}>
      <button onClick={onBack} style={backBtnStyle}>
        ← Back
      </button>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.fg, marginBottom: 6, marginTop: 0 }}>
        What did they tell you?
      </h2>
      <p style={{ fontSize: 14, color: C.fgMuted, marginBottom: 20, marginTop: 0, lineHeight: 1.5 }}>
        Enter the specific factual claim you want to check — a deadline, a right they cited,
        something printed on the notice. STAND will compare it against the official verified source.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="stand-claim"
          style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.fg, marginBottom: 8 }}
        >
          The claim to verify
        </label>
        <textarea
          id="stand-claim"
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && canRun) {
              e.preventDefault();
              handleRun();
            }
          }}
          placeholder='e.g. "My landlord gave me 3 days to pay rent or leave"'
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {adviceRedirect && (
        <div
          style={{
            background: C.amberBg,
            border: `1px solid ${C.amber}`,
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, color: C.amber, margin: 0, lineHeight: 1.5 }}>
            <strong>STAND cannot answer that.</strong> {adviceRedirect}
          </p>
        </div>
      )}

      {error && (
        <div
          style={{
            background: C.redBg,
            border: `1px solid ${C.red}`,
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, color: C.red, margin: 0 }}>{error}</p>
        </div>
      )}

      <button onClick={handleRun} disabled={!canRun} style={primaryBtn(canRun)}>
        {loading ? 'Checking…' : 'Run Verification Check →'}
      </button>

      <p style={disclosureStyle}>
        Claims are compared against verified official sources — not AI opinions or guesses.
      </p>
    </div>
  );
}

// ── Screen 4 — Result (evidence-grammar display) ──────────────────────────────

const STATUS_CONFIG = {
  match: {
    label: 'MATCH',
    color: '#22c55e',
    bg: '#052e16',
    desc: 'The claim is consistent with the verified statute.',
  },
  mismatch: {
    label: 'MISMATCH',
    color: '#f87171',
    bg: '#450a0a',
    desc: 'The claim does not match the verified statute.',
  },
  cannot_verify: {
    label: 'CANNOT VERIFY',
    color: '#fbbf24',
    bg: '#451a03',
    desc: null, // filled dynamically based on cannotVerifyReason
  },
} as const;

function Screen4({
  result,
  onCreateAccount,
  onBack,
}: {
  result: VerifyApiResult;
  onCreateAccount: () => void;
  onBack: () => void;
}) {
  const cfg = STATUS_CONFIG[result.status];
  const cannotVerifyDesc =
    result.cannotVerifyReason === 'stale_source'
      ? 'The source data is overdue for re-verification. Verify the deadline directly with the official source.'
      : 'No matching verified rule was found for this claim and jurisdiction. This does not mean the claim is wrong — only that STAND cannot confirm or deny it from its current rule set.';

  const statusDesc = result.status === 'cannot_verify' ? cannotVerifyDesc : cfg.desc;

  return (
    <div style={cardStyle}>
      <button onClick={onBack} style={backBtnStyle}>
        ← Back
      </button>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.fg, marginBottom: 20, marginTop: 0 }}>
        Verification Result
      </h2>

      {/* Status verdict */}
      <div
        style={{
          background: cfg.bg,
          border: `1px solid ${cfg.color}`,
          borderRadius: 10,
          padding: '16px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <span
          style={{
            background: cfg.color,
            color: '#fff',
            borderRadius: 6,
            padding: '3px 9px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {cfg.label}
        </span>
        <p style={{ fontSize: 14, color: cfg.color, margin: 0, lineHeight: 1.5 }}>
          {statusDesc}
        </p>
      </div>

      {/* Matched rule with evidence-grammar tags */}
      {result.matchedRule && (
        <div style={{ marginBottom: 20 }}>
          {/* Evidence-grammar origin + verificationStatus tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                padding: '2px 7px',
                fontSize: 10,
                fontWeight: 700,
                color: C.fgMuted,
                letterSpacing: '0.06em',
              }}
            >
              SYSTEM-DERIVED FROM SOURCE
            </span>
            <span
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.color}`,
                borderRadius: 4,
                padding: '2px 7px',
                fontSize: 10,
                fontWeight: 700,
                color: cfg.color,
                letterSpacing: '0.06em',
              }}
            >
              {result.status.toUpperCase().replace('_', ' ')}
            </span>
          </div>

          {/* Verified source text */}
          <blockquote
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${cfg.color}`,
              borderRadius: '0 8px 8px 0',
              padding: '12px 16px',
              margin: 0,
              marginBottom: 12,
              fontSize: 13,
              color: C.fg,
              lineHeight: 1.65,
            }}
          >
            {result.matchedRule.exactText}
          </blockquote>

          {/* Source metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <p style={{ fontSize: 12, color: C.fgMuted, margin: 0 }}>
              <strong style={{ color: C.fg }}>Source:</strong>{' '}
              <a
                href={result.matchedRule.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: C.teal, textDecoration: 'none', wordBreak: 'break-all' }}
              >
                {result.matchedRule.sourceUrl}
              </a>
            </p>
            <p style={{ fontSize: 12, color: C.fgMuted, margin: 0 }}>
              <strong style={{ color: C.fg }}>Last verified:</strong>{' '}
              {new Date(result.matchedRule.lastVerifiedDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p style={{ fontSize: 12, color: C.fgMuted, margin: 0 }}>
              <strong style={{ color: C.fg }}>Jurisdiction:</strong>{' '}
              {result.matchedRule.jurisdiction.charAt(0).toUpperCase() +
                result.matchedRule.jurisdiction.slice(1)}
            </p>
          </div>
        </div>
      )}

      {/* Disclosure (deterministic — not AI-generated) */}
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 22,
        }}
      >
        <p style={{ fontSize: 11, color: C.fgMuted, margin: 0, lineHeight: 1.55 }}>
          This is a factual comparison against a verified official source. It does not confirm
          whether your case is strong, predict any outcome, or constitute legal advice. For legal
          representation, consult a licensed Michigan attorney or{' '}
          <a
            href="https://michiganlegalhelp.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: C.teal }}
          >
            Michigan Legal Help
          </a>
          .
        </p>
      </div>

      {/* Account gate CTA — appears AFTER Verification Check, never before */}
      <button onClick={onCreateAccount} style={primaryBtn(true)}>
        Create my STAND →
      </button>
      <p style={{ fontSize: 12, color: C.fgMuted, textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
        Save your verification and build your case record. Free — no card required.
      </p>

      <p
        style={{
          fontSize: 11,
          color: C.fgMuted,
          textAlign: 'center',
          marginTop: 12,
          marginBottom: 0,
        }}
      >
        Checked at {new Date(result.checkedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}

// ── Step 5 — Account Gate ─────────────────────────────────────────────────────

function AccountGate({
  email,
  submitted,
  onEmailChange,
  onSubmit,
}: {
  email: string;
  submitted: boolean;
  onEmailChange: (e: string) => void;
  onSubmit: () => void;
}) {
  if (submitted) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 16 }}>✓</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.teal, marginBottom: 8, marginTop: 0 }}>
          You&apos;re on the Floor.
        </h2>
        <p style={{ fontSize: 14, color: C.fgMuted, marginBottom: 0 }}>
          Check your email to finish setting up your STAND account. Your verification
          result is saved to your case file.
        </p>
      </div>
    );
  }

  const canSubmit = email.includes('@') && email.includes('.');

  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.fg, marginBottom: 6, marginTop: 0 }}>
        Create your STAND account
      </h2>
      <p style={{ fontSize: 14, color: C.fgMuted, marginBottom: 24, marginTop: 0, lineHeight: 1.5 }}>
        Your Verification Check is complete. Create a free account to save your case file,
        build your timeline, and generate a Factual Packet when you&apos;re ready.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="stand-email"
          style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.fg, marginBottom: 8 }}
        >
          Email address
        </label>
        <input
          id="stand-email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) onSubmit();
          }}
          placeholder="you@example.com"
          style={inputStyle}
          autoComplete="email"
        />
      </div>

      <button onClick={onSubmit} disabled={!canSubmit} style={primaryBtn(canSubmit)}>
        Get started — it&apos;s free
      </button>

      <p style={disclosureStyle}>
        Case Floor is free. No card required.
      </p>
    </div>
  );
}
