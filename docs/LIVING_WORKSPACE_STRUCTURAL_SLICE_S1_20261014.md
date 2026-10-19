# Living Workspace — Structural Foundation, Slice S1 (2026-10-14)

**Branch:** `design/living-workspace-vision-circle-20261014`  
**PR:** #131, draft/unmerged.  
**Production:** unchanged. **Full human/backend certification:** pending.

## Purpose
Convert the visually approved four-mode shell from isolated examples into one entry to **existing** SecurePay identity and server-owned work. The system of record does NOT move to the frontend, Vercel, localStorage, a new API service, or the model.

## Built in Slice S1
1. **Shared identity boundary:** the existing `SessionStore` is passed into the structural workspace. The built-in KS Number and OTP `SignInExperience` uses the existing `AuthGateway` and sets the same in-memory session. Signing in is NOT joining the Trust Project and does NOT grant Circle privileges. On full reload a new sign-in is needed because authentication tokens intentionally live only in tab memory; saved work itself remains on the server.
2. **Authorised real personal work:** `WorkspaceContinuityPanel` fetches only the requested domain:
   - **My Work:** `/api/agent/saved-builds`, with explicit `POST /api/agent/saved-builds/{id}/resume`. It resumes the EXACT original conversation through the existing `AgentController.resumeConversation`; it does not create a second Agreement or infer acceptance.
   - **Vision:** `GET /api/v1/vision-dreams` lists only the signed-in person's private saved Dreams. Existing Vision Board route handles editing under its own rules; this list is read-only.
   - **Circle:** `GET /api/v1/community/circles/mine` lists only Circles returned under the user's server-side privileges. No unverified member lookup or private Circle content is exported to LIVE. Existing Circle experience retains decision/governance authority.
   - **Community:** membership from `/api/v1/community/membership/me`; LIVE feed is requested only for ACTIVE membership. In addition to server authorisation, the UI renders only posts with `circleId === null`.
3. **Navigation continuity:** `#/preview/living-workspace/{work|vision|circle|community}` is refreshable/bookmarkable; switching modes preserves the active real Work conversation within the same mounted workspace. The original frontend route remains supported.
4. **Single transport/permission chain:** `createPreviewWorkspaceGateways` reuses the existing Auth, Agent, VisionDream and Community gateway implementations. The separate Vercel `api/preview-workspace.js` relay is same-origin and preview-host-only, allowing only the read methods above, narrow auth and explicit saved-build resume. Requests are size-limited, unrecognised paths rejected, cookies never sent upstream. It is not a generic API/CORS bypass and not to be promoted as an unreviewed production gateway.
5. **Truthful presentation:** signed-in users see server-owned records rather than illustrative proposal lists. No fake Agreement is displayed alongside an authenticated unselected My Work. Example SecurePay Helps cards are hidden after sign-in; signed-out demonstrations remain labelled. No UI observation authorises Money or Agreement actions.
6. **Automated checks:** targeted phase-7 test suite includes relay allowlist, cookie forwarding restrictions, untrusted origin rejection, authorised gateway reuse, direct saved-conversation resumption, and version-bound Fair Trade display. GitHub's `Living Workspace Phase 7 Validation` tests, typecheck and build are green at the integration checkpoint.

## Explicitly NOT completed
- Real Vision sketch/asset/draft editing within the Living Workspace itself; use existing approved Vision services and UI.
- Real Circle proposals, voting, stewardship and privacy-aware editing inside the new shell; existing Community/Circle journeys are canonical.
- Community project/event creation and moderation from new shell; use existing authorised Community features.
- A complete My Work list of fully accepted Agreements: S1 shows **Saved Agreement Builds**, not all legal Agreements; the existing Agreements screen retains authority.
- Universal production navigation and backend persona scope across all four contexts. Only the real My Work KS001 chat is integrated; other chat postures remain demonstrations.
- Durable tab-independent sign-in persistence: session tokens intentionally remain only in memory. Server records persist; identities must sign in after a full reload.
- Money execution or Fair Trade Qualification: API PR #321 remains draft and unmerged. CORS relay, browser authentications and backend methods still need real-human smoke tests.
- Full frontend convergence and Java backend certification (blocked/unresolved).

## Human acceptance protocol
1. Open the Vercel preview from a new browser. Navigate Work → Vision → Circle → Community; note mode URL and back/forward behaviour. Hard refresh Vision and verify mode returns.
2. Sign in using an authorised **test identity** via the native KS Number + OTP flow; do NOT share credentials. Confirm the same signed-in state is used across all four modes.
3. My Work: see actual saved builds (or truthful empty state), resume one; verify the original conversation history and the Living Agreement reappear, with the same conversation ID.
4. Vision: see own Dreams; refresh a listing and open real Vision Board. Verify no local demo boards masquerade as private saved work.
5. Circle: see only your Circles; do NOT find a private unrelated Circle. Circle proposals/decisions are accessed only through the existing governed Circle experience.
6. Community: with an ACTIVE member, see actual LIVE posts; with a nonmember or failed membership read, no member feed is exposed.
7. Sign out in the real app and return; ensure private lists disappear. Change account and ensure no previous identity's saved work is visible.
8. Hard-refresh while signed out: the workspace mode remains in URL, but the data requires re-authentication; do not claim session persistence.

## Next structural slices
- S2: server-owned navigation into exact VisionDream/Board IDs, Circle IDs and existing Agreement records, avoiding duplicate controllers.
- S3: move Vision canvas saves, Circle proposals and authorised governance actions into the new shell using existing revision/version and permission contracts.
- S4: Community lifecycle, universal tools, photo/document provenance and contextually relevant Helps with no fake data.
- S5: authoritative end-to-end Agreement + Fair Trade examination + Money/fulfilment integration; human/mobile certification and controlled rollout.

**No merge, no production deploy, no paid-provider operations.**
