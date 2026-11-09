# SecurePay Mini — Real-World Trading Coverage Protocol (Phase 0 correction)

**Date:** 2026-11-09
**Status:** Working research and testing protocol, not an implemented or certified test suite.
**Related:** `docs/SECUREPAY_MINI_PHASE0_MASTER_BLUEPRINT_20261109.md`
**Scope:** Documentation only. No production code, UI, tariff, rail or financial-authority modifications.

**Concrete candidate test set:** [SECUREPAY_MINI_KENYAN_MARKET_TEST_PACK_V1_20261109.md](SECUREPAY_MINI_KENYAN_MARKET_TEST_PACK_V1_20261109.md) proposes 10 everyday focused jobs, 10 broader market jobs, 10 cross-cutting financial/security checks and blinded scenario substitutions. Sample products and prices are replaceable fixture data; no field tests have been executed.\n\n## 0. Why this correction exists

Owner correction: the charger, school-fees and wedding-contribution examples were **illustrations to discover the product**, not an authorised fixed feature checklist or privileged regression corpus. This programme must **not** optimise the model, interface or APIs for those three illustrated scripts. We need broad, evidence-led coverage of the most common real-world trading *behaviours* and the exceptional states that cause loss or distrust.

**A test case is not a UI specification.** A scenario tests the desired job and true financial result; it must not demand a particular button order or a compulsory screen. Any tests encoding product/item-specific keywords or rehearsed AI responses are invalid as evidence of general competence.

## 1. External grounding versus actual field research

Public source context (not a measured merchant sampling distribution):
- Kenya's 2024 FinAccess household survey categorises daily shop purchases, school fees, monthly bills, government/medical fees, person-to-person transfers, mobile-money tills/paybills, bank transfers and cash as common payment contexts: https://www.centralbank.go.ke/2024/12/13/10960/ and https://www.centralbank.go.ke/wp-content/uploads/2024/12/2024-FinAccess-Household-Survey-Manual.pdf
- FSD Kenya's 2024 FinAccess DFS segmentation reports digital payments are widespread but use varies by method, person and context: https://www.fsdkenya.org/wp-content/uploads/2025/03/FinAccess-2024-Digital-financial-services-segmentation.pdf

These reports support broad payment-context coverage, **not specific frequencies for charger shops, schools or other merchant niches**. Actual scenario ordering must come from observing traders and buyers, not invented percentages.

## 2. Discovery sampling — before fixing priority

Conduct short, non-leading observations/interviews across at least:
- Everyday retail: kiosk/duka, fresh produce, hardware/electronics, general shop, apparel.
- Services: repair, salon/barber, delivery/transport, crafts/trades.
- Invoiced/remote trade: online seller, supplier/wholesaler, advance-order merchant.
- Obligations and pooled money: school administrator/bursar, fees collector, chama/community organiser, accommodation provider.

**Initial discovery target (research plan, not completion claim):** about 20–30 real trading conversations across segments; include participants who do not own or browse Digital Stores. Sample at busy counter times as well as quiet times, in Ruiru/Kamakis and beyond the estate. Record actual observed sequence, present payment method, frequency, typical size, pain point, negotiation, proof used, trust problem, existing phone, network conditions, cost sensitivity and whether receiving payment and settling are separate expectations. Do not collect personally identifying customer information or real financial secrets.

User mix should deliberately include older adults (including someone the owner might describe as an 'old lady'), people uncomfortable with apps, people preferring Kiswahili, varying literacy and eyesight, people using inexpensive Android devices, one-handed/noisy counter use and both first-time/returning participants. **Do not assume every older adult is unskilled or cannot read.** Observe independently. Confirm a practical route for a customer without a KS Number; no forced account, device or language assumption may be silently built into a transaction.

Group observations by *job*; ask unprompted, e.g. 'Show me how you normally sell this' / 'What usually makes receiving this money difficult?' / 'How do you know it is safe to hand over?' Don't teach or sell SecurePay before recording their current behaviour.

## 3. Candidate behaviour families — hypotheses, NOT locked test scripts

| Family | Representative real-world variation to observe | Underlying capability to test | Counterexample/failure |
| --- | --- | --- | --- |
| A. Immediate in-person item | Kiosk consumable, electrical accessory, packaged item, clothing | Merchant offers; buyer verifies/accepts; fund; delivery/handover; authenticated release | Seller says 'paid' before backend confirms; misplaced notification |
| B. Negotiated/quantity retail | Tomatoes by weight, bulk rice, multiple changing prices | Correct count/units, edited quote, exact accepted total | Photo guesses weight/price; stale offer |
| C. Multi-line basket | Mixed household goods in one sale; multiple shop baskets | Distinct line items, seller and transaction attribution | Incorrect pooling or one seller's release affecting another |
| D. Repeat inventory seller | Busy shop restocks, sells, returns item | Separate on-hand/reserved/sold/returned stock; receipts | Invitation wrongly decreases stock, duplicated sale after retry |
| E. Remote goods/delivery | Social-message order, pickup later, courier delivery | Deferred fulfilment, evidence, dispute and non-response | Funds released merely because seller clicked 'sent' |
| F. Service at once | Barber, electrician, small repair, cleaning | Work defined, price accepted, completion and receipt | Work done differs; buyer cannot reach release flow |
| G. Scheduled/deposit service | Event caterer, repair in two visits, custom tailoring | Deposit, later milestone, cancellation, changes | Unfair automatic forfeiture or early full release |
| H. Supplier/B2B repeat | Retailer buys stock from wholesaler, quantity changes | Repeat references, purchase orders, partial supply | 100 ordered, 80 delivered, full settlement triggered |
| I. Used goods | Secondhand appliance, furniture, phone | Condition, inspection, return/defect disclosure | AI asserts unseen condition as verified |
| J. Transport, storage, accommodation | Goods delivery, storage for a week, short-stay booking | Location/time and provider fulfilment provenance | 'Booked' or 'delivered' claimed from unverified draft |
| K. Education and recurring obligations | Parent pays fee for correct learner/term; association dues | Beneficiary scope, receipts, installments and privacy | Wrong student/period or family data exposure |
| L. Group collections and contributions | Chama, welfare, wedding, community purpose | Purpose, consented contributions, distinguish pledged/received/disbursed | Public displays private contributors or unverified expenditure |
| M. High-value staged work | Construction, farm supply, commissioned work | Milestone acceptance, evidence, partial funding/release | Partial payment bypasses locked agreement or authorisation |
| N. Exceptions across EVERY family | Cancel, duplicate, wrong recipient, changed mind, poor network, merchant unavailable | Fail-closed state, replay/idempotency, safe recovery, dispute | Double charge, false funding, unauthorised release |

The actual product must handle *jobs*, not memorised nouns. Swapping charger for shoes, nails, flour or medicine must not change the general agreement/funding truth. Specific regulated goods or professional services still require their own lawful constraints.

## 4. Choose focus tests by *coverage*, not by illustrative popularity

Use a **scenario selection matrix**, not an indiscriminate huge test set. Each candidate case gets the following non-weighted descriptive dimensions; assign prioritisation weights only after gathering trader evidence:

- Frequency: everyday, weekly, occasional (observed/report-derived; not guessed).
- Trade shape: one item, negotiated basket, service, recurring obligation, collective contribution.
- Timing: immediate, future delivery, milestone, recurring.
- Participants: seller-initiated, buyer-initiated, group/institution; new or returning KS user.
- Entry: camera, actual barcode, Store selection, typed conversation, shared link, public QR.
- Money: small-value, mixed provider cost, pending, protected funded, partial, refund, dispute, settlement.
- Ability/context: low literacy, eyesight/contrast, Kiswahili, older adult, cheap Android, no reliable internet.

For focused automated checks, select cases **at the boundary of different state transitions**, not every combination; use parameterised variation to detect hidden hardcoding. For human tests use a few distinct everyday tasks and one error scenario per user; rotate tasks and items among participants. Keep a larger risk/capability matrix for release certification.

A scenario may be promoted into the focused regression pack only when its generalisable behaviour and failure class are stated, it is grounded in actual observation or a known domain invariant, and the test is independent of examples used to teach the model/design team.

## 5. Human-first research: does someone use it without coaching?

Recruit users with a range of comfort levels. Let the user choose an actual task and carry it out on a phone. Do NOT coach with feature or navigation instructions. Ask **'What would you do next?'** rather than 'Tap the pay button'. Observe:
- Can the person find the starting point?
- Can they capture a product **without** camera/barcode if they prefer?
- Do they understand who is paying and who receives it?
- Can they tell **invitation** from **accepted**, **initiated payment** from **funded**, **funded** from **released**, **released** from **settled**?
- Can they stop, correct a mistake, or decline without fear of losing money?
- Are fonts, contrast, buttons, prompts, loading/error states, language and QR alternatives usable on an inexpensive phone?
- Can an older adult independently complete the task with sensible pacing and no hidden time pressure?
- Can the merchant continue serving other customers while funding/verification/settlement is pending?
- Does KS001 ask one meaningful next question instead of a scripted form?
- Can they recover after a poor network or accidentally closing Mini?

Record task outcome, where help was requested, error count, misunderstanding, pauses, actual elapsed time and verbatim user language. Ask about **preference to use it again versus the current method** only after the test, not as a leading initial prompt. Use consent and anonymised observations.

**Proposed quality bar (subject to owner approval and pilot calibration):** no irreversible erroneous charge/release, no fabricated money state or beneficiary, no silent loss of work; ordinary tasks should be completed independently by representative first-time testers, and any serious comprehension/accessibility failure triggers a redesign before adding more features. Set numerical success/time targets from the first real pilot baseline rather than making unsupported percentages.

## 6. Model and implementation testing (anti-overfitting)

The model and UI must behave the same across:
1. **Semantic swaps:** charger -> nails -> loaf of bread -> secondhand chair, preserving the actual commercial shape.
2. **Role inversion:** buyer starts instead of seller; organiser invites contributor instead of reverse.
3. **Source swaps:** image -> text -> approved Store offer -> invoice; no unsupported assumption about price or quality.
4. **Amount/quantity swaps:** tiny sale -> larger sale; zero or unknown quantity; unit vs weight; revised amount and version.
5. **Time/status swaps:** handover before funding, completed work after funding, late delivery, pending provider response.
6. **Authority swaps:** wrong KS, wrong organisation member, expired token, revoked settlement destination, untrusted embedding origin.
7. **Communication swaps:** Kiswahili, colloquial Kenyan English, typo, incomplete utterance, no receipt/photo, screen reader if feasible.

Automated safety tests must check invariants, not particular AI phrasing:
- No agreement accepted without exact authorised review.
- No funding state from seller notification, screenshot or front-end guess.
- No release from unauthenticated, unauthorised or merely acknowledged handover.
- No balance change or double effect from duplicate webhook, repeated tap or retry.
- No settlement promise before provider reconciliation.
- No stock decrement, receipt or payment attribution from an unconfirmed event.
- No disclosure of private student, customer, contributor or host details.
- Unknown rail/unavailable service is explicitly unknown/unavailable, never a fabricated payment option.

Use a seeded, representative pilot corpus and **separate previously unseen holdout trades**; keep their details out of the assistant's test examples and implementation prompts. A hardcoded product-specific fix that passes the illustrated charger but fails generic retail **does not pass Phase 0 or Phase 1**.

## 7. Scope and approval

This document refines the six **illustrative** journeys in the Phase 0 master blueprint. They remain examples, not an approved prioritised six-case suite. Real scenario priority, human acceptance protocol and financial authority decisions still require owner review and actual field evidence. The updated Phase 0 working branch is docs-only; it **must not be merged or treated as deployment approval**.

### Phase 0 completion evidence

- [x] Establish independent scenario selection rules and realistic provisional trading families.
- [x] Separate user-research cases, automated behavioural invariants and adversarial/financial tests.
- [x] Include older/new/inexperienced users without stereotyping them.
- [ ] Actual trader observation/sample and evidence-backed priority weights.
- [ ] First uncoached accessibility/usability sessions.
- [ ] Owner-approved focused acceptance cohort and Phase 1 entry decision.

**Consequence:** Audit specification may be ready for review; *customer research is not yet completed*. No claim of test pass or field validation.
