# SecurePay Mini — Phase 3: KS001 and Agreement Review

**Date:** 2026-11-09
**Scope:** User-visible Mini integration with the **existing** SecurePay guest agent and canonical Agreement review. No second AI model, no identity authority, no production finance changes.
**Status:** Source candidate + focused checks. **Live guest AI requires separate exact-site backend approval**, not an environment variable alone.

## What Phase 3 adds

- `src/mini/MiniGuestChat.tsx` replaces the misleading static "Ask KS001" placeholder with a real guest SDK client. When an approved SecurePayAPI pilot is reachable, it sends visitor-written turns to the existing canonical KS001 API, displays actual replies, preserves failed/pending requests and lets the owner explicitly retry the same request.
- `public/embed/securepay-guest-agent.js` reuses the site-scoped SDK already developed for the ShortStays/Estate assistant pilot. Mini does **not** implement a new model, proxy, ledger or conversation store.
- Users may explicitly **Discuss this draft with KS001**. Mini pre-fills an editable message from the user-reviewed local description, amount, quantity, unit and note. No counterparty identifier, guest token, image or source attachment is included; the user must click **Ask KS001** to send.
- After an actual guest conversation exists, Mini can request the existing canonical **read-only Agreement Formation review** and show the version, stage, summary and unresolved terms supplied by SecurePayAPI.
- If the backend says `reviewable`, the user may explicitly request a **version-pinned review handoff preparation**. The backend is the sole authority; this is NOT signature, invitation, acceptance, funding or a SecureLink.
- An unconfigured or blocked API produces an honest not-connected message, **never a simulated KS001 response**.
- The existing compact Mini, trade capture, quantity, photo and sample-host preview remain independent of the main approved three-panel SecurePay UI.

## Why this is safe, and why it is not yet the complete Phase 3

- Phase 3 is often described as "KS identity, invitation, Agreement". The current **guest** backend, even on draft PR #398, permits read-only review and preparation. It **does not** permit public participants to verify identity, issue signed invitations, accept exact agreements, or make money movements.
- Current draft API implementation is stacked through PR #399, **not production-certified**. Only a signed-in user in the actual SecurePay Workspace with canonical server-side identity/Agreement authority can perform those later actions.
- A person typing a KS Number is not authenticated; Mini explicitly says no invitation was sent and no one accepted.
- A link to the full SecurePay website does **not** automatically carry this draft/guest conversation. A separately verified possession-token, owner-confirmed transfer is necessary; it is not enabled in this Phase 3 pocket view.
- This is a *real protocol integration path*, not proof that a model reply has already been delivered. A simulator of SDK responses in a focused test is **not** a real connected browser test.
- The Mini iframe in the sample host is **same-origin owner-only** (and requires scripts/same-origin to load Vite module code). That setup is **not** an acceptable public cross-site embed isolation architecture. Real third-party distribution must use a separate SecurePay-controlled iframe origin and exact CSP/host registration.

## Provisioning for an actual owner live KS001 test

These steps are for an authorised staging operator; **none are silently performed by the UI branch**.

1. Select the exact, certified SecurePayAPI guest pilot branch containing the installed site manifest, guest conversation, turn/history and scoped Agreement review/handoff API. Review draft API PRs #395–#399 and their migrations, rate limits, authenticated installation ownership, budget reservation and trust boundaries; separately complete backend tests. Keep all money providers disabled.
2. Run a dedicated disposable staging API at an approved `https://sandbox.securepay.ke` or other exact staging-prefixed `*.securepay.ke` origin with model credentials configured securely on the server. Do not put keys in Vite, GitHub or URL parameters.
3. Authenticate the actual KS owner/operator to enrol/enable one **nonproduction installation** such as `securepay-mini-owner-preview`, with the **EXACT** Vercel preview origin used for Phase 3, strict CORS, daily/monthly test visitor model budgets, allowed guest/chat/review actions only and a valid host origin. Ensure the reverse proxy actually forwards browser `Origin` and `X-SecurePay-Conversation-Token` only to the scoped API routes.
4. Supply **public non-secret** Vercel Preview environment variables `VITE_MINI_GUEST_SITE_ID=securepay-mini-owner-preview` and `VITE_MINI_GUEST_API_ORIGIN=https://sandbox.securepay.ke`. Configuration alone is insufficient: the API must return `securepay-embed-guest-v3` manifest and `enabledOperations.ask=true` for that exact origin. **Never set these on Production**.
5. Rebuild a *preview branch* and test in an actual authenticated browser: manifest success, guest creation, first KS001 model reply (check actual backend log), history recovery, budget exhausted 429, expired token, wrong origin, rejected handoff and stale version 409. Verify no untrusted host receives tokens.
6. Observe the Mini's canonical Agreement version and unresolved points. The owner may prepare for review, but **must not** be told it signed, invited, funded or settled anything. Actual invitation issuance requires a separately certified identity/invitation gate.
7. After backend and browser signoff, enable explicit, consented continuation to authenticated full SecurePay on its own distinct project phase. Do not fabricate context transfer.

## Current source checks

```sh
node --test tests/securepay-mini-trader-cohort.test.mjs
node --test tests/securepay-mini-phase1.test.mjs
node --test tests/securepay-mini-phase2.test.mjs
node --test tests/securepay-mini-phase3.test.mjs
npm run typecheck
npm run build
```

The Phase 3 suite checks:
- exact staging-only backend URL and registered site configuration
- fail-closed disabled guest manifest and no unauthorised turn
- real client SDK route use and *mocked server* canonical review
- explicit opt-in draft discussion; no counterparty/secret leak from the local draft
- no signing, inviting, funding, settling or fictional answers
- independence of the existing full SecurePay workspace

**Human acceptance remains open.** The owner should exercise a working configured staging preview without guided clicks, then report whether Mini feels like a real helpful conversation. Until a model-backed staging response is observed, Phase 3 is **source implemented, technically testable, LIVE KS001 BLOCKED BY STAGING**, not complete.
