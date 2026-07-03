'use client';

/**
 * StandOnboarding — 4-screen intake flow (Section 4, STAND Build Brief)
 *
 * Screen 1 — Tell us what happened (story → POST /api/extract-timeline)
 * Screen 2 — Who are you up against? (opponent type selection)
 * Screen 3 — What did they tell you? (claim → POST /api/verify)
 * Screen 4 — Verification result (evidence-grammar badges per §8)
 * Step 4   — Account gate: email capture AFTER Verification Check, never before
 *
 * Design: dark navy palette, inline styles (per brief spec).
 * Hero line (locked, verbatim from brief):
 *   "You hit the right page. No question about it. Welcome to the Floor. Let's get busy."
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Color tokens ──────────────────────────────────────────────────────────────
const NAVY      = '#0F172A';
const NAVY_DEEP = '#0A1120';
const STEEL     = '#38BDF8';
const STEEL_DIM = '#1E3A52';

// ── Types ─────────────────────────────────────────────────────────────────────

// 0 = Screen1, 1 = Screen2, 2 = Screen3, 3 = Screen4, 4 = AccountGate
type Step = 0 | 1 | 2 | 3 | 4;

interface TimelineEvent {
  id: string;
  text: string;
  date: string | null;
}

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

const OPPONENTS = [
  'Landlord / property manager',
  'Employer',
  'City or county',
  'Debt collector / creditor',
  'Police / criminal court',
  'Other',
] as const;
type OpponentType = typeof OPPONENTS[number];

// ── Root orchestrator ─────────────────────────────────────────────────────────

export default function StandOnboarding() {
  const [step, setStep] = useState<Step>(0);
  const [story, setStory] = useState('');
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [opponentType, setOpponentType] = useState<OpponentType | ''>('');
  const [verifyResult, setVerifyResult] = useState<VerifyApiResult | null>(null);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: NAVY,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#fff',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Header ── */}
      <div
        style={{
          borderBottom: `1px solid ${STEEL_DIM}`,
          padding: '18px 44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: `2px solid ${STEEL}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ width: 8, height: 8, background: STEEL, borderRadius: '50%' }} />
          </div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '0.02em' }}>
            STAND
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/about" style={{ color: '#475569', fontSize: 12.5, textDecoration: 'none' }}>
            How it works
          </a>
          <a href="/pricing" style={{ color: '#475569', fontSize: 12.5, textDecoration: 'none' }}>
            Pricing
          </a>
          <span style={{ color: '#475569', fontSize: 12.5 }}>
            Veritas Systems &amp; Technologies
          </span>
        </div>
      </div>

      {/* ── Hero quote (step 0 only, verbatim from brief) ── */}
      {step === 0 && (
        <div style={{ padding: '48px 44px 0', maxWidth: 780 }}>
          <p
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 22,
              color: STEEL,
              fontStyle: 'italic',
              lineHeight: 1.5,
              marginBottom: 4,
            }}
          >
            &ldquo;You hit the right page. No question about it. Welcome to the Floor. Let&apos;s get busy.&rdquo;
          </p>
        </div>
      )}

      {/* ── Screens ── */}
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        {step === 0 && (
          <Screen1
            story={story}
            timeline={timeline}
            onStoryChange={setStory}
            onTimelineExtracted={setTimeline}
            onContinue={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <Screen2
            selected={opponentType}
            onContinue={(type) => {
              setOpponentType(type);
              setStep(2);
            }}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <Screen3
            opponentType={opponentType as OpponentType}
            onRun={(result) => {
              setVerifyResult(result);
              setStep(3);
            }}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && verifyResult && (
          <Screen4
            result={verifyResult}
            onDone={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <AccountGate
            email={email}
            submitted={emailSubmitted}
            onEmailChange={setEmail}
            onSubmit={() => setEmailSubmitted(true)}
          />
        )}
      </div>

      {/* ── Progress bar (steps 1–3) ── */}
      {step > 0 && step < 4 && (
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 44px 48px' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {([0, 1, 2, 3] as const).map((i) => (
              <div
                key={i}
                style={{
                  height: 3,
                  flex: 1,
                  borderRadius: 2,
                  background: i < step ? STEEL : STEEL_DIM,
                  transition: 'background 0.2s ease',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Persistent disclosure ── */}
      <div style={{ padding: '0 44px 28px', maxWidth: 1040, margin: '0 auto' }}>
        <p style={{ fontSize: 11.5, color: '#334155', textAlign: 'center' }}>
          STAND is not a law firm and does not provide legal advice. This is an organization and verification tool.
        </p>
      </div>
    </div>
  );
}

// ── Screen 1 — Tell us what happened ─────────────────────────────────────────

function Screen1({
  story,
  timeline,
  onStoryChange,
  onTimelineExtracted,
  onContinue,
}: {
  story: string;
  timeline: TimelineEvent[];
  onStoryChange: (s: string) => void;
  onTimelineExtracted: (events: TimelineEvent[]) => void;
  onContinue: () => void;
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
        // extraction is best-effort — silent failure, user can still continue
      } finally {
        setExtracting(false);
      }
    },
    [onTimelineExtracted]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => extractTimeline(story), 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [story, extractTimeline]);

  const canContinue = story.trim().length >= 20;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.1fr 0.9fr',
        gap: 0,
        minHeight: 560,
      }}
    >
      {/* Left: story input */}
      <div style={{ padding: '48px 44px', borderRight: `1px solid ${STEEL_DIM}` }}>
        <div
          style={{
            color: STEEL,
            fontSize: 12,
            letterSpacing: '0.14em',
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          STEP 1 OF 4
        </div>
        <h1
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 34,
            color: '#fff',
            lineHeight: 1.15,
            marginBottom: 10,
            marginTop: 0,
          }}
        >
          Tell us what happened.
        </h1>
        <p
          style={{
            color: '#94A3B8',
            fontSize: 15,
            lineHeight: 1.6,
            marginBottom: 24,
            maxWidth: 460,
            marginTop: 0,
          }}
        >
          One sentence, your own words. No dates, no legal terms, no perfection needed.
        </p>
        <textarea
          value={story}
          onChange={(e) => onStoryChange(e.target.value)}
          placeholder="My landlord shut off my water after I complained about mold."
          style={{
            width: '100%',
            minHeight: 150,
            background: NAVY_DEEP,
            border: `1px solid ${STEEL_DIM}`,
            borderRadius: 8,
            color: '#fff',
            fontSize: 16,
            lineHeight: 1.6,
            padding: 16,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.target.style.borderColor = STEEL)}
          onBlur={(e) => (e.target.style.borderColor = STEEL_DIM)}
        />
        <p style={{ color: '#64748B', fontSize: 13, marginTop: 10, marginBottom: 0 }}>
          {extracting
            ? 'Building your timeline…'
            : 'As you type, your timeline builds on the right — in real time.'}
        </p>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          style={{
            marginTop: 28,
            background: canContinue ? STEEL : STEEL_DIM,
            color: canContinue ? NAVY_DEEP : '#64748B',
            border: 'none',
            borderRadius: 6,
            padding: '13px 28px',
            fontSize: 15,
            fontWeight: 700,
            cursor: canContinue ? 'pointer' : 'not-allowed',
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={(e) =>
            canContinue && ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)')
          }
          onMouseUp={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')
          }
        >
          Continue →
        </button>
      </div>

      {/* Right: live timeline */}
      <div style={{ padding: '48px 40px', background: NAVY_DEEP }}>
        <div
          style={{
            color: '#64748B',
            fontSize: 12,
            letterSpacing: '0.14em',
            fontWeight: 700,
            marginBottom: 18,
          }}
        >
          YOUR CASE FLOOR
        </div>
        {timeline.length === 0 ? (
          <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.7, paddingTop: 8 }}>
            Nothing yet. Start typing on the left — every sentence becomes a dated event here.
          </div>
        ) : (
          <div>
            {timeline.map((ev, i) => (
              <div
                key={ev.id}
                style={{
                  display: 'flex',
                  gap: 14,
                  marginBottom: 4,
                  animation: 'fadeIn 0.25s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 16,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: STEEL,
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  {i < timeline.length - 1 && (
                    <div
                      style={{
                        width: 1,
                        flex: 1,
                        background: STEEL_DIM,
                        minHeight: 28,
                      }}
                    />
                  )}
                </div>
                <div style={{ paddingBottom: 22 }}>
                  <div
                    style={{ color: '#fff', fontSize: 14.5, lineHeight: 1.5, marginBottom: 4 }}
                  >
                    {ev.text}
                  </div>
                  <div style={{ color: '#F59E0B', fontSize: 12, fontWeight: 600 }}>
                    {ev.date ?? 'date not yet set'}
                  </div>
                </div>
              </div>
            ))}
            {/* SYSTEM-DERIVED tag */}
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${STEEL_DIM}`,
              }}
            >
              <span
                style={{
                  background: 'rgba(245,158,11,0.12)',
                  color: '#F59E0B',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  padding: '3px 8px',
                  borderRadius: 999,
                }}
              >
                SYSTEM-DERIVED
              </span>
              <span style={{ color: '#334155', fontSize: 12, marginLeft: 8 }}>
                Extracted from your description — not AI-generated advice
              </span>
            </div>
          </div>
        )}
        <div
          style={{
            marginTop: 20,
            paddingTop: 20,
            borderTop: `1px solid ${STEEL_DIM}`,
          }}
        >
          <div style={{ color: '#334155', fontSize: 13, lineHeight: 1.6 }}>
            Next: an affidavit. Then: evidence, verified against the actual rule.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Screen 2 — Who are you up against? ───────────────────────────────────────

function Screen2({
  selected,
  onContinue,
  onBack,
}: {
  selected: OpponentType | '';
  onContinue: (type: OpponentType) => void;
  onBack: () => void;
}) {
  const [picked, setPicked] = useState<OpponentType | ''>(selected);

  return (
    <div style={{ padding: '56px 44px', minHeight: 560 }}>
      <div
        style={{
          color: STEEL,
          fontSize: 12,
          letterSpacing: '0.14em',
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        STEP 2 OF 4
      </div>
      <h1
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 34,
          color: '#fff',
          marginBottom: 10,
          marginTop: 0,
        }}
      >
        Who are you up against?
      </h1>
      <p
        style={{
          color: '#94A3B8',
          fontSize: 15,
          marginBottom: 32,
          maxWidth: 480,
          marginTop: 0,
        }}
      >
        This points you to the right procedures, deadlines, and rule sources — nothing else.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          maxWidth: 560,
        }}
      >
        {OPPONENTS.map((opt) => (
          <button
            key={opt}
            onClick={() => setPicked(opt)}
            style={{
              textAlign: 'left',
              padding: '16px 18px',
              borderRadius: 8,
              border: `1px solid ${picked === opt ? STEEL : STEEL_DIM}`,
              background:
                picked === opt ? 'rgba(56,189,248,0.08)' : 'transparent',
              color: picked === opt ? '#fff' : '#CBD5E1',
              fontSize: 14.5,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: `1px solid ${STEEL_DIM}`,
            color: '#94A3B8',
            borderRadius: 6,
            padding: '13px 22px',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => picked && onContinue(picked)}
          disabled={!picked}
          style={{
            background: picked ? STEEL : STEEL_DIM,
            color: picked ? NAVY_DEEP : '#64748B',
            border: 'none',
            borderRadius: 6,
            padding: '13px 28px',
            fontSize: 15,
            fontWeight: 700,
            cursor: picked ? 'pointer' : 'not-allowed',
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// ── Screen 3 — Verification Check ────────────────────────────────────────────

function Screen3({
  opponentType,
  onRun,
  onBack,
}: {
  opponentType: OpponentType;
  onRun: (result: VerifyApiResult) => void;
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
        body: JSON.stringify({ claim: trimmed, opponentType, jurisdiction: 'michigan' }),
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
      onRun(result);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const canRun = claim.trim().length >= 6 && !loading;

  return (
    <div style={{ padding: '56px 44px', minHeight: 560 }}>
      <div
        style={{
          color: STEEL,
          fontSize: 12,
          letterSpacing: '0.14em',
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        STEP 3 OF 4 — VERIFICATION CHECK
      </div>
      <h1
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 34,
          color: '#fff',
          marginBottom: 10,
          marginTop: 0,
        }}
      >
        What exactly did they tell you?
      </h1>
      <p
        style={{
          color: '#94A3B8',
          fontSize: 15,
          marginBottom: 6,
          maxWidth: 500,
          lineHeight: 1.6,
          marginTop: 0,
        }}
      >
        The specific thing they said that scared you, or didn&apos;t feel right.
      </p>
      <p style={{ color: '#475569', fontSize: 13.5, marginBottom: 22, marginTop: 0 }}>
        Example: &ldquo;You have to move out in 3 days or the police will remove you.&rdquo;
      </p>
      <textarea
        value={claim}
        onChange={(e) => setClaim(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && canRun) {
            e.preventDefault();
            handleRun();
          }
        }}
        placeholder="Type their exact words, if you remember them."
        style={{
          width: '100%',
          maxWidth: 560,
          minHeight: 110,
          background: NAVY_DEEP,
          border: `1px solid ${STEEL_DIM}`,
          borderRadius: 8,
          color: '#fff',
          fontSize: 15.5,
          lineHeight: 1.6,
          padding: 16,
          resize: 'vertical',
          outline: 'none',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          display: 'block',
        }}
        onFocus={(e) => (e.target.style.borderColor = STEEL)}
        onBlur={(e) => (e.target.style.borderColor = STEEL_DIM)}
      />
      <p
        style={{
          color: '#64748B',
          fontSize: 13,
          marginTop: 12,
          maxWidth: 500,
          lineHeight: 1.6,
          marginBottom: 0,
        }}
      >
        We don&apos;t give legal advice. We show you the rule text and where it comes from — you
        decide what to do.
      </p>

      {adviceRedirect && (
        <div
          style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: 8,
            padding: '12px 16px',
            marginTop: 16,
            maxWidth: 560,
          }}
        >
          <p style={{ color: '#F59E0B', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            <strong>STAND cannot answer that.</strong> {adviceRedirect}
          </p>
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.4)',
            borderRadius: 8,
            padding: '12px 16px',
            marginTop: 16,
            maxWidth: 560,
          }}
        >
          <p style={{ color: '#F87171', fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: `1px solid ${STEEL_DIM}`,
            color: '#94A3B8',
            borderRadius: 6,
            padding: '13px 22px',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          onClick={handleRun}
          disabled={!canRun}
          style={{
            background: canRun ? STEEL : STEEL_DIM,
            color: canRun ? NAVY_DEEP : '#64748B',
            border: 'none',
            borderRadius: 6,
            padding: '13px 28px',
            fontSize: 15,
            fontWeight: 700,
            cursor: canRun ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Checking…' : 'Run Verification Check →'}
        </button>
      </div>
    </div>
  );
}

// ── Screen 4 — Verification result (evidence-grammar §8) ─────────────────────

const STATUS_META = {
  match: {
    label: 'MATCH',
    pill: 'rgba(34,197,94,0.15)',
    pillText: '#22C55E',
    desc: 'The claim is consistent with the verified statute.',
  },
  mismatch: {
    label: 'MISMATCH',
    pill: 'rgba(248,113,113,0.15)',
    pillText: '#F87171',
    desc: 'The claim does not match the verified statute.',
  },
  cannot_verify: {
    label: 'CANNOT VERIFY',
    pill: 'rgba(148,163,184,0.12)',
    pillText: '#94A3B8',
    desc: null, // filled dynamically
  },
} as const;

function Screen4({
  result,
  onDone,
  onBack,
}: {
  result: VerifyApiResult;
  onDone: () => void;
  onBack: () => void;
}) {
  const meta = STATUS_META[result.status];

  const cannotVerifyDesc =
    result.cannotVerifyReason === 'stale_source'
      ? 'The source data is overdue for re-verification. Check the official source directly before relying on this.'
      : 'No matching verified rule was found in our current rule set for this claim and jurisdiction. This does not mean the claim is wrong — only that we cannot confirm or deny it at this time.';

  const statusDesc = result.status === 'cannot_verify' ? cannotVerifyDesc : meta.desc;

  return (
    <div style={{ padding: '56px 44px', minHeight: 560 }}>
      <div
        style={{
          color: STEEL,
          fontSize: 12,
          letterSpacing: '0.14em',
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        STEP 4 OF 4 — RESULT
      </div>

      {/* Evidence-grammar result card */}
      <div
        style={{
          background: NAVY_DEEP,
          border: `1px solid ${STEEL_DIM}`,
          borderRadius: 10,
          padding: 26,
          maxWidth: 620,
          marginBottom: 28,
        }}
      >
        {/* Evidence-grammar tags */}
        <div
          style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}
        >
          <span
            style={{
              background: 'rgba(245,158,11,0.15)',
              color: '#F59E0B',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.08em',
              padding: '4px 10px',
              borderRadius: 999,
            }}
          >
            SYSTEM-DERIVED FROM SOURCE
          </span>
          <span
            style={{
              background: meta.pill,
              color: meta.pillText,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.08em',
              padding: '4px 10px',
              borderRadius: 999,
            }}
          >
            {meta.label}
          </span>
        </div>

        {/* Status description */}
        <p style={{ color: meta.pillText, fontSize: 14, lineHeight: 1.55, marginTop: 0, marginBottom: 18 }}>
          {statusDesc}
        </p>

        {/* Matched rule text */}
        {result.matchedRule && (
          <>
            <div
              style={{
                color: '#64748B',
                fontSize: 12,
                marginBottom: 6,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              WHAT THE RULE ACTUALLY SAYS
            </div>
            <blockquote
              style={{
                color: '#fff',
                fontSize: 14,
                lineHeight: 1.65,
                margin: 0,
                marginBottom: 16,
                paddingLeft: 14,
                borderLeft: `3px solid ${STEEL_DIM}`,
              }}
            >
              {result.matchedRule.exactText}
            </blockquote>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                <strong style={{ color: '#94A3B8' }}>Source: </strong>
                <a
                  href={result.matchedRule.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: STEEL, textDecoration: 'none', wordBreak: 'break-all' }}
                >
                  {result.matchedRule.sourceUrl}
                </a>
              </p>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                <strong style={{ color: '#94A3B8' }}>Last verified: </strong>
                {new Date(result.matchedRule.lastVerifiedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </>
        )}
      </div>

      {/* CTA — account gate comes AFTER this result */}
      <h2
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 26,
          color: '#fff',
          marginBottom: 8,
          marginTop: 0,
        }}
      >
        Save this as your STAND dossier.
      </h2>
      <p
        style={{
          color: '#94A3B8',
          fontSize: 14.5,
          marginBottom: 24,
          maxWidth: 480,
          lineHeight: 1.6,
          marginTop: 0,
        }}
      >
        Your timeline and this verification check are saved free. Create an account to export,
        share, or build on your case record.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: `1px solid ${STEEL_DIM}`,
            color: '#94A3B8',
            borderRadius: 6,
            padding: '13px 22px',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <button
          onClick={onDone}
          style={{
            background: STEEL,
            color: NAVY_DEEP,
            border: 'none',
            borderRadius: 6,
            padding: '13px 30px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Create my STAND →
        </button>
      </div>
      <p style={{ fontSize: 11, color: '#334155', marginTop: 12, marginBottom: 0 }}>
        Checked at {new Date(result.checkedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}

// ── Account Gate — Step 4 (after Verification Check, never before) ────────────

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
      <div style={{ padding: '80px 44px', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>✓</div>
        <h2
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 28,
            color: STEEL,
            marginBottom: 12,
            marginTop: 0,
          }}
        >
          You&apos;re on the Floor.
        </h2>
        <p style={{ color: '#94A3B8', fontSize: 15, maxWidth: 400, margin: '0 auto' }}>
          Check your email to finish setting up your STAND account. Your verification result is
          saved to your case file.
        </p>
      </div>
    );
  }

  const canSubmit = email.includes('@') && email.includes('.');

  return (
    <div style={{ padding: '56px 44px', minHeight: 560 }}>
      <h2
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 32,
          color: '#fff',
          marginBottom: 10,
          marginTop: 0,
        }}
      >
        Create your STAND account.
      </h2>
      <p
        style={{
          color: '#94A3B8',
          fontSize: 15,
          marginBottom: 32,
          maxWidth: 480,
          lineHeight: 1.6,
          marginTop: 0,
        }}
      >
        Your Verification Check is complete. Create a free Case Floor account to save your
        timeline, build your case record, and generate a Factual Packet when you&apos;re ready.
      </p>

      <div style={{ maxWidth: 420 }}>
        <label
          htmlFor="stand-email"
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: '#CBD5E1',
            marginBottom: 8,
          }}
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
          autoComplete="email"
          style={{
            width: '100%',
            background: NAVY_DEEP,
            border: `1px solid ${STEEL_DIM}`,
            borderRadius: 8,
            padding: '13px 16px',
            color: '#fff',
            fontSize: 15,
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: 16,
          }}
          onFocus={(e) => (e.target.style.borderColor = STEEL)}
          onBlur={(e) => (e.target.style.borderColor = STEEL_DIM)}
        />
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%',
            background: canSubmit ? STEEL : STEEL_DIM,
            color: canSubmit ? NAVY_DEEP : '#64748B',
            border: 'none',
            borderRadius: 6,
            padding: '14px 0',
            fontSize: 15,
            fontWeight: 700,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          Get started — it&apos;s free
        </button>
        <p style={{ fontSize: 12, color: '#475569', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
          Case Floor is free. No card required.
        </p>
      </div>
    </div>
  );
}
