# M1 First-Party Mini KS001 — compatibility and staging activation gate
**Date:** 12 November 2026 · **Status:** code candidate, not a live session certification.

## Finding: guest installation endpoint is not the current main API
Source comparison between current SecurePayAPI `main` complete git tree and approved Mini code shows:
- Mini's legacy `public/embed/securepay-guest-agent.js` calls `/api/v1/public/embed/installations/{siteId}`, with `/conversations`, `/history`, `/turns` and guest Agreement review/transfer under that prefix.
- The current SecurePayAPI `main` git tree has **no Java source path named Guest/Embed/Installation**, other than `ApplicationEmbedOriginRepository` and `JdbcApplicationEmbedOriginRepository` in developer-platform. No controller implementation of the assumed public guest-installation route was found. This is a source-level finding, not a proof that every independently hosted staging instance lacks a compatibility route.
- Current SecurePayAPI **does** define `POST /api/agent/conversations`, `POST /api/agent/conversations/{id}/turns`, `GET .../history`, `GET .../context`, `GET .../agreement-formation` and a version-pinned read-only handoff path. Anonymous unsaved conversations require the one-time `X-SecurePay-Conversation-Token` on later scoped requests.
- The original Workspace already uses `src/api/securepay/agent` plus `src/features/agent/controller.ts` for those genuine first-party routes.

## Candidate first-party Mini path
To reuse existing authority rather than build a second model or backend:
- `src/mini/miniFirstPartyConfig.ts` validates a **preview-only** configured `VITE_MINI_FIRST_PARTY_API_ORIGIN` against an HTTPS staging/sandbox/test/qa subdomain of `securepay.ke`; rejects production, Vercel, arbitrary origins, ports and URL path/query fragments.
- `src/mini/MiniFirstPartyKs001.tsx` reuses the existing `createAgentGateway`, `createHttpClient` and **same** `createAgentController` as Workspace, with its original consent/authorization rules. It displays replies inside Mini's existing compact `spm-guest` style and reads genuine `AgreementFormation` by user request. No new Agreement writes, payment rails, invitations or fabricated source data.
- Existing Mini `MiniGuestChat` stays as fallback when first-party staging is **not explicitly configured**; no change to approved shell, Store, ordinary Collect or seller/buyer source paths. The legacy guest SDK remains available to registered embedded-host environments and is *not* automatically re-routed to first-party.
- Resume guards: require a successful server history read, identical restored turn count and successful context read; otherwise no send is allowed. A 404 leaves a **non-secret session expiry marker** until human explicitly clears. A temporary error retains canonical conversation access for explicit retry.
- `tests/mini-m1-first-party-agent-contract.test.mjs`: four focused source/authority invariants; `package.json` prebuild adds them to six continuity and eight beneficiary tests plus TypeScript typecheck.

## Backend/operator handoff
**Do not change Vercel environment or invite a real person until all below are confirmed.**

1. Verify the *actual* `staging.securepay.ke` backend process/commit, live `/api/agent` routes, and separate database/Redis/model environment. The current Vercel staging project deployment listing returning zero cannot establish the identity of a service running at that hostname.
2. Verify staging CORS accepts **only an approved exact Mini preview Origin**. Tokens must stay in tab-scoped sessionStorage; never put them in URLs, screenshots, logs, Slack or chat.
3. After (1) and (2), operator sets **non-secret** `VITE_MINI_FIRST_PARTY_API_ORIGIN=https://staging.securepay.ke` in the **specific candidate Vercel Preview branch only**, never Production; deploy and inspect exact source SHA and no production services.
4. Human test with synthetic identities, no medical records/phone/bank data: create one conversation, 12-turn Ruiru chairs correction and delivery test, open Agreement review, reload original session, network history failure/retry, expiry/explicit clear, one mother collection story.
5. Confirm source-derived slots/unknown facts and acceptance thresholds by independent API logs and human visual test. A meaningful Agreement draft is **not** accepted Agreement authority. Real sign-in, invitations and Money will follow separate gates.
6. Verify `npm run typecheck`, `node --test tests/mini-m1-*.test.mjs` and browser mobile/desktop, including accessibility and network failures. CI job success must show executed steps, not mere Vercel READY state.
7. The existing guest-installation compatibility contract must be resolved for **third-party embedded Ask KS001** only by the registered-host/API owners; do not weaken first-party authority to make it appear to work.

## NO-GO triggers
Missing independent staging evidence; lack of CORS allowlisting; production API target; runtime API route unavailable; restored chat missing messages; wrong participant identity; backend model repeats already-supplied quantities; false donor authorization; fake paid/funded status; a new duplicate chat/Agreement/Money ledger; a layout redesign.

## Release decision
- **First-party integration code:** Candidate only.
- **Current Mini preview:** existing local guided beneficiary questions and source-backed Store browsing continue to operate; real first-party KS001 is NOT automatically on.
- **M1 acceptance:** PENDING exact staging registration and real model/human checks.
- **Production:** NO-GO.
