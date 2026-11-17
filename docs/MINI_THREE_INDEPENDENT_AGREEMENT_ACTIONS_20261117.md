# Mini Agreement Exit — Three Independent Choices (17 Nov 2026)

Owner's correction: **Sending a SecureLink is not a prerequisite for connecting Money.** Once the Basket has prepared an Agreement, show three equally discoverable choices, not a multi-step send-then-pay funnel:

1. **Send SecureLink** — when another person needs to inspect, clarify, counter, agree or sponsor the trade.
2. **Connect to Money** — when this is a simple, fixed-price, ready-to-supply sale that needs no further material counterparty terms. The buyer goes straight to the available certified rails; no SecureLink is sent.
3. **Save for later** — preserve unfinished work without sending or paying.

The Basket stays the quiet WWWWWH/Fair Trade preparer; KS001 is optional. A delivery is its own mini Agreement; it cannot be assumed from the purchase. Choice Bank → M-PESA → PesaLink is unchanged.

## Implemented owner-preview behaviour
- The three buttons sit together directly beneath Agreement review, and remain visible even if the user chose to send an optional review request.
- The source-backed direct checkout preview is allowed **without any sample SecureLink event** only when offer snapshots are freshly verified, prices are published and fixed, basket questions are resolved, Store availability is `AVAILABLE` or `LOW_AVAILABILITY`, source identity/version is present, no unagreed provider clarification remains, and goods are collected (no linked third-party delivery).
- Service appointments, bespoke quoted prices, separate delivery and published `NEEDS_CONFIRMATION` remain reasons to get actual participant/contract terms. Do not claim they require SecureLink *specifically*—a canonical authenticated seller consent may also satisfy the requirement when supported.
- A buyer may still choose SecureLink on a simple sale as an optional route. Following fictional sample seller responses and buyer review, simulated Money can proceed with the same version-bound proposal.
- Before opening even fictitious Money rails, the owner preview rereads each published Store offer. Changed versions fail closed and require buyer reconciliation. No live acceptance, seller chat, payment or ledger occurs.
- Explicit owner-only preview `?miniTradeDemo=1&agreementActionsPreview=1` opens directly on a fictional Ruiru pump sale with collection, showing the three independent actions. It does not run on `securepay.ke`.
- `miniAgreementActions.mjs` is explicitly non-authoritative, returning `backendAuthorised:false` in all circumstances; never convert this into a financial permission. Real Money requires a server-issued canonical accepted Agreement, payer/recipient verification, provider route and reconciliation evidence, appropriate contractual/legal rules, and a genuine provider dispatch.
- The production app's currently unconnected Money and SecureLink buttons remain disabled, not falsely described as operational.

## Sell Something foundation
This three-exit pattern is not exclusive to buyers: a seller who has prepared a viable Agreement must also see the appropriate three choices, and can send it to a customer or directly attach a permitted Money path where the server verifies all necessary consents. No duplicated Agreement schema, Money gateway or Fair Trade rules.

## Quality checks
`tests/mini-three-agreement-actions.test.mjs` covers direct simple-sale eligibility without SecureLink, independent three-button presentation, source recheck, and proper blocking for unquoted, stale, service-availability or delivery cases. Existing sample Money/Living Agreement, quick delivery, approved compact Fair Trade and mobile Store tests are kept in the build gate. Final human phone walkthrough remains separate from automated build certification.
