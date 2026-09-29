// Types for the shared Veritas rules engine (rules.mjs is copied verbatim from the platform; do not edit it here).
export type SpineEvent = {
  seq: number; event_type: string; actor_id: string; role: string;
  payload_canonical?: string; payload?: unknown; event_sha256?: string;
  prev_event_sha256?: string | null; client_time_iso: string;
};
export function canonical(v: unknown): string;
export function eventHeader(sessionId: string, e: Omit<SpineEvent, 'payload_canonical'>, payloadSha: string): string;
export function protocolEnvelope(p: { namespace: string; name: string; version: string; definition_sha256: string }): string;
export function terminalTypes(def: unknown): string[];
export function grantedRoles(def: unknown, events: SpineEvent[]): Set<string>;
export function checkEvent(def: unknown, prior: SpineEvent[], cand: SpineEvent, sessionSubject?: unknown): string[];
export function checkHistory(def: unknown, events: SpineEvent[], sessionSubject?: unknown): string[];
export function isInterim(def: unknown, events: SpineEvent[]): boolean;
export function referencedEvidence(def: unknown, events: SpineEvent[]): Set<string>;
