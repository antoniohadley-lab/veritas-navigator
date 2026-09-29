// Veritas protocol rules engine, v4.
// ONE implementation shared by the server (spine-api), the independent verifier, and the test harness.
// Contains no inspection-specific logic: every rule is read from the protocol definition.
// Plain JavaScript, no imports, so it runs unchanged in Node, Deno and the browser.

const J = s => { try { return typeof s === "string" ? JSON.parse(s) : s; } catch { return {}; } };

export function canonical(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
}

export const eventHeader = (sessionId, e, payloadSha) =>
  ["v1", sessionId, e.seq, e.event_type, e.actor_id, e.role, payloadSha, e.prev_event_sha256 ?? "", e.client_time_iso].join("|");

// Protocol envelope: what an outside party pins. Status is excluded so publishing a draft does not change identity.
export const protocolEnvelope = p => canonical({ namespace: p.namespace, name: p.name, version: p.version, definition_sha256: p.definition_sha256 });

export const terminalTypes = def => Object.keys(def.completion ?? {});

// Replays signed events to derive who holds which role. Never trusts an unsigned participant list.
export function grantedRoles(def, events) {
  const held = new Set();
  const open = def.opening ?? {};
  for (const raw of events) {
    const e = { ...raw, payload: J(raw.payload_canonical ?? raw.payload) };
    if (e.seq === 1 && e.event_type === open.event_type) held.add(`${e.actor_id}|${open.role}`);
    if (e.event_type === "participant_added" && held.has(`${e.actor_id}|${e.role}`) && (def.authority?.participant_added ?? []).includes(e.role))
      held.add(`${e.payload.actor_id}|${e.payload.role}`);
  }
  return held;
}

// Checks one candidate event against the protocol and the events before it.
// `prior` = earlier events of the same session (payload_canonical or payload), in order.
// Returns a list of problems; empty means the event is allowed.
export function checkEvent(def, prior, cand, sessionSubject) {
  const p = [];
  const e = { ...cand, payload: J(cand.payload_canonical ?? cand.payload) };
  const pr = prior.map(x => ({ ...x, payload: J(x.payload_canonical ?? x.payload) }));
  const open = def.opening ?? {};
  const where = `event ${e.seq} (${e.event_type})`;

  // 1. Opening
  if (pr.length === 0) {
    if (e.event_type !== open.event_type) p.push(`${where}: a session must begin with ${open.event_type}`);
    if (e.role !== open.role) p.push(`${where}: the session must be opened by the ${open.role}`);
    if (sessionSubject !== undefined && canonical(e.payload.subject ?? null) !== canonical(sessionSubject ?? null))
      p.push(`${where}: the signed subject does not match the session subject`);
    return p;
  }
  if (e.event_type === open.event_type) p.push(`${where}: a session can only be opened once`);

  // 2. Nothing after a terminal event
  const terms = terminalTypes(def);
  if (pr.some(x => terms.includes(x.event_type))) p.push(`${where}: the session had already ended`);

  // 3. Role actually granted by signed events
  if (!grantedRoles(def, pr).has(`${e.actor_id}|${e.role}`)) p.push(`${where}: acting as "${e.role}" without having been granted that role`);

  // 4. Authority
  const allowed = def.authority?.[e.event_type];
  if (allowed && !allowed.includes(e.role)) p.push(`${where}: only ${allowed.join(" or ")} may do this; recorded by "${e.role}"`);

  // 5. Role grants
  if (e.event_type === "participant_added") {
    if (!e.payload.actor_id) p.push(`${where}: no actor named`);
    if (!(e.payload.role in (def.roles ?? {}))) p.push(`${where}: "${e.payload.role}" is not a role in this protocol`);
  }

  // 6. Preconditions
  for (const req of def.preconditions?.[e.event_type] ?? []) {
    const [type, role] = req.split(":");
    if (!pr.some(x => x.event_type === type && (!role || x.role === role))) p.push(`${where}: requires ${req} first`);
  }

  // 7. References to earlier events
  for (const ref of def.references?.[e.event_type] ?? []) {
    const vals = ref.many ? e.payload[ref.field] : [e.payload[ref.field]];
    if (!Array.isArray(vals) || vals.length === 0 || vals.some(v => !v)) { p.push(`${where}: must reference a prior ${[].concat(ref.event_type).join(" or ")} in "${ref.field}"`); continue; }
    const types = [].concat(ref.event_type), label = types.join(" or ");
    for (const v of vals) {
      if (!pr.some(x => x.event_sha256 === v && types.includes(x.event_type))) p.push(`${where}: "${ref.field}" does not point to a prior ${label}`);
      else if (ref.acknowledged_by_actor && !pr.some(x => x.event_type === ref.acknowledged_by_actor && x.actor_id === e.actor_id && x.payload[ref.field] === v))
        p.push(`${where}: the referenced ${label} was not acknowledged first by the same person`);
    }
  }

  // 8. Allowed outcomes
  const oc = def.outcomes?.[e.event_type];
  if (oc && !oc.allowed.includes(e.payload[oc.field])) p.push(`${where}: "${e.payload[oc.field]}" is not an allowed ${oc.field}`);

  // 9. Evidence-bearing events
  const ev = def.evidence?.[e.event_type];
  if (ev) {
    if (!/^[0-9a-f]{64}$/.test(e.payload[ev.hash_field] ?? "")) p.push(`${where}: missing evidence hash`);
    for (const f of ev.required_fields ?? []) if (!e.payload[f]) p.push(`${where}: missing "${f}"`);
  }

  // 9b. Required fields for any step
  for (const f of def.fields?.[e.event_type] ?? []) {
    const v = e.payload[f];
    if (v === undefined || v === null || v === "") p.push(`${where}: missing "${f}"`);
  }

  // 10. Completion contract for terminal events
  if (def.completion?.[e.event_type]) for (const t of def.completion[e.event_type])
    if (!pr.some(x => x.event_type === t)) p.push(`${where}: cannot end the session before any ${t}`);

  return p;
}

// Whole-history check used by the verifier.
export function checkHistory(def, events, sessionSubject) {
  const problems = [];
  events.forEach((e, i) => problems.push(...checkEvent(def, events.slice(0, i), e, i === 0 ? sessionSubject : undefined)));
  const last = events.at(-1);
  if (!last) problems.push("the record has no events");
  else if (!terminalTypes(def).includes(last.event_type) && !def.open_record) problems.push(`the record is not complete: it ends at event ${last.seq} (${last.event_type}), not a closing event`);
  return problems;
}

// A rulebook with "open_record": true describes a long-running record (a life matter, a project file)
// that may be exported and verified before it closes. Such a record is verified "through event N".
export const isInterim = (def, events) => !!def.open_record && events.length > 0 && !terminalTypes(def).includes(events.at(-1).event_type);

// Evidence items referenced by signed events.
export function referencedEvidence(def, events) {
  const out = new Set();
  for (const e of events) { const ev = def.evidence?.[e.event_type]; if (ev) out.add(J(e.payload_canonical ?? e.payload)[ev.hash_field]); }
  return out;
}
