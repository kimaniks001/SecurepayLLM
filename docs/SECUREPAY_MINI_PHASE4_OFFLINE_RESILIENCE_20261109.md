# SecurePay Mini — Phase 4 Offline Resilience Gate (owner sandbox)

**9 November 2026 — development candidate only.**

This is a *narrow, isolated offline resilience gate* carried forward from the owner-accepted
Phase 3 Gate 4 simulation. It does **not** mean the full master-plan Phase 4 checkout core
or real provider integration has passed.

## Invariants

- Same sample Store and ShortStays pages, one compact SecurePay Mini, optional KS001.
- Locked three-panel SecurePay full workspace unchanged.
- Existing Choice Bank, M-Pesa, PesaLink selectors remain **fictional**.
- Never mark a purchase paid, accommodation booked, a legal Agreement accepted,
  an inventory item held or any money moved.
- Don't contact production SecurePay, start real Money Sessions/Payment Intents,
  trigger STK prompts, reserve stock or reconcile bank provider transactions.
- All mini-sandbox API functions require the exact Phase 4 Preview branch,
  deployment host, nonproduction Vercel environment and independent encrypted secrets.

## Focused improvements

1. **Double-click**: The Mini attempt launcher now uses an immediate ref lock as well as
   React's busy state; a second click in the same update cannot start a second request.
   The host Pay launcher already has a single-in-flight guard.
2. **Unknown/pending**: A different attempt token is not accepted by the originating host
   while the original is pending, unknown, or fictionally confirmed. The host must
   independently re-read the original attempt from the Gate 4 server.
3. **Verified failure**: Only after the host has independently read a simulated
   `SIMULATED_FAILED` on its **current original attempt** may it replace that reference
   with a new simulated attempt.
4. **Outage or stale read**: A failed status GET can never authorise a retry. A
   response for an old attempt cannot clobber the UI state of a newer attempt.
5. **Expired**: A stored expired checkout is removed and cannot resume automatically;
   expired Mini attempts cannot restart from an outdated review. A new sandbox
   checkout requires a deliberate new host Pay action.
6. **Abandoned/reopened**: The same unexpired tab-local signed checkout and test attempt
   survive closing/reopening or a same-tab refresh.

All of these describe **single-browser-tab sandbox UX discipline**, not a production
idempotency or cross-device payment guarantee.

## Executing tests

`tests/securepay-mini-phase4-resilience.test.mjs` drives the real Store/ShortStays
host scripts with simulated DOM, signed encrypted Gate 2/3 tokens, Gate 4 server
readbacks, offline errors and expired saved sessions. The existing Gate 2/3/4 regression
tests still execute; TypeScript and Vite build remain mandatory.

## Owner acceptance (each host)

1. Open sample Store Pay. Click rapidly twice: exactly one checkout opens.
2. Review mock terms. Select M-Pesa and `Unknown → reconciled test confirmation`.
3. While unknown, close and reopen. Hit Check original test attempt. **No new attempt.**
4. After the server-derived simulated result, return to Store. Host says **NOT PAID**.
5. Repeat on ShortStays, try `Fail the attempt`, check host failure, then use an explicit
   new simulation attempt. No room should be called booked.
6. Try an expired session and a temporarily unavailable status check. The UI must
   prevent an unknown result being treated as safely retryable.

## What still blocks genuine Phase 4

Server-owned orders and room holds, authentic buyer/seller consent, legal Agreement
version acceptance, authenticated Payment Intent and real approved provider rails,
webhook/ledger reconciliation, durable idempotency and official provider sandbox
certification are **not** implemented by this offline gate. Backend PR #406 remains
draft; the live Store API 503/CI startup_failure must be separately resolved.
No production release or financial activation.
