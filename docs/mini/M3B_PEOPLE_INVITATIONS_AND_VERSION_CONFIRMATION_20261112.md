# M3B — People, invitations, and independent version confirmation in SecurePay Mini
**12 November 2026 | Product direction:** The approved compact Mini is SecurePay. No UI redesign, no second participant service, no new server contract.
**Status:** code candidate, backend acceptance and real-world legal/finance authority unproven. **Production NO-GO.**

## Scope and source-of-truth contract
The real SecurePayAPI already provides:
- `GET /api/v1/me/agreements` — server-scoped existing Agreements (not the anonymous KS001 candidate or saved build).
- `POST /api/v1/agreements/{id}/propose`, `GET /api/v1/agreements/{id}/invitation-targets/by-ks-number`, `POST /api/v1/agreements/{id}/invitations` and `GET /.../invitations` — creator-side permissions and invitation status.
- `GET /api/v1/agreement-invitations/me`, `GET /api/v1/agreement-invitations/me/{invitationId}` and `POST /api/v1/agreement-invitations/me/{invitationId}/join` — *recipient's own* inbox, review and Join.
- `GET /api/v1/agreements/{id}/versions`, `GET /.../versions/{versionId}`, `POST /.../versions/{versionId}/confirm` — recipient's exact current version and signed-in, idempotent, personally authoritative confirmation. The expected version number and content hash are sent by existing RecipientController, never invented or guessed by Mini.

The existing frontend implementation already has **one** `createInviteController`, **one** `createInvitationInboxController`, **one** `createRecipientController`. M3B reuses all three. The backend still independently checks account roles, target eligibility, session authentication, Agreement version and confirmation permission. A typed KS Number is not authority.

## What was implemented
- `src/mini/MiniParticipantInvitations.tsx`: a small optional **Invitations for me** layer inside the frozen Mini. Reads only the authenticated, own-account inbox; shows status words grounded in backend, then routes the chosen invitation into **the existing RecipientController**.
- The recipient first reviews the invitation. A distinct **Take part** action performs Join (which is **not** agreement). SecurePay then retrieves the exact `CURRENT` version. A second, explicit **I agree to this exact version** action calls the existing version-bound confirmation method. A 403 rejects the wrong account. An old version fails closed and is re-read by canonical RecipientController. A timeout/5xx retains the same idempotency key. This implementation does **not** infer everyone else's confirmation or any Money transfer.
- `src/mini/MiniCreatorInvitations.tsx`: an optional **Invite someone** layer. Selects only a real, signed-in-account-visible existing Agreement, not an Agent chat suggestion. Uses the existing InviteController to separately propose a DRAFT (without inviting anyone), verify an intended KS recipient, select an actual SecurePay role, explicitly create an invitation, show the server's status and optionally revoke. The one-time invite link can be copied on deliberate click and is never persisted by Mini.
- `src/mini/MiniFirstPartyKs001.tsx`: adds the two buttons only inside the existing staging-only first-party Mini, using the **same in-memory SessionStore** and AgreementGateway. Sign-in is a separate, on-demand identity step; merely logging in never joins or confirms an Agreement. Reauth clears previous account data; no action triggers silently from effect.
- `src/mini/mini.css`: only compact on-demand People styles; the Mini home, Store, conversation and floating tools are unchanged.
- `tests/mini-m3b-participant-authority.test.mjs`: focused tests execute the **real** canonical invitation/inbox/recipient TypeScript controllers, bundled into Node via the existing esbuild dependency, with fake backend responses. These test explicit action separation, wrong identity denial, uncertain idempotent retries, obsolete versions, KS target verification, changed recipient number and no financial authority.
- Existing M1–M3 focused tests remain unchanged in the prebuild; TypeScript verification is required.

## Non-negotiable distinctions
1. **Invitation created** ≠ recipient notified; a recipient may need to receive a copied link or discover the invitation in their self-scoped inbox.
2. **Link opened / VIEWED** ≠ joined.
3. **Joined** ≠ agreed; only a successful signed-in `confirmVersion` records one participant's confirmation of one current version.
4. **One participant confirmed** ≠ all confirmed, Agreement active or money funded.
5. **Needs changing / Not now** currently records **no decline, counter-offer or change request**. The existing RecipientController/REST contract does not offer a formal recipient decline/change endpoint; Mini explicitly tells the person to seek revision from the inviter. Do not market this as built.
6. A saved KS001 conversation and a read-only `AgreementFormationDto` are **not** an established Agreement. The existing first-party HandoffController governs the setup step; it is **not** newly wired by this PR. An independently authorised established Agreement is required to invite.
7. This uses frontend-only M3B code; it cannot be claimed to satisfy production participant notice, legal identity sufficiency, regulated Money, or actual backend security. No production mutation was performed.

## Exit gate — what live staging still must prove
- M0 isolated API/DB/Redis/queue/model/provider and exact browser-Origin CORS for Mini: missing. Production-backed ordinary preview cannot be used to test real writes.
- **Two distinct synthetic authenticated actors**, not an impersonating frontend flag. Creator selects an established Agreement, signs in and explicitly invites the intended verified KS Number and role; recipient sees only their own invite, reads its current version, first joins, then independently confirms; creator must see the resulting **real version-bound status**. A third unrelated actor is denied.
- Separate tests: expired/revoked invitation, wrong-account 403, changed version 409/422, network timeout with retained idempotency key, sign-out/account switch, and a declined-to-act path that never claims a recorded refusal.
- Agreement chat → authorised handoff/set-up → `AgreementId` is a separate remaining integration. M4's "My Agreements" will surface established Agreements and current next actions, distinct from M3A's unfinished Saved Builds.
- Source and staging test proof include exact UI/API SHA and meaningful success/failure screenshots. A green Vercel build does not equal a live M3B PASS.

**Decision:** M3B user-interface/controller **candidate**; live M3B certification **BLOCKED**; production and Money **NO-GO**. All twenty synthetic personas remain optional test fixtures, not a new product workstream.
