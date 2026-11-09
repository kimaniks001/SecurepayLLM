# SecurePay Mini — Phase 1 Owner Human-Experience Test Charter

**Established in Phase 0, 9 November 2026**
**Review mode:** owner + ChatGPT, hands-on preview. **Financial mode:** fictional/sandbox only.
**Goal:** discover whether Mini helps a real human to complete ordinary trade naturally, without having to know SecurePay's internal architecture.

## Division of responsibility

**Owner:** is the *real person using the real preview*. Chooses tasks, clicks without a prescribed sequence, notices hesitation, evaluates whether they would genuinely use it. May override any suggested scenario. Owner observations are real human feedback, but do not prove broader population usability by themselves.

**ChatGPT:** maintains and varies the fictional trader cohort, critiques user-experience decisions, draws generalisable findings from owner reports and screenshots, proposes narrowly scoped fixes, and checks for incorrect financial reasoning. A model role-play is *not* a human using the app. ChatGPT cannot truthfully claim to have observed a user's clicks unless the user supplies evidence.

**Engineering:** provides an actual inspectable preview connected to matching API versions, uses test identities and synthetic money, records source SHA/environment, runs focused regression/safety checks, and resolves failures without redesigning the locked full SecurePay UI.

## Test process — one real job at a time

1. Begin from a natural purpose, not a screen or feature list. Example neutral prompt: "You've got a customer in front of you; help them trade" — owner chooses *what* is being sold and how.
2. Let owner operate the phone/Mini without hand-holding. No narrator saying which button to press.
3. Note initial intention, whether Mini understood it, unnecessary questions, visible state, pauses, mistaken assumptions, and whether the owner knows *what happens next*.
4. Inject one change (quantity, buyer, delivery status, network interruption, merchant unavailable) only after starting.
5. Review what was genuinely completed: prepared vs invited vs accepted vs funded in SANDBOX vs handed over vs release authorised vs settled. Never equate UI simulation with bank evidence.
6. Record at most one or two critical generalisable problems per focused run and the exact preview commit. Fix those problems; rerun that trader's job with different item/names/words, then rotate in a blind trade.
7. At repeat-use and business-evolution checkpoints, return to the **same fictional trader ID**, retaining earlier evidence and comparing across versions. Do not add their imagined data to production customer records.

## Owner session card

Record a short, factual card per actual session:

- **Preview:** URL, frontend commit, backend commit, staging environment, date/time
- **Fictional actor / task family:** TR-xxx, Fxx/Bxx, or "owner chose an unseen task"
- **Starting words:** how the owner naturally describes the job
- **What owner actually did:** actions they report or screenshots, not imagined clicks
- **What Mini genuinely said/did:** user-visible output and authoritative API result if relevant
- **Time and effort:** optional observed timings, hesitation, unnecessary prompts
- **Confusion/error:** a clear description, severity (blocker / friction / polish)
- **Trade truth:** exact state, including "SIMULATED" and unknown/unavailable where appropriate
- **Result:** PASS / FAIL / BLOCKED / DESIGN_GAP, with an evidence reference
- **Next change:** one generalisable correction and targeted regression to protect it

A card without observations remains `NOT_TESTED`. Never fabricate PASS results or performance metrics.

## Rules for the perfect Swiss Army knife

- Simple enough for an older first-time user, without stereotyping or taking away their freedom; text readable, large targets and optional Kiswahili/voice when actually implemented.
- User may speak, photograph, type, select a Store offer, use a QR/link or simply ask KS001. The available method is clearly distinguished from future concepts.
- KS001 acknowledges naturally, then asks **one useful next question** if essential information is missing; no obligatory complex questionnaire.
- The simplest routine trade should stay fully in Mini. The full securepay.ke workspace appears only when user chooses it or a genuine complex task needs it; **never lose the same canonical work**.
- Capture/description/invitation/acceptance/funding/fulfilment/release/settlement must never be confused. Unknown provider result is not "paid".
- No price, beneficiary, quantity, identity, inventory, booking or settlement invented by AI.
- No silent fund release or unverified identity; Money remains API-authorised.
- Merchant and buyer must understand when they can safely proceed and when they cannot.
- If a user declines onboarding, cancels or has a poor network, Mini explains their genuine options rather than inventing protected funds.
- Avoid broad test suites while discovering user experience. One relevant functional/regression check plus safety invariants per change.

## Human acceptance and financial release are separate

**Permission to begin owner testing:** a realistic preview, clearly fictional data, no real-money execution, exact compatible API versions, and a safe way to stop/clear a transaction.

**Evidence needed to call Mini easy for typical users:** uncoached owner sessions plus later consenting real users of varied digital confidence, device quality, language and accessibility. A single owner cannot validate the whole population.

**Evidence needed to activate Money:** independently documented authorised partner, legal/regulatory and engineering controls, financial reconciliation, identity and release governance. Passing human tests alone does not activate Money.

## Standing decision

Owner and ChatGPT can begin human UX testing once the Phase 1 inspectable Mini exists. We do **not** need to complete an external merchant survey before drawing lessons from the owner's first use. The current Phase 0 source audit and synthetic cohort are enough to enter **non-financial Phase 1 preview design**, not to declare market acceptance or live payment readiness.
