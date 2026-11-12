# SecurePay Mini → SecurePay: One Product Production Programme
**Decision:** 12 November 2026 · **Owner direction:** Mini is the primary SecurePay. Living Workspace is a deep, optional workbench.
**Status:** owner-approved *product direction*; programme blueprint, not a production certificate or authorization to move money.
**Working UI baseline:** current Mini experience from `feat/day11-mini-collect-for-someone-conversation-20261112` (draft PR #276, stacked on #274 and approved Mini Phase-4 baseline PR #270). Preserve the original approved Store masterpiece separately (#271). Do not confuse previews, staging, or builds with verified real transactions.

## 1. Non-negotiable product charter
**Brand:** SecurePay (not a second public brand called "Mini"; Mini is the form factor / embedded component).
**Category to establish:** **Agreement Commerce** — people agree first, then act, pay through a chosen eligible regulated provider, and monitor outcomes.
**Meaningful promise:** "Money should follow the agreement." Emotional line: "Trust is the currency." Never imply automatic trust, a guaranteed outcome, automatic escrow, licensed financial custody, or financial safety certification.
**Customer experience:** "What would you like to do?" Buy something, Sell something, Pay someone, Collect money, or ask KS001; the ordinary path remains direct and understandable. An advanced option is revealed only when a real need, evidence or explicit question calls for it.
**Living Workspace:** keep the approved three-panel workbench and all meaningful prior work; suspend public rollout and visual feature growth. A deep job may open full work with the *same* canonical Agreement / conversation and a genuine return path. Deep work must not be a compulsory step for everyday purchase or collection.
**Digital Stores:** no redesign. One real merchant offer identity, search/listing, original Store, selection, seller confirmation and Agreement. No cloned Mini Stores. The Store stays a familiar shop with human help available only when relevant.
**Ask KS001:** one intelligence backend, source-grounded answers, one relevant question or action, quick pills and free-form conversation. No unnecessary token-consuming turns, advertisements or invented availability. The same identity/permission/state across Mini, Store, embedded Ask and Workspace.
**Onion principle:** complexity, not consequences, stays hidden. Fees, third-party money destination, a participant's identity, binding terms, data sharing and authority are clearly surfaced *before* their consequential action. Never use dark patterns, unconsented linking or invisible financial decisions.

### Core invariants
1. One real identity/representation authority; a typed name/KSNumber is not verified.
2. One canonical Agreement and version/provenance/state machine; conversation/draft, ready for review, sent, independently accepted, funded, in-progress, satisfied/completed, disputed, cancelled/expired are distinct. A draft isn't accepted.
3. One participant-specific consent/authorisation; no person, Plug, Master, helper, family member, KS001 or merchant assistant can accept for another without verified delegation.
4. One authoritative Money orchestration/ledger/regulated provider boundary. Payment rail is the customer's eligible choice; SecurePay is *not* a mandatory escrow or customer-funds custodian. No movement inferred from AI text, screen copy, UI button, simulator or provider callback alone.
5. One status/event truth across surfaces, one Store/cart source identity, one set of appointments/obligations/evidence. All state transitions idempotent and replayable.
6. Source-backed Store search, quantity, price, status and eligibility; invented results and ranking/pay-to-promote are prohibited.
7. Qualified Plugs/Masters are optional scoped human capabilities, never central navigation or automatic paid extra. Community Saver has its own higher three-/multi-party and qualified-Plug consent contract; sensitive provider verification is independent.
8. As the conversation unfolds: People, Place, Dates, Work, Money, Milestones, Evidence, Appointments, Permissions and Next Action appear as **slots in the underlying Agreement**, not ten open forms. User facts remain user claims until appropriately checked.
9. My Agreements speaks **from actual events**: what's done, what's pending, by whom, deadline, verified provider financial status and the next lawful action. No imaginary reminders, signed terms, funds or completed work.
10. Accessibility/data cost matter: phones, text-first low-data, English/Swahili, keyboard, errors/retry and assisted work. Do not claim offline/SMS/USSD/voice works until each is built and proven.
11. Small Store and Mini visual design is frozen. Only an explicitly evidenced accessibility, usability, security or functional defect can justify a scoped visible correction approved against the frozen baseline.
12. Fair Trade Principles remain contextual lenses for both sides, not a rigid checklist or unqualified "passed 12/12" badge. Simple trade stays simple; complex work receives meaningful depth.

## 2. The full journey from ordinary words to durable work
```text
Mini / host Store / Ask KS001
  -> explicit user intention; no mandatory sign-in for harmless browsing
  -> KS001 asks ONE material question or offers the next factual choice
  -> canonical source-backed Agreement draft (slot + provenance + verification state)
  -> review of actual terms, benefits, risks, fees, data-sharing and consequences
  -> identity/representation and invitation: each affected party independently consents
  -> accepted canonical Agreement (or clear pending/declined/expired status)
  -> perform obligations and evidence; optional certified partner money choices
  -> provider proof, reconciliation, authorised milestones and release if applicable
  -> My Agreements: next action, reminders, changes, resolution, final archive
```
Contributors, recipients and families: beneficiary consent/verified lawful authority, recipient ownership, target, permitted disclosure, transparent uses/updates and separate regulated rail are mandatory before publishing. Responding "yes" in an interview does *not* certify authorisation.

## 3. One delivery programme: Mini phases M0–M12
These **Mini experience phase IDs** are not SecurePayAPI's historical Phases 1–42. **Reuse** API Phase 42A–42H programme, existing domain services, CI evidence and release prerequisites; do NOT rewrite/restart those backend phases.

| Phase | Deliverable and dependency | Binary exit gate |
| --- | --- | --- |
| **M0 — Freeze and audit** | Lock approved Mini and Store screenshots / interaction contracts, state customer language. Reconcile PR #270/#274/#276 with Store #271, independent Ask #275, Living Workspace and API authoritative `main`. Recover GitHub Actions billing/CI and identify deployable SHA, staging API, DB and model. | **PASS** only with one reviewed product baseline and proven independent staging + one release ledger; production unchanged. |
| **M1 — Stable conversation** | Real authorised KS001 in Mini, reliable continuity through reload/retry/network loss, bounded cost, meaningful concise answers and recovery. Fix known 12-turn Ruiru chairs failure/repeated questions/incomplete delivery and broken context restore before accepting "intelligent". | **PASS:** real model completes the 12-turn chairs test, preserves correction + delivery, reloads same authorised work, never fabricates Store/person/consent; explicit failure paths. |
| **M2 — Agreement slots** | Extract user-confirmed People, Purpose, Offer, Dates, Places, Quantity, Money, Responsibilities, Evidence and Pending Questions; server stores typed candidate fields with source/revision, explicit review, correction, expiry. Reuse canonical Agreement, not a Mini ledger. | **PASS:** "mother, KSh 50,000, 15 December" forms distinct provisional slots; after correction, exactly one up-to-date draft is restored across devices. |
| **M3 — Identity, permission and invitations** | KSNumber identity and representation; sender/receiver roles, nominated delegate, counterpart verification, invitations, accept/decline/amend/cancel and private visibility. Buyer/seller/organiser/contributor never silently coupled. | **PASS:** authenticated independent acceptance on the same current version, cross-account privacy negative tests, impersonation/role-substitution blocked. |
| **M4 — Living My Agreements** | Mini gets a quiet agreements list, contextual "what's happening" and one next action for each real Agreement; links to confirmed obligations, dates, evidence, reminders, reschedules, changes, disputes and closure. Workspace remains optional depth. | **PASS:** draft/accepted/due/late/disputed/completed journeys speak only server truth; reload and switching surfaces lose no work. |
| **M5 — Real Digital Stores** | Lock Store presentation; source-backed Buy → Store → item/cart → seller-confirmed stock/price/location/terms → distinct buyer acceptance → canonical Agreement. Seller operations and refund/changes remain domain-authoritative. | **PASS:** two actual sandbox merchants and a buyer complete sourced purchase/Agreement, stale offers rejected, multi-store separated, no forced KS001/Plug. |
| **M6 — Clear money choice** | Reuse canonical provider-neutral Money API, provider KYC/AML responsibility, real approved quote/fee/rate, third-party destination, pay once/deposit/milestones, idempotent callbacks/reconciliation and refunds/exception controls. Escrow only if explicitly opted, truly provided and independently verified. | **PASS:** provider-certified *chosen rail* with live sandbox evidence, economic quote, callback/retry/reconcile proof, no false Paid/Released status; independent legal/partner signoff **before real funds**. |
| **M7 — Collections and groups** | Mother/daughter case, communal purpose, contributors, pledges, trusted disbursement/receipts, approved purpose-specific links, transparent updates, removal of permission, refunds/closeout. Not a fabricated "charity verification" badge. | **PASS:** independently validated beneficiary/delegate/recipient authority; contributors see truthful purpose/destination/fees; multi-person checks, receipts and permission revocation tested with partner. |
| **M8 — Source/host integrations** | One single secure Mini embedded in the approved Store, Varsityville Estate, ShortStays and eventually partner sites, with signed/expiring host context, CSRF/origin defence, same Agreement version, authorised return and host independence. | **PASS:** a transaction starts on a real permitted host and returns to its original context without duplicate cart, Agreement, money action or session leak. |
| **M9 — Human help only when needed** | Qualified Plug assistance, verified-scope Master advice, scoped delegation, Skills Institute/progression and optional Community Saver coordination, plus low-data/assisted options that actually exist. No always-on role marketplace. Transport/storage/accommodation need separate category vetting. | **PASS:** direct transaction never encounters forced helper; assisted case checks qualification, separate assignment/fee/consent and remains one canonical Agreement. |
| **M10 — Production security and operations** | Across every phase, then consolidated: threat model, auth/session MFA/recovery, least privilege, privacy/ODPC, retention, abuse/fraud, consumer disclosures, independent pentest, monitoring/alerts, backups/restore, kill switches, reconciliation operations, audit logs, privacy breach/incident response, customer support and accessibility/performance. | **PASS:** external legal/compliance/security responsibilities accepted, independent pen-test and closure, backup restore rehearsal, reconciliation/incident drills, no critical open financial/privacy issues. |
| **M11 — Real pilots and controlled activation** | A: genuine Agreement pilot **without money**; B: limited approved real-money pilot on certified rails/products and segregated provider accounts; C: wider Kenyan availability only after measured satisfaction and readiness. Pilot limits and go/no-go actors explicitly named. | **PASS:** observed end-to-end human tasks, actual identity/Agreement/partner records, verified incidents and support, zero critical unresolved incidents, documented owner + compliance + partner GO for each money tranche. |
| **M12 — Repetition and expansion** | Repeat purchase, Store conversion, estate/community adoption, external developer embedding, reliable support, measured unit economics and judicious expansion. New offers are *capabilities under Agreement Commerce*, not new unrelated SecurePay product lines. | **PASS:** repeat use, completion, failure/complaint trends, merchant retention, per-transaction contribution margins and verified customer understanding justify next market; monthly brand check against 22 laws. |

### Parallel work is allowed, skipped gates are not
- M0 first; M1 and M3 can share independent foundation work; M2/M3/M4 operate in related staged increments.
- M5 may advance in parallel with M1–M4 only against **shared source contracts**; its money button remains disabled until M6.
- M7, M8 and M9 can be prepared independently but must only show genuine verified capabilities in a public release.
- M10 is active throughout, not "hardening at the end." M11 can start agreement-only before M6's money pilot is authorised.
- M12 is post-pilot, never justification to hold back a useful safe first release or to launch unvetted sensitive services.

## 4. KS001 must be deliberately introduced in layers
| Intelligence layer | Minimal visible experience | Technical authority |
| --- | --- | --- |
| K0 Observe | Person asks in own words, or taps one understandable starting action. | User input, no assumptions. |
| K1 Understand | Brief acknowledgment; one best next question or straight answer. | Model may classify/interpret; cannot certify claims. |
| K2 Remember | Remember corrections and already answered details across reload/resume. | Server-authenticated conversation ID, provenance, versioning, no cross-user sharing. |
| K3 Structure | An Agreement quietly develops slots as relevant. | Source-labelled candidate slots and review; canonical Agreement owns final truth. |
| K4 Connect | Relevant Stores/People/Places/evidence suggestions only when user asks or need clearly arises. | Authorised source-specific API reads, permission scopes, stale status checks. |
| K5 Act with permission | Invite, request confirmation, propose specialist help, capture receipts, remind. | Explicit human action + backend authorisation + idempotent event; no automatic paid services. |
| K6 Explain progress | My Agreements "speaks" the next genuine action. | Canonical status/events/financial provider proof only. |
| K7 Resolve complexity | Supporting agreements, changes, milestone verification and warranted deep Workspace. | Preserve exact Agreement and same KS001; never a second money ledger. |

Hard UX rule: there is no fixed series of K0–K7 screens. A two-minute transaction may use only K0/K3/K5; a complex project may reveal them all.

## 5. Release programmes (do not confuse)
**Product GO (agreements only):** real verified accounts, source-backed terms, versioned independent acceptance, My Agreements continuity, privacy and support can run with no Money feature. Public calls-to-action must say what is unavailable.

**Financial GO:** separately approved for each product/rail/user cohort/amount limit. Real provider obligations, authority, safeguards, CBK legal perimeter and incident response are evidenced. Money is *not* automatically on because the Mini build is green.

**Expansion GO:** a new host/category/country must repeat its privacy, serviceability, access-control, legal/rail and 22-laws checks. No transport/stays/storage booking without separate provider certification.

In SecurePayAPI terms, **Phase 42H is explicitly inactive until Phase 42G and its external regulatory/financial/operational requirements close**. The parent backend roadmap remains in force and is not replaced by this Mini plan.

## 6. Evidence and test dashboard
Each phase maintains 5 fields: `Code/branch`, `source/API evidence`, `focused test logs`, `staging human outcome`, `owner/independent release decision`.
Status vocabulary: **NOT BUILT → CANDIDATE → TESTED → INDEPENDENTLY VERIFIED → PILOT → PRODUCTION**. A green Vercel build = **build evidence only**.

**Required golden journeys**
- Ordinary Buy: real offer, 40 cement bags, confirmed delivery, separate seller/buyer acceptances, correct revised stock.
- Counter sale: single item/price, independently accepted and paid via permitted provider, actual receipt.
- Service work: quote, milestones, time, evidence and dispute/variation handling.
- Collect for mother: verify beneficiary and collector's authority, receiving beneficiary/regulated provider, purpose, data disclosures and contributor receipts; "not yet" blocks publication.
- Simple one-off pay versus group contributions (proper independent obligations).
- Reopen My Agreements: genuine status and next action; no repeated questions; private context after reload.
- A user with very little data, an elder expert needing human assistance, and one ordinary customer who never sees helper roles.
- Third-party host: original Store → Mini → original Store safe return without new session/order.
- Failures: duplicate funding callback, mismatched identity, stale quote, wrong buyer/beneficiary, unknown provider status, session expiry, provider outage, consent revoke, lost connectivity.

**Suggested thresholds to agree at M0, not measured facts:** zero unresolved critical security/financial/identity incidents; all hard authority-negative tests pass; all critical golden journeys pass both desktop/mobile and recovery; response/reliability/low-data performance budgets measured against real devices and Kenyan networks; 95% or higher completion for a pre-agreed defined first-use human task sample is an initial pilot target, not a guaranteed marketing outcome.

## 7. Business, brand and channel discipline
**Position:** SecurePay is an **Agreement Commerce** system, not a money wallet, payment rail, marketplace clone, law firm, automatic escrow, or AI chat app. A bank/PSP/merchant is a participant or integration, not an owned brand category.
**Entry market:** start with the existing Varsityville/Kamakis seller-and-buyer ecosystem and one narrow repeatable value proposition. Expand through genuine Stores/other estates/partner embeds only after real use.
**Distribution:** Store shopping and real buyer agreements bring visitors; shared authorised SecureLinks and trusted merchants bring repeated exposure. Never pay for vanity sign-ups, fake reviews, referral-only pyramid growth, paid top ranking or compulsory intermediaries.
**Commercial health:** validate published fees/activation/subscriptions with actual users before freezing pricing; isolate platform fee from principal/tax/rail charges; no hidden deposit, fake "free escrow" margin or unagreed deductions. Show pricing and payer before action; measure contribution margin after provider/communication/support/dispute cost.
**Primary pilot metrics:** number of first complete agreements; % reaching independent acceptance; share with timely obligations; repeat agreements per 30 days; Store buyers returning; time to first useful answer; human help actually requested; unit margin after costs; verified disputes/fraud/false-state incidents; % users able to describe SecurePay in one sentence as "agree, then complete". No fabricated success figures.
**Brand discipline:** review `docs/marketing/SECUREPAY_22_LAWS_DECISION_GATES_20261112.md` on M0, marketing copy, product additions, release, major partnerships and market expansion. This is a strategic framework, not 22 mathematically immutable rules.

## 8. Explicit hold/stop rules
STOP if: someone can see/approve another identity's work, a draft appears accepted, product claims "paid" from a local simulation, exact beneficiary details escape their scope, AI repeats a settled question, false Store stock is advertised, collection receives funds before legitimate authority, a financial partner is not independently certified, fees/principal are conflated, a channel claims offline/phone/SMS support it lacks, a production migration is not independently tested, a high-risk category lacks vetting, or Mini is visually redesigned without a documented owner exception.

## 9. Immediate sequence
1. Create this **one plan and design lock**, review as documentation only. Existing user-approved UI remains a separate reviewed candidate, not a frozen production commit.
2. Complete M0 branch and environment/source convergence inventory; recover CI and identify exact deployed SHA and independent staging service/DB. Do not merge a diverged Store UI over Mini.
3. M1 first genuine live KS001 conversation in Mini, same conversation on reload, 12-turn Ruiru chairs test PASS and mother collection natural turn test PASS; report faults openly.
4. M2–M4 real Agreement slot authority and My Agreements spoken status. This is the first secure end-to-end **non-money** completion target.
5. M5 real Store handoff under approved design. Only then M6 each certified provider sandbox and later approved limited real-money pilot.
6. Product/Marketing review each gate, and independent legal/financial/operations review before any public collection or real-money release.

## 10. Decisions that cannot be made by engineering alone
- Exact regulated role of Keyman/SecurePay for each proposed fund/collection/escrow arrangement, and permitted named financial partners.
- How a non-consenting/incapacitated beneficiary is lawfully represented and who may collect/manage funds.
- Exact fee, taxes and disclosed cost-bearing party, support economics, merchant subscription structure.
- Incident officer, legal/ODPC responsibility split, retention, data residency/processing, support and dispute handling.
- Named owner of each provider kill switch, who signs each GO/NO-GO, pilot cap and rollback authority.
- Approved Stage A/B/C market audience and brand copy; independent proof before any leadership claim.

**Read together, never supersede:** SecurePayAPI `docs/phase42/PHASE_42_MASTER_PLAN.md`, `PHASE_42_PRODUCTION_ACTIVATION_GATE.md`, `docs/FINANCIAL_PARTNER_RESPONSIBILITY_MATRIX.md`, `docs/TRUE_NORTH_HUMAN_EXPERIENCE_CONTRACT_20261027.md`, SecurepayLLM `docs/SECUREPAY_MINI_CLEAN_APPROVED_BASELINE_20261110.md`, `docs/DAY11_ONE_AGREEMENT_COMMERCE_HAND.md`.
