# SecurePay Mini — Phase 0 Master Blueprint & Source Audit

**Date:** 2026-11-09  
**Scope:** Documents and audit only. No product-code, financial-authority, UI, deployment or production changes.  
**Status:** Phase 0 working specification for owner review; no new protected financial doctrine approved or implemented by this document.  
**Repository:** `kimaniks001/SecurepayLLM`. Backend authority: `kimaniks001/SecurePayAPI`.

## 1. Product north star — owner direction

> SecurePay Mini should be so helpful that people choose it for ordinary trade—and so trustworthy that, once they use it, they prefer not to transact without it.

Mini is the **primary everyday face** of SecurePay, not a restricted teaser or a miniature copy of the full application. Many customers may never need to visit securepay.ke. Those needing comprehensive projects, multiple parties, full audit trails, disputes or institutional administration can explicitly continue the **same** transaction in the full Living Workspace. Developers/institutions use approved SecurePay APIs; an embedded host does not gain direct payment or identity authority by displaying Mini.

Supported experiences to design:
- Standalone mobile-first Mini (phone-first, camera-capable, QR/share link/shortcut-capable).
- SecurePay-origin isolated embedded Mini on approved host websites, without altering their main UI.
- One shared KS001 brain and canonical Agreement/Money engine; context-specific starting point, not separate feature implementations.

Do not damage the locked SecurePay 3-panel Living Workspace, the approved Store design, or existing independent Estate, ShortStays, My Ride and Storage experiences. Mini floats/collapses, keeps host context private and returns the person to where they started.

**Intended value:** understand a real-life trade; capture accurate proposed terms; invite a person to review/accept/refuse/correct; let them choose eligible funding rails; show *verified* funding; record actual fulfilment/hand-over; enforce transaction-bound, authenticated release permission; track settlement; make helpful receipts, stock records and follow-up available from the same source. It must feel effortless at a shop counter while preserving non-instant financial authority.

**Economic principle:** do not sell "escrow" as an additional surcharge. Existing backend-defined platform charges and real provider costs remain separate and must be disclosed and economically tested. This product direction does not silently modify the locked fee doctrine.

## 2. Existing architecture to preserve

- **SecurePayAPI AGENTS.md (main):** backend-calculated Payment Ready, immutable balanced ledger, idempotent financial commands, KS Number authority, audited changes; frontend/partner never releases money, edits balances or calls Choice directly.
- **SecurepayLLM AGENTS.md (main):** approved Bolt/Quiet Trust visual DNA; canonical source -> explicit use -> trade context -> Agreement authority -> Money; authenticated join is not Agreement confirmation, and confirmed funding is not settled money.
- **Money architecture (API main):** Agreement -> obligation -> funded authority -> conditions -> authorised exercise -> rail -> reconciliation. Ledger-backed KS-to-KS movement and settlement primitives exist; not all customer paths are live-certified.
- **Store domain:** offer descriptions, optional prices/quantities and availability exist, but an offer quantity is **not** a reservation or a sale. Order-linked stock reservation/decrement needs its own authorised, reconciled semantics.
- **Group SecureLink:** contribution intent, public locator and governance primitives exist. Intent is not verified funding; governance approval is not by itself a money movement. A school-fees ledger and verified public fundraiser expenditure experience are not proven complete.
- **Money UI:** Agreement-bound quote, payment intent, release status and settlement destinations have existing read/composition work. Never build a second Money authority inside Mini.

## 3. Inspected work and evidence — source ≠ deployed proof

| Capability | Source inspected | Phase 0 classification | Next action |
|---|---|---|---|
| Canonical KS001 conversation and Agreement progression | SecurePayAPI and SecurepayLLM main doctrines; existing Agent/Agreement programmes | Reuse existing authority; integration certification required | Contract-and-runtime audit against exact deployment pair |
| Store offer with quantity | `docs/operations/MW_03B_STORE_DOMAIN_COMPLETION_REPORT.md` | Existing non-financial offer semantics; no sale/reservation guarantee | Design order allocation, merchant corrections and stock movement |
| Agreement Money and safeguarded allocation | `docs/PHASE_2_MONEY_AUTHORITY_ARCHITECTURE.md`; Phase 35/36 completion | Reuse core money model; live rail enablement unproven | Partner certification and negative financial tests |
| Three rail adapters | API `application.yml` on main: Choice, M-Pesa, PesaLink `enabled: false`, sandbox defaults | Source has adapters, **not proof of live payment services** | Authoritative runtime-capability feed; operator/partner certification |
| Embedded guest discovery + sponsor budgets | API draft stacked PRs #395-#397 | Built as draft/staging pilot; not general availability | Reconcile branches; exact-site and budget tests |
| Guest review + saved-work continuity | API draft stacked PRs #398-#399; UI draft #219 | Source-only, unmerged/uncertified | Two-origin authenticated staging review |
| Cross-product one KS001 assist | UI draft PR #221 | Reuse shared assistant; no second AI brain | Test context-isolated common adapter |
| SecurePay-origin Mini window | UI draft PR #241 | ShortStays staging-only prototype, not generic merchant SDK | Verify frame CSP, origin, cookies, real model and host privacy |
| Digital Store compact browser | UI PR #229 | Reusable UI candidate, not proof of payment Mini | Reuse offer source; preserve 3-panel masterpiece |
| Stock/sales receipt from verified fulfilment | Merchant workflow proposal | **Not proven complete** | New domain contract; prevent duplicates and false stock updates |
| School fees and public QR contributions | Group/Organisation foundations | **Specialised end-to-end journeys not proven** | Education/campaign scope and release/recipient decisions |
| Universal Mini payment/invite/release | Product concept | **Not built or certified as a full Mini journey** | Gate 1–5 specification and sandbox end-to-end proof |

Relevant draft PRs:
- API: https://github.com/kimaniks001/SecurePayAPI/pull/395 ; https://github.com/kimaniks001/SecurePayAPI/pull/396 ; https://github.com/kimaniks001/SecurePayAPI/pull/397 ; https://github.com/kimaniks001/SecurePayAPI/pull/398 ; https://github.com/kimaniks001/SecurePayAPI/pull/399
- UI: https://github.com/kimaniks001/SecurepayLLM/pull/219 ; https://github.com/kimaniks001/SecurepayLLM/pull/221 ; https://github.com/kimaniks001/SecurepayLLM/pull/229 ; https://github.com/kimaniks001/SecurepayLLM/pull/241

Note: branch stacks differ. Never assume drafts are merged, compatible or present on the deployed API. Reconcile exact frontend/API SHAs before connecting source, testing or promoting.

## 4. Human experience contract (design target; not implementation claim)

**Default Mini screen:** small, friendly, useful next action with Ask KS001 available. Do not present a banking dashboard, a checklist of twelve principles, financial infrastructure language or the entire tool tray. On entry show the relevant local object (offer, fee, contribution, service, booking) only after source verification and permission. Merchant can initiate from camera, real barcode, Digital Store item, typed text, voice or document. Buyer can enter from KS invitation, private link or approved public QR.

**Progressive tools:** capture -> review proposal -> invite/review/accept -> choose rail/fund -> see confirmed status -> acknowledge fulfilment -> authenticated release -> settlement receipt. Present only the tool needed. Mini can be closed/reopened without silently losing the canonical transaction; transfer to full Workspace is explicit, identity-bound, same record.

**KS001 character:** acknowledge naturally, ask the next meaningful question, avoid unnecessary financial jargon; confirm owner-input source facts before making consequential claims. AI cannot authenticate a person, verify funds from a screenshot, certify a product from a photo, grant authority, change a confirmed Agreement or authorise release.

**Merchant mode:** photograph or select one/many offers, confirm actual unit/quantity, set seller-reviewed terms, invite buyer's KS Number safely, see fund state, handover, release tasks, sales and stock. Retain one shared source of truth across counter sale and Digital Store. Human sale records are not the same thing as public catalogue availability.

**Buyer mode:** verify seller, see item, quantity, conditions, delivery and disclosed charges; ask KS001; correct/refuse/accept exact proposal; pick an actually enabled rail; see funding and later release/settlement status. A buyer need not visit securepay.ke for an uncomplicated trade.

**Other modes:** fee obligations with student privacy and school receipt authority; charitable/wedding contributions with public purpose, organiser verification, contributor consent/privacy and clear distinction of intention/received/spent/verified; milestones and disputes with escalated review when complexity warrants.

## 5. One transaction, separate authoritative states

Baseline proposal for ordinary physical goods, subject to owner/financial-authority review:

1. `PROPOSED` — seller-reviewed item, amount, quantity, conditions and source.
2. `INVITED` — scoped buyer invitation; notification is not consent.
3. `ACCEPTED` — authenticated, exact-version participant acceptance; neither acceptance nor seller notification proves funding.
4. `FUNDING_PENDING` — authorised provider processing or unknown; no false "paid" status.
5. `FUNDED_HELD` — backend reconciles confirmed provider evidence to Agreement/KS allocation; customer principal is safeguarded by an appropriate authorised provider, not operational company funds.
6. `FULFILMENT_RECORDED` — seller handover/evidence event, which is not itself permission to release.
7. `RELEASE_AUTHORISED` — required named party/parties independently authenticated and authorised for this exact Agreement/version/amount and release policy; backend checks restrictions/disputes. A seller may acknowledge handover **before** funding, but that event must never create funding or trigger release.
8. `SETTLEMENT_PENDING` — backend issues approved rail instruction; ambiguity remains pending/held, never presumed settled.
9. `SETTLED` — authoritative provider plus reconciliation evidence of completion, not merely an instruction submitted.

Parallel/exception states: rejected, expired, amended, charge/quote expired, funding failed, duplicate notification, dispute hold, part-fulfilled, partial release, refund/reversal/compensation, mistaken beneficiary, lost network, provider unknown, destination change cooling-off, reconciliation mismatch. No irreversible action solely from a host button/notification. Terms of release vary by trade class; do not invent a blanket rule that seller, buyer or AI can unilaterally settle.

**Terminology:** KS Number identifies the person/business/organisation. Agreement identifies the transaction and rules. KS Account is the authorised/accounting allocation with backing regulated custody, not a newly invented unlicensed deposit account. Actual provider settlement destination is separate. One merchant KS may have thousands of isolated Agreement allocations.

## 6. Privacy / security / host boundaries

- An untrusted host must not receive SecurePay session/KS credentials, bearer tokens, guest possession tokens, fund-release permissions or private trade history. Use SecurePay-origin isolated frame with audited per-site registration, exact origin/frame-ancestor allowlists, purpose-scoped contexts and authenticated backend calls.
- Never use the source website origin or knowledge of a KS Number as proof of actor identity. Protect lookup against enumeration and unwanted private data disclosure. Invited users review and accept independently.
- Publisher owns its site data, Store its offers, Estate its gate/estate records, ShortStays its availability, My Ride its operations, Storage its physical space. SecurePay owns KS identity, canonical Agreements, Money/ledger, authorised financial state, and conversation access. Data exchange is explicit, minimal, auditable and revocable where possible.
- Idempotency for every funding/settlement command, durable provider reconciliation, no client-derived balance; release approval strongly authenticated and role/transaction-bound. Signed and scoped events for host status sync.
- Cost controls: site and visitor usage budgets, AI-credit abuse protection, quotas and throttles; charge only the appropriate agreed fees. An exhausted sponsored AI budget cannot lock a person out of money records or prevent legitimate fulfilment/dispute actions.
- False claims and failures must be obvious: "Invitation sent" != "accepted"; "payment initiated" != "funded"; "funded" != "released"; "release instructed" != "settled"; "product photo detected" != "verified product"; "contribution pledged" != "received".

## 7. Real-world trading coverage — illustrations are not the test plan

**Owner correction (2026-11-09):** The previously listed charger, school-fees, wedding, Store, contractor and cross-site journeys were examples used to uncover requirements; they are **not** the locked six-journey acceptance suite or instructions to hardcode specific trades.

The primary test strategy is now documented in [SECUREPAY_MINI_REAL_WORLD_SCENARIO_COVERAGE_20261109.md](SECUREPAY_MINI_REAL_WORLD_SCENARIO_COVERAGE_20261109.md).

It requires real merchant/buyer observation and a representative matrix spanning everyday in-person sales, negotiated/quantity retail, multibaskets, stock, remote orders, services, recurring supply, secondhand goods, transportation/accommodation/storage, fees, group contributions, milestone work and cross-cutting exceptions. It specifically requires uncoached older users and people with low confidence, vision, language or network constraints, without stereotyping.

Select automated regression cases by **general behavioural class and state/authority boundary**, not nouns or rehearsed prompts; rotate goods, actor roles, input sources, money conditions and settlement outcomes. Keep holdout trades unseen in development; no illustrative example gets automatic priority solely because it appeared in the product discussion.

**Phase 0 is not fully field-certified:** external discovery and representative human testing remain open, and their results should determine the test cohort before Phase 1 is considered ready for human acceptance.

## 8. Phase 0 unresolved decisions (not implementation permission)

1. **Release authority by trade type:** what buyer, seller and/or independent confirmer must do for shop-counter handover, delivery, school fees, gifts and milestones; disputes, lost acknowledgements and non-response. Identified authorised actor is necessary but not sufficient.
2. **Regulated custody and rail truth:** confirmed bank/provider contracts, live method eligibility, exact KS Account mapping, settlement and refund routes, runtime capability feed, external limits and legal classification. Never present disabled rail as live.
3. **Fee economics:** "no extra escrow fee" product direction versus existing platform fees, micro-purchases, rail pass-through and revenue on contributions. No unilateral fee-doctrine alteration.
4. **Inventory contract:** sales, reservations, returns, out-of-stock, partial collection and merchant corrections; no automatically inferred SKU/barcode/quantity/price.
5. **Schools/organisations/campaigns:** approved ownership, identity, verified beneficiaries, guardian/student privacy, what "consumption now or later" means; restricted donations, fee accounting and public transparency permissions.
6. **Embedding public rollout:** exact host ownership and verification, isolated iframe/session flow, third-party developer scopes, origin/CSRF controls, mobile PWA/offline behaviour, accessibility and rate limits.
7. **Draft stack reconciliation:** exact source versions, CI, migrations, contract tests and staging versus current production, including known rail concurrency and outstanding permission-scope defects in the API unresolved-items register.
8. **Financial actuation GO/NO-GO:** source-complete features are not permission to connect live money; require independent security, compliance, financial partner and owner signoff.

## 9. Phase sequence and Phase 1 entry gate

Phase 0 audit/blueprint -> 1 Mini interface -> 2 capture/trade -> 3 KS identity/invitation/Agreement -> 4 funding -> 5 fulfilment/release/settlement -> 6 everyday merchant + school/group tools -> 7 cross-product distribution -> 8 owner/human/financial certification and controlled rollout.

**Phase 1 may begin as a staged UI and non-financial workflow only after**:
- owner reviews this master behavioural contract;
- exact source and compatible frontend/API branch pair selected;
- locked main three-panel UI and host UIs baseline/screenshots recorded;
- agreed miniature mobile shell and non-destructive entry/exit/handoff;
- staged money disabled, real/fixture labels unmistakable;
- representative non-scripted trading coverage and human research protocol recorded, with no broad wasteful test sweep.

**Phase 0 document-review checkpoint:** source evidence and missing authorities are documented, owner can review the blueprint, and a **draft documentation-only PR** exists. Actual trader observation and uncoached human evidence are still needed before signing off the representative acceptance corpus. Phase 0 does **not** claim completed production testing, partner certification, a real integrated Mini or live financial enablement.

## 10. Source references

- https://github.com/kimaniks001/SecurePayAPI/blob/main/AGENTS.md
- https://github.com/kimaniks001/SecurepayLLM/blob/main/AGENTS.md
- https://github.com/kimaniks001/SecurePayAPI/blob/main/docs/PHASE_2_MONEY_AUTHORITY_ARCHITECTURE.md
- https://github.com/kimaniks001/SecurePayAPI/blob/main/docs/doctrine/SECUREPAY_PAYMENT_FEES_REVENUE_DOCTRINE_v1.0.md
- https://github.com/kimaniks001/SecurePayAPI/blob/main/docs/PHASE_25_GROUP_SECURELINK_GOVERNANCE.md
- https://github.com/kimaniks001/SecurePayAPI/blob/main/docs/PHASE_27_CHOICE_KS_ACCOUNT_RAIL.md
- https://github.com/kimaniks001/SecurePayAPI/blob/main/docs/operations/MW_03B_STORE_DOMAIN_COMPLETION_REPORT.md
- https://github.com/kimaniks001/SecurepayLLM/blob/main/docs/MONEY_COMPLETION_BUILD2_REPORT.md
- https://github.com/kimaniks001/SecurepayLLM/blob/main/docs/LIVING_WORKSPACE_PRODUCT_CONTRACT_20261014.md

**Last checked:** 2026-11-09. GitHub main and named draft PR inspection; no live deployment, connected bank runtime or controlled human study certified in this audit.
