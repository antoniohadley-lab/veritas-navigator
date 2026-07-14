import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plans — STAND',
  description: 'Case Floor, Standing Room, Factual Packet, Intake Docket, and Launch Floor pricing.',
};

// All prices sourced from env — never hardcode in copy.
// Locked per STAND Build Brief. Do not change without founder confirmation.
const STANDING_ROOM_MONTHLY = process.env.STANDING_ROOM_PRICE
  ? (parseInt(process.env.STANDING_ROOM_PRICE) / 100).toFixed(2)
  : '9.99';

const FACTUAL_PACKET = process.env.FACTUAL_PACKET_PRICE
  ? (parseInt(process.env.FACTUAL_PACKET_PRICE) / 100).toFixed(2)
  : '75.00';

const INTAKE_DOCKET_MONTHLY = process.env.INTAKE_DOCKET_PRICE
  ? (parseInt(process.env.INTAKE_DOCKET_PRICE) / 100).toFixed(2)
  : '99.00';

const LAUNCH_FLOOR = process.env.LAUNCH_FLOOR_PRICE
  ? (parseInt(process.env.LAUNCH_FLOOR_PRICE) / 100).toFixed(2)
  : '15.00';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-veritas-blue text-white px-6 py-4 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <a href="/start" className="text-xl font-semibold tracking-tight hover:opacity-90">
              STAND
            </a>
            <p className="text-blue-200 text-xs mt-0.5">
              by Veritas Systems &amp; Technologies LLC
            </p>
          </div>
          <nav className="flex items-center gap-5">
            <a
              href="/about"
              className="text-sm text-blue-200 hover:text-white transition-colors"
            >
              How it works
            </a>
            <a
              href="/start"
              className="text-sm text-blue-200 hover:text-white transition-colors"
            >
              Get started
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-16">
        {/* Headline */}
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Plans</h2>
          <p className="mt-3 text-gray-500 text-sm max-w-xl mx-auto">
            They&apos;re not smarter than you. They&apos;re just organized.
          </p>
        </div>

        {/* ── Disputes & litigation tiers ── */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Disputes &amp; Litigation
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Case Floor — Free */}
          <TierCard
            name="Case Floor"
            price="Free"
            priceNote="No card required"
            highlight={false}
            features={[
              'Case intake',
              'Manual timeline entry',
              'BYO AI cross-check template',
              'Verification Check (one claim)',
            ]}
            cta="Start now"
            ctaHref="/start"
          />

          {/* Standing Room — $9.99/mo */}
          <TierCard
            name="Standing Room"
            price={`$${STANDING_ROOM_MONTHLY}`}
            priceNote="per month"
            highlight
            features={[
              'Everything in Case Floor',
              'Unlimited Verification Checks',
              'Document vault',
              'Ongoing case history',
              'Evidence hashing',
            ]}
            cta="Get Standing Room"
            ctaHref="/start"
          />

          {/* Factual Packet — $75 flat */}
          <TierCard
            name="Factual Packet"
            price={`$${FACTUAL_PACKET}`}
            priceNote="one-time, per case"
            highlight={false}
            features={[
              'Full case VerificationEvent export',
              'Timeline + affidavit + exhibits',
              'Hash-verified PDF',
              'Court-ready formatting',
              'Flat rate — no itemized breakdown',
            ]}
            cta="Get Factual Packet"
            ctaHref="/start"
          />

          {/* Intake Docket — $99/mo */}
          <TierCard
            name="Intake Docket"
            price={`$${INTAKE_DOCKET_MONTHLY}`}
            priceNote="per attorney seat / month"
            highlight={false}
            features={[
              'B2B portal seat',
              'Attorney or org staff access',
              'Submit and track client cases',
              'Bar verification required',
              'Each seat individually verified',
            ]}
            cta="Request access"
            ctaHref="/start"
          />
        </div>

        {/* ── Business formation tier ── */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Business Formation
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <TierCard
            name="Launch Floor"
            price={`$${LAUNCH_FLOOR}`}
            priceNote="one-time walkthrough"
            highlight={false}
            features={[
              'EIN registration (IRS — free)',
              'State entity registration guide',
              'UEI vs. DUNS — which applies',
              'Sales/use tax, DBA, UIA steps',
              'BOI status (rechecked monthly)',
            ]}
            cta="Launch your business"
            ctaHref="/start"
            note={`Government filing fees (e.g. Michigan LLC: $50 to LARA) are paid directly to the state — separate from the $${LAUNCH_FLOOR} STAND walkthrough fee.`}
          />
        </div>

        {/* Legal disclaimer */}
        <p className="mt-4 text-center text-xs text-gray-400 max-w-2xl mx-auto leading-relaxed">
          STAND is not a law firm and does not provide legal advice. All tiers are organization
          and verification tools. For legal representation, consult a licensed Michigan attorney
          or contact{' '}
          <a
            href="https://michiganlegalhelp.org"
            className="underline hover:text-gray-600"
            target="_blank"
            rel="noopener noreferrer"
          >
            Michigan Legal Help
          </a>
          .
        </p>
      </main>
    </div>
  );
}

interface TierCardProps {
  name: string;
  price: string;
  priceNote: string;
  highlight: boolean;
  features: string[];
  cta: string;
  ctaHref: string;
  note?: string;
}

function TierCard({
  name,
  price,
  priceNote,
  highlight,
  features,
  cta,
  ctaHref,
  note,
}: TierCardProps) {
  return (
    <div
      className={`rounded-xl border bg-white p-6 flex flex-col ${
        highlight
          ? 'border-veritas-teal shadow-md ring-2 ring-veritas-teal ring-offset-2'
          : 'border-gray-200'
      }`}
    >
      <div className="mb-6">
        <p
          className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
            highlight ? 'text-veritas-teal' : 'text-gray-400'
          }`}
        >
          {name}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">{price}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{priceNote}</p>
      </div>

      <ul className="space-y-2 flex-1 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-veritas-teal mt-0.5 font-bold text-xs flex-shrink-0">✓</span>
            {f}
          </li>
        ))}
      </ul>

      {note && (
        <p className="text-xs text-gray-400 mb-4 leading-relaxed border-t border-gray-100 pt-3">
          {note}
        </p>
      )}

      <a
        href={ctaHref}
        className={`block text-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
          highlight
            ? 'bg-veritas-teal hover:bg-teal-700 text-white'
            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {cta}
      </a>
    </div>
  );
}
