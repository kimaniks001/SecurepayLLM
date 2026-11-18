# SecurePay Mini — Sell Something Phase 6A: Trade Again (initial engineering slice)
18 November 2026 · stacked draft · **NOT** production certified

## Scope: first incremental implementation, not the whole of Phase 6
The signed-in personal Mini **Quick Contract** now offers an optional **Trade again** path backed by authenticated, caller-scoped, paginated `GET /api/v1/me/agreements` (first 20 results only). It shows up to six distinct COMPLETED Agreements. Selecting one triggers a fresh authenticated `/api/v1/agreements/{id}/detail` read; the selected Agreement must still be COMPLETED and have the same canonical current-version identifier. Otherwise the shortcut fails closed.

**Only the old title is offered as the starting text for a completely new, local Sell Something draft.** The seller must declare their right to offer it, current availability, price, fulfilment, people and dates again; the existing Fair Trade questions and three existing seller exits remain unchanged.

The former Agreement, counterparty/KSNumber, payer, price, consent, invitation, securelink, billing state and Money **are never duplicated or inherited**. Buying a service previously never implies authority to sell it now. No new Agreement is created merely by using Trade again. No past trading relationship becomes a favourite or a directory listing.

The existing Quick Contract fallback ("Start with a person" and "Find a Store") remains. Business Agreements need separately certified representation and signed Agreement authority, so no guessed Business permissions are added.

## Not yet built / remaining Phase 6 work
- Verified, opt-in My People and Favourite Stores with an explicit privacy/visibility contract.
- Recurring Agreement / renewal semantics, stop rules, fresh consent and future scheduled performance; no recurring charges or automatic payer authorization.
- Wider browsing/pagination, safe repeated-offer editing, comprehensive authenticated integration and empty/error/revocation tests.
- Any business-specific Trade Again must use a separate backend representation-scoped Agreement listing and authority contract; personal Agreement endpoints cannot impersonate a Business.

## Test / release gates
- Node-focused policy/contract tests authored and added to prebuild, **not executed here** against a full checkout.
- Java 21/Gradle, PostgreSQL/Flyway, real identity and concurrent permission-revocation tests remain outstanding for stacked Phases 3–5 and later phases.
- No production change, merge, provider payment, eTIMS connection, actual directory publication, or sample-to-live privilege escalation.
- **Money follows the Agreement and is initiated only by the payer.** Existing Phase 7–11 release gates unchanged.
