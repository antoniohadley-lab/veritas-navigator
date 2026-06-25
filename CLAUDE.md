# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Project Is

**Veritas Navigator + VROS** are two entry points into one shared event ledger — not two products.

- **Navigator** — AI-assisted Michigan legal self-help navigation. No geography limit. Guides residents through disputes using a structured triage flow, builds a verified Timeline, generates the Factual Packet, and hands off to VROS when physical action is needed.
- **VROS (Veritas Route Operations System)** — Field execution engine with a hard ~25-mile radius limit (4,000–10,000 people). Converts Navigator trust and data into paid physical action: mobile notary, process service, property inspection, specimen courier.

Navigator's job is to generate trust and structured data at near-zero marginal cost. VROS's job is to convert a fraction of that trust into paid physical action inside the corridor. Every screen and every table below exists to make that handoff automatic instead of a cold call.

Navigator is **not a law firm**. It describes routes, deadlines, and commonly-used procedures — it never gives legal opinions, predictions, or strategy. Every behavioral rule in this codebase enforces that line.

---

## Immediate Priorities (Read Before Writing Any Code)

### Build Order
1. **Shared data layer first** — `Case`, `FieldJob`, `VerificationEvent` tables (Prisma schema at `prisma/schema.prisma`). Do not build UI that generates events until these tables exist.
2. **Housing & Eviction end-to-end** — Layers 1 → 2 → 3 → Stripe payment gate → Factual Packet export → Shield conversion offer. This is the first full Navigator case flow.
3. **Handoff button** — "I need this served / notarized / documented" trigger that creates a `FieldJob` row linked to the `Case`. Even if it just creates the row and texts the founder, ship it.
4. **Stop and confirm with the founder** before adding any other Navigator category or VROS service type.

Live Stripe payment is included now (not deferred). The founder has funded Stripe setup for Veritas Systems & Technologies L.L.C. Charge for the Factual Packet before generating it.

Pricing: **$0** for Free tier (case intake, manual timeline, BYO AI cross-check template). **$4.99/month** for Veritas Shield. **$15.00 flat, one-time** for the Factual Packet. **$99/month per attorney** for Professional License (B2B portal seat). No itemized packet breakdown — same price regardless of which components are needed.

---

## Architecture

### Routing Conventions
- `/navigator` — chat UI page (triage flow)
- `/api/chat` — AI response endpoint (Next.js App Router)

### The Three-Layer Triage Flow

The conversation is structured into three mandatory layers enforced as **application state**, not AI memory:

| Layer | Content | Cost |
|-------|---------|------|
| **Layer 1** — Universal Intake | What kind of notice? Who sent it? What does it ask and by when? | Free |
| **Layer 2** — Category Narrowing | Open, neutral status/narrative/time-sensitivity questions per category | Free |
| **Layer 3** — Fact Collection | Specific facts for the relevant document (names, dates, amounts, case numbers) | Free until complete |
| **Payment Gate** | Stripe pre-flight checklist → charge | Paid |
| **Document Delivery** | Factual Packet export | Output of paid step |

**Hard rule:** Navigator must not offer or generate a paid document until `completed_fields` matches `required_fields` for the specific form. Never assume, infer, or skip facts to reduce friction.

### Application State Per Case (`case_id`)

Every case tracks these fields from Day One — do not defer this data model:

```
case_id              unique matter identifier
current_layer        'layer1' | 'layer2' | 'layer3' | 'payment' | 'document-delivery' | 'resolved'
category             Layer 1 output (e.g. 'housing_eviction')
subcategory          Layer 2 narrowing result
required_fields      full set of facts Layer 3 needs for the relevant document
completed_fields     which required fields have been collected
payment_status       'unpaid' | 'paid' | 'refunded' | 'failed'
document_status      'not_generated' | 'generated' | 'delivered'
classification_log   array of per-turn { turn_id, classification: 'green'|'yellow'|'red', timestamp }
shield_offered       boolean
shield_converted     boolean
shield_conversion_date timestamp
```

Outcome fields (populated over 30/60/90 days post-resolution):
```
outcome_30_day       'resolved' | 'pending' | 'escalated' | 'unknown'
outcome_60_day
outcome_90_day
user_satisfaction    1-5 scale, anonymized
additional_filings   boolean
escalation_events    description of escalation if any
final_disposition    last known state
```

### Where Behavior Rules Live in Code

- **System prompt for `/api/chat`** — Truth Mode, GPS Standard, disclosure triggers, triage questions, referral rules, Green/Yellow/Red classification instructions.
- **Persistent UI element** — Tier 1 disclosure text rendered as a footer under the chat input, not generated by the AI each turn: *"Veritas Navigator is not a law firm and does not provide legal advice. This is a navigation and document-organization tool."*
- **Application logic** — Layer state machine, `completed_fields` vs `required_fields` check, payment gate, Yellow-tier pause, Shield conversion trigger.

---

## Shared Core Data Layer (Prisma)

All data lives in Postgres via Prisma. The `VerificationEvent` table is the connective tissue — Navigator events and VROS field events write to the same table, linked by foreign key.

```prisma
model Case {
  id          String     @id @default(cuid())
  userId      String
  caseType    CaseType
  status      CaseStatus @default(ACTIVE)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  fieldJobs   FieldJob[]
  events      VerificationEvent[]
}

enum CaseType {
  FORECLOSURE
  EVICTION
  CUSTODY
  CIVIL_DISPUTE
  OTHER
}

enum CaseStatus {
  ACTIVE
  CLOSED
  ARCHIVED
}

model FieldJob {
  id                   String      @id @default(cuid())
  caseId               String?     // null = booked directly, not from a Navigator case
  case                 Case?       @relation(fields: [caseId], references: [id])
  serviceType          ServiceType
  clientName           String
  location             String
  scheduledWindowStart DateTime?
  scheduledWindowEnd   DateTime?
  status               JobStatus   @default(SCHEDULED)
  feeQuoted            Decimal?
  feeCollected         Decimal?
  createdAt            DateTime    @default(now())
  events               VerificationEvent[]
}

enum ServiceType {
  NOTARY
  PROCESS_SERVICE
  PROPERTY_INSPECTION
  SPECIMEN_COURIER
  OTHER
}

enum JobStatus {
  SCHEDULED
  EN_ROUTE
  ON_SITE
  COMPLETED
  MISSED
  CANCELLED
}

model VerificationEvent {
  id           String    @id @default(cuid())
  caseId       String?
  case         Case?     @relation(fields: [caseId], references: [id])
  fieldJobId   String?
  fieldJob     FieldJob? @relation(fields: [fieldJobId], references: [id])
  actorId      String
  roleType     String    // "litigant" | "notary" | "process_server" | "inspector"
  eventType    String    // "document_drafted" | "arrival" | "photo_captured" | "affidavit_executed" ...
  payloadType  String    // "document" | "property" | "specimen" | "case_note"
  payloadRef   String?
  timestamp    DateTime  @default(now())
  geoLat       Float?
  geoLng       Float?
  evidenceUri  String?
  notes        String?
  priorEventId String?
  evidenceHash String?   // SHA-256, computed at write time
}
```

**Factual Packet export rule:** Pull all `VerificationEvent` rows where `caseId = X` — across both the Case's own events AND any FieldJob attached to it — ordered by `timestamp`, rendered to PDF. One query, one document, regardless of whether events came from a self-service drafting session or a field visit.

**Reverse case (VROS → Navigator):** A `FieldJob` booked with no Case behind it can later be converted into a Case if the client wants ongoing documentation. Same tables, populated in the other order.

---

## Navigator Core Modules

- **Case Intake** — caseType, basic facts, what outcome they're trying to reach. Maps to Layer 1/2/3 triage flow.
- **Timeline Builder** — chronological event log the user builds themselves: uploads, notes, dates. Each entry is a `VerificationEvent` with `roleType: "litigant"`.
- **AI Cross-Check Workflow** — *Not a hosted AI feature.* A guided template: "Draft this affidavit in [ChatGPT/Gemini/Claude free tier], then paste it into a second tool and ask it only to check for internal consistency — do the dates match, are names spelled the same way throughout, is anything referenced but missing?" Zero AI hosting cost. The workflow result is logged as events: `document_drafted` → `cross_check_pass` or `discrepancies_flagged` → `finalized`. The cross-check template explicitly forbids: generating legal arguments, citing case law, or recommending a course of action. Internal consistency only.
- **Document Vault (Shield)** — stores uploaded evidence, hashed on intake (`evidenceHash` field).
- **Factual Packet Export** — compiles the Case's full `VerificationEvent` history into a printable PDF. This is the paid $15 deliverable.
- **"I need this served / notarized / documented" button** — the handoff trigger into VROS (see Handoff section).

### Hard guardrails (build into UI copy, not just the privacy policy)
- Every screen that touches drafting: *"This tool organizes your information. It does not tell you what to argue or whether your case is strong. For legal advice, consult an attorney."*
- The AI Cross-Check template instructions explicitly forbid generating legal arguments, citing case law, or recommending a course of action.
- No screen ever says "Veritas recommends" anything about strategy.

---

## VROS — Field Execution Engine

**Audience:** people and entities inside the ~25-mile physical radius who need something done in person.
**Job:** convert trust into a paid physical action, priced at real market rate, not software rate.

### Job types
- Mobile notary (including hospital/jail/care facility)
- Process service
- Property/asset inspection
- Specimen courier (parallel track, once BAA/insurance paperwork is in place)

### Field execution workflow
1. **Booking** — name, address, service type, time window, billing method. Creates a `FieldJob` row.
2. **En route / Arrival** — `VerificationEvent` with `eventType: "arrival"`, geo-stamped automatically.
3. **On-site capture** — photos (exterior/interior/document/ID as relevant), notes. Each is a `VerificationEvent`.
4. **Completion** — `eventType: "affidavit_executed"` or `"report_exported"`, payment collected.
5. Every event writes to the same `VerificationEvent` table as Navigator. `fieldJobId` always set; `caseId` also set if this job originated from a Navigator handoff.

### VROS pricing (anchored to real market rate, never flat software pricing)
| Service | Price | Note |
|---|---|---|
| Mobile notary | $50–150/visit | Statutory per-signature fee is small; travel/convenience fee is uncapped |
| Process service | Local market rate | Check current comps in your county |
| Property inspection | $35–75/property direct | Verified market comp — avoid vendor networks, which pay $3–10 |
| + Verification premium | +$15–25 on any of the above | The hash/GPS-stamp/Factual Packet layer — charged on top, never standing alone |

### Route batching
Group same-day jobs by geography before leaving the house. Manual is correct for now — there is only one field agent. Do not build automated standby rerouting until there is a second field agent to reroute to.

---

## The Handoff — Exact Mechanics

**Trigger:** inside an active Navigator Case, the user taps "I need this served / notarized / documented."

**What happens:**
1. A `FieldJob` row is created with `caseId` set to the originating `Case.id`.
2. The Case's existing data (names, address, document type, what's needed) pre-fills the booking — no re-collecting information, no cold call.
3. The field rate is quoted (VROS pricing above) — this is a separate transaction from anything paid to Navigator, billed at field rates.
4. On completion, the `FieldJob`'s `VerificationEvent`s are already linked back to the Case by foreign key — no extra step for them to appear in the next Factual Packet.

---

## Behavioral Rules (Enforced in the System Prompt)

### Truth Mode
- Never inflate urgency, odds of success, or outcomes to motivate a purchase.
- Never say a user "will win," "has a strong case," or "should" take a specific legal action.
- State facts, deadlines, and commonly-used procedures — not predictions or judgments.
- If information is missing, ask — do not guess.
- If a paid product genuinely isn't needed, say so. Do not manufacture a reason to upsell.

### GPS Standard (Green / Yellow / Red)
Every response is classified before delivery:

- **Green** — describes route only: facts, deadlines, document names, common next steps, pre-filled factual form fields. Auto-delivered.
- **Yellow** — borderline, close to but not yet crossing into legal judgment. Triggers the Yellow State Machine (see Technical Guardrails).
- **Red** — crosses into legal judgment, prediction, strategy, or argument-writing. Blocked; user routed to licensed counsel or free legal aid/court self-help resources.

**The test:** A GPS describes the route and the distance. It never tells the driver *why* to go somewhere or whether they *should* go. Navigator does the same — what the document is, what deadline applies, what people in this situation commonly do next. Never what decision to make, what argument to use, or what the outcome will be.

**Motion rule (resolved June 19, 2026):** Navigator identifies the exact motion type, locates the correct official Michigan court form, and pre-fills every factual field (names, dates, case number, court, deadline) from confirmed case data. Navigator does not write the argument paragraph — the substantive legal reasoning for why the motion should be granted. Where the argument paragraph is needed, Navigator names the specific free resource (legal aid or court self-help center) where the user can get that completed.

### Disclosure Structure
- **Tier 1 (passive):** Always present as a UI element, not repeated by the AI in message bodies.
- **Tier 2 (active):** Triggers only when a user directly asks for a legal opinion or prediction ("Will I win?", "What should I do?"). At that moment only, Navigator redirects plainly: it cannot answer because that would be legal advice, while still providing any relevant factual information.

---

## Jurisdiction Clock Restraint Rule

**Source:** Veritas Jurisdiction Clock Restraint Rule (June 2026, Veritas Systems Group L.L.C.)

All user-facing statutory deadline numbers live in **`lib/jurisdiction-clocks.ts`** — the Connector layer. No deadline day-count may be generated by the AI model at runtime, even if the model sounds confident and correct. Generating a number too short or too long is equally a violation.

### Engineering enforcement
- Any UI string that states a deadline must be template-filled from `lib/jurisdiction-clocks.ts`, keyed by `public_body_type` or matter category.
- The AI system prompt includes the verified table values so the model only cites them — it is also instructed never to generate a day-count outside the table.
- If jurisdiction type is unknown at the time the deadline is needed: ask the user, or display both applicable rows — never silently default to either.

### Adding a new entry
Verify the day-count directly against the current statute text. Do not pattern-match from a similar jurisdiction or infer from "most states are around X days." Add the entry only after direct statutory verification.

### Currently verified entries in `lib/jurisdiction-clocks.ts`

| Key | Statute | Days | Unit | Extension |
|-----|---------|------|------|-----------|
| `FOIA_CLOCKS.michigan_state_local` | MCL 15.231 et seq. | 5 | business days | +10 w/ written notice |
| `FOIA_CLOCKS.federal` | 5 U.S.C. § 552 | 20 | business days | +10, unusual circumstances |
| `NOTICE_TO_QUIT_CLOCKS.michigan_nonpayment` | MCL 554.134(1) | 7 | calendar days | — |
| `NOTICE_TO_QUIT_CLOCKS.michigan_holdover_monthly` | MCL 554.134(1) | 30 | calendar days | — |
| `DEBT_COLLECTION_CLOCKS.fdcpa_validation_window` | 15 U.S.C. § 1692g | 30 | calendar days | — |

---

## Technical Guardrails (Deterministic — Not AI Behaviors)

### H1 — Layer 2 Narrative Pre-Processing
Before any open-ended Layer 2 user text reaches the AI model, a lightweight classifier must:
1. Reduce the input to structured factual tokens: `[Target entity], [Action type], [Timeline markers], [Document type if mentioned]`
2. Check for adversarial prompt injection patterns (role-play requests, "ignore previous instructions," attempts to elicit legal judgments)
3. Pass the structured token list to Navigator — not the raw emotional paragraph

### H2 — Yellow Tier State Machine
When a response is classified Yellow:
1. The chat input pauses immediately.
2. A static pre-written UI block renders: *"This matter includes a question that requires a standard compliance verification before we continue."*
3. The conversation payload is dispatched to the Veritas internal review queue.
4. The user is offered: (a) opt-in to SMS/email notification when review completes (target: under 4 business hours), or (b) browse the free localized resources panel (legal aid contacts, court self-help links for their county).
5. No AI response is delivered until a human reviewer clears the Yellow classification.

### H3 — Pre-Flight Checklist Before Stripe
Before any Stripe API call, the UI renders a static summary generated from `completed_fields` — no AI-generated text:

```
Verify Your Details Before Purchasing
- Category: [confirmed category]
- Document Type: [specific named document]
- Controlling Deadline: [exact date and days remaining]
- Key Facts Confirmed: [list of completed_fields]

[ Confirm and Proceed to Secure Payment ($XX) ]  |  [ Go Back and Edit ]
```

"Go Back and Edit" must be functional. The payment gate is a confirmation boundary, not a point of no return.

---

## Post-Resolution: Shield Conversion

When `current_layer` transitions to `'resolved'`:
1. Navigator acknowledges resolution plainly (no inflation).
2. Immediately presents the Shield offer as a factual next step: *"Veritas Shield monitors for new notices, bills, and legal contacts on your behalf for $4.99/month. If something arrives, you're already in the system — no starting over. Would you like to keep Shield active?"*
3. **Keep Shield Active** → create a new Stripe subscription at $4.99/month against the existing payment method; update `shield_converted = true`, `payment_status = 'active'` for Shield.
4. **No thanks** → close the case cleanly, no further charge.

At MVP, Shield means the user has an active account with retained history. It does **not** automatically scan email or external accounts. Do not describe it as doing so until that capability is built.

---

## Michigan Legal Categories

**MVP (build Housing & Eviction first, then one-at-a-time):**
- Housing & Eviction (MCL 554.134, MCL 600.5701 — Notice to Quit)
- Security Deposit Disputes (MCL 554.602-609)
- Debt Collection Summons / Judgment Defense (FDCPA 15 U.S.C. § 1692, MCL 339.901)
- Medical & Consumer Billing Disputes (No Surprises Act, MCL 500.2001) — never labeled "credit repair"; Navigator does not contact credit bureaus or handle SSNs for credit dispute purposes
- Utility Disconnection — Investor-Owned Energy (MPSC rules, Mich. Admin. Code R 460.101; applies to electric and natural gas utilities such as Consumers Energy, DTE Energy)
- Utility Disconnection — Municipal Water/Sewer (Home Rule City Act, MCL 117.1 et seq.; federal due process floor per *Memphis Light, Gas & Water Div. v. Craft*, 436 U.S. 1 (1978); governing notice/dispute period set by the specific municipality's ordinance — verified individually per jurisdiction, never assumed to match the energy-utility rule)
- Debt Validation Requests (FDCPA § 809)

This brings the MVP category count to seven once the Utility Disconnection categories are built. Housing & Eviction remains first in build order.

**Future phase (not MVP):** Family & Custody, Employment Disputes.

---

## Referral Rules

When a matter exceeds self-help navigation (active litigation with represented opposition, hearing underway, process service or notarization needed):
- Refer to **Veritas Field Services / VROS** (operational arm) — state what the service does and how to reach it, not a sales pitch, no individual named.
- Refer to **Michigan State Bar Lawyer Referral Service and regional legal aid organizations** when the matter requires licensed counsel.
- Never inflate the need for referral to generate a sale.

---

## Data Principles

- **Veritas owns all case data.** The AI model (Claude, GPT, etc.) is a processing tool — it does not own Veritas workflow logic, case records, or outcome intelligence.
- **Model independence:** The AI provider must be replaceable without changing the data model, compliance framework, or payment system. The application controls workflow, storage, payment gate, document status, and audit trail. The AI reads case state and produces outputs.
- **Data minimization:** Do not request SSNs, full financial account numbers, medical diagnosis details, or unrelated personal information unless a specific workflow legally requires it. If sensitive data is not required, tell the user not to provide it.
- **Anonymization:** All outcome data used for research or reporting must be fully anonymized before any external use.

---

## Revenue Tiers (Current)

| Product | Price | Trigger |
|---------|-------|---------|
| Free tier | $0 | Case intake, manual timeline, BYO AI cross-check template |
| Veritas Shield | $4.99/month | Post-resolution conversion, or direct signup |
| Factual Packet | $15.00 flat, one-time | Charged at the Layer 3 → document gate; same price regardless of which components are needed |
| Professional License (B2B) | $99/month per attorney | Seat-based; each attorney individually verified against bar records before subscription activates |
| VROS field services | Market rate + verification premium | Mobile notary $50–150; process service at local comps; property inspection $35–75; +$15–25 verification premium |

The Navigator packet price is configurable via `NAVIGATOR_PACKET_PRICE` env var (currently 1500 cents = $15.00). Do not hardcode prices in UI copy — pull from env.

**B2B Professional License** may be built and exposed now, in dormant form — available for signup but not actively marketed or required for Housing & Eviction users. Bar status must be verified against bar records before `subscription_status` can be set to `'active'`. Never activate a seat for an unverified attorney. B2B Companion and Verified tiers remain post-MVP and undecided.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **AI:** Anthropic API (`ANTHROPIC_API_KEY`) via `/api/chat` route — the main triage AI
- **AI Cross-Check:** BYO — users use their own ChatGPT/Gemini/Claude free tier; zero AI hosting cost for this feature
- **ORM:** Prisma (`prisma/schema.prisma`) against Postgres
- **Database:** Supabase Postgres (or any Postgres) — `navigator_cases`, `navigator_case_outcomes`, `compliance_review_queue`, `b2b_attorneys` tables (Supabase-managed); plus `Case`, `FieldJob`, `VerificationEvent` via Prisma for the unified event ledger
- **Payments:** Stripe Node.js SDK — one-time charge for Factual Packet, recurring subscription for Shield, seat-based for B2B

### Key Database Tables

| Table / Model | Purpose |
|-------|---------|
| `navigator_cases` | One row per dispute; tracks `current_layer`, `completed_fields`, `classification_log`, payment/document status, Shield conversion fields |
| `navigator_case_outcomes` | Outcome intelligence populated at 30/60/90 days post-resolution |
| `compliance_review_queue` | Yellow-tier responses pending human review; status: `'pending'` → `'cleared'` |
| `b2b_attorneys` | B2B Professional License — attorney identity, bar verification status, subscription state |
| `Case` (Prisma) | Root record linking Navigator triage data to VROS field jobs |
| `FieldJob` (Prisma) | One row per physical field visit; linked to Case or standalone |
| `VerificationEvent` (Prisma) | Immutable event log shared by Navigator and VROS; hashed evidence chain |

**`b2b_attorneys` schema:**
```
attorney_id           uuid, primary key
full_name             text
bar_number            text
bar_status            'pending_verification' | 'active' | 'inactive' | 'flagged'
verification_date     timestamp
subscription_status   'inactive' | 'active' | 'cancelled'
stripe_subscription_id text
created_at            timestamp
```
Bar status must be verified against bar records before `subscription_status` can be set to `'active'`. Never activate a seat for an unverified attorney.

### System Prompt Location
The AI system prompt must be stored in `lib/system-prompt.ts`, not hardcoded inline in the `/api/chat` route handler.

---

## Build Sequencing

### Now (manual-friendly, ships fast)
- `Case`, `FieldJob`, `VerificationEvent` tables via Prisma migration.
- Factual Packet export as a PDF render of one Case's `VerificationEvent`s, in timestamp order.
- The handoff button — even if it just creates a `FieldJob` row and texts the founder, ship it.

### Once there are 10+ real Cases and 10+ real FieldJobs
- Dashboard view of jobs by status (paid/unpaid, scheduled/completed).
- Route batching suggestions based on `FieldJob` locations for a given day.

### Only once there is a second field agent
- Automated SMS dispatch, standby rerouting, full Grace Protocol automation. Not before — there is nothing to reroute to yet. Do not build this early.

---

## Required Environment Variables (`.env.local`)

```
ANTHROPIC_API_KEY

# Postgres / Supabase
DATABASE_URL                       # Postgres connection string for Prisma
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Stripe
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Pricing (in cents)
NAVIGATOR_PACKET_PRICE=1500        # $15.00 flat — Factual Packet
SHIELD_PRICE=499                   # $4.99/month — Veritas Shield recurring
B2B_SEAT_PRICE=9900                # $99.00/month per verified attorney seat
```

All Stripe activity is connected to the **Veritas Systems & Technologies L.L.C.** account (EIN 41-5302526), not a personal account. Use Stripe test mode before switching to live keys.
