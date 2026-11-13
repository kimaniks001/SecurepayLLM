# SecurePay Mini M6 — One Agreement Money journey
**13 Nov 2026 · source build candidate; backend/provider certification pending**

## What is implemented in the approved Mini
No Living Workspace redesign or new payment engine. Entry:
**Mini → My SecurePay → My Agreements → existing Agreement → Money**.

The Money section is the CANONICAL backend read, not the owner test simulator:

1. Authenticate as the actual Agreement participant; read current Agreement
   version. Any account switch remounts and clears private Money state.
2. GET existing `/api/v1/agreements/{id}/money-snapshot`. Verify exact
   agreement/version ID, funding positions, Payment Ready, eligible rails,
   release/movement assessment. A READY assessment is not a completed transfer.
3. GET existing `/api/v1/agreements/{id}/payment-intents?page=0&size=10`,
   validate server-owned states, amount, currency and uniqueness. Inspect an
   existing attempt via authenticated GET. An unresolved result is NOT paid.
4. Funding routes come ONLY from backend discovery. NEVER hardcode M-Pesa,
   Choice Bank, PesaLink, availability, fees, account/beneficiary or rates.
5. If the backend separately permits quote requests and the build's quote
   review flag is enabled, customer explicitly requests a VERSION-BOUND
   funding quote on the selected server rail. Show returned principal,
   SecurePay charge, provider charge, quoted total and expiry, with no
   invented economics. A provider quote may persist quote evidence but
   DOES NOT create an intent or debit anything.
6. The financial-command UI is a SEPARATELY gated source candidate. It
   rechecks payer authority, reuses the exact quoteReference and current
   Agreement version to create a server-owned, immutable amount intent.
   Requires independent explicit second customer action before initiating
   the provider with the EXACT quote rail and reference.
   Every initiation uses a single idempotency key. Network timeout is
   UNKNOWN; do not retry or change routes. Recheck the original attempt.
   NO release, ledger write or self-declared PAID status from Mini.

## Status, deposits and measured work
- Existing M6A quote-born Agreement screen lets the buyer compare proposed
  full amount, deposit/balance or milestone schedules, but does not record a
  new signed schedule or turn preview numbers into payable obligations.
- Existing M6B1 Agreement rate preview handles hours/km plus optional fixed
  fees, e.g. 4h tractor or 50km transport, also proposal-only. A verified
  usage bill requires independently evidenced actual work and agreed
  versioned rates. No browser-reported hours/km authorize payment.
- Existing SecurePayAPI has the funded-authority and CappedMeasuredSettlement
  engine; Mini must never reimplement it or assume funds in escrow.
  Direct routes and regulated safeguarding remain distinct optional choices
  under independently agreed terms and qualified providers.

## Release gates — ALL OFF by default
| Build switch | Default | Meaning |
|---|---|---|
| `VITE_SECUREPAY_M5_QUOTATIONS` | disabled | Open quoted Agreement controls only with matching API |
| `VITE_SECUREPAY_M6_MONEY_STATUS` | disabled | Read authenticated canonical Money snapshot and attempts |
| `VITE_SECUREPAY_M6_FEE_QUOTES` | disabled | Explicit POST for version-bound pricing evidence |
| `VITE_SECUREPAY_M6_PAYMENT_SUBMISSION` | disabled | May initiate provider; also PREVIEW-HOST only and requires backend financial-command certification |

None of these flags bypasses server authorization. The last switch is
additionally restricted to the explicit preview-host allowlist, rather
than normal production hosts. Never use the shared existing
www.securepay.ke sandbox as evidence that the isolated financial
environment is certified.

## Customer-facing Mini cleanup
- Removed ordinary-host entry to the old `Explore funding options
  (simulation)` draft preview.
- Sandbox-only query routes are ignored on normal hosts, and production
  labels no longer advertise `Phase 4` or `staging`.
- Owner Amina/Njeri scenario is kept ONLY for preview-host training and
  still cannot set a real Money status.
- `SECUREPAY_MINI_RELEASE_BUILD=1` omits demo/test HTML entries.
- `scripts/securepay-mini-release-audit.mjs` FAILS the customer release if
  compiled JavaScript still includes synthetic identities, sample chair
  agreement strings, test Money controls, or fake status labels.
  This gate intentionally remains a blocker until the full production
  bundle has been inspected and all fixture imports stripped.
  Do not delete the safeguard or simply relabel synthetic data.

## Remaining M6/M10 mandatory evidence BEFORE real funding or 20-person UAT
- Deploy the correct paired API and Mini branches to an isolated tenant,
  with separate DB, synthetic KS identities, provider **sandbox** rails
  and no real client money. Full Java/TypeScript/schema/API contract
  certification, not source inspection alone.
- Prove seller/buyer authority, Agreement V1+ amendment invalidation,
  multiple obligations and partial deposits do not bypass Money authority.
- Prove the complete provider lifecycle: eligible rails, accurate fees,
  expiring quote, exact intent version, idempotent replay, provider
  refusal/pending/unknown/reconciliation, no blind duplicate debit,
  evidence/obligation completion and authorised settlement.
- For measured services, record and independently confirm tariff, billable
  units and usage evidence before the server calculates a payable amount.
- Validate customer-facing release has no demo/test fixture bytes. Pass
  the release audit (currently not asserted).
- Once technical isolated sandbox gates pass, run the existing 20-person
  human test group, then controlled production release.

## Honest state
Mini's actual Money **frontend integration candidate** is implemented and
subject to focused tests/TypeScript/Vercel build. This is NOT yet a
certified, live financial service. Real provider debits and settlements
remain deliberately disabled.
