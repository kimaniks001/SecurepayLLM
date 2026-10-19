# Living Workspace — Structural Slice S2
**Date:** 2026-10-14  
**Branch:** `design/living-workspace-vision-circle-20261014`  
**PR:** #131, draft/unmerged.  
**Production:** unchanged. **Status:** implemented in Vercel preview; full authenticated/browser convergence NOT certified.

## Objective
Take the real member-scoped list of work from S1 and connect its *individual records* to existing SecurePay experiences, without copying authority, creating parallel editors, exposing private Circle content, or mistaking a saved KS001 draft for an accepted Agreement.

## What is built
1. **Separate accepted Agreements from saved drafts.** My Work reads existing `currentUserAgreements(0,20)` under the current session and lists the returned canonical title, reference and status. Saved builds remain a separate list and still resume the original KS001 conversation. No client-inferred Agreement creation or acceptance.
2. **Explicit, ID-based handoffs.** A member may choose **Open this Agreement**, **Open this Dream**, or **Open this Circle**. Each passes just the selected record ID using an in-memory, one-use entry bridge and exits preview. No private title, bearer token, content or ID is placed into the URL or persistent browser storage.
   - Agreement: `storeAgreementEntry(id)` enters existing Agreement Hub/detail, which revalidates access and version.
   - Dream: `storeDreamEntry(id)` enters existing `VisionDreamHome` / `VisionDreamExperience`. The existing `VisionDreamController.openOwnedById(id)` does an owner-scoped server `get`, rejects mismatched IDs, and reuses existing DreamBuilder revision/lock/version handling. No second editor.
   - Circle: `storeCircleEntry(id)` enters existing `CommunityExperience` and the canonical `CommunityController.openCircle(id)`, including backend circle GET and membership checks. No fabricated stewardship or Circle-only content leaked into LIVE.
3. **Preview-safe verified record inspection.** The same signed-in member can select **Inspect record** without leaving Vercel. This invokes existing, owner/participant-scoped `agreements.detail(id)`, `dreams.get(id)` or `community.circles.get(id)` via a *narrow read-only* preview relay. Server response ID must equal the requested ID. The detail is read-only, version-labelled when available, and cannot pay, update, join, share or accept anything.
4. **Restricted preview relay.** Only GET-by-ID for Dream, Circle and Agreement detail are added, with literal bounded path patterns and no query, no POST, and obligatory session bearer. The existing signed-in `GET /api/v1/me/agreements?page=0&size=20` uses its own strict allowlist. No generic API proxy, file/media reads, Circle posts, money actions or private source writes.
5. **Navigation and identity unchanged.** All four workspaces retain bookmarkable preview routes. One existing `SessionStore` remains the only identity source. On a hard refresh token-in-memory session intentionally requires reauthentication. No memberships are created when signing in.

## Explicit technical limitation
The isolated Vercel frontend routes into the **existing full-screen app** by switching hash routes on the same origin. That full-screen app presently talks to `https://securepay.ke/api` directly, which was previously observed to fail CORS from Vercel preview domains. **Therefore: passing a record ID into the existing editor is engineered but its full-screen Vercel preview handoff is not yet browser-certified or guaranteed to function.** The in-preview read-only **Inspect record** path is available for authenticated testing through the constrained relay. A production same-origin rollout or a separately approved, secure, appropriate preview API integration is necessary before claiming seamless full editing from Vercel.

## Verification
Targeted Node tests in `tests/living-workspace-phase7.test.mjs` check one-shot ID transitions, existing server-controller selection, strict non-mutating relay allowlists and denied arbitrary routes/query/POST, and response-ID validation. `Living Workspace Phase 7 Validation` runs these plus TypeScript and production build.
Full main UI regression gates and real authenticated cross-domain browser flows remain independently unverified. Backend Fair Trade PR #321 is still draft with blocked Java CI; do not merge this UI on its behalf.

## Human tests
1. Open latest Vercel preview, navigate My Work, sign in using a test KS Number (do not share credentials). Verify two distinct lists: saved KS001 builds and your server-listed Agreements.
2. Select **Inspect record** on an Agreement. Verify reference, status, current version, participants, and money status come from the actual record. Try a different identity and confirm it cannot read this record.
3. Inspect a real Dream; verify its version and locked state. A stale/unavailable ID must show an access error, not details from another Dream.
4. Inspect a Circle; verify server-provided purpose, visibility, lifecycle. Check a private Circle belonging to another identity cannot be inspected.
5. Select **Open this Dream/Circle/Agreement** and record whether the full app successfully loads, or if CORS blocks it on the preview host. Do NOT label the full handoff certified without a verified live browser journey.
6. Check that no Agreement acceptance, money funding or Circle decision can be initiated from the read-only preview inspector.

## Next structural slice S3
Bring the existing real Vision editing, Circle governance and Community transitions *within* the Living Workspace under their native version and access contracts, or solve the secure same-origin routed full experience; avoid duplicate authority, automatic sharing and CORS workarounds. Bring universal Photos/Documents evidence into the same permission model thereafter.

**No merge / production deploy / provider spending without explicit approval.**
