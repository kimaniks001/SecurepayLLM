# Mini Sell Something — Phase 4 canonical Agreement handoff (17 Nov 2026)

**Draft only. No connected real seller source is passed by MiniExperience yet; no production writes enabled here.**

## Existing SecurePay authority reused

The seller's local Mini offer **cannot itself be declared an Agreement**. To progress, the seller must explicitly save the underlying offer into a real KS001 conversation with a backend Trade Context version. The existing `AgentGateway` supplies:

1. `createHandoff(conversationId, clientActionId, expectedTradeContextVersion)` — bound to a saved conversation, guarded by exact reviewed version.
2. `reviewHandoff(handoffId)`, then `readHandoff(handoffId)` — returns canonical terms, outstanding questions, source status and server-owned candidate digest.
3. `continueHandoff(handoffId, {expectedTradeContextVersion, expectedCandidateDigest})` — explicit seller acceptance of the exact reviewed source, idempotent per handoff; returns a backend-created DRAFT Agreement.
4. `AgreementGateway.detail(agreementId)` — confirms the real Agreement, its status and current version.
5. `AgreementGateway.propose(agreementId)` — a **separate explicit seller action**.
6. `AgreementGateway.issuePublicDoorway(agreementId, idempotencyKey)` — only after a PROPOSED real Agreement. Uses the existing **standard** SecureLink, no customisation.

The new `miniSellerAgreementHandoff.mjs` and `.d.mts` guard the progression and return only server-issued identities. `MiniSellSomething.tsx` now shows a discreet, optional staged Agreement section **only when a trusted signed-in caller supplies an actual `handoffGateway`, `agreementGateway` and `sellerSavedSource`**.

## Seller screen

- Review saved KS001 terms — displays backend candidate, amount and selected Who/What/When details; no typeless generated or fictitious Agreement.
- One answer pill: **These are the terms I'll share**. A separate **I need to change something** choice keeps the Agreement private. The saved reviewed Mini local snapshot is checked against subsequent local edits so a stale review cannot be reused accidentally.
- Set up my draft Agreement — calls authenticated existing handoff continuation; never invites, proposes or sends Money.
- Propose Agreement for buyer review — separate human click.
- Create SecureLink — separately authorized backend `public-doorway` only after real proposal. Returns backend-issued URL verbatim; if absent, no fabricated URL is shown.

Three seller exits remain independent: Share with buyer (Agreement + SecureLink), Add to my Store (unpublished, text-only Store draft) and Save for later (local text-only note). **No seller-side Connect to Money**.

## Remaining hard requirements before real user activation

- Real signed-in KSNumber/Business authority and a trustworthy KS001 conversation from this exact seller offer need to be supplied by the Mini shell; the existing playground supplies none of these props.
- Seller-written Mini offer values and the backend Trade Context must converge through a **real source write/selection** before the handoff (not an invented conversation ID or an ungrounded claim of matching offer). The UI currently shows actual server terms for comparison and confirmation rather than claiming local text was uploaded.
- Integrate tested source ownership, local/remote draft continuity and robust re-entry after network uncertainty; no blind non-idempotent create retries.
- Test and certify against SecurePayAPI Java 21/Postgres/Flyway, authorization/Business delegation, current offer revision, server review freshness, buyer version confirmation and first-party SecureLink issuance.
- Store text-only publication and its optimistic version control remains separate work. Public photos, Identimarks and image rights remain blocked in Phase 3 certification.
- No public deployment, PR merge, Money initiation, link customization or altered approved Mini design.

## Verification

Focused Node tests are authored for saved source version, backend review, unresolved matters, changed source, stale digest, DRAFT Agreement, separate PROPOSE and SecureLink conditions, plus static Mini screen boundary checks. Added to npm prebuild. **Tests have not been executed against a full checkout in this session.**
