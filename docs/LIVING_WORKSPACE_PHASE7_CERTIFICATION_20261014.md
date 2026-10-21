# Phase 7 — Human Certification and Production Convergence

Status: **OPEN — NOT PRODUCTION CERTIFIED** (2026-10-14)

## Validated approvals versus runtime truth
Phases 1–6 have user-approved *visual directions*. The React previews are explicitly fixtures with local UI state. They are not evidence of end-to-end SecurePay capability and must not be promoted to production as a functioning product.

## Phase 7 gates
1. **Baseline engineering:** `npm ci && npm run typecheck && npm run lint && npm run build && npm run test:living-workspace && npm run test:final-convergence`. Gather machine-readable logs and failures on the exact candidate commit. No unresolved failures.
2. **Real KS001 personas:** Work/Vision/Circle/Community enter backend orchestration as authorised context, not injected untrusted chat text. Capture actual model outputs for the same starter prompt. Prove context switching preserves facts and consent scopes. No model-generated authority.
3. **Agreement end-to-end:** Real sourced fact intake, document/photo provenance, permissions, missing requirements, canonical review, print, invitation, acceptance and Agreement-bound Money. Confirmation must be server authoritative.
4. **Vision continuity and resource boundaries:** Persist real Vision data and revisions; connect resource consumption to the API usage ledger, never a local cooldown toggle. Free Agreement work and read-only saved Vision are always available.
5. **Circle and Community truth:** Replace illustrative members, posts and proposals with authenticated owner/membership-scoped API reads and writes. Verify nonmember denial, no Circle-to-LIVE leakage, proposal not approval, governed votes/decisions.
6. **Connected tools:** Universal Quick Support affordance across all four environments. Short Stays/My Ride never promise provider availability; Quick Documents carry source/provenance and require issuance review; financial partners require current disclosed terms. Community Saver requires Plug verification, feasibility, participant consent, and authorised changes.
7. **Human certification:** With consent, run at least five real first-time-user journeys across desktop and mobile: simple trade, evidence/photo, personal dream, Circle proposal, quick invoice and practical help. Record time to first useful result, lost states, permissions confusion, unclear actions, and recovery. Observe rather than coach. Fix blockers and rerun.
8. **Deployment:** Review differential against real app state, isolate draft-only preview route, signoff feature rollout, monitoring and rollback. No merge or production deploy before approval.

## Current progress
- Opt-in live KS001 **My Work** bridge uses the existing `createAgentController` and `AgentGateway` (canonical conversation, real replies, canonical Trade Context, idempotent retry). The right-hand My Work panel now follows the SAME controller's conversation ID and reads server-owned Agreement Formation with the existing `createFormationController`; no illustrative Agreement facts are mixed into the live view. Live-session state survives workspace-tab changes within the mounted preview. The runtime API environment and first real backend exchange remain to be browser-certified.
- The `Vision`, `Circle` and `Community` persona behaviours remain UI previews: the backend `TurnRequest` currently accepts `message`, `clientTurnId` and `clientTimeZone`, but not a trusted, permission-bound workspace mode. Never inject a fake system instruction into user text to simulate this.
- GitHub workflow `.github/workflows/living-workspace-phase7.yml` adds typecheck, lint, contract suite, full regression and build on the isolated design branch; its run must be independently confirmed green.
- New repository test suite: `tests/living-workspace-phase7.test.mjs`, invoked with `npm run test:living-workspace`.
- Static contract checks do **not** validate backend access control, payment correctness, accessibility, end-to-end UI, browser render fidelity or LLM responses.
- Backend adapter work, persistence, actual model context, browser automation, human sessions and production acceptance are not implemented in this branch.
- **Current gate: NO-GO for production.**

## CORS isolation: Vercel preview only (October 14, 2026)
A preview browser cannot fetch `https://securepay.ke/api/agent/conversations` directly unless production explicitly allows its ephemeral origin. **Do not weaken production CORS** for this visual test.

The isolated Vercel deployment now serves `/api/preview-agent?path=...` on its own origin. The opt-in Work-only KS001 gateway forwards only conversation creation, turns, context, history and read-only Agreement Formation through a narrowly allowlisted Vercel serverless function to the existing `https://securepay.ke` API. The relay rejects non-Vercel hosts, cross-origin calls, unknown endpoints/methods/query parameters, malformed inputs and large requests; it never forwards browser Origin or cookies to SecurePay. Same-origin Vercel auth cookies can reach only Vercel deployment protection. Existing SecurePay conversation secret headers and optional bearer authorisation remain available for backend enforcement.

This resolves the **frontend cross-origin request design**. The deployed serverless function and upstream production response must still be verified in an authenticated browser session. Vercel reporting READY only proves its build/deploy succeeded, not that a real KS001 turn succeeded. If the live button is absent, inspect the preview's API environment configuration; if the relay responds 502, inspect Cloudflare/server-to-server access and upstream API availability. No money, private Agreement permission or CORS production policy is changed.

## Live integration smoke test (My Work only)
Open `#/preview/living-workspace`, choose My Work, and press **Try real KS001 (Work only)**. Enter an original trade intention. Verify a real API reply arrives, open canonical Trade Context, then switch to Vision and back: the Work conversation must remain present. Test an interrupted turn to confirm the retry does not generate a new client turn ID. Check that the right panel updates from the matching canonical Agreement Formation after each turn and context-version change. It must show server-owned terms, unresolved points and the next question without fabricating price, identity or acceptance. Correct a fact in chat and verify the SAME Agreement changes; test the explicit Refresh action. Confirm changing workspaces does not silently transfer content. If the option is absent, the API gateway is not configured on that preview deployment. This is a network/API/manual gate, not currently signed off.

## Observational certification script
Open the isolated Vercel preview with a new tester. Ask them to:
1. Describe a delivery deal; explain what is confirmed versus suggested.
2. Attach or describe a photo and identify its source before any Agreement action.
3. Dream up a workshop; save an idea; change tabs; explain privacy.
4. Contribute a Circle proposal; distinguish expression of support from adoption.
5. Open Quick Support from Vision; draft an invoice; explain whether payment has occurred.
6. Explore a transport or accommodation need; identify what requires real-provider confirmation.
7. Return to My Work after simulating Vision cooldown.

A journey fails when the UI misrepresents fake data as real, loses context, reveals private content, implies payment/approval/booking, or blocks Agreement work because Vision exploration is exhausted.
