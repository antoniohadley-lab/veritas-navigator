-- STAND / Veritas Systems & Technologies LLC
-- Supabase SQL Editor migration — paste this directly if npx prisma migrate dev
-- cannot run (binary engine blocked, no local Postgres, etc.).
--
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- This matches prisma/schema.prisma exactly.
-- Safe to re-run: ON CONFLICT DO NOTHING on seed inserts.

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "CaseStatus"        AS ENUM ('ACTIVE', 'CLOSED', 'ARCHIVED');
CREATE TYPE "ExtractionStatus"  AS ENUM ('PENDING', 'PROCESSED', 'FLAGGED');
CREATE TYPE "TrackType"         AS ENUM (
  'HOUSING_FORECLOSURE_EVICTION', 'MUNICIPAL_DISPUTE', 'FAMILY_CUSTODY_SUPPORT',
  'DEBT_COLLECTIONS_GARNISHMENT', 'EMPLOYMENT_HR_PAYROLL',
  'BUSINESS_FORMATION_COMPLIANCE', 'BENEFITS_AGENCY', 'VEHICLE_CONSUMER',
  'EVIDENCE_PRESERVATION', 'OTHER'
);
CREATE TYPE "TrackStatus"       AS ENUM ('ACTIVE', 'MONITORING', 'RESOLVED');
CREATE TYPE "ActorType"         AS ENUM ('PERSON', 'AGENCY', 'COURT', 'EMPLOYER', 'LENDER', 'INSTITUTION', 'OTHER');
CREATE TYPE "EventSource"       AS ENUM ('USER_ENTERED', 'SYSTEM_EXTRACTED', 'FIELD_VERIFIED');
CREATE TYPE "VerifStatus"       AS ENUM ('UNVERIFIED', 'CONFIRMED', 'CONTRADICTED', 'CANNOT_VERIFY');
CREATE TYPE "OutputType"        AS ENUM ('LEGAL_PACKET', 'IOAP', 'SESSION_BRIEF', 'ATTORNEY_HANDOFF', 'EMPLOYER_HR_PACKET', 'LENDER_UNDERWRITER_PACKET', 'FIELD_SERVICE_HANDOFF');
CREATE TYPE "AccessLevel"       AS ENUM ('PUBLIC_METADATA', 'AUTHORIZED_FULL');
CREATE TYPE "ServiceType"       AS ENUM ('NOTARY', 'PROCESS_SERVICE', 'PROPERTY_INSPECTION', 'BUSINESS_VERIFICATION', 'SPECIMEN_COURIER', 'COURT_FILING', 'OTHER');
CREATE TYPE "JobStatus"         AS ENUM ('SCHEDULED', 'EN_ROUTE', 'ON_SITE', 'COMPLETED', 'MISSED', 'CANCELLED');
CREATE TYPE "RuleSourceType"    AS ENUM ('statute', 'court_rule', 'official_form', 'administrative_rule');

-- ─── User & Session ──────────────────────────────────────────────────────────

CREATE TABLE "User" (
  "id"           TEXT        NOT NULL,
  "email"        TEXT        NOT NULL,
  "passwordHash" TEXT        NOT NULL,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "User_pkey"  PRIMARY KEY ("id"),
  CONSTRAINT "User_email" UNIQUE ("email")
);

CREATE TABLE "UserSession" (
  "id"        TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "token"     TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "UserSession_pkey"  PRIMARY KEY ("id"),
  CONSTRAINT "UserSession_token" UNIQUE ("token")
);

ALTER TABLE "UserSession"
  ADD CONSTRAINT "UserSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Case ─────────────────────────────────────────────────────────────────────

CREATE TABLE "Case" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "status"    "CaseStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Case"
  ADD CONSTRAINT "Case_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── NarrativeEntry ──────────────────────────────────────────────────────────

CREATE TABLE "NarrativeEntry" (
  "id"               TEXT               NOT NULL,
  "caseId"           TEXT               NOT NULL,
  "rawText"          TEXT               NOT NULL,
  "enteredAt"        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  "sessionId"        TEXT,
  "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',

  CONSTRAINT "NarrativeEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "NarrativeEntry"
  ADD CONSTRAINT "NarrativeEntry_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── IssueTrack ───────────────────────────────────────────────────────────────

CREATE TABLE "IssueTrack" (
  "id"               TEXT          NOT NULL,
  "caseId"           TEXT          NOT NULL,
  "narrativeEntryId" TEXT,
  "trackType"        "TrackType"   NOT NULL,
  "status"           "TrackStatus" NOT NULL DEFAULT 'ACTIVE',
  "urgencySignal"    BOOLEAN       NOT NULL DEFAULT FALSE,
  "urgencyNote"      TEXT,
  "createdAt"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT "IssueTrack_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "IssueTrack"
  ADD CONSTRAINT "IssueTrack_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IssueTrack"
  ADD CONSTRAINT "IssueTrack_narrativeEntryId_fkey"
  FOREIGN KEY ("narrativeEntryId") REFERENCES "NarrativeEntry"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Actor ────────────────────────────────────────────────────────────────────

CREATE TABLE "Actor" (
  "id"          TEXT        NOT NULL,
  "caseId"      TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "actorType"   "ActorType" NOT NULL,
  "role"        TEXT,
  "contactInfo" TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "Actor_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Actor"
  ADD CONSTRAINT "Actor_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── TimelineEvent ────────────────────────────────────────────────────────────

CREATE TABLE "TimelineEvent" (
  "id"               TEXT           NOT NULL,
  "caseId"           TEXT           NOT NULL,
  "issueTrackId"     TEXT,
  "narrativeEntryId" TEXT,
  "eventDate"        TIMESTAMPTZ,
  "eventDateRaw"     TEXT,
  "description"      TEXT           NOT NULL,
  "actorNames"       TEXT,
  "documentRef"      TEXT,
  "entrySource"      "EventSource"  NOT NULL DEFAULT 'USER_ENTERED',
  "createdAt"        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TimelineEvent"
  ADD CONSTRAINT "TimelineEvent_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimelineEvent"
  ADD CONSTRAINT "TimelineEvent_issueTrackId_fkey"
  FOREIGN KEY ("issueTrackId") REFERENCES "IssueTrack"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TimelineEvent"
  ADD CONSTRAINT "TimelineEvent_narrativeEntryId_fkey"
  FOREIGN KEY ("narrativeEntryId") REFERENCES "NarrativeEntry"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Claim ────────────────────────────────────────────────────────────────────

CREATE TABLE "Claim" (
  "id"                 TEXT          NOT NULL,
  "caseId"             TEXT          NOT NULL,
  "issueTrackId"       TEXT,
  "narrativeEntryId"   TEXT,
  "claimText"          TEXT          NOT NULL,
  "enteredAt"          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "verificationStatus" "VerifStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "sourceUrl"          TEXT,
  "sourceTitle"        TEXT,
  "sourceTextHash"     TEXT,
  "verifiedAt"         TIMESTAMPTZ,
  "verifiedBy"         TEXT,
  "priorClaimId"       TEXT,

  CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Claim"
  ADD CONSTRAINT "Claim_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Claim"
  ADD CONSTRAINT "Claim_issueTrackId_fkey"
  FOREIGN KEY ("issueTrackId") REFERENCES "IssueTrack"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Claim"
  ADD CONSTRAINT "Claim_narrativeEntryId_fkey"
  FOREIGN KEY ("narrativeEntryId") REFERENCES "NarrativeEntry"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── CaseDocument ─────────────────────────────────────────────────────────────

CREATE TABLE "CaseDocument" (
  "id"           TEXT        NOT NULL,
  "caseId"       TEXT        NOT NULL,
  "filename"     TEXT        NOT NULL,
  "mimeType"     TEXT        NOT NULL,
  "storageUri"   TEXT        NOT NULL,
  "fileHash"     TEXT        NOT NULL,
  "uploadedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "uploadedBy"   TEXT        NOT NULL,
  "description"  TEXT,
  "exhibitLabel" TEXT,

  CONSTRAINT "CaseDocument_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CaseDocument"
  ADD CONSTRAINT "CaseDocument_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── VerificationEvent ────────────────────────────────────────────────────────
-- Immutable event log shared by STAND platform and VROS field visits.
-- eventType values (platform): fact_statement_drafted | claim_logged |
--   source_retrieved | form_check_run | exhibit_cross_referenced | finalized |
--   output_generated | upl_checkpoint_triggered
-- eventType values (field): arrival | photo_captured | affidavit_executed |
--   report_exported | custody_accepted | destination_reached | custody_transferred

CREATE TABLE "VerificationEvent" (
  "id"           TEXT        NOT NULL,
  "caseId"       TEXT,
  "claimId"      TEXT,
  "fieldJobId"   TEXT,
  "actorId"      TEXT        NOT NULL,
  "roleType"     TEXT        NOT NULL,
  "eventType"    TEXT        NOT NULL,
  "payloadType"  TEXT        NOT NULL,
  "payloadRef"   TEXT,
  "timestamp"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "geoLat"       DOUBLE PRECISION,
  "geoLng"       DOUBLE PRECISION,
  "evidenceUri"  TEXT,
  "notes"        TEXT,
  "priorEventId" TEXT,
  "evidenceHash" TEXT,
  "verifiedBy"   TEXT,

  CONSTRAINT "VerificationEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VerificationEvent"
  ADD CONSTRAINT "VerificationEvent_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VerificationEvent"
  ADD CONSTRAINT "VerificationEvent_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "Claim"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VerificationEvent"
  ADD CONSTRAINT "VerificationEvent_fieldJobId_fkey"
  FOREIGN KEY ("fieldJobId") REFERENCES "FieldJob"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Output ───────────────────────────────────────────────────────────────────

CREATE TABLE "Output" (
  "id"                  TEXT           NOT NULL,
  "caseId"              TEXT           NOT NULL,
  "outputType"          "OutputType"   NOT NULL,
  "generatedAt"         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "generatedBy"         TEXT           NOT NULL,
  "snapshotHash"        TEXT           NOT NULL,
  "storageUri"          TEXT,
  "accessLevel"         "AccessLevel"  NOT NULL DEFAULT 'AUTHORIZED_FULL',
  "publicMetadataToken" TEXT,
  "tokenExpiresAt"      TIMESTAMPTZ,

  CONSTRAINT "Output_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Output"
  ADD CONSTRAINT "Output_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── FieldJob ─────────────────────────────────────────────────────────────────

CREATE TABLE "FieldJob" (
  "id"                   TEXT          NOT NULL,
  "caseId"               TEXT,
  "assignmentNumber"     TEXT          NOT NULL,
  "serviceType"          "ServiceType" NOT NULL,
  "clientName"           TEXT          NOT NULL,
  "location"             TEXT          NOT NULL,
  "scheduledWindowStart" TIMESTAMPTZ,
  "scheduledWindowEnd"   TIMESTAMPTZ,
  "status"               "JobStatus"   NOT NULL DEFAULT 'SCHEDULED',
  "feeQuoted"            DECIMAL(65,30),
  "feeCollected"         DECIMAL(65,30),
  "createdAt"            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT "FieldJob_pkey"             PRIMARY KEY ("id"),
  CONSTRAINT "FieldJob_assignmentNumber" UNIQUE ("assignmentNumber")
);

ALTER TABLE "FieldJob"
  ADD CONSTRAINT "FieldJob_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── ContractorProfile ────────────────────────────────────────────────────────

CREATE TABLE "ContractorProfile" (
  "id"              TEXT        NOT NULL,
  "legalName"       TEXT        NOT NULL,
  "idVerified"      BOOLEAN     NOT NULL DEFAULT FALSE,
  "ageVerified"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "agreementSigned" BOOLEAN     NOT NULL DEFAULT FALSE,
  "agreementDate"   TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "ContractorProfile_pkey" PRIMARY KEY ("id")
);

-- ─── RuleSource ───────────────────────────────────────────────────────────────

CREATE TABLE "RuleSource" (
  "id"               TEXT               NOT NULL,
  "jurisdiction"     TEXT               NOT NULL,
  "topic"            TEXT               NOT NULL,
  "sourceType"       "RuleSourceType"   NOT NULL,
  "exactText"        TEXT               NOT NULL,
  "sourceUrl"        TEXT               NOT NULL,
  "lastVerifiedDate" TIMESTAMPTZ        NOT NULL,
  "verifiedBy"       TEXT,
  "staleAfterDays"   INTEGER            NOT NULL DEFAULT 45,
  "createdAt"        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

  CONSTRAINT "RuleSource_pkey" PRIMARY KEY ("id")
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX "UserSession_userId_idx"                  ON "UserSession"("userId");
CREATE INDEX "Case_userId_idx"                         ON "Case"("userId");
CREATE INDEX "NarrativeEntry_caseId_idx"               ON "NarrativeEntry"("caseId");
CREATE INDEX "IssueTrack_caseId_idx"                   ON "IssueTrack"("caseId");
CREATE INDEX "Actor_caseId_idx"                        ON "Actor"("caseId");
CREATE INDEX "TimelineEvent_caseId_eventDate_idx"      ON "TimelineEvent"("caseId", "eventDate");
CREATE INDEX "TimelineEvent_issueTrackId_idx"          ON "TimelineEvent"("issueTrackId");
CREATE INDEX "Claim_caseId_idx"                        ON "Claim"("caseId");
CREATE INDEX "Claim_issueTrackId_idx"                  ON "Claim"("issueTrackId");
CREATE INDEX "CaseDocument_caseId_idx"                 ON "CaseDocument"("caseId");
CREATE INDEX "VerificationEvent_caseId_timestamp_idx"  ON "VerificationEvent"("caseId", "timestamp");
CREATE INDEX "VerificationEvent_claimId_idx"           ON "VerificationEvent"("claimId");
CREATE INDEX "VerificationEvent_fieldJobId_idx"        ON "VerificationEvent"("fieldJobId");
CREATE INDEX "Output_caseId_idx"                       ON "Output"("caseId");
CREATE INDEX "RuleSource_jurisdiction_topic_idx"       ON "RuleSource"("jurisdiction", "topic");

-- ─── RuleSource seed data ─────────────────────────────────────────────────────
-- ON CONFLICT DO NOTHING is safe to re-run.

INSERT INTO "RuleSource" ("id","jurisdiction","topic","sourceType","exactText","sourceUrl","lastVerifiedDate","verifiedBy","staleAfterDays","createdAt","updatedAt")
VALUES
-- Housing & Eviction
('seed-001','michigan','eviction notice period nonpayment','statute',
 'If a tenant fails to pay the rent when due and the landlord desires to terminate the tenancy, the landlord may demand payment of the rent and give notice in writing that if the rent is not paid within 7 days after the notice is given, the lease or rental agreement is terminated.',
 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-554-134',
 '2026-06-01',NULL,45,NOW(),NOW()),

('seed-002','michigan','eviction notice period holdover month to month','statute',
 'To terminate a month-to-month tenancy or a tenancy at will, the landlord shall give the tenant written notice 30 days or 1 rental period, whichever is greater, before termination of the tenancy.',
 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-554-134',
 '2026-06-01',NULL,45,NOW(),NOW()),

-- FOIA
('seed-003','michigan','foia state local response window','statute',
 'Within 5 business days after receiving a written request for a public record, a public body shall grant or deny the request, unless the request includes a demand for records not subject to disclosure under this act.',
 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-15-235',
 '2026-06-01',NULL,45,NOW(),NOW()),

('seed-004','michigan','foia extension period','statute',
 'A public body may extend the period to grant or deny a request by up to 10 business days by notifying the requesting person in writing within the original 5 business day period and stating the specific reasons for the extension.',
 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-15-235',
 '2026-06-01',NULL,45,NOW(),NOW()),

('seed-005','federal','foia federal response window','statute',
 'Each agency, upon any request for records made under paragraph (1), (2), or (3) of this subsection, shall determine within 20 days (excepting Saturdays, Sundays, and legal public holidays) after the receipt of any such request whether to comply with such request.',
 'https://www.law.cornell.edu/uscode/text/5/552',
 '2026-06-01',NULL,45,NOW(),NOW()),

-- Debt Collection
('seed-006','federal','fdcpa debt validation window','statute',
 'If the consumer notifies the debt collector in writing within the thirty-day period described in subsection (a) that the debt, or any portion thereof, is disputed, or that the consumer requests the name and address of the original creditor, the debt collector shall cease collection of the debt.',
 'https://www.law.cornell.edu/uscode/text/15/1692g',
 '2026-06-01',NULL,45,NOW(),NOW()),

-- Other Civil
('seed-007','michigan','surplus foreclosure proceeds','statute',
 'If the amount received at the foreclosure sale exceeds the amount of the debt, together with interest, costs, and expenses of the sale, the excess shall be paid to the mortgagor, or the mortgagor''s assigns, heirs, or legal representatives.',
 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-600-3252',
 '2026-06-01',NULL,45,NOW(),NOW()),

('seed-008','michigan','child custody domicile change notice','statute',
 'A parent of a child whose custody is governed by court order shall not change the legal residence of the child to a location that is more than 100 miles from the child''s legal residence at the time of the commencement of the action in which the order is issued without the consent of the other parent or a court order.',
 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-722-31',
 '2026-06-01',NULL,45,NOW(),NOW()),

('seed-009','michigan','security deposit return deadline','statute',
 'Within 30 days after termination of the tenancy and receipt of the tenant''s forwarding address, the landlord shall deliver to the tenant the full security deposit or, if an amount is withheld, an itemized list of any damages claimed and an explanation of the reason for the deduction.',
 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-554-609',
 '2026-06-01',NULL,45,NOW(),NOW()),

('seed-010','michigan','eviction summons response period','court_rule',
 'A defendant in a summary proceeding for possession of premises must appear and defend at the hearing scheduled in the summons. The summons must specify a hearing date that is no sooner than 5 days and no later than 10 days after service.',
 'https://courts.michigan.gov/siteassets/rules-instructions-administrative-orders/michigan-court-rules/court-rules-book-ch-4-responsive-html5.htm#4.201',
 '2026-06-01',NULL,45,NOW(),NOW()),

-- Business Formation
('seed-011','federal','business formation ein employer identification number','statute',
 'An Employer Identification Number (EIN) is a unique nine-digit number assigned by the IRS to identify business entities for federal tax purposes. EINs are issued free of charge by the Internal Revenue Service. Online applications completed at IRS.gov are processed immediately — an EIN is issued during the same online session. The application is available to businesses whose principal place of business is in the United States or a U.S. Territory. There is no fee to apply for or receive an EIN.',
 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online',
 '2026-07-01',NULL,45,NOW(),NOW()),

('seed-012','michigan','michigan llc entity registration lara articles of organization','statute',
 'To form a Michigan Limited Liability Company, Articles of Organization must be filed with the Michigan Department of Licensing and Regulatory Affairs (LARA), Corporations, Securities & Commercial Licensing Bureau (CSCL). The current state filing fee for LLC Articles of Organization is $50.00, paid directly to LARA — this is a government fee separate from any service fee. The Articles of Organization form (CSCL/CD-700) is available on the LARA website. A Michigan LLC comes into existence upon the effective date stated in the Articles of Organization or, if no date is stated, upon LARA''s filing of the document.',
 'https://www.michigan.gov/lara/bureau-list/bcs/corps/forms',
 '2026-07-01',NULL,45,NOW(),NOW()),

('seed-013','federal','uei unique entity identifier sam.gov federal contracts grants','administrative_rule',
 'Effective April 4, 2022, the federal government replaced the DUNS Number with the Unique Entity Identifier (UEI) for all SAM.gov registrations, federal contracts, federal grants, and cooperative agreements. The UEI is a 12-character alphanumeric identifier created in SAM.gov. Registration in SAM.gov and obtaining a UEI is free of charge. The UEI is required only for entities seeking federal contracts, federal grants, or other federal financial assistance. It is not required for general business formation, state-level licensing, or commercial trade credit. The UEI does not replace the DUNS Number for D&B credit file purposes — those are two separate systems serving different purposes.',
 'https://sam.gov/content/duns-migration',
 '2026-07-01',NULL,45,NOW(),NOW()),

('seed-014','federal','duns number dun bradstreet trade credit business identity','administrative_rule',
 'A DUNS (Data Universal Numbering System) Number is a unique nine-digit identifier issued by Dun & Bradstreet (D&B) for business entities. The DUNS Number is free to obtain directly from D&B at dnb.com. The DUNS Number is not deprecated and has not been replaced by the federal UEI — they are two separate identifiers serving different purposes. The DUNS Number anchors a business''s D&B credit file and PAYDEX score, which is relevant for vendor trade credit (net-30/net-60 accounts), business loan applications, and requirements set by specific large vendors or partners. PAYDEX development requires at minimum 3 reported trade payment experiences and typically 6 to 12 months of payment history to build meaningfully. D&B offers paid Credit Insights products layered on top of the free DUNS number; the DUNS Number itself costs nothing.',
 'https://www.dnb.com/duns-number.html',
 '2026-07-01',NULL,45,NOW(),NOW()),

('seed-015','michigan','michigan sales use tax registration michigan treasury online mto','administrative_rule',
 'A Michigan Sales Tax License is required for any business that sells taxable tangible personal property or taxable services in Michigan. Registration is completed through Michigan Treasury Online (MTO) at www.michigan.gov/taxes. Registration for a sales tax license is free of charge. A separate license is required per business location. The use tax registration is combined in the same MTO application. Registration must be completed before the first taxable sale is made.',
 'https://www.michigan.gov/taxes/sales-use/registration',
 '2026-07-01',NULL,45,NOW(),NOW()),

('seed-016','michigan','certificate of assumed name dba michigan llc sole proprietor','statute',
 'A Michigan limited liability company or corporation that conducts business under a name other than its legal name must file a Certificate of Assumed Name (form CSCL/CD-4541) with the Michigan Department of Licensing and Regulatory Affairs. Sole proprietorships and general partnerships operating under an assumed name in Michigan must file an assumed name certificate with the county clerk in the county where the business is principally conducted. The appropriate filing location depends on the entity type — confirm entity type before selecting the filing path, as LLC/corporation filers use LARA and sole proprietorship/partnership filers use the county clerk.',
 'https://www.michigan.gov/lara/bureau-list/bcs/corps/assumed-name',
 '2026-07-01',NULL,45,NOW(),NOW()),

('seed-017','michigan','michigan uia unemployment insurance agency employer registration employees','statute',
 'A Michigan employer is required to register with the Michigan Unemployment Insurance Agency (UIA) when: (1) the employer has paid wages of $1,000 or more in any calendar quarter in the current or preceding calendar year; or (2) the employer has employed one or more individuals in 20 or more different calendar weeks in the current or preceding calendar year. A single-member LLC with no employees is generally not required to register. Registration is completed through MiWAM (Michigan Web Account Manager) at www.michigan.gov/uia.',
 'https://www.michigan.gov/uia/employers/new-employer-resources',
 '2026-07-01',NULL,45,NOW(),NOW()),

-- HIGH VOLATILITY — staleAfterDays: 30 (monthly recheck)
('seed-018','federal','beneficial ownership information boi fincen corporate transparency act domestic exemption','statute',
 'Under the Corporate Transparency Act (31 U.S.C. § 5336) and FinCEN''s implementing regulations, an interim final rule effective March 21, 2025 exempts domestic entities — including domestic corporations, LLCs, and other entities created by filing with a U.S. state or tribal government — from Beneficial Ownership Information (BOI) reporting requirements. As of this entry''s verified date, only foreign entities registering to do business in the United States are required to file BOI reports with FinCEN. IMPORTANT: This exemption has changed multiple times since 2024. A final FinCEN rulemaking is expected in 2026 that could reinstate the domestic filing requirement with little advance notice. Domestic entities should monitor FinCEN.gov for any changes. This entry is rechecked monthly due to high regulatory volatility.',
 'https://www.fincen.gov/boi',
 '2026-07-01',NULL,30,NOW(),NOW())

ON CONFLICT ("id") DO NOTHING;
