# SecurePay Mini — Checkout-First Master Build Alignment

**Date:** 9 November 2026  
**Status:** Revised owner-directed build programme for review. **Documentation only**; no payment integration, live money activation or deployment changes.  
**Baseline:** Existing stacked Mini Phase 0–4 branches, approved SecurePay three-panel workspace and canonical SecurePayAPI.

**Phase 0 audit correction:** The backend already has `DeveloperMoneySessionController`, `MoneySessionController` and `HostedMoneySessionService`. These are first-choice foundations for hosted checkout, not a reason to build a parallel checkout session service. Their `FUND` redemption path must be explicitly reconciled with the existing provider-driven Payment Intent flow; **we have not confirmed equivalence**. See [Phase 0 Checkout Foundation Audit](SECUREPAY_MINI_PHASE0_CHECKOUT_FOUNDATION_AUDIT_20261109.md).

## Executive direction

**One Mini. One KS001. One agreement. One checkout. One ongoing trade.**

SecurePay Mini is the everyday face of SecurePay and should appear in **two equally natural ways**:

- **Ask / Get help / Prepare a trade** — a conversational, compact interface that discovers what a person intends and progressively introduces only the needed tools.
- **Pay / Book / Pay deposit / Settle invoice** — a compact, contextual checkout opened by an approved website with a canonical order/booking reference and authenticated terms, **not** a second assistant or a different payment product.

The user does not have to chat before paying. KS001 is available *on demand* inside checkout; it is the same agent and transaction context. Full securepay.ke is optional for deeper or unusual work and must eventually continue the same server-owned work with an approved user-controlled handoff.

Do **not** add a fourth full-workspace panel, redesign the locked masterpiece, replicate a money engine or embed host-side financial secrets.

## Foundation already built — don't rebuild

| Existing deliverable | Honest state | What we reuse |
| --- | --- | --- |
| Phase 0 blueprint; 20 permanent fictional trader/buyer profiles; 20 candidate behaviours; 10 safety checks | Draft, unmerged, research evidence pending | Stable IDs and longitudinal owner-led tests |
| Phase 1 compact standalone and owner-only same-origin sample host | Built preview, owner acceptance not yet certified | Pocket shell, responsive UX, on-device draft |
| Phase 2 capture/trade preparation | Built preview, limited media intelligence | Human-controlled text, photo, voice/browser, optional document and quantities |
| Phase 3 guest KS001 and canonical Agreement review | Frontend SDK path built; real staging AI, verified identity/invitation/acceptance outstanding | Existing guest SDK; same canonical API and review/handoff |
| Phase 4 Choice Bank / M-Pesa / PesaLink rail selection | **Local SIMULATOR only**, no authenticated checkout, quote, rail or provider outcome | Method selection UX and safe pending/unknown/failure demonstrations |
| Existing full SecurePay money infrastructure | Payment-intent, quote, snapshot and authenticated gateway **source** exists; compatibility and live provider certification unverified | Reuse payment-intent and money-snapshot APIs with no Mini-side ledger |

Source reference: `src/api/securepay/payment-intent/index.ts`, `dto.ts`, `src/api/securepay/money-snapshot/index.ts`; Mini existing `src/mini/miniFundingSimulator.ts`. API guest staging PRs #395–#399 remain draft. Digital Store browser PR #229 and ShortStays SecurePay iframe PR #241 remain draft. None of those is proof of a working cross-site checkout.

## The product lifecycle is the architecture

```
HOST ITEM / BOOKING / JOB                        DIRECT "ASK KS001"
          |                                           |
          v                                           v
Host server creates/validates order          Mini clarifies trade intent
          |                                           |
          +--------------------+----------------------+
                               v
                  SECUREPAY CHECKOUT SESSION
             immutable source/order/host references
             exact parties, terms, version, totals
                               |
                               v
                      Agreement review
                 (authentic users & consent)
                               |
                               v
          API funding authority / available rail list
             Choice Bank / M-Pesa / PesaLink*
                               |
                               v
                   version-bound fee quote
                    explicit payer consent
                               |
                               v
            backend-created idempotent payment intent
                  provider-required action
                               |
                               v
         authoritative provider status + money snapshot
              pending / failed / unknown / funded
                               |
                  +------------+-----------+
                  v                        v
         host notified safely     user sees original task
                  |                        |
                  +------------+-----------+
                               v
       booking/order fulfilment → evidence → dispute/refund
                               |
                               v
       authenticated, agreed release → provider settlement

* All three selectable in the owner SIMULATOR. Live API returns only actual
  partner-authorised, eligible and enabled rail options.
```

A customer's click on a host **Pay** button opens checkout; it must **not** initiate a charge or automatically accept an agreement. For hosted sites, the merchant owns listings, room inventory, rates, trip fulfilment and service terms. SecurePay owns the exact reviewed agreement, funding eligibility, money evidence and release authorisation.

## Revised phase programme

**Phase 0 — Blueprint and trader test cohort** (existing documented baseline)  
**Phase 1 — Small Mini, one companion** (existing preview)  
**Phase 2 — Capture and prepare trade** (existing preview)

**Phase 3 — Canonical KS001 + agreement authority** (resume, don't bypass):  
- 3A: exact-origin registered pilot; real KS001 answer, conversation preservation and budget/error recovery on staging.
- 3B: verified owner/guest identity boundary, consented canonical agreement review and exact-version acceptance **through existing authenticated SecurePayAPI**; user controls full-site transfer.
- Gate: no live-model, identity or invitation success claim until observed against a real enabled staging backend. Nothing can be funded against a merely local draft.

**Phase 4 — Checkout core** (now redefined as a complete owner journey):  
- 4A: **retained** three-rail local simulator and progressive disclosure (already built).
- 4B: secure checkout session for a server-owned order/booking, authenticated source and exact host/origin binding. Only opaque short-lived reference passes through browser. No amount, beneficiary or fee taken as authority from browser.
- 4C: buyer sees merchant, item/booking/service, amount, taxes/fees actually available, terms and cancellation conditions, agrees, chooses the API-provided rail, and sees the correct provider requirement/status.
- 4D: result displayed in same Mini, can safely leave/return/resume; no misleading payment success, repeat charge or unauthorised release. Tests in sandbox first.
- Gate: owner can compare **direct Mini-initiated** and **host Pay-button initiated** checkout, starting from distinct sources, and both resolve to the same trusted backend semantics without duplicate KS001 or ledger.

**Phase 5 — Shared website Pay-button bridge**:  
- One small **host SDK / checkout launcher**, with approved plugin/host integrations rather than per-app payment forms.
- First reference integrations: **one Digital Store** and **one ShortStays booking** (deliberately distinct retail/booking domain shapes). They use the **same** checkout service, not two implementations.
- Follow with My Ride, Storage and estate invoices/gate-related purchases **when domain rules are ready**.
- Initial trigger includes server-issued checkout/order reference, allowlisted host, permitted return destination and an expiry. Mini fetches all material fields from SecurePayAPI.
- Host verifies signed server-to-server events / reads trusted state; browser return or popup close is never payment confirmation.
- Gate: no host balance or order is marked paid solely on popup closure, local simulation, client redirect or forged callback.

**Phase 6 — After-payment work, release, refund and settlement**:  
- Keep **host order**, **SecurePay agreement**, **payment intent**, **protected money**, **fulfilment**, **release authority** and **settlement** distinctly visible.
- Support partial delivery, delayed booking, no-shows, cancellation, approved refunds, adjustments and complaints; release only on the authorized agreement/participant/policy conditions. No simulated release posed as a real bank transfer.
- Multi-seller Digital Store cart: one smooth customer experience, but separate seller-specific agreements/positions and no cross-merchant release authority or fund mixing.
- Gate: reconciliation and provider evidence independently prove each transition; disagreement/unknown paths fail closed.

**Phase 7 — Ecosystem convergence & consistent experience**:  
- Install same Mini entry/checkout modes across Digital Stores, ShortStays, My Ride, Storage and eventually Estate.ke.
- Each host supplies a **limited, consented context** (catalog/booking/order category and reference); no full host account export; no change to host's locked UI.
- The Mini can be tiny and unintrusive, launch in either Ask or Checkout mode, show a single next action and preserve continuity if user expands to full SecurePay.
- Gate: test identical protocol across different hosts and device/browser settings; no accidental cross-site state or merchant leakage.

**Phase 8 — Owner, human, security and commercial certification**:
- Revisit 20 stable fictional trader IDs across first-use, repeat-use and business evolution, **plus unseen variations**.
- Owner performs uncoached preview sessions. Independent consenting merchants, including older/lower-confidence participants, support wider market claims before broad rollout.
- Financial partner, legal/compliance, security, penetration, rate limiting, provider callback and reconciliation gates signed off separately. Only then narrow limited production release.
- Rollout measured for customer completion, failure/unknown resolution, fee comprehension, false-confirmation incidents and reconciliation—without pretending fictional tests are live usage.

## Phase 4/5 must share one checkout contract

Detailed contract and host acceptance table: [SECUREPAY_MINI_CHECKOUT_CONTRACT_V1_20261109.md](SECUREPAY_MINI_CHECKOUT_CONTRACT_V1_20261109.md).

**Minimal issuer:** host backend creates or confirms a real offer/booking and requests a SecurePay server-side checkout session. The browser receives only an opaque, short-lived, host-bound session reference (or one-time token); SecurePay re-fetches exact order/offer, merchant, amount and policy from trusted systems.

**No trusted browser price:** a host page saying KSh 9,000 is a display, not a financial instruction. Merchant identity, order/booking validity, currency, quantity and version must be verified by the respective authoritative servers.

**One Money engine:** reuse authenticated existing `fundingAuthority`, `fundingOptions`, `createVersionBoundQuote`, `createIntent`, `initiate`, `get` / `listAttempts` and read-only `money-snapshot` gateway. The Mini should not handcraft bank instructions or import the local Phase 4 simulator into production flows.

**Status integrity:** merchant reservation or booking hold, accepted agreement, payment initiated, provider confirmed, protected funded allocation, release authorised and settled are **separate facts**; show only the evidence the relevant backend actually holds.

**Return:** a customer may close Mini while pending and resume safely on the host; server-to-server signed events and/or authenticated reads reconcile state with retry/replay protection. The host can confirm a booking only after both its own inventory/business rules and appropriate SecurePay funding evidence are satisfied.

**Fees & economic truth:** show platform charge and rail provider charge from server-origin quotes, distinguish fee payer, avoid hidden charges; if no viable real rail/quote exists, don't offer a fake checkout option.

## What's next — controlled vertical slice, not another unrelated feature

**Start by resolving Phase 0's existing Hosted Money Session / provider Payment Intent compatibility gate**, then implement only the missing Phase 4B checkout context and Phase 5 launch/return bridge together, in **sandbox** using one Store order and one ShortStays booking. Run owner tests across different unscripted jobs. Complete real Phase 3 backend authority in parallel but do not fake or bypass it.

The implementation should carry **one canonical cross-site contract** through those vertical slices before broad Store/ShortStays/Ride/Storage rollout. Only widen after the complete journey works with clear evidence and no duplicated payment architecture.

### Protected boundaries

- No production deployment, hosted payment interception, bank provider activation, real fund movement, or new financial pricing in this roadmap PR.
- No main three-panel SecurePay UI redesign and no arbitrary host/CSP allowlist.
- Preserve previous tests and PRs; add checkout-specific contract tests rather than replacing them.
- Do not misrepresent staging simulated outcomes as actual agreement acceptance, provider credit, escrow, settlement or successful booking.

**Owner decision requested:** Lock this as the revised master roadmap before the next code phase. Product alignment can be approved independently of live financial certification.
