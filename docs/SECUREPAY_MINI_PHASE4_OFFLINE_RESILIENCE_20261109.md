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

## Gate 2 — untrusted iframe reference containment (same offline lane)

The browser postMessage reference is now treated as **untrusted even after origin and
iframe checks**. Previously the host temporarily persisted an incoming token before
calling GET; a tampered, expired, cross-order or network-unverifiable token could
occupy the current checkout slot, preventing the real attempt from being restored.

The host now performs a read-only, same-origin
`GET /api/mini-gate4-return?checkout=ORIGINAL&attempt=CANDIDATE` **before
accepting or persisting a candidate**. It checks the server-proven matching source,
fixture, original amount/order, false real-money authority flags and exact status.
On 403/409/503/mismatch or when the checkout changed during the request, the
existing reference remains unchanged; the host still shows NOT PAID. Only a
server-matched candidate may enter sessionStorage.

New executable cases test cross-order injection, a deliberately unavailable
status read, false PAID message hints, and valid same-order recovery on both
Store and ShortStays. Existing Gate 4 tests were adjusted to assert the shared
verification function, not weakened or bypassed.

### Verification record

- GitHub branch `feat/mini-phase4-offline-resilience-20261109`, stacked draft PR #256.
- Vercel Preview exact candidate `2ef82e79c4369e55c85c4fb7a9ac53d3f1694cc1`:
  **READY**, build-gated focused suites and TypeScript passed; Vite compiled.
- Owner independent browser acceptance of this Gate 2 change is still open.
- **No real provider, legal acceptance, financial activation or production deployment.**

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

## Gate 3 — offline checkout continuity after a failed status read

**2026-11-09 — implemented and build-verified; owner acceptance still open.**

A genuine sandbox recovery gap was found after Gate 2: when the Mini sent its
original signed test attempt during a temporary 503/network outage, the host
correctly refused to persist an unverified attempt, but it could then show
"No attempt started" and offered no direct way to recheck that same attempt.

The host now holds the incoming candidate in **volatile memory only** until
it can independently call its existing read-only, exact-original-checkout
reconciliation API. While unverified, it displays a clear **NOT PAID** state
and leaves **Check original test attempt** available. When the connection
recovers, the button retries *the same candidate*, and only a correctly
source/order/version/amount-matched server response allows persistence.

No candidate is saved to sessionStorage, reused as legal acceptance or
authorised for money. On explicit checkout expiry the local references are
cleared with an unambiguous **NOT PAID** warning; only a fresh user-initiated
sandbox Pay click can start another example. Closing Mini while a candidate
is unverified does not erase the warning.

### Executed gate tests

`tests/securepay-mini-phase4-resilience.test.mjs` now also executes Store
and ShortStays browser-host scripts through:
- unavailable status server → unverified attempt remains unsaved,
- close Mini → unresolved status remains visible,
- reconnect and click Check original → original attempt verified and stored,
- same-tab page reload → original verified attempt recovers with **no new checkout POST**,
- active checkout reaches expiry → no status GET/retry, explicit new Pay required.

Vercel Preview deployment `dpl_GGMcp57eZaxW7r4PavAtkZFFigCs` is
**READY** at source commit `c4e96175458b9b7ebaf291ef0b5ee2c1fa7205ae`.
Focused regression suites, TypeScript and Vite build passed. Earlier
Gate 1/2 checks remain enabled, and the owner-approved Phase 3 preview
was not changed.

**Important boundaries:** an unverified candidate is held only in tab memory,
not durable storage; after a full page reload while still offline, reopening
the Mini may be necessary for it to resend the original attempt. This is
still a fictional expiring test token, not cross-device idempotency,
bank/provider reconciliation, escrow or payment safety certification.
Do not merge to production or activate any provider.

### Owner's focused Gate 3 checks

On both the Store and ShortStays sandbox pages, start a mock payment attempt,
choose an unknown outcome, close and reopen Mini, press Check original and
confirm the same reference reconciles without duplicate Pay. Repeat for a
failed outcome and confirm a second simulation is possible only after an
independent failure read. All screens should explicitly report **NOT PAID**.
