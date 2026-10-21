# SecurePay Master Phase 7 — Money & Fulfilment Source Audit

**Audit basis:** SecurepayLLM merged Phase 6 integration HEAD `7cc5c5d8a27f7046d57f58ac506a832a38dac5e1`, SecurePayAPI current `main` source and historical Money checkpoint documents. No provider environment credentials or live-money test were used. The status labels below describe inspected code and documented gaps, **not financial production certification**.

| Capability | Existing source / authority | Phase 7 treatment | Live qualification |
| --- | --- | --- | --- |
| Agreement financial summary | `src/api/securepay/agreements`, `MoneyAgreementCards`, `UnifiedMoneyTool` | **WORKING / CONNECTED**: keep compact Agreements + Review and Open Money | Server-sourced when signed in |
| Money at a glance | `money-snapshot/index.ts`, `MoneySnapshotPanel` | **WORKING / CONNECTED**: read-only version-checked per-obligation summary in Money shelf | Preview makes no financial changes |
| Authorised maximum | `money-authority/dto.ts` | **WORKING**: display authoritative position, never derive across contracts | Exact identity/version checked |
| Funded / progressed / released / remaining | `AgreementFundedAuthorityStatusResponse` | **WORKING**: show per obligation, no front-end sums | No fabricated global balance |
| Payment readiness | `AgreementMoneySnapshotPaymentReady` | **WORKING**: show backend evaluation vs pending | Not inferred from accepted-looking UI |
| Release movement preflight | `AgreementMoneyMovementSnapshot` | **WORKING**: display READY/BLOCKED/UNAVAILABLE read-only | READY is not transfer execution |
| SecurePay/provider charges | Existing `MoneySnapshotPanel`, `AgreementFundingQuoteResponse` | **CONNECTED** through canonical Money quote review, never guessed in this shelf | Versioned quote only, not sample |
| Funding rails / options | `money-snapshot/dto.ts` and `payment-intent/dto.ts` | **WORKING discovery**: show only server-returned rails; sample labels clearly hypothetical | **Not live-certified** by this PR |
| Funding quote and intent | `payment-intent/index.ts` | **EXISTING**: leave write authority in canonical Money | No initiation or sandbox charge executed |
| M-PESA / PesaLink / Bank | API rail-adoption source and adapter docs | **API DEPENDENT**: never claim all rails eligible or live | Historical docs note major cost/adapter gaps |
| Partner institution offers | `financial-partners`, Money UI | **PARTIAL**: canonical financial partner discovery; do not call partner Store | No credit or insurance approval implied |
| Evidence and milestones | `AgreementDetail`, `AgreementMoneyPanels`, obligations/evidence APIs | **WORKING/PARTIAL**: existing fulfilment surfaces; sample journey explains linkage | No evidence accepted in preview |
| Release / return / disputes | `payment-release`, Money and Agreement-review modules | **API DEPENDENT**: existing authority retained | No release, refund or review verdict simulated |
| Community Saver | Phase 4 Store plan + Plug consent | **EXISTING / PARTIAL**: sample journey preserves multiple distinct Stores, Plug and 3-way consent | No savings invented |
| Notifications | `notifications/index.ts`, existing notification UI | **EXISTING**: no new event-sending engine | KNOW/DECIDE/DO/REMEMBER remains server-owned |
| KS001 Money assistance | Existing `UnifiedMoneyTool` to agent conversation | **WORKING / CONNECTED**: Borrow/Invest/Protect advice routes through same KS001 | No autonomous payment |
| Agreement ↔ Money handoff | `features/money/handoff.ts` and preview entry intents | **WORKING**: existing Agreement context and version preserved | Back navigation as implemented |

## Phase 7 implementation

1. Keep `UnifiedMoneyTool` the only Money shelf. Add a collapsible, accessible sample of **seven human journeys** without sign-in or actual money.
2. Show a per-Agreement, read-only Money snapshot in the same tool for signed-in members, gated by matching `agreementId` and `currentVersionId`. Suppress financial figures if source context is inconsistent. Never sum positions.
3. Display backend-authoritative funding positions, Payment Ready, read-only movement preflight, and quoted-route availability. Any charge review or financial action opens the **existing** canonical Money experience; the shelf never writes Money.
4. Preserve original three-column Workspace, KS001, Store, Vision, Circle and Community presentation.
5. Test wrong Agreement, stale version, duplicated obligation, unsafe amount, blocked preflight, quote permission and zero financial writes; browser screenshots at 1440/390/320px.

## Seven journey evidence boundaries

**A Purchase, B Delivery, C Milestones, D Chama, E Cross-Store Community Saver, F Dispute, G Uncertain Provider:** all seven are **interactive, explicitly illustrative UI reviews**, NOT certified genuine funding, release, identity acceptance, payout or provider reconciliation. The 7th case specifically keeps timeout outcomes UNKNOWN pending provider reconciliation.

## Release-critical follow-up certification (not hidden)

- SecurePayAPI isolated authenticated multi-party journeys, exact accepted Agreement/version/role/ledger bindings.
- M-PESA, Bank and PesaLink actual active provider capability, cost, price/fee payer, quoted total, expiry, callback authenticity and idempotency.
- Funds preservation, partial settlement, double-release resistance, refund/return, dispute restriction and provider reconciliation.
- Evidence consent, GPS/location privacy and retention, delivery acceptance and conditional Money authority.
- Community Saver genuine Store identities, Plug certification, three-way economic consent.
- Owner walkthrough of all seven cases and existing approved visual layout.

**Do not merge or deploy to production without owner approval. The UI review does not claim live-money certification. No SecurePayAPI files, provider secrets, production rail configuration, or real payment instructions are changed in this UI-first slice.**
