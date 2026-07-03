-- STAND / Veritas Systems & Technologies LLC
-- Supabase SQL Editor migration — paste this directly if npx prisma migrate dev
-- cannot run (binary engine blocked, no local Postgres, etc.).
--
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- This matches prisma/schema.prisma exactly as of the stand_rename migration.

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "CaseType" AS ENUM (
  'FORECLOSURE', 'EVICTION', 'CUSTODY', 'CIVIL_DISPUTE', 'OTHER'
);

CREATE TYPE "CaseStatus" AS ENUM ('ACTIVE', 'CLOSED', 'ARCHIVED');

CREATE TYPE "ServiceType" AS ENUM (
  'NOTARY', 'PROCESS_SERVICE', 'PROPERTY_INSPECTION', 'SPECIMEN_COURIER', 'OTHER'
);

CREATE TYPE "JobStatus" AS ENUM (
  'SCHEDULED', 'EN_ROUTE', 'ON_SITE', 'COMPLETED', 'MISSED', 'CANCELLED'
);

CREATE TYPE "EventType" AS ENUM (
  -- STAND Verification Check flow
  'claim_logged',
  'source_retrieved',
  'source_not_found',
  'consistency_checked',
  'result_displayed',
  'affidavit_drafted',
  'form_check_run',
  'exhibit_cross_referenced',
  'finalized',
  -- BYO AI Cross-Check flow
  'document_drafted',
  'cross_check_pass',
  'discrepancies_flagged',
  -- VROS field events
  'arrival',
  'photo_captured',
  'affidavit_executed',
  'report_exported'
);

CREATE TYPE "VerificationStatus" AS ENUM ('match', 'mismatch', 'cannot_verify');

-- Evidence-grammar tag: source of user-facing text.
-- ai_suggested_rewrite must be visibly labeled in the UI (UPL disclosure standard §8).
CREATE TYPE "ContentOrigin" AS ENUM (
  'user_entered', 'system_derived', 'ai_suggested_rewrite'
);

CREATE TYPE "RuleSourceType" AS ENUM (
  'statute', 'court_rule', 'official_form', 'administrative_rule'
);

-- ─── Case ─────────────────────────────────────────────────────────────────────

CREATE TABLE "Case" (
  "id"        TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "caseType"  "CaseType"  NOT NULL,
  "status"    "CaseStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- ─── FieldJob ─────────────────────────────────────────────────────────────────

CREATE TABLE "FieldJob" (
  "id"                   TEXT          NOT NULL,
  "caseId"               TEXT,
  "serviceType"          "ServiceType" NOT NULL,
  "clientName"           TEXT          NOT NULL,
  "location"             TEXT          NOT NULL,
  "scheduledWindowStart" TIMESTAMPTZ,
  "scheduledWindowEnd"   TIMESTAMPTZ,
  "status"               "JobStatus"   NOT NULL DEFAULT 'SCHEDULED',
  "feeQuoted"            DECIMAL(65,30),
  "feeCollected"         DECIMAL(65,30),
  "createdAt"            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT "FieldJob_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FieldJob"
  ADD CONSTRAINT "FieldJob_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── VerificationEvent ────────────────────────────────────────────────────────

CREATE TABLE "VerificationEvent" (
  "id"           TEXT          NOT NULL,
  "caseId"       TEXT,
  "fieldJobId"   TEXT,
  "actorId"      TEXT          NOT NULL,
  "roleType"     TEXT          NOT NULL,
  "eventType"    "EventType"   NOT NULL,
  "payloadType"  TEXT          NOT NULL,
  "payloadRef"   TEXT,
  "timestamp"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "geoLat"       DOUBLE PRECISION,
  "geoLng"       DOUBLE PRECISION,
  "evidenceUri"  TEXT,
  "notes"        TEXT,
  "priorEventId" TEXT,
  "evidenceHash" TEXT,

  -- source_retrieved structured fields
  "sourceUrl"        TEXT,
  "sourceTitle"      TEXT,
  "sourceTextHash"   TEXT,
  "verifiedDate"     TIMESTAMPTZ,

  -- result_displayed structured field
  "verificationStatus" "VerificationStatus",

  -- Evidence-grammar tag (required on every event with user-facing text)
  "origin" "ContentOrigin",

  CONSTRAINT "VerificationEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VerificationEvent"
  ADD CONSTRAINT "VerificationEvent_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VerificationEvent"
  ADD CONSTRAINT "VerificationEvent_fieldJobId_fkey"
  FOREIGN KEY ("fieldJobId") REFERENCES "FieldJob"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── RuleSource ───────────────────────────────────────────────────────────────

CREATE TABLE "RuleSource" (
  "id"               TEXT             NOT NULL,
  "jurisdiction"     TEXT             NOT NULL,
  "topic"            TEXT             NOT NULL,
  "sourceType"       "RuleSourceType" NOT NULL,
  "exactText"        TEXT             NOT NULL,
  "sourceUrl"        TEXT             NOT NULL,
  "lastVerifiedDate" TIMESTAMPTZ      NOT NULL,
  "staleAfterDays"   INTEGER          NOT NULL DEFAULT 45,
  "createdAt"        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT "RuleSource_pkey" PRIMARY KEY ("id")
);

-- ─── Useful indexes ──────────────────────────────────────────────────────────

CREATE INDEX "VerificationEvent_caseId_timestamp_idx"
  ON "VerificationEvent"("caseId", "timestamp");

CREATE INDEX "VerificationEvent_fieldJobId_idx"
  ON "VerificationEvent"("fieldJobId");

CREATE INDEX "RuleSource_jurisdiction_topic_idx"
  ON "RuleSource"("jurisdiction", "topic");
