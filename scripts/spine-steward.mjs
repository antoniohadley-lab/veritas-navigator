// One-time setup: gives STAND its own signing identity on the Veritas platform.
// Usage:  SPINE_ENROLL_CODE=<code> node scripts/spine-steward.mjs
// Prints the env lines to add to STAND's server environment. The private key is shown once; keep it secret.
import { generateKeyPairSync } from "node:crypto";

const API = process.env.SPINE_API_URL ?? "https://gjwfwtwgtbolyzjqkial.supabase.co/functions/v1/spine-api";
const code = process.env.SPINE_ENROLL_CODE;
if (!code) { console.error("Set SPINE_ENROLL_CODE to an enrollment code from the Veritas platform."); process.exit(1); }

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const rawPub = publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64");
const anon = process.env.SPINE_ANON_KEY;
const res = await fetch(API, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...(anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {}) },
  body: JSON.stringify({ action: "enroll", code, display_name: "STAND", kind: "service", public_key: rawPub }),
});
const out = await res.json();
if (!res.ok || out.error) { console.error("Enrollment failed:", out.error ?? res.status); process.exit(1); }

console.log(`# STAND steward identity on the Veritas platform (created ${new Date().toISOString()})
SPINE_ENABLED=1
SPINE_STEWARD_ACTOR_ID=${out.actor_id}
SPINE_STEWARD_KEY_ID=${out.key_id}
SPINE_STEWARD_PRIVATE_KEY=${privateKey.export({ format: "der", type: "pkcs8" }).toString("base64")}`);
