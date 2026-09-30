# CLAUDE.md

This file guides Claude Code (claude.ai/code) when working in this repository.

---

## What This Project Is

**STAND** (this repo, historically "Veritas Navigator") organizes any real-life mess a person is working through: what happened, what they have, what the rules say, what is due when, and what they did about it. It turns a person's situation into a structured, verifiable record they own.

STAND is **not legal-tech and not a law firm.** Legal matters (housing, debt, benefits, court) are one lane among many, and the unauthorized-practice-of-law (UPL) rules below are a guardrail for that lane, not the identity of the product. STAND never gives legal opinions, predictions, or strategy in any lane. Every behavioral rule in this codebase enforces that line.

The founder's own life is Case 0001: STAND is built and tested on real, messy situations, not tidy demos.

### STAND is a customer of the Veritas platform
Every STAND Case can carry a **verified Matter record** on the Veritas platform (a separate product and repo: the evidence engine that runs rulebooks, signs and chains every step, and exports Proof Packages anyone can check). STAND uses the platform's public API like any other customer. Keep the lanes separate: do not copy platform logic into STAND, and do not put STAND-specific logic into the platform.

- Rulebooks: `stand/stand-matter v0.2` (Matters, with moves and outcomes) and `stand/stand-playbook v0.1` (rules learned from outcomes). Copies in `lib/spine/*.json`; the platform holds the pinned originals.
- Engine: `lib/spine/rules.mjs` is a verbatim copy of the platform's rules engine. **Never edit it here**; update it from the platform.
- Roles: `steward` (STAND itself), `holder` (the person), `helper`, `witness`.
- Anything STAND records stays STAND's organizing work until the holder confirms it from their own device (`record_confirmed`). STAND can never confirm, attest, or act as the holder; the engine refuses it.
- Checks record what was compared against which published source (`confirmed` / `contradicted` / `cannot_verify`). There is no outcome for advice or "who is right", by design.
- STAND keeps its own copy of every event hash it signed (`VerificationEvent.spineEventSha`, `Case.spineHeadSha256`). That is STAND's independent witness file; do not remove it.
- Matter writes go through `mirror()` so a platform outage never breaks a STAND flow.
- **How STAND learns (never skip a step):** STAND proposes moves, each with the governing rule it rests on (`move_proposed`). Only the holder decides (`move_decided`: chosen / deferred / declined). Outcomes close the loop (`move_outcome`: worked / partial / stalled / failed). STAND proposes playbook rules citing outcome evidence (`rule_proposed`); only the Chairman adopts or retires them (`rule_adopted` / `rule_retired`). Nothing becomes a rule without outcomes and the Chairman's signature. Code: `lib/spine/moves.ts`, `lib/spine/playbook.ts`, `app/playbook`.
- **The repo is public: never commit real case content** (names, family details, addresses). Real Matters are seeded from local files that stay out of git (`*.local.json`).

Code: `lib/spine/` (client, matter bridge, browser holder key, operator guard), `app/api/matters/[caseId]/*`, `app/matters/[caseId]` (the holder's page). Test: `npx tsx scripts/test-matter-bridge.mts` with `VERITAS_PLATFORM` pointing at a checkout of the platform repo. DB fields: `prisma/spine-bridge-migration.sql`.

---

## Immediate Priorities (Read Before Writing Any Code)

### Fix First
The `/navigator` chat page shows **empty response bubbles** even though the server logs show successful 200 responses from `/api/chat`. The API call succeeds; the assistant's response text is not rendering in the UI. Fix this bug before anything else.

### Build Order
1. **Housing & Eviction** — fully working end-to-end: Layers 1 → 2 → 3 → Stripe payment gate → document generation → Shield conversion offer.
2. **Stop and confirm with the founder** before adding any other category.

Live Stripe payment is included now (not deferred). The founder has funded Stripe setup for Veritas Systems & Technologies L.L.C. Charge for the Layer 3 document packet before generating the final document.

MVP pricing: **$29/month** for active Navigator use. **$4.99/month** for Shield (passive monitoring, post-resolution). No free tier at this stage.

---

## Architecture

### Routing Conventions
- `/navigator` — chat UI page
- `/api/chat` — AI response endpoint (likely Next.js App Router or Pages API route)

### The Three-Layer Triage Flow

The conversation is structured into three mandatory layers enforced as **application state**, not AI memory:

| Layer | Content | Cost |
|-------|---------|------|
| **Layer 1** — Universal Intake | What kind of notice? Who sent it? What does it ask and by when? | Free |
| **Layer 2** — Category Narrowing | Open, neutral status/narrative/time-sensitivity questions per category | Free |
| **Layer 3** — Fact Collection | Specific facts for the relevant document (names, dates, amounts, case numbers) | Free until complete |
| **Payment Gate** | Stripe pre-flight checklist → charge | Paid |
| **Document Delivery** | Generated document packet | Output of paid step |

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

- **System prompt for `/api/chat`** — Truth Mode, GPS Standard, disclosure triggers, triage questions, referral rules, Green/Yellow/Red classification instructions (see Parts A, B, C below).
- **Persistent UI element** — Tier 1 disclosure text rendered as a footer under the chat input, not generated by the AI each turn: *"Veritas Navigator is not a law firm and does not provide legal advice. This is a navigation and document-organization tool."*
- **Application logic** — Layer state machine, `completed_fields` vs `required_fields` check, payment gate, Yellow-tier pause, Shield conversion trigger.

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

## Legal Lane: Michigan Categories (first lane, not the whole product)

**MVP (build Housing & Eviction first, then one-at-a-time):**
- Housing & Eviction (MCL 554.134, MCL 600.5701 — Notice to Quit)
- Security Deposit Disputes (MCL 554.602-609)
- Debt Collection Summons / Judgment Defense (FDCPA 15 U.S.C. § 1692, MCL 339.901)
- Medical & Consumer Billing Disputes (No Surprises Act, MCL 500.2001) — never labeled "credit repair"; Navigator does not contact credit bureaus or handle SSNs for credit dispute purposes
- Utility Disconnection (MPSC rules, Mich. Admin. Code R 460.101)
- Debt Validation Requests (FDCPA § 809)

**Future phase (not MVP):** Family & Custody, Employment Disputes.

---

## Referral Rules

When a matter exceeds self-help navigation (active litigation with represented opposition, hearing underway, process service or notarization needed):
- Refer to **Veritas Field Services** (operational arm) — state what the service does and how to reach it, not a sales pitch, no individual named.
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
| Veritas Shield | $4.99/month | Post-resolution conversion, or direct signup |
| Veritas Navigator | $59/month or per-packet *(hypothesis — not yet validated against real transactions)* | Active dispute, charged at Layer 3 document gate |
| Veritas Marketplace | ~15% fee | Field Services (notarization, process serving, filing) |

**MVP launches free.** No payment processing at MVP testing stage (Founding Document 8, Weeks 1-3). Payment activates at public launch (Weeks 4-6). The system prompt must not present a price to users during MVP testing. The Navigator packet price is configurable via `NAVIGATOR_PACKET_PRICE` env var (in cents) and must be re-validated against real transactions before public launch.

B2B tiers (Companion, Pro, Verified) are post-MVP. Do not build or expose them now.

---

## Tech Stack

- **Framework:** Next.js (App Router or Pages — confirm from existing files)
- **AI:** Anthropic API (`ANTHROPIC_API_KEY`) via `/api/chat` route
- **Database:** Supabase — `navigator_cases` and `navigator_case_outcomes` tables (see Data Model above), plus `compliance_review_queue` for Yellow-tier items
- **Payments:** Stripe Node.js SDK — one-time charge for Navigator packet, recurring subscription for Shield

### Key Supabase Tables

| Table | Purpose |
|-------|---------|
| `navigator_cases` | One row per dispute; tracks `current_layer`, `completed_fields`, `classification_log`, payment/document status, Shield conversion fields |
| `navigator_case_outcomes` | Outcome intelligence populated at 30/60/90 days post-resolution |
| `compliance_review_queue` | Yellow-tier responses pending human review; status: `'pending'` → `'cleared'` |

### System Prompt Location
The AI system prompt (Parts A, B, C of the governance document — Truth Mode, GPS Standard, disclosure, triage questions, referral rules) must be stored as a **separate constant or config file**, not hardcoded inline in the `/api/chat` route handler.

---

## Required Environment Variables (`.env.local`)

```
ANTHROPIC_API_KEY
# Veritas platform bridge (see lib/spine/client.ts; values are secrets, never commit them)
SPINE_ENABLED=1
SPINE_API_URL
SPINE_ANON_KEY
NEXT_PUBLIC_SPINE_ANON_KEY
SPINE_STEWARD_ACTOR_ID
SPINE_STEWARD_KEY_ID
SPINE_STEWARD_PRIVATE_KEY
SPINE_HOLDER_ENROLL_CODE
STAND_OPERATOR_TOKEN               # required for Matter write routes until STAND has user accounts
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NAVIGATOR_PACKET_PRICE=2900        # $29.00 in cents
SHIELD_PRICE=499                   # $4.99 in cents
```

All Stripe activity is connected to the **Veritas Systems & Technologies L.L.C.** account (EIN 41-5302526), not a personal account. Use Stripe test mode before switching to live keys.
