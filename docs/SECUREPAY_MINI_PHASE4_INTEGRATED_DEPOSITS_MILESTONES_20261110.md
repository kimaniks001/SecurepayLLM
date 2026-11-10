# SecurePay Mini — Phase 4 final simulated Agreement obligations & next actions

**10 November 2026 · Offline development only · No SecurePayAPI · Draft branch**

## Roadmap preserved

This is **not** a new kitchen-contractor product or payment engine. It extends the
existing `journey=1` full checkout simulation already used by Digital Store and
ShortStays. The approved Mini shell, linked official SecurePay logo, optional KS001
chat, default `demoCheckout` journey, other Gate 2–4 simulators and existing
host return/recovery logic remain intact.

The focus is the universal Agreement lifecycle: source review → the same
version of terms → **selected payment obligations** → existing simulated rails
→ provider evidence → buyer review/concern → next obligation → completion.

## Explicitly selectable payment schedules

An uncomplicated purchase can **pay once**; a larger trade can choose a deposit
and milestones. This is a choice, not a mandatory instalment system:

| Example | Full amount | Deposit, 30% | First milestone, 40% | Final milestone, balance |
| --- | ---: | ---: | ---: | ---: |
| Store, 3 packs | KSh 1,800 | KSh 540 | KSh 720 | KSh 540 |
| ShortStays, 2 nights | KSh 9,000 | KSh 2,700 | KSh 3,600 | KSh 2,700 |

**All percentages/due days are fictional demo settings**, not agreed fee rules.
They are illustrative, not recommendations for all Store products or all
ShortStays bookings. Rounding is calculated in integer minor units with an
exact sum invariant; tiny unsplittable amounts fail closed.

Changing payment schedule while reviewing terms resets **both** parties'
review marks. Changing the source clears that schedule, every review, ongoing
sample attempts, evidence and disputed state. Only both reviewed participants
can enter the payment simulator. No review click is legal consent.

## In the original Mini

1. Click **Seller/Stay host** and review the fictional source.
2. As **Buyer/guest**, select Pay once or Deposit + stages, then review.
3. Switch to Seller/Host and review the same schedule. Return to Buyer.
4. Open the original Choice Bank/M-Pesa/PesaLink **simulation** for the
   **current scheduled obligation**, never the wrong instalment amount.
5. Select an outcome manually. Unknown/failed prevents moving on. A *fictional
   confirmed* result permits only an explicit **Continue sample work step**.
   There is no actual funded deposit, ledger credit or released obligation.
6. The seller/host adds a **text-only example evidence caption**.
   Buyer may raise a concern, provider can respond with corrected evidence,
   and Buyer can approve this simulated stage.
7. Repeat for subsequent staged obligations. Each has a new simulation
   component/ref selection and a fresh buyer/provider checkpoint; prior
   payment status and evidence cannot be reused.
8. Next-action preview names the responsible participant and a **fictional
   due date**; an optional checkbox previews what an overdue prompt looks like.
   No WhatsApp, email, push, AI agent or event queue is contacted.

The contract remains
`OFFLINE_AUTHORITY: {simulationOnly:true, ...every real money/notification flag:false}`.
No user identity has been verified; all example source/amount data are
checked-in fixtures; none creates a real order, room reservation, purchase,
deposit, acceptance, provider instruction, stock release or refund.

## Open directly for owner acceptance

- Store:
  `/mini.html?demoCheckout=STORE-DEMO-01&journey=1`
- ShortStays:
  `/mini.html?demoCheckout=STAY-DEMO-01&journey=1`

The `journey=1` toggle deliberately keeps all Gate 4 recovery features and
legacy checkout routes in place rather than taking over their flows.

## Executed safeguards

`tests/securepay-mini-phase4-integrated-milestones.test.mjs` includes:
- exact totals, 30/40/remaining rounding and small-value rejection;
- both Store and ShortStays pay-once and staged schedule reuse;
- the wrong role, out-of-order reviews, unknown/failed provider outcomes;
- each staged result, evidence caption, concern/correction, approval and
  advance to next independently simulated obligation;
- source/schedule change invalidating every earlier review;
- due/overdue and recipient-specific prompt rendering **without sending**;
- unconditional false real-money, fund-release, booking and notification flags;
- reuse of the original Mini, original funding simulator and preserved default
  checkout mode without a second payment engine or SecurePayAPI calls.

Included in `scripts/securepay-mini-preview-checks.mjs` together with all
existing focused regressions, TypeScript and frontend build checks.

**Required before leaving offline Phase 4:** owner hands-on review on both
examples, status/duplicate/reload regression checks across hosts and a clear
handoff of unresolved partner/API gates. Passing this offline simulation is
NOT proof of real payment, escrow protection or production readiness.
