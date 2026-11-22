# SecurePay Mini — Kenyan Market Realism Test Pack v1

**Date:** 2026-11-09
**Status:** Proposed research-grounded, risk-based test scenarios for owner review; **NOT executed**.
**Phase:** Mini Phase 0. Companion to `SECUREPAY_MINI_REAL_WORLD_SCENARIO_COVERAGE_20261109.md` and the Phase 0 Master Blueprint.
**Scope:** Nonproduction scenario specification only. Nothing in this file approves financial rail activation, pricing changes, model hardcoding or a redesigned main SecurePay workspace.

## Why these cases

SecurePay Mini is the everyday face of SecurePay. Validate jobs people already perform in Kenya, NOT the charger/school/wedding examples discussed earlier. Each test is a **trading-behaviour class**: nouns, prices, seller names, modalities and spoken wording are variable test data.

Market grounding:
- CBK/KNBS/FSD Kenya 2024 FinAccess survey reports formal financial access of 84.8% and confirms mobile money as the key driver, while inclusion and device access vary: https://www.centralbank.go.ke/2024/12/13/10960/
- FSD Kenya's FinAccess review reports 52.6% daily mobile-money use in 2024: https://www.fsdkenya.org/blogs-publications/2024-finaccess-household-survey-key-insights-into-kenyas-financial-landscape/
- Kenyan MSME policy situational analysis identifies micro-enterprises and wholesale/retail/services as significant categories (older base survey, so **do not** pretend it establishes 2026 frequency weights): https://msme.go.ke/sites/default/files/2025-03/Draft%20MSME%20Policy%202025.pdf

**Research caveat:** No actual field observations have yet validated this exact scenario mix, their prevalence, transaction amounts, demographics or economics. Priority below is a **product risk and plausible-frequency hypothesis**, not a statistical market share.

## How to use

- **Focus A (F01–F10):** ten separate everyday jobs to exercise before a Mini owner demo. Run one representative case per family, with a different item/name/phrase each time. This is a *candidate* focus list awaiting pilot observation.
- **Breadth B (B11–B20):** another ten jobs testing distribution, continuity and adjacent commercial opportunity; use a few per development slice and all in release/human readiness.
- **Safety S01–S10:** small invariant tests that must be checked across families and negative states. Automated tests should be narrow and deterministic; human tests uncoached, no model-prompt teaching.
- Do **not** turn the specific sample objects into keyword handlers or mandatory UI screens. Where rail/identity/org/campaign capability does not exist, the **correct result** is honest unavailability and preserved work, not a fabricated successful payment.

### Each tester receives
1. **Situation:** what they really want to accomplish, described in plain words.
2. **Actor & constraint:** whose phone, in-person/remote, buyer KS known/unknown, network conditions, urgency.
3. **Desired outcome:** what must be true at the end, not which buttons they must press.
4. **Unexpected change:** a realistic variation introduced after the user begins.

The observer may say *“Show me how you normally do this”* and then give no navigating instructions. The tester may use voice, typing, picture, selected Store offer, barcode or QR as suits the task. KS001 proposes, the human approves, backend rules decide financial truth.

## A. Focused daily-market journeys — 10

### F01. Very small counter sale — kiosk/duka
- **Situation:** A seller wants to hand a walk-in buyer a low-priced consumable; sample KSh 80–150. Buyer inspects it at the counter and wants to leave quickly.
- **Conditions:** busy shop, inexpensive Android, buyer has a KS Number in baseline; seller may choose existing item, one-line description or camera — no forced picture per transaction.
- **What this proves:** shortest useful offer -> correct buyer -> exact acceptance -> real funding status -> physical handover -> authenticated, policy-compliant release -> settlement record. Speed observed against ordinary till payment, not guessed.
- **Unexpected change:** customer changes to a different product before accepting; old quote/invitation cannot silently fund the new item.
- **Economics:** reveal total fee/rail charge; the existing minimum KSh 20 fee could be commercially unattractive for this sale. **Do not invent a new micro-tariff.**

### F02. Fresh produce sold by a less digitally confident older trader
- **Situation:** A vegetable seller hears “ongeza nyanya mbili, punguza sukuma moja”; units and negotiated final amount differ from first offer. Sample total KSh 170.
- **Conditions:** older seller; prefers spoken Kiswahili; variable count/weight, sunlight and imperfect connectivity; no assumptions about age equalling inability.
- **What this proves:** helpful question only for missing amount/units; no photo-derived price or weight; merchant confirms exact revised total; buyer can see it clearly before accepting.
- **Unexpected change:** connectivity fails before provider confirmation; trader sees **pending**, never “money received.”

### F03. Mixed household basket and corrected total
- **Situation:** Small shop sells soap, cooking oil and household goods as one sale, sample KSh 1,380.
- **Conditions:** merchant may select catalogue items, photograph a group or type list; one price is adjusted before acceptance.
- **What this proves:** line items, quantity, single-shop ownership, item provenance, exact accepted amount, clear total, receipt and stock movement only after appropriate confirmed sale/fulfilment.
- **Unexpected change:** customer returns one item immediately; returned amount/stock and authorised adjustment are properly represented.

### F04. Busy shop with overlapping customers
- **Situation:** Three customers pay for different items while a fourth customer's funding remains pending. Amounts happen to be identical for two sales.
- **Conditions:** 10 or more notifications in a short period; shop assistant and owner have different permissions.
- **What this proves:** every acknowledgement, funding, handover and release is bound to the **correct unique transaction**; a high-volume queue can be operated without accidentally approving someone else's sale.
- **Unexpected change:** notifications arrive out of order or twice; financial and inventory effects remain idempotent.

### F05. Service completed while customer waits
- **Situation:** Barber or salon worker finishes a service; sample KSh 600. There is no deliverable item or barcode.
- **Conditions:** price known at completion, buyer present; assistant must not demand product inventory or delivery photo.
- **What this proves:** service scope, final price, customer acceptance, verified funding, completion and appropriate release.
- **Unexpected change:** customer disputes an additional unquoted treatment; no automatic uplift or release of disputed amount.

### F06. Remote order from social media
- **Situation:** A seller receives a WhatsApp enquiry about shoes or bedding, sample KSh 2,400 plus KSh 250 delivery.
- **Conditions:** seller sends an invitation to known KS; buyer is not at shop, delivery is later. No need to move the sale to a new marketplace.
- **What this proves:** price/product/delivery terms and seller identity captured; accepted invitation can be funded; seller dispatch is not buyer receipt; no early automatic release.
- **Unexpected change:** seller substitutes a different size; buyer must review updated agreement, not fund silently modified terms.

### F07. Small home repair with unexpected materials
- **Situation:** Electrician called to repair an issue, starting labour estimate KSh 1,800; extra materials required after inspection.
- **Conditions:** buyer and tradesperson have different information; receipts/photo are proposals/evidence, not unquestioned truth.
- **What this proves:** scope clarification, honest estimate vs accepted quote, authorised amendment, funding and completion separate; original agreement cannot mutate behind buyer's back.
- **Unexpected change:** work stops and parties agree to pay only completed part; financial release honours authorised amount.

### F08. School fee partial payment
- **Situation:** Guardian owes KSh 24,000 for an identified learner and wants to pay KSh 6,000 this week.
- **Conditions:** school has a verified institutional KS; no public child profile or account exposure; parent may be paying on another person's behalf.
- **What this proves:** correct learner/term/balance, partial receipt, no cross-account allocation, school acknowledgment, clear payment and any separately approved application/release policy.
- **Unexpected change:** same family has two learners; never infer the recipient from shared surname. If institutional workflow unavailable, flag requirement, do not simulate a receipt.

### F09. Small community contribution via QR
- **Situation:** Person sees a local welfare/event contribution QR and chooses KSh 300.
- **Conditions:** contributor should understand organiser, purpose, intended use, whether contribution is refundable, and any disclosed costs.
- **What this proves:** verified purpose/organiser, clear consent, privacy, actual confirmed contribution vs pledge, governed disbursement rather than arbitrary withdrawal.
- **Unexpected change:** contributor wants anonymity from other supporters; public progress must not expose identity. No fake verified spending claims.

### F10. Trader buying stock from wholesaler
- **Situation:** Retailer orders 40 units of stock, sample total KSh 28,000, but only 32 arrive.
- **Conditions:** two business KS identities, inventory counts, supplier delivery evidence; possible bank rather than mobile rail.
- **What this proves:** business-to-business version-bound order, partial fulfilment, disputed difference, proportional release only if terms authorise it; remaining held amount tracked.
- **Unexpected change:** supplier proposes sending eight remaining units later rather than refund; both parties must agree to changed fulfilment timeline.

## B. Broader market journeys — 10

### B11. Regular customer requests “pay next week”
- **Situation:** Familiar customer wants goods today but cannot fund until later; sample KSh 1,250.
- **What this probes:** distinction between a recorded obligation, actual funding and credit. Mini must **not** pretend secured funds exist, unilaterally lend money or suggest a creditor is guaranteed payment.
- **Variation:** customer part-pays, remaining amount tracked without false settlement.

### B12. Second-hand purchase in person
- **Situation:** Seller offers a used cooker or sofa; sample KSh 9,500. Buyer inspects existing defects before accepting.
- **What this probes:** photo/condition disclosure, item-specific acceptance, pickup vs later delivery, disputes grounded in recorded terms.
- **Variation:** seller discloses a defect after invitation; new terms require explicit buyer review.

### B13. One cart, multiple independent sellers
- **Situation:** Buyer selects goods from two separate Digital Stores, totals KSh 950 and KSh 1,700.
- **What this probes:** one pleasant shopping experience without commingling sellers' financial allocations or inventing pooled settlement permissions.
- **Variation:** one seller cancels; other seller's valid trade remains unchanged.

### B14. Monthly rent, utilities or estate service charge
- **Situation:** Tenant/resident has a KSh 1,500 recurring charge and wants to confirm the correct month and beneficiary.
- **What this probes:** obligation identifiers, instalments/arrears, receipt and entity authority, no accidental double billing or false “paid” status.
- **Variation:** prior month partly paid; don't carry old balance into the wrong period.

### B15. Ride or delivery completed before payment
- **Situation:** Customer hires an authorised rider for local transport; sample KSh 250.
- **What this probes:** agreed fare, changed destination and completion; Mini respects My Ride's own provider availability and trip truth.
- **Variation:** rider changes fare mid-trip; customer must approve change, not be charged silently.

### B16. ShortStays reservation and cancellation
- **Situation:** Guest requests one night, sample KSh 4,500, subject to the actual host's available dates and cancellation terms.
- **What this probes:** payment protection cannot create a booking from an unverified listing; customer sees deposit, timeline and refund conditions.
- **Variation:** host cancels; record authorised refund path and truthful state.

### B17. Physical storage with optional transport
- **Situation:** Person stores furniture for four days, sample KSh 2,000, before buyer collection.
- **What this probes:** storage custody, location/time, extension charges and separate authorised transport arrangement; neither service can claim another's completion.
- **Variation:** furniture stays two more days; updated scope and amount require consent.

### B18. Milestone construction or skilled work
- **Situation:** Construction repair or fabrication job totals KSh 120,000 in two agreed stages.
- **What this probes:** evidence of milestones, partial authorised release, hold of unfulfilled funds and dispute process. Mini handles next action, full securepay.ke takes comprehensive review without duplicate trade.
- **Variation:** first milestone is rejected; no release from contractor-submitted photo alone.

### B19. Buyer without KS Number, data or smartphone
- **Situation:** An ordinary buyer wants to transact with a Mini merchant but does not have an active KS account or smartphone; another insists on physical cash.
- **What this probes:** honest onboarding or alternative approved route, accessibility and economic viability, no fabricated identity/funding; **physical cash is not automatically safeguarded in a bank allocation**.
- **Variation:** shopper decides to decline rather than register. No coercion and no bogus funded receipt.

### B20. Merchant closes the shop and asks “what happened today?”
- **Situation:** Trader handled 37 sales, three pending handovers, one refund and one disputed delivery.
- **What this probes:** usable daily sales/stock/fee reconciliation in natural language, clearly separating recorded orders, funded funds, authorised release, pending settlement and actual settled money.
- **Variation:** one bank provider is delayed; the merchant must not see that amount under **settled**.

## C. Ten cross-cutting safety / robustness checks

| ID | Stress case | Must be true |
| --- | --- | --- |
| S01 | Wrong KS Number or lookalike merchant | No private lookup leakage, mistaken recipient acceptance or payment |
| S02 | Seller falsely says money has arrived | No funded state until trusted provider confirmation and reconciliation |
| S03 | Handover before funding; seller clicks confirm | Handover recorded, but cannot produce funded balance or release |
| S04 | Wrong person/assistant/employee tries to release | Denied without transaction-scoped authenticated authority |
| S05 | Duplicate callback, payment tap, retry or race | At most one financial effect for the same authorised operation |
| S06 | Provider timeout/unknown outcome | No second blind send; preserve pending/held state and recovery route |
| S07 | Price, quantity, beneficiary or terms change after review | Exact acceptance snapshot cannot be silently altered |
| S08 | Buyer rejects, disappears, returns or opens a dispute | No indefinite opaque hold; show lawful agreed process without invented default timeout |
| S09 | Merchant embeds Mini in unauthorised site | No credential, money, customer or private Agreement leakage; fail closed |
| S10 | Tiny KSh 50–100 trade with existing fee/rail costs | Reveal costs, evaluate net economics; no hidden tariff or claim of cost-free trade |

## D. Blind variation and anti-overfitting

For every focus family, at least once change **the item**, **actor who starts**, **input method**, **local language/typos**, **amount**, **funding rail status**, **network response timing**, or **release-authority holder**. Keep variation count lean: one or two changes per run, not a Cartesian explosion.

**Examples of held-out replacements:** charger -> packet of flour; tomatoes -> charcoal measured in bags; salon -> bicycle puncture repair; shoes -> curtains; electrician -> water pump repair; parent pays school -> sponsor pays apprentice's fee; fundraiser -> bereavement support; wholesaler sells 40 units -> cooperative delivers 60 crates.

Do not teach the model any holdout case or record item-specific hardcoded routes. Grade whether the system **asks the right missing question, preserves exactly supplied facts, gets valid consent and presents correct authority**, not whether its exact wording matches an example.

## E. Tester cohort and evaluation

Proposed pilot, **not yet conducted**:
- Merchant perspectives: older market vendor, kiosk owner, high-volume shop cashier, small-service professional, remote online seller, stock buyer and school/association administrator.
- Buyer perspectives: first-time buyer, parent, contributor, returning customer, someone with no active KS or no smartphone, and someone preferring Kiswahili.
- Test on inexpensive Android and standard mobile browsers under sun/noise/weak network; do not stereotype based on age, gender or occupation.
- Do not coach users through clicks or use leading questions. Give the **job**, let them choose how. Observe time, hesitations, misunderstandings, error recovery, completion, willingness to use again versus current workflow and actual cost concern.
- Financial invariants are non-negotiable zero-tolerance safety gates; usability thresholds calibrated after pilot data rather than invented.

**Outcome labels:** PASS (observed behaviour plus authoritative proof), FAIL (observed incorrect), BLOCKED (missing API/provider/permission), NOT_TESTED (no run), DESIGN_GAP (usable workflow not yet specified). Source-only code/test existence is never PASS.

## F. Decision rule for prioritisation

**Focus A** covers highest-risk ordinary repeat behaviours and contrasting kinds of payment. **Breadth B** checks wider applicability and known opportunity boundaries. This is a starting hypothesis; replace focus priority after observed merchant evidence. Do not let an owner illustration become a compulsory development test.

A focused test should answer: *Does SecurePay Mini make this trade measurably easier than the user's existing method **while preserving financial truth and consent**?* If not, solve the general problem, not the particular product noun.

**Current progress:** Test specification authored; zero live human sessions, zero model certifications and zero financial end-to-end tests performed by this pack.
