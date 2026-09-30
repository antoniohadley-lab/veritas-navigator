'use client';

/**
 * /playbook?t=<link token> — the Chairman's page. STAND proposes rules from recorded outcomes;
 * nothing becomes a rule until it is adopted here, signed by the Chairman's own device.
 */
import { useCallback, useEffect, useState } from 'react';
import { loadDevice, linkChairmanDevice, readRecord, appendAs, exportWithWitness, type HolderDevice } from '@/lib/spine/browser';
import { deriveRules, type PlaybookRule } from '@/lib/spine/playbook-rules';

function save(name: string, data: unknown) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = name; a.click();
}

const BADGE: Record<PlaybookRule['status'], string> = { proposed: 'Awaiting your decision', adopted: 'Adopted', retired: 'Retired' };

export default function PlaybookPage() {
  const [device, setDevice] = useState<HolderDevice | null | undefined>(undefined);
  const [rules, setRules] = useState<PlaybookRule[] | null>(null);
  const [boundary, setBoundary] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async (d: HolderDevice) => {
    try { const st = await readRecord(d); setRules(deriveRules(st.events)); setBoundary(st.protocol.definition.boundary); }
    catch (e) { setMsg((e as Error).message); }
  }, []);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('t'));
    loadDevice('playbook').then((d) => { setDevice(d ?? null); if (d) refresh(d); }).catch(() => setDevice(null));
  }, [refresh]);

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (device) await refresh(device); if (done) setMsg(done); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-veritas-light px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-veritas-teal">STAND · Playbook</p>
          <h1 className="text-2xl font-bold text-veritas-blue">Rules learned from outcomes</h1>
        </header>

        {msg && <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{msg}</div>}
        {device === undefined && <p className="text-gray-600">Loading…</p>}

        {device === null && (token ? (
          <section className="space-y-3 rounded-lg bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-veritas-blue">Link this device as Chairman</h2>
            <p className="text-sm text-gray-700">This device will hold the only key that can adopt or retire a rule.</p>
            <input className="w-full rounded border p-2" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <button disabled={busy || !name.trim()} className="rounded bg-veritas-blue px-4 py-2 text-white disabled:opacity-50"
              onClick={() => run(async () => { const d = await linkChairmanDevice(token, name.trim()); setDevice(d); window.history.replaceState(null, '', window.location.pathname); })}>
              Link this device
            </button>
          </section>
        ) : <p className="text-gray-700">Open the Chairman link to use this page.</p>)}

        {device && rules && (
          <>
            {!rules.length && <p className="text-gray-700">No rules proposed yet. STAND proposes rules once moves have recorded outcomes.</p>}
            {rules.map((r) => (
              <article key={r.proposal_event_sha256} className="rounded-lg bg-white p-4 shadow-sm">
                <div className="flex justify-between text-xs text-gray-500"><span>{r.domain}</span><span>{BADGE[r.status]}</span></div>
                <p className="mt-1 font-medium text-gray-900">{r.rule}</p>
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  {r.evidence.map((e) => <li key={e.event_sha256}>Matter {e.matter_ref}: {e.result}{e.note ? `, ${e.note}` : ''} <span className="text-xs text-gray-400">({e.event_sha256.slice(0, 10)}…)</span></li>)}
                </ul>
                {r.retired_reason && <p className="mt-1 text-sm text-gray-600">Retired: {r.retired_reason}</p>}
                {r.status === 'proposed' && (
                  <button disabled={busy} className="mt-3 rounded bg-veritas-teal px-3 py-1 text-sm text-white"
                    onClick={() => run(() => appendAs(device, 'rule_adopted', { proposal_event_sha256: r.proposal_event_sha256 }), 'Rule adopted and signed.')}>Adopt this rule</button>
                )}
                {r.status === 'adopted' && (
                  <button disabled={busy} className="mt-3 rounded border border-red-300 px-3 py-1 text-sm text-red-700"
                    onClick={() => { const reason = prompt('Why retire this rule?') ?? ''; if (reason.trim()) run(() => appendAs(device, 'rule_retired', { rule_event_sha256: r.adopted_event_sha256, reason: reason.trim() }), 'Rule retired and signed.'); }}>Retire</button>
                )}
              </article>
            ))}
            <button disabled={busy} className="rounded border border-veritas-blue px-4 py-2 text-veritas-blue"
              onClick={() => run(async () => { const { pkg, witness } = await exportWithWitness(device); save(`playbook-${device.sessionId}.json`, pkg); save(`witness-chairman-${device.sessionId}.json`, witness); })}>Download proof</button>
            <p className="text-xs text-gray-500">{boundary}</p>
          </>
        )}
      </div>
    </main>
  );
}
