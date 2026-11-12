# M3 — Owner-authorised Save and Continue in SecurePay Mini
**Date:** 12 November 2026 · **Scope:** first-party Mini, isolated staging-only API, source-test candidate.
**Status:** M3A candidate pending final build and live staging certification. No production deploy or financial action.

## Approved unchanged
- Mini **is** the primary SecurePay; compact front end and locked Store presentation remain unchanged. Living Workspace survives as an optional deeper workbench.
- Same canonical KS001 AgentGateway, AgentController, AgreementFormationDto and SecurePayAPI Saved Builds domain. No new sign-in/identity/Agreement/finance system, no duplicate local server records.
- Marketing focus: #5 Focus, #12 Line Extension, #13 Sacrifice, #15 Candor, #18 Success; do not advertise "saved Agreement" as though anyone else has agreed.

## What M3A adds, as a quiet capability
1. **Sign in to save** is presented inside Mini only when the person requests Save or My saved work. It uses SecurePay's existing KS Number/password/OTP `createIdentityController` and **memory-only** `createSessionStore`. The password is dropped from the identity controller after the one-time challenge. The browser does not persist credentials, access tokens or confidential saved-build listings in localStorage/sessionStorage.
2. **Save for later** calls the existing authenticated `POST /api/agent/conversations/{conversationId}/saved-build`. It checks the server's actual `savedBuildId` and confirms that the returned `conversationId` matches the work being saved; a failed or unverified response is **not** shown as saved. The backend owns idempotency and actor authorization. The session can be refreshed via the existing `ensureFreshSession` helper, not an ad-hoc auth mechanism.
3. **My saved work** calls `GET /api/agent/saved-builds?limit=20&offset=0`, with server-enforced caller authorization. Items are bounds-checked and shown only after the backend returns a valid list. This is a list of **unfinished builds**, not accepted Agreements.
4. **Continue** calls `POST /api/agent/saved-builds/{savedBuildId}/resume`, verifies the returned saved-build ID, loads the original server dialogue history and uses the same `AgentController.resumeConversation(originalId,history)` with exact history and context proof from M1. It **never mints a duplicate conversation**. On invalid or unavailable data it fails closed, offers an explicit retry and never labels a partial transcript as recovered.
5. **Sign out** requires confirmation and clears only the in-memory session, transient owner list and current preview transcript. Unsaved work may be lost; it is explained before confirming.
6. **Privacy/permissions:** the API still independently checks identity, ownership and the participant boundaries. A typed KSNumber is not authentication. Neither this saved draft nor a listed build can invite, accept, fund or settle another person's Agreement.
7. Mini's original unsigned `Keep draft in this tab` preview remains truthful and separate from server-authenticated Save. The full account-save options are only reachable when the separately verified matching staging origin enables first-party KS001; existing production-backed previews remain disabled.

## Source layout
- `src/mini/MiniIdentityStep.tsx` — compact KSNumber + password/OTP, reuses existing SecurePay IdentityController, on-demand only.
- `src/mini/miniOwnedWork.mjs`, `.d.mts` — strict server ID/list shape and return-to-original validation.
- `src/mini/miniSavedWorkFlow.mjs`, `.d.mts` — testable real Save/List/Resume gateway sequences; actual source uses canonical gateway and AgentController.
- `src/mini/MiniFirstPartyKs001.tsx` — wire owner's explicit Save, list, Continue, Sign out and blocked-state retry inside the existing Mini KS001 layer.
- `src/mini/mini.css` — small on-demand identity/saved controls, no shell redesign.
- `tests/mini-m3-owned-work.test.mjs` — focused owned-work boundaries, original-conversation resume, negative identity authority, spoofed list, failed history, cancellation and truthful state assertions.
- `package.json` prebuild retains earlier M1/M2 cases and TypeScript, adds M3.

## Certification still required
- M0/M1 stage: exact isolated SecurePayAPI runtime SHA, database, Redis, model, queues, provider accounts; exact preview Origin CORS, no production data; all first-party API paths responsive.
- M1: genuine 12-turn Ruiru chairs and mother collection, no answer loops, source-correct delivery, reload and recovery.
- **M3:** two independently authenticated synthetic identities, creator saves then signs out and signs back in (fresh in-memory token), creator resumes original conversation and revisits the same authoritative server draft, **other identity denied** the saved-build ID; older saved build recently edited sorts first; session expiry/OTP failure/401/404 handled safely, no false creation or acceptance.
- **M3B remaining:** true second-party invitations, pending/accepted/refused/amended state and explicit identity/representation checks. Use only the existing API Agreement/Handoff and invitation domain and obtain human/authority gate. **No invitation or agreement acceptance was implemented in M3A.**
- M4: "My Agreements" for **established** Agreements, with actual status/next action, remains separate from "My saved work" for drafts.
- Money providers and real collections are separately gated; none are enabled.

## Decision
The first M3 Save/List/Resume **code slice** is a build candidate. Live multi-identity acceptance and M3B participant invitations are **not complete**. No merging to production on the strength of preview build status. The 20 original synthetic personas are auxiliary test inputs, not a parallel product programme.
