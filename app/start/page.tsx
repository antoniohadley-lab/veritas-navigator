'use client';

/**
 * /start — STAND onboarding entry point (Section 4)
 *
 * READY FOR: stand-onboarding.jsx component once provided.
 * When the component is attached:
 *   1. Replace the StandOnboardingPlaceholder below with the real component.
 *   2. Screen 1 "what happened" must call /api/verify (not a placeholder).
 *   3. Screen 3 "what did they tell you" must call /api/verify.
 *   4. Screen 4 result display must render evidence-grammar tags per §8:
 *      - Show verificationStatus badge (match / mismatch / cannot_verify)
 *      - Show origin tag for every AI-touched field (ai_suggested_rewrite label)
 *   5. Account creation gate stays AFTER the first Verification Check —
 *      do not gate the check itself.
 *
 * Thesis: "They're not smarter than you. They're just organized."
 */

export default function StartPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StandHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <StandOnboardingPlaceholder />
      </main>
      <StandFooter />
    </div>
  );
}

function StandHeader() {
  return (
    <header className="bg-veritas-blue text-white px-6 py-4 shadow-md">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">STAND</h1>
          <p className="text-blue-200 text-xs mt-0.5">
            by Veritas Systems &amp; Technologies LLC
          </p>
        </div>
        <nav className="flex gap-4 text-sm">
          <a href="/pricing" className="text-blue-200 hover:text-white transition-colors">
            Pricing
          </a>
        </nav>
      </div>
    </header>
  );
}

function StandFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white py-4 px-6">
      <p className="text-center text-xs text-gray-400">
        STAND is not a law firm and does not provide legal advice.
        This is an organization and verification tool.{' '}
        <a
          href="/pricing"
          className="underline hover:text-gray-600"
        >
          See plans
        </a>
      </p>
    </footer>
  );
}

function StandOnboardingPlaceholder() {
  return (
    <div className="max-w-2xl w-full text-center space-y-6">
      <div className="space-y-3">
        <p className="text-2xl font-semibold text-gray-900 leading-snug">
          You hit the right page. No question about it.
        </p>
        <p className="text-2xl font-semibold text-veritas-blue leading-snug">
          Welcome to the Floor. Let&apos;s get busy.
        </p>
        <p className="text-sm text-gray-500 italic mt-4">
          They&apos;re not smarter than you. They&apos;re just organized.
        </p>
      </div>

      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-10 text-gray-400 text-sm">
        <p className="font-medium text-gray-500 mb-2">Onboarding flow pending</p>
        <p>
          Attach <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">stand-onboarding.jsx</code> to
          wire the four-screen intake flow here.
        </p>
        <p className="mt-2">
          Screen 3 and Screen 1 connect to{' '}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">POST /api/verify</code>.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="/pricing"
          className="rounded-lg bg-veritas-teal hover:bg-teal-700 text-white px-6 py-3 text-sm font-medium transition-colors"
        >
          See plans
        </a>
        <a
          href="/navigator"
          className="rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 text-sm font-medium transition-colors"
        >
          Go to triage chat
        </a>
      </div>
    </div>
  );
}
