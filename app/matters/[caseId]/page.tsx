'use client';

/**
 * /matters/:caseId?t=<link token> — the person's own view of their verified Matter record.
 * Their phone holds the only key that can sign in their name. What STAND recorded is shown
 * as STAND's work until they mark it accurate or not accurate.
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { loadDevice, linkThisDevice, readRecord, appendAsHolder, exportWithWitness, type HolderDevice } from '@/lib/spine/browser';
import { deriveMoves, STATUS_LABEL, type Move } from '@/lib/spine/moves';

type Ev = { seq: number; event_type: string; role: string; actor_id: string; event_sha256: string; payload_canonical: string; client_time_iso: string; display_name?: string };

const LABEL: Record<string, string> = {
  session_opened: 'Matter opened',
  participant_added: 'Person added',
  statement_recorded: 'Statement',
  document_attached: 'Document attached',
  fact_logged: 'Fact noted',
  claim_checked: 'Checked against a published source',
  deadline_noted: 'Deadline noted',
  record_confirmed: 'Reviewed by you',
  witness_attested: 'Witness statement',
  action_taken: 'Action taken',
  correction_linked: 'Correction',
  note_recorded: 'Note',
  session_closed: 'Matter closed',
  move_proposed: 'Move proposed',
  move_decided: 'Your decision',
  move_outcome: 'What happened',
};
const CONFIRMABLE = new Set(['statement_recorded', 'fact_logged', 'claim_checked', 'deadline_noted', 'document_attached']);
const RESULT: Record<string, string> = { confirmed: 'matches the source', contradicted: 'does not match the source', cannot_verify: 'could not be checked' };

function describe(e: Ev): string {
  const p = JSON.parse(e.payload_canonical);
  switch (e.event_type) {
    case 'session_opened': return p.subject?.title ?? '';
    case 'participant_added': return `as ${p.role}`;
    case 'statement_recorded': return `“${p.text}”`;
    case 'document_attached': return p.title;
    case 'fact_logged': return p.statement + (p.date ? ` (${p.date})` : '');
    case 'claim_checked': return `“${p.claim}” ${RESULT[p.result] ?? p.result}: ${p.source_title}`;
    case 'deadline_noted': return `${p.description}: ${p.due} (${p.controlling_source})`;
    case 'record_confirmed': return `${p.event_sha256s.length} item(s) marked ${p.confirmation === 'accurate' ? 'accurate' : 'NOT accurate'}${p.note ? `: ${p.note}` : ''}`;
    case 'witness_attested': return `“${p.statement}”`;
    case 'action_taken': return p.action;
    case 'move_proposed': return `${p.move} (rule: ${p.governing_rule})`;
    case 'move_decided': return `${p.decision}${p.reason ? `: ${p.reason}` : ''}`;
    case 'move_outcome': return `${p.result}: ${p.what_happened}`;
    default: return p.text ?? p.reason ?? '';
  }
}

function save(name: string, data: unknown) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = name; a.click();
}

export default function MatterPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [device, setDevice] = useState<HolderDevice | null | undefined>(undefined);
  const [record, setRecord] = useState<{ events: Ev[]; protocol: { definition: { boundary: string } } } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [words, setWords] = useState('');
  const [did, setDid] = useState('');
  const [outcome, setOutcome] = useState<{ sha: string; result: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async (d: HolderDevice) => {
    try { setRecord(await readRecord(d)); } catch (e) { setMsg((e as Error).message); }
  }, []);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('t'));
    loadDevice(caseId).then((d) => { setDevice(d ?? null); if (d) refresh(d); }).catch(() => setDevice(null));
  }, [caseId, refresh]);

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (device) await refresh(device); if (done) setMsg(done); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  const reviewed = new Set<string>();
  record?.events.filter((e) => e.event_type === 'record_confirmed').forEach((e) => JSON.parse(e.payload_canonical).event_sha256s.forEach((h: string) => reviewed.add(h)));

  return (
    <main className="min-h-screen bg-veritas-light px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-veritas-teal">STAND · Your record</p>
          <h1 className="text-2xl font-bold text-veritas-blue">Matter record</h1>
        </header>

        {msg && <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{msg}</div>}

        {device === undefined && <p className="text-gray-600">Loading…</p>}

        {device === null && (token ? (
          <section className="space-y-3 rounded-lg bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-veritas-blue">Link this phone to your record</h2>
            <p className="text-sm text-gray-700">This phone will hold a key that only works on this phone. Anything you confirm or add is signed with it, in your name.</p>
            <input className="w-full rounded border p-2" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <button disabled={busy || !name.trim()} className="rounded bg-veritas-blue px-4 py-2 text-white disabled:opacity-50"
              onClick={() => run(async () => { const d = await linkThisDevice(caseId, token, name.trim()); setDevice(d); window.history.replaceState(null, '', window.location.pathname); })}>
              Link this phone
            </button>
          </section>
        ) : <p className="text-gray-700">Open the link STAND gave you to see this record on your phone.</p>)}

        {device && record && (
          <>
            <MovesSection moves={deriveMoves(record.events)} busy={busy} outcome={outcome} setOutcome={setOutcome}
              decide={(m, decision) => { const reason = decision === 'chosen' ? '' : (prompt('Why? (optional)') ?? ''); run(() => appendAsHolder(device, 'move_decided', { move_event_sha256: m.event_sha256, decision, ...(reason.trim() ? { reason: reason.trim() } : {}) }), 'Decision saved and signed.'); }}
              report={(m, result, text) => run(async () => { await appendAsHolder(device, 'move_outcome', { decision_event_sha256: m.decision!.event_sha256, result, what_happened: text }); setOutcome(null); }, 'Outcome saved and signed.')} />

            <h2 className="pt-2 font-semibold text-veritas-blue">Full record</h2>
            <section className="space-y-2">
              {record.events.map((e) => {
                const mine = e.actor_id === device.actorId;
                const pending = CONFIRMABLE.has(e.event_type) && !mine && !reviewed.has(e.event_sha256);
                return (
                  <article key={e.event_sha256} className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{LABEL[e.event_type] ?? e.event_type} · {mine ? 'you' : e.role === 'steward' ? 'recorded by STAND' : e.display_name ?? e.role}</span>
                      <span>{new Date(e.client_time_iso).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-gray-900">{describe(e)}</p>
                    {pending && (
                      <div className="mt-3 flex gap-2">
                        <button disabled={busy} className="rounded bg-veritas-teal px-3 py-1 text-sm text-white"
                          onClick={() => run(() => appendAsHolder(device, 'record_confirmed', { event_sha256s: [e.event_sha256], confirmation: 'accurate' }), 'Marked accurate.')}>Accurate</button>
                        <button disabled={busy} className="rounded border border-red-300 px-3 py-1 text-sm text-red-700"
                          onClick={() => { const note = prompt('What is wrong with it?') ?? ''; run(() => appendAsHolder(device, 'record_confirmed', { event_sha256s: [e.event_sha256], confirmation: 'inaccurate', ...(note.trim() ? { note: note.trim() } : {}) }), 'Marked not accurate.'); }}>
                          Not accurate
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>

            <section className="space-y-3 rounded-lg bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-veritas-blue">Add in your own words</h2>
              <textarea className="h-24 w-full rounded border p-2" value={words} onChange={(e) => setWords(e.target.value)} placeholder="What happened, in your words" />
              <button disabled={busy || !words.trim()} className="rounded bg-veritas-blue px-4 py-2 text-white disabled:opacity-50"
                onClick={() => run(async () => { await appendAsHolder(device, 'statement_recorded', { text: words.trim(), entry_source: 'typed_by_holder' }); setWords(''); }, 'Saved and signed.')}>Save statement</button>
              <input className="w-full rounded border p-2" value={did} onChange={(e) => setDid(e.target.value)} placeholder="Something you did (called, filed, paid, sent)" />
              <button disabled={busy || !did.trim()} className="rounded bg-veritas-blue px-4 py-2 text-white disabled:opacity-50"
                onClick={() => run(async () => { await appendAsHolder(device, 'action_taken', { action: did.trim() }); setDid(''); }, 'Saved and signed.')}>Save action</button>
            </section>

            <section className="space-y-2 rounded-lg bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-veritas-blue">Proof</h2>
              <p className="text-sm text-gray-700">Download the record and this phone&apos;s own witness file. Anyone can check them with the free Veritas verifier.</p>
              <button disabled={busy} className="rounded border border-veritas-blue px-4 py-2 text-veritas-blue"
                onClick={() => run(async () => { const { pkg, witness } = await exportWithWitness(device); save(`matter-${device.sessionId}.json`, pkg); save(`witness-holder-${device.sessionId}.json`, witness); })}>Download proof</button>
            </section>

            <p className="text-xs text-gray-500">{record.protocol.definition.boundary}</p>
          </>
        )}
      </div>
    </main>
  );
}

function MovesSection({ moves, busy, decide, report, outcome, setOutcome }: {
  moves: Move[]; busy: boolean;
  decide: (m: Move, d: 'chosen' | 'deferred' | 'declined') => void;
  report: (m: Move, result: string, text: string) => void;
  outcome: { sha: string; result: string; text: string } | null;
  setOutcome: (o: { sha: string; result: string; text: string } | null) => void;
}) {
  if (!moves.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-semibold text-veritas-blue">Your moves</h2>
      <p className="text-sm text-gray-600">Each move names the rule it rests on. You decide which to take; nothing moves without you.</p>
      {moves.map((m) => (
        <article key={m.event_sha256} className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{m.rank !== null ? `#${m.rank} · ` : ''}{STATUS_LABEL[m.status]}</span>
            {m.deadline && <span>by {m.deadline}</span>}
          </div>
          <p className="mt-1 font-medium text-gray-900">{m.move}</p>
          <p className="text-sm text-gray-700">{m.rationale}</p>
          <p className="text-xs text-gray-500">Rule: {m.governing_rule}{m.depends_on.length ? ` · Needs: ${m.depends_on.join(', ')}` : ''}{m.unlocks.length ? ` · Unlocks: ${m.unlocks.join(', ')}` : ''}</p>
          {m.outcomes.map((o) => <p key={o.event_sha256} className="mt-1 text-sm text-gray-800">→ {STATUS_LABEL[o.result]}: {o.what_happened}</p>)}
          {(m.status === 'open' || m.status === 'deferred') && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button disabled={busy} className="rounded bg-veritas-teal px-3 py-1 text-sm text-white" onClick={() => decide(m, 'chosen')}>Take this move</button>
              {m.status === 'open' && <button disabled={busy} className="rounded border px-3 py-1 text-sm" onClick={() => decide(m, 'deferred')}>Later</button>}
              <button disabled={busy} className="rounded border border-red-300 px-3 py-1 text-sm text-red-700" onClick={() => decide(m, 'declined')}>Not taking it</button>
            </div>
          )}
          {m.decision?.decision === 'chosen' && (outcome?.sha === m.event_sha256 ? (
            <div className="mt-3 space-y-2">
              <select className="w-full rounded border p-2" value={outcome.result} onChange={(e) => setOutcome({ ...outcome, result: e.target.value })}>
                <option value="worked">Worked</option><option value="partial">Partly worked</option>
                <option value="stalled">Stalled</option><option value="failed">Didn&apos;t work</option>
              </select>
              <input className="w-full rounded border p-2" placeholder="What happened" value={outcome.text} onChange={(e) => setOutcome({ ...outcome, text: e.target.value })} />
              <button disabled={busy || !outcome.text.trim()} className="rounded bg-veritas-blue px-3 py-1 text-sm text-white disabled:opacity-50" onClick={() => report(m, outcome.result, outcome.text.trim())}>Save what happened</button>
            </div>
          ) : (
            <button disabled={busy} className="mt-3 rounded border border-veritas-blue px-3 py-1 text-sm text-veritas-blue" onClick={() => setOutcome({ sha: m.event_sha256, result: 'worked', text: '' })}>Record what happened</button>
          ))}
        </article>
      ))}
    </section>
  );
}
