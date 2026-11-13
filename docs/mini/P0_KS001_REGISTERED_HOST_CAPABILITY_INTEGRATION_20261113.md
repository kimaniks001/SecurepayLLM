# P0 — Ask KS001 registered-site capability convergence

**13 November 2026. Code candidates only. No deployed/runtime/financial certification.**
**Scope:** SecurePay Mini, Varsityville Estate and Shortstays. My Ride and Storage remain subsequent adapter slices.
**UI lock:** preserve the existing Mini/Store/Estate/Shortstays layouts. A collapsed, on-demand help disclosure is permitted only in isolated staging.

## Purpose

One KS001 intelligence implementation and one code-owned capability source. Each surface sees only the subset it is permitted to know. The onion reveals information on request and never elevates identity, site, financial or agreement authority.

## Paired source branches — DO NOT interchange or merge blindly

1. First-party API source:
   `kimaniks001/SecurePayAPI@feat/p0-ks001-governed-onion-catalog-20261113`.
   Protects `GET /api/agent/conversations/{conversationId}/capabilities` by the existing conversation owner/possession policy, derives server-side mode and reads the registry also used by the Agent orchestrator.
2. Guest API source:
   `kimaniks001/SecurePayAPI@feat/p0-guest-ks001-capabilities-20261113`, based on the **historical Day 6 embed Phase 5 API candidate**, NOT main.
   Protects `GET /api/v1/public/embed/installations/{siteId}/conversations/{conversationId}/capabilities` with registration + exact Origin + site-conversation binding + the ordinary possession/owner policy. The guest subset is limited to Formation, Review and explicit Handoff preparation. No payments or executor authority.
3. Mini/UI source:
   `kimaniks001/SecurepayLLM@feat/p0-mini-ks001-governed-onion-20261113`, based on the M8 terms candidate. The first-party view is disabled unless `VITE_SECUREPAY_P0_KS001_CAPABILITIES=enabled`; its read goes through the existing AgentGateway. The registered-site SDK has a separately scoped guest `readCapabilities()`. The existing Shortstays-hosted frame and Embed SDK have been brought forward without redesign.
4. Estate integration:
   `kimaniks001/estate-manager@feat/p0-estate-ks001-capability-onion-20261113`, based on the isolated authorised-context staging branch. Estate retains its OWN permission-scoped data source and separately approved deliberate sharing. The local guest SDK copy uses the same new guest capability wire contract and has no money/gate actions.
5. Shortstays client:
   `kimaniks001/kenya-stay-stories@feat/ks001-shortstays-mini-staging-20261108` remains unchanged. Its opt-in iframe expects `/embed/shortstays-mini.html`, now restored to the Mini P0 branch and set to reveal the catalogue only on human request after an actual guest conversation. It must not be mistaken for a real booking handoff.

## Architectural constraints

- Capability catalogues are **descriptive-only**; Agent exposure is never tool execution. No registration, new KS identity, agreement acceptance, money intent or escrow can originate from these GET endpoints.
- First-party and guest endpoints are **different authority envelopes** over the same code-owned capability facts. Do not point registered guest widgets at `/api/agent/conversations` as a workaround.
- A public Origin never grants ownership, an unsaved conversation ID alone is insufficient, and any unknown/hidden/unsupported capability fails closed.
- The two API branches must be reconciled into one reviewed candidate before deploying the paired client. Day 6 embed endpoints, database migrations, configuration and CORS are NOT on the inspected current main; the new guest controller alone cannot run without its baseline.
- Estate's pinned prototype SDK is a compatibility copy. Do not evolve a second agent brain; after the paired sandbox certification, plan a pinned canonical SDK asset/version delivery with exact-origin and integrity controls, rather than manual duplicated logic.
- For the Shortstays hosted frame, operator must match its exact approved parent URLs and site ID, frame-ancestors policy, frame-Origin registration, and guest budget. An iframe READY postMessage is only transport readiness; it does not prove real KS001/model availability.
- Real checkout, booking availability, provider callbacks, money and agreement confirmation are not part of this P0 change. No real provider rails are authorised.

## Focused verification still required

1. Source reconciliation: bring API first-party and guest changes together on a single isolated target **without losing Gate 7/Gate 8** or prior developer work.
2. Run only `EmbedGuestCapabilityCatalogueControllerTest`, `AgentCapabilityCatalogueControllerTest`, `mini-p0-capability-catalogue.test.mjs`, `mini-p0-guest-capability-contract.test.mjs`, and applicable narrow Java/TypeScript compile checks. These have NOT been executed in this handoff.
3. Confirm an unregistered/disabled/cross-origin/other-conversation guest cannot read any capability and cannot contact a private agreement or money route.
4. Confirm a legitimate guest can chat, then disclose the three bounded Formation/Review/Handoff abilities, return to the same conversation, and explicitly continue to SecurePay without duplicate work.
5. Verify Estate guest context is explicit user-selected and remains separate; Shortstays only passes a PUBLIC listing slug and never assumes a reservation or price.
6. Confirm configured staging is an isolated API/database/model environment, with real browser/network evidence and rollback. Do not deploy to shared `www.securepay.ke` sandbox as evidence of release readiness.
7. Next client engineering: My Ride registered-site adapter (reuse hosted guest contract) and then Storage once a genuine maintained source repository/deployment baseline is established.

## Roadmap preservation

P0 capability truth + host contract is preparatory work. Resume the agreed SecurePay Gate 8 completion and the final Gate 9 (provider/callback safety), Gate 10 (20-person acceptance after technical gates), Gate 11 (production readiness). Do not shift the owner into broad testing or launch before engineering closure.
