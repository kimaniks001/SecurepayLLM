# SecurePay Mini — Phase 4 Gate 5: Deposits, Milestones & Next Actions

**Date:** 9 November 2026
**Status:** isolated owner demo, draft PR; no live SecurePay required.

## Why this gate

SecurePay must organise the obligations surrounding money, not simply provide
a checkout button. The same compact Mini can display an agreed schedule, who is
responsible for the next step, what evidence or approval is needed, and what
would be communicated. A real agreement and real funding require independent
server authority; neither is claimed by this preview.

## One controlled example

A kitchen installation illustration totals **KSh 150,000**:
- Materials deposit: KSh 30,000 (before work begins).
- Cabinet installation: KSh 60,000 (after builder evidence and buyer review).
- Final handover: KSh 60,000 (after inspection and buyer approval).

The arithmetic is validated in source and focused tests. There is NO claim that
a deposit is funded/held or a milestone is paid/released.

## Working offline behaviour

- Buyer and builder **separately explore** the sample schedule, without signing.
- Buyer previews the deposit obligation; only then does the builder receive
  the next-action prompt to submit sample completion evidence.
- Builder enters a text evidence caption. Buyer can approve this sample stage
  or raise a concern; the builder must respond with corrected evidence first.
- Buyer previews the next scheduled payment obligation; the next milestone
  cannot reuse the first milestone's evidence or approval.
- A role-sensitive **in-app notification preview** shows recipient, single
  next action, deadline, and an overdue example controlled by the viewer.
- Sample activity is kept within the current browser tab, with guarded restore
  of locally stored test state and explicit reset.
- All statuses are visually tagged **NOT FUNDED / NO REAL PAYMENT**.

The preview is served using the existing `MiniExperience` shell at
`/mini.html?milestoneSandbox=1`. It does not alter the approved full
SecurePay three-panel page, replace Gate 4 checkout, or require KS001 chat.

## Critical authority boundaries

- This is not a legitimate consent/signature, order, booking, fund request,
  payment, escrow balance, settlement or release.
- Action prompts are calculated from **local sample state**, not canonical
  Agreement events; nothing is sent through WhatsApp, email, push or KS001.
- No database, notifications worker, store, financial rail or provider is touched.
- Evidence is a local **caption only**, not authenticated media/document proof.
- The sample does not pretend that a service order, funding or handover happened.
- Do not connect these state flags to payment providers or promote them to
  production without real participant identity, versioned legal consent, event
  authority, scheduling/idempotency, quiet hours and recipient preferences.
- Other platforms (Digital Store, ShortStays, My Ride, Storage, estate.ke) should
  later consume the *same canonical Agreement events* but apply their own
  commercial/booking/fulfilment rules. This Gate 5 is not a substitute for
  the SecurePayAPI contract.

## Focused acceptance

1. Open the Gate 5 Mini link. Buyer reviews sample schedule.
2. Switch to Builder; review schedule. A KSh 30,000 *deposit obligation*
   appears for Buyer, not a real payment prompt.
3. Switch to Buyer; preview deposit step. Builder is prompted to add evidence.
4. Builder adds a caption. Buyer can raise concern, then Builder corrects it.
5. Buyer approves sample cabinet installation; preview KSh 60,000 scheduled
   obligation. Builder proceeds to final handover, submits new evidence.
6. Buyer approves final sample stage. Total remains KSh 150,000 and all
   real-money flags remain false.
7. Toggle the overdue preview. Verify correct recipient, due time and clear
   **in-app preview only** warning. Refresh the page in the same tab: the sample
   stage is preserved. Reset the sample.
8. Confirm the main three-panel SecurePay and the Gate 4 Store/ShortStays
   simulated checkout pages are unchanged.

## Future real integration gates

1. Canonical Agreement schedule with authentic participants and version
   acceptance; invariant total/fees/currency.
2. Staged funding instructions and server-calculated fee/rule disclosures,
   explicitly separating funding, protection and release.
3. Authoritative evidence attachments, actor permissions, inspection,
   disagreement/escalation, conditional consent and disputes.
4. Durable next-action events, reminder queue, preferences, opt-outs,
   rate limits, deduplication and delivery retries.
5. Only then connect authorised provider-verified money events, reconcile,
   hold and release under approved partner rules.

This gate is **development-only** until the owner accepts the experience.
