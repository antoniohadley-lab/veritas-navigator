import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-navy px-6 py-4 flex justify-between items-center">
        <div>
          <div className="text-gold font-black text-sm tracking-widest">VERITAS SYSTEMS GROUP</div>
          <div className="text-white opacity-40 text-xs tracking-wider mt-0.5">NAVIGATOR</div>
        </div>
        <div className="text-white opacity-30 text-xs">(269) 500-2430</div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-xl">
          <div className="text-5xl mb-6">⚖️</div>
          <h1 className="text-3xl font-black text-navy mb-4 leading-tight">
            Get the right document.<br />In plain language. Right now.
          </h1>
          <p className="text-sub text-base mb-3 leading-relaxed">
            Facing a housing issue, billing dispute, or civil legal problem in Michigan? Describe your situation and the Veritas Navigator will identify what you need and prepare the correct document — no attorney required for this step.
          </p>
          <p className="text-xs text-sub mb-8 italic">
            Document preparation assistance only. Not legal advice. Not a law firm.
          </p>

          {/* UPL Disclosure — shown before any document work begins */}
          <div className="bg-white border border-vborder rounded-lg p-4 mb-8 text-left">
            <div className="font-bold text-xs text-navy uppercase tracking-wider mb-2">Before you begin</div>
            <p className="text-xs text-sub leading-relaxed">
              Veritas Systems Group LLC and its subsidiaries are <strong>not a law firm</strong> and do not provide legal advice.
              The Veritas Navigator helps you understand your situation and prepare documents.
              For legal advice, consult a licensed Michigan attorney.
              <br /><br />
              If you are in immediate danger, call 911 or the National DV Hotline at{" "}
              <a href="tel:18007997233" className="text-navy font-bold">1-800-799-7233</a>.
            </p>
          </div>

          <Link
            href="/navigator"
            className="inline-block bg-navy text-white font-bold text-base px-8 py-4 rounded-lg hover:bg-steel transition-colors"
          >
            Start the Navigator →
          </Link>

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {["Housing / Eviction", "Billing Disputes", "Business Formation", "Judgment Defense"].map((t) => (
              <span key={t} className="bg-white border border-vborder text-sub text-xs px-3 py-1.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-sub py-6 border-t border-vborder">
        Veritas Systems Group LLC · veritassystemsgroup.com · (269) 500-2430
        <br />
        <span className="italic">Document preparation and navigation assistance. Not legal advice. Not a law firm.</span>
      </footer>
    </div>
  );
}
