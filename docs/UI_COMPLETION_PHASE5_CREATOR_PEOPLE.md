# UI Completion — Phase 5: Creator Invitation Issuance, People & Confirmation Visibility

Branch `feat/ui-phase5-creator-people` from `main` @ `56474de5ca2ec93679c07ff29b965cca3efc7df8` (Phase 4 / PR #30 merged) · UI-only · SecurePayAPI **read-only, not modified** · Not merged, not deployed.

Doctrine: **invitation created ≠ opened ≠ joined ≠ confirmed; an earlier confirmation ≠ a current one; one confirmation ≠ everyone.** Every creator-facing statement must be answerable with "SecurePay knows this because…".

## A. Archaeology (SecurePayAPI source; API not run) — and every prompt assumption that was wrong

| Question | Backend authority | Existing UI | Gap / correction to the prompt |
|---|---|---|---|
| Who may issue? | `AgreementInvitationService.issue`: **only the creator** ("only creator may issue invitations for now", 422) | `issueInvitation()` in the gateway, **no UI** | UI shows invite controls only when the caller's own participant status (Hub `currentActor`) is `CREATOR` |
| Which states allow it? | `AgreementStatus.canIssueInvitations()` = **PROPOSED, INVITATION_PENDING, PARTICIPANTS_JOINING**. **Not DRAFT.** | Phase 3 ends at a **DRAFT** | **Wrong assumption:** a Phase 3 draft cannot be invited yet. `POST /agreements/{id}/propose` (creator only, DRAFT→PROPOSED, idempotent) is a separate prior step. Built as its own explicit "Propose this Agreement" (invites nobody, tells nobody); never combined with inviting |
| Role codes? | `@NotBlank String roleCode` — **any non-blank string**, no enumeration | — | Documented. The UI offers the canonical vocabulary (`ROLE_CANONICAL`, mirroring the Agent's `RoleVocabulary`) as a *UI* choice, not a server rule |
| Target KS Number? | `intendedKsNumber` free string, **not validated** or resolved at issue; enforced at Join by `InvitationOwnershipVerifier` (case-insensitive match to the joiner's KS) | — | UI requires a KS Number and warns "only the account with this KS Number will be able to join". A mistyped KS creates an invitation nobody can join |
| Target identity id? | `intendedIdentityId` optional UUID; **only this** triggers a `agreement.invitation_issued` notification | — | Not exposed (internal id). So a KS-targeted invitation sends **no** notification; the UI claims none |
| Untargeted/open? | **Allowed** (open invitation: any authenticated identity may join) | — | Not offered (product doctrine unspecified; a bearer link anyone could use). Documented |
| Idempotent? | Yes, `(operation, key)` with request-digest check; **but a replay returns `invitationToken: null`** | — | **Key finding:** after a lost response the link is **unrecoverable**. UI says so and points to revoke + new invitation |
| List issued invitations? | **Yes** `GET /agreements/{id}/invitations` → `id, roleCode, status, issuedAt, expiresAt, revokedAt` (readable by any reader of the Agreement) | none | **Wrong assumption corrected:** the list exists. No target, no token, no `firstViewedAt` |
| VIEWED visible? | Yes, as `status = VIEWED` in that list | — | Shown as "Link opened · nobody has joined with it". Opened ≠ joined |
| Revoke? | **Yes** `POST …/invitations/{id}/revoke` (idempotent; no-op if already unusable). Does **not** remove the pre-created participant row | — | Built. Note: a revoked invitation's `INVITED` participant row remains, and the participant response carries no invitation id, so they can't be matched (gap) |
| Reissue/replace? | No such endpoint; you issue another invitation. **No dedupe**: inviting the same KS twice creates a second invitation *and* a second `INVITED` participant row | — | No "Resend"/"Extend"/"Generate new link" button exists. UI does not dedupe (server doesn't) |
| Expiry? | Fixed TTL 14 days (`INVITATION_TTL`); `expiresAt` in the list; `EXPIRED` status | — | Shown; "Expired" also derived from `expiresAt` in the past |
| Who joined? | `GET /participants` (id, identityId, roleCode, participantStatus, addedAt) and **Detail participants** (id, role, status, `ksNumber`/`displayName` **only when `identityId` is set**) | People used Detail | An `INVITED` row from a KS-only invitation has **no identity** (identityId null) → shown as "Someone invited" |
| Participant statuses | `CREATOR, INVITED, PENDING, JOINED_UNCONFIRMED, CONFIRMED` | mapped incorrectly (below) | mapped exactly |
| Confirmation statuses | `ConfirmationStatus` (CONFIRMED + others); UI counts only `CONFIRMED` | — | — |
| Current vs stale | `/confirmations` returns every confirmation with `confirmationCurrent` (= on the Agreement's current version) and `reconfirmationRequired` (= !current) | Detail used `confirmation-status` | **Wrong assumption:** `GET /confirmation-status` passes the *caller's* identity and returns **only the caller's own row**, so it can never show other people. Phase 5 uses `GET /confirmations` (all participants) |
| Creator's own confirmation | Creator has status `CREATOR` and role **`PROPOSER`**; `confirm()` requires `JOINED_UNCONFIRMED`/`CONFIRMED` → **the creator cannot confirm** and is never "reconfirmation required" | showed the creator as "Joined — not yet confirmed" | **Wrong assumption:** no "Your confirmation is needed" for the creator; no "Client · confirmed". Creator row is "Started this Agreement" |
| Later evaluation on confirm | Confirming triggers Payment Ready evaluation server-side (best effort) | — | Not surfaced (Money out of scope) |
| Creator actions after confirmations | None specific in the Agreement API beyond the backend `nextActions` already shown in Overview | — | No local next-action ranking added |

**Existing People bugs fixed (`participantConfirmationStatus`)**: a stale confirmation was labelled "Joined — Not yet confirmed"; `participantStatus === 'CONFIRMED'` with no confirmation row became "Confirmed current version"; the creator was "Joined — not yet confirmed"; and a failed confirmation read failed the whole Detail closed.

## B. Authority map

| Step | Action | Endpoint | Auth | Transition | UI claim allowed |
|---|---|---|---|---|---|
| Propose | "Propose this Agreement" | `POST /agreements/{id}/propose` | creator | DRAFT→PROPOSED | "invites nobody and tells nobody" |
| Create invitation | "Create invitation" | `POST /agreements/{id}/invitations` | creator | invitation `ISSUED` + participant `INVITED`, Agreement→`INVITATION_PENDING` | "Invitation ready… nothing has been sent, and no one has joined" |
| Copy | "Copy invitation link" | none (clipboard) | — | none | "Link copied. Copying doesn't send it to anyone" |
| List | People area | `GET …/invitations` | reader | none | statuses as SecurePay reports them |
| Revoke | "Revoke this invitation" | `POST …/invitations/{id}/revoke` | creator | `REVOKED` | "stops a link from working; doesn't remove anyone who has joined" |
| People | Detail | `GET …/detail`, `GET …/confirmations` | reader | none | role/status/identity as supplied |

## C–E. Creator journey and sharing
Open a draft from Agreements → People → **Propose this Agreement** (draft only) → **Invite someone** → *Who should take part in this Agreement?* (their KS Number, their role in this Agreement) → **Create invitation** → **Invitation ready** → **Copy invitation link**. The link is `origin + /#/invitation/<token>` (the Phase 4 route) built from the returned token, held **in memory only**, never displayed as text, never persisted, cleared by **Done**. Copying proves only that the link is on the clipboard: no Sent/Delivered/Seen, no WhatsApp/SMS/email. After a Phase 3 draft is created, the notice offers **Open this Agreement** (and says nobody has been invited).

Naming: the backend calls the Agreement invitation link a "SecureLink" in its join notification ("Someone joined your SecureLink") but the frontend's SecureLink components are Store offer doorways. The UI stays factual: **invitation link**. Naming question left open.

## Correction pass (review of head `608d462`)
1. **Nullable token contract.** `IssueInvitationDto.invitationToken` is `string | null` (a replay returns the invitation without its token).
2. **Exact replay identity.** A replay without a token keeps the returned `invitationId` (`issued: { invitationId, link: null }`; never the token). The "This invitation already exists" state has **Revoke this invitation** bound to exactly that id (not chosen by role, date, position or text), then **Create a new invitation** (fresh key). "Revoked" is read from the list entry with **that id**; an uncertain revoke keeps the id, re-reads the list, and is not shown as revoked until SecurePay says so. `reset()` clears the identity.
3. **`CONFIRMED` participant with no matching confirmed record = UNKNOWN** ("Joined · confirmation details couldn't be established"); "still needed" is used only where the participant status is also `JOINED_UNCONFIRMED`. A record belonging to a different participant does not fill the gap.
4. **KS Number not validated at creation.** The form now says: "SecurePay will bind this invitation to the KS Number you enter. It is not checked when the invitation is created, so check the number carefully. Only the account with this KS Number will be able to join." No verified/found/valid wording.
5. **Unknown invitation status fails closed.** Only `ISSUED` reads "Not opened yet"; anything else reads "Invitation status unavailable" and offers no Revoke.

6. **Production session-refresh boundary audited and brought current.** `RuntimeApp` had a hand-copied `withSessionRefresh` method list for the Agreement gateway that had drifted: `confirmations`, `propose`, `invitations`, `revokeInvitation`, `issueInvitation`, `participants`, `milestoneEffectiveStates`, `calendarEvents`, `calendarConflicts`, `tagsForAgreement`, `tagAgreement`, `untagAgreement`, `myCalendar` (and `myTags`) were missing, so an expired-but-refreshable access token could surface as a 401 (falsely: "confirmation status unavailable", invitation list/creation failure). The list now lives in `agreements/refresh.ts` (`AUTHENTICATED_AGREEMENT_METHODS`, every `auth: 'required'` method; the public `invitation(token)` is deliberately excluded) and `RuntimeApp` uses it. `tests/agreement-session-refresh.test.mjs` parses the gateway source and fails loudly if any authenticated method is unlisted, and proves an expired session refreshes before `issueInvitation`/`propose`/`invitations`/`revokeInvitation`/`confirmations`, that a valid session is not refreshed, that the public GET never refreshes, and that a rejected refresh makes no call. No gateway authority, InvitePanel behaviour or sign-in flow changed.

## F–H. People (participants + confirmations joined by participant id)
| Backend fact | Shown |
|---|---|
| `CREATOR` | "Started this Agreement" |
| `INVITED`/`PENDING` | "Invitation issued · not joined yet" (identity only if SecurePay supplied one; else "Someone invited") |
| joined, a `CONFIRMED` confirmation with `confirmationCurrent` | "Joined · confirmed version N" |
| joined, only confirmations with `confirmationCurrent=false` | "Confirmed version M · needs to review version N" |
| `JOINED_UNCONFIRMED`, confirmations read OK, no confirmed row | "Joined · confirmation still needed" |
| `CONFIRMED` participant, no matching confirmed row (the authorities disagree) | "Joined · confirmation details couldn't be established" (unknown) |
| joined, `/confirmations` failed | "Joined · confirmation status couldn't be loaded" (never "not confirmed") |
Currentness is SecurePay's flag, never a version-number comparison; matching is by `participantId`, never name/KS/role/position; no percentages, bars or "2/3". Identity is `displayName · ksNumber` only where the Detail projection supplies it; internal identity ids are never shown. Every state has an icon **and** words.

## I. Partial failure
Participants and confirmations are separate authorities: Detail (fail-closed, core truth) + `/confirmations` (best effort → `null` = unknown). If one succeeds and the other fails, the truth held is kept. Invitation list failure says "couldn't be loaded", never "none". (This intentionally replaces the earlier rule that a failed confirmation read fails the whole Detail; the concern behind it — not rendering "nobody confirmed" from a failed read — is met by the explicit unknown state.)

## J. Idempotency
One request (key + role + KS) is held from the first attempt until success, a definite rejection, or reset/Cancel. Timeout/network/5xx → "We're not sure that went through" with **Check and try again** (same key, same body; inputs locked meanwhile). Success releases the key; a later invitation is a new action with a fresh key; a 4xx is definite (releases the key). A replay without a token → "This invitation already exists… can't show that link again". 401/403/422/409 each have their own non-leaking words; none claim an invitation exists. Propose is idempotent on the server; revoke re-reads the list.

## K. Browser verification (kept separate)
- **Real API:** not run.
- **Scripted mock in real Chrome** (shaped from the controllers above; proxied via a scratch config, never port 8080): A first invitation (People → Invite → KS + role → Create → Invitation ready → Copy, with a real mouse click: "Link copied. Copying doesn't send it to anyone."; the mock log shows one issue with role, KS and no identity id); B joined → "Joined · confirmation still needed"; C confirmed current → "Joined · confirmed version 1"; D Agreement moved to v2 → "Confirmed version 1 · needs to review version 2"; E lost response → "We're not sure…" → retry (log: two issues, **one key**, one invitation, then "already exists"); F 403 → "This account can't invite people…", no invitation; G confirmations failed → participants kept, "confirmation status couldn't be loaded". Mobile: at **320 and 375** (same-origin iframe) the People area (long title, long participant name, stale badge) and the invite form wrapped with no horizontal overflow outside the app's pre-existing bottom navigation, which clips at 320.
- **Correction pass, scripted mock (real API not run):** a decoy invitation (`inv-1`, same role, listed first) was created first; the target attempt was lost, retried with the same key (replay, no token), and the direct **Revoke this invitation** sent `revoke inv-2` (the replay's returned id) — the mock shows `inv-1:ISSUED, inv-2:REVOKED`; a deliberate **Create a new invitation** then issued with a fresh key (`issue` keys: decoy, 9f33f6ed, 9f33f6ed, 7cc3d837). The KS helper copy was read from the live page.
- **Render/unit:** `tests/ui-phase5.test.mjs` (50) + updated `tests/signed-in.test.mjs`.
- **Not tested:** real sign-in/session expiry mid-invite, a real clipboard denial, screen-reader behaviour, revoke in the browser (unit only), the Phase 3 "Open this Agreement" jump (it relies on the new draft appearing in the Hub; if it doesn't, nothing opens).

## L. Tests
658 tests, 0 failing (`node --test tests/*.test.mjs`); `tsc`, `eslint src`, `vite build` clean.

## M. Changed files
`invitations/{controller,InvitePanel}` (new), `workspace/{controller,view,WorkspaceExperience}`, `components/{AgreementPeople,AgreementDetail}`, `api/securepay/agreements/index`, `handoff/{HandoffPanel,view}`, `agent/AgentExperience`, `types.ts`, tests, this doc.

## N. Backend/API gaps
- Invitations list has no target (KS/identity), no first-viewed time, and no token; issued links are shown once only (unrecoverable after a lost response). No token retrieval.
- Participant rows can't be linked to invitations; a revoked invitation leaves an `INVITED` participant; a duplicate invite creates a duplicate participant.
- Role codes are unconstrained; `intendedKsNumber` is not validated or resolved at issue; no recipient lookup exists (Phase 1 found identity lookup is not participant-safe).
- No delivery channel; targeting by KS sends no notification (only `intendedIdentityId` does).
- `confirmation-status` returns only the caller; creator confirmation is not modelled (creator can't confirm).
- No untargeted-invitation doctrine; no revoke of the participant row; no invitation-expiry management (fixed 14 days).

## O. Next phase
Agreement changes/amendments (what changed between versions — `amendments/{id}/diff` exists) and the re-review loop, now that both sides can see who has and hasn't confirmed which version.
