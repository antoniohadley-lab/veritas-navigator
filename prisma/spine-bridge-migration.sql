-- STAND ↔ Veritas platform bridge (run after supabase-migration.sql).
-- Adds the fields STAND keeps so it can act as its own independent witness of each Matter record.

ALTER TABLE "Case"
  ADD COLUMN IF NOT EXISTS "spineSessionId"      TEXT,
  ADD COLUMN IF NOT EXISTS "spineProtocolSha256" TEXT,
  ADD COLUMN IF NOT EXISTS "spineHeadSha256"     TEXT,
  ADD COLUMN IF NOT EXISTS "holderActorId"       TEXT,
  ADD COLUMN IF NOT EXISTS "holderKeyId"         TEXT,
  ADD COLUMN IF NOT EXISTS "holderLinkTokenHash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Case_spineSessionId_key" ON "Case"("spineSessionId");

ALTER TABLE "VerificationEvent"
  ADD COLUMN IF NOT EXISTS "spineEventSha" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationEvent_spineEventSha_key" ON "VerificationEvent"("spineEventSha");

-- STAND Playbook: one row holding STAND's side of the playbook record.
CREATE TABLE IF NOT EXISTS "Playbook" (
  "id"                    TEXT PRIMARY KEY DEFAULT 'stand',
  "sessionId"             TEXT UNIQUE,
  "protocolSha256"        TEXT,
  "headSha256"            TEXT,
  "chairmanActorId"       TEXT,
  "chairmanKeyId"         TEXT,
  "chairmanLinkTokenHash" TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
