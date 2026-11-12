# M1 — SecurePay Mini staging activation: verified configuration and exact next gate
**Date:** 2026-11-12 · **Product:** Approved SecurePay Mini is primary SecurePay · **Deployment:** staging-only, production untouched.

## Verified facts from connected Vercel and GitHub
- The `securepay-llm` Vercel project is `prj_C8t8l9Q3eAt5cFsfsxHJoNB6w8GJ`, a Vite preview application.
- Its existing non-secret `VITE_SECUREPAY_API_BASE_URL` is **`https://securepay.ke`** across Preview, Production and Development. Therefore the current Mini preview is **NOT isolated** for end-to-end real API experimentation. Read-only public Store browsing is permitted under the existing narrow preview relay, but testing a live Agreement on this origin without proving isolation is forbidden.
- The `VITE_MINI_FIRST_PARTY_API_ORIGIN` variable has not been configured in this project. Its first-party KS001 staging path is therefore dormant.
- The separate `securepay-ks001-staging` Vercel project `prj_bnd17Uacp36N38RuE12wluwtHLlV` has no latest deployment or custom domain attached in the connected Vercel account. Its default Vercel subdomain alone does not prove that `staging.securepay.ke` is or is not running elsewhere.
- A direct automated public URL check for `https://staging.securepay.ke` and `https://securepay.ke` did **not** obtain a usable response from the available network tools. Record this as **unverified connectivity**, never as confirmed backend downtime.
- SecurePayAPI main has real first-party `/api/agent/conversations`, `/turns`, `/history`, `/context` and `/agreement-formation` source contracts. They are not proven accessible at any verified isolated staging hostname yet.
- The existing `api/preview-staging-policy.js` enforces a crucial safeguard: staging upstream with writes is permitted **only** when `VERCEL_PROJECT_ID` is the **dedicated staging Vercel project** and the exact operator confirmation is present. Do not weaken that safeguard just to make the ordinary Mini preview appear connected.
- M0/M1 already introduced a first-party Mini KS001 adapter that uses the same canonical AgentGateway/AgentController as Workspace. It is a code candidate, not an accepted live conversation.

## New proven client repairs on the current branch
1. The first-party Mini previously read `history?limit=20` and then the controller separately fetched its default history window. A valid 12-turn chairs case may have **24 or more entries** and was at risk of a false continuity failure.
2. `resumeConversation(conversationId, verifiedHistory?)` now optionally reuses the **exact authorised server snapshot** instead of a second read with a different limit. Older callers continue to work unchanged.
3. `miniHistoryRestored` requires the expected conversation ID, ready canonical context, identical ordered message IDs, actual speaker and text. A same-length different transcript, duplicate ID or unresolved prior turn fails closed.
4. `miniFirstPartyOriginsAligned` requires **both** `VITE_MINI_FIRST_PARTY_API_ORIGIN` and the shared `VITE_SECUREPAY_API_BASE_URL` to be the same approved staging/sandbox/test/qa HTTPS origin. Production, mismatches, lookalikes, URLs with credentials/paths and arbitrary Vercel hosts fail closed. This is necessary but NOT sufficient for full backend isolation.

## Operator activation checklist — do not prematurely switch on
1. Identify the actual SecurePayAPI staging infrastructure, running SHA and API endpoint. Independently prove separation from production DB, Redis, queue, media and model/financial credentials. Document non-secret evidence and owner signoff.
2. Establish HTTPS `<approved-staging-host>.securepay.ke`; demonstrate the actual first-party Agent routes and server response schema from this isolated environment without using production identity or payment data.
3. Ensure the staging origin allows CORS only from the **exact owner-approved Vercel Mini staging preview Origin** with the needed methods and `X-SecurePay-Conversation-Token`; verify token secrecy and session-scoped retention.
4. Deploy the *approved Mini branch* to the dedicated staging Vercel project or otherwise complete an equally reviewed staging isolation architecture. Keep current `api/preview-staging-policy.js` allowlists. Do not simply add a stage target to the ordinary production-backed preview.
5. Set the **non-secret, branch-scoped** `VITE_SECUREPAY_API_BASE_URL` and `VITE_MINI_FIRST_PARTY_API_ORIGIN` to the *same verified stage origin*. The existing staging proxy environment configuration requires independent operator verification; never copy production credentials.
6. Run focused browser/API acceptance: 12-turn Ruiru chairs with 15 available vs 40 required, delivery questions and full final summary; same chat on reload with 24+ entries; forced history outage, recovery and 404 explicit reset; real mother's proposed collection with separate consent and recipient authority; read-only authentic Agreement Formation slots. Collect only synthetic/private-safe test words.
7. Verify the right KSNumber actor, independently accepted Agreement authority and truthful status. This M1 stage does not permit Money, SecureLinks, public family campaigns, Store writes or settlement.
8. Record actual API/UI commit SHAs, CORS policy, running backend version, focused logs, desktop/mobile human outcomes and explicit GO/NO-GO. Repair model behavior only from evidence. No mass test-run loops.

## Independent restrictions
- Backend stage isolation cannot be proven by a matching URL string alone; code checks cannot substitute for infrastructure verification.
- Do not equate passing TypeScript/Node/Vercel with passing the real KS001 12-turn scenario.
- Do not create a replacement KS001, Agreement engine, user store or financial proxy. Preserve approved Mini and Stores designs, and existing SecurePayAPI Phase 42 production gates.
- The 20 synthetic personas are auxiliary acceptance cases only; the main critical path remains M1 real KS001 → M2–M4 canonical living Agreements → M5/M6 onward.

## Current release decision
**Code correction:** candidate in `fix/mini-m1-history-proof-20261112`; verify focused build.  
**Staging activation:** **BLOCKED** pending independent backend/CORS/proxy isolation evidence.  
**M1 live KS001 certification:** **NOT YET PASSED**.  
**Production or real customer money:** **NO-GO**.
