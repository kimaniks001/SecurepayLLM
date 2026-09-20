# UI Completion — Phase 4: Recipient Entry, Join, Review & Exact Agreement Confirmation

Branch `feat/ui-phase4-recipient-review` (from `main` @ `a2d44a5`, Phase 3 merged) · UI-only · SecurePayAPI **read-only, not modified** · Not merged, not deployed.

Doctrine: **open ≠ authenticate ≠ join ≠ review ≠ confirm.** A recipient flow already existed (`src/features/recipient`, hash route `#/invitation/<token>`); this phase corrects its claims and failure handling rather than rebuilding it.

## A. Archaeology matrix (from SecurePayAPI source; API not run)

| Question | Actual backend authority | Current UI (before) | Gap |
|---|---|---|---|
| Public locator | `GET /api/v1/agreement-invitations/{token}` (`AgreementInvitationViewService`); raw token, hashed server-side | hash route `#/invitation/<token>` | none |
| Signed-out sees | only `publicReference, title, purpose, intendedRole, currency, proposedAmountMinor, invitationExpiresAt, notice` (`proposalVersionNumber` is hard-coded 1) | card, inviter shown as "Someone" | **no inviter identity, no terms/participants pre-join** |
| Private | everything else: version snapshot, participants, roles of others, source | — | "inspect the Agreement before joining" is limited to that summary |
| What Join does | `POST …/join`, **auth required**: verifies the token is for this identity (`InvitationOwnershipVerifier`, else 403 `AGREEMENT_OWNERSHIP_MISMATCH`), sets participant `JOINED_UNCONFIRMED`, invitation `JOINED`, Agreement → `PARTICIPANTS_JOINING`. Idempotent per `(operation, key)`; replay returns the same result | correct, but titled "Join agreement" | copy only |
| Join adds participant authority? | Yes: a participant (can read the Agreement/versions, confirm). Not acceptance | said so | — |
| What records review? | **Nothing.** There is no review-recording operation for a participant; "review" is the client reading the version. Confirmation has no prior-review gate | UI gated confirm on having fetched the version | backend does not enforce review; UI still does |
| What records confirmation? | `POST /agreements/{id}/versions/{vid}/confirm`, **auth + joined participant**: participant → `CONFIRMED`, confirmation row with `assuranceMethod=AUTHENTICATED_SESSION`. Triggers Payment Ready evaluation server-side (best effort) | "Yes, this is what I agree to" | wording |
| Exact version/hash | request carries `versionId`, `expectedVersionNumber`, `expectedContentHash`; must equal the **current** version, else 422 `AGREEMENT_CONFIRMATION_ERROR` ("stale version number" / "version hash mismatch" / "version superseded") | already bound | 422 is one code for several causes; UI disambiguates by re-reading versions |
| Decline | **none** (only *amendment* reject/withdraw) | none | not built |
| Request a change | `POST /agreements/{id}/amendments` exists for a joined participant, but takes free-form `proposedTerms` (a map merged into the snapshot). That is an edit form | "I need something changed" was a **silent no-op button** | not built (would be a frontend edit form); the button now says so plainly |
| Changed after review | confirm fails 422/409; current version is another id/number/hash | handled | `amendments/{id}/diff` exists but needs an amendment id, so no "what changed" view |
| Expired / revoked | **all** unusable invitations are one status: 422 `AGREEMENT_INVITATION_ERROR`, told apart only by message (`invitation not found/revoked/expired`, `agreement no longer available`, `invitation already joined`) | showed raw backend message | mapped to plain words, unknown text never echoed |
| Public identity exposure | none of the inviter's | "Someone" | no inviter name available |
| Source provenance for recipients | not in the public view or `AgreementVersionResponse`; the Phase 3 `CommercialSourceReference` is on the creator side | none | **not shown to recipients** (documented gap) |
| Roles of others | `GET /agreements/{id}/participants` → `id, identityId, roleCode, participantStatus, addedAt` (participant-readable; **no name / KS Number**) | `parties: []` | now shown as role + status ("You" found by the participant id Join returned) |

## B. Authority map

| Step | Frontend action | Endpoint | Auth | Backend transition | UI claim allowed |
|---|---|---|---|---|---|
| Open | `load()` | `GET agreement-invitations/{token}` | none | invitation `VIEWED` (first view) | "Opening this page has not added you… nothing agreed" |
| Authenticate | identity controller | `/auth/login`, `/auth/complete` | — | session only | "SecurePay needs to know who you are… does not join, confirm or accept" |
| Join | `join()` explicit | `POST …/join` | required | participant `JOINED_UNCONFIRMED` | "You have joined… You have not yet agreed" |
| Review | `version()` read | `GET …/versions/{id}` | required | none | "Current version — you have not confirmed it" |
| Confirm | `confirm()` explicit | `POST …/versions/{id}/confirm` | required | participant `CONFIRMED` for that version | "You confirmed this version… only you; not everyone; no payment" |
| Change / decline | — | none usable | — | none | "There isn't a way to send a change request from here yet, and nothing has been sent" |

## C–H. What changed
- **Public entry:** orientation ("Opening this page has not added you…"), ordered "What happens next", role in plain words, integer-exact amount; no invented inviter ("James wants…" is impossible: the API exposes no inviter).
- **Auth:** "SecurePay needs to know who you are" with the same-invitation promise and a "Not now" exit. The same controller/invitation survives sign-in; no second flow.
- **Join:** "Join this Agreement — adds you as a participant… does not mean you agree, and nothing is paid." After: "You have joined this Agreement" and, separately, "You have not yet agreed to these terms." Smaller icon, no ceremony.
- **Exact review:** the Phase 3 canonical card, from the backend version only, plus real roles/statuses; "Version N" and a consequence line.
- **Confirm CTA:** "Yes, I confirm this version" (was "Yes, this is what I agree to"): the backend records a participant confirming an exact version via authenticated session; it does not model a signature, so no "sign"/"legally".
- **Stale:** "This Agreement changed since you reviewed it… nothing you did applied to the new one"; never auto-confirmed on the new version; confirm key reset.
- **Change:** the silent no-op is replaced by an honest notice.
- **Errors:** distinct expired / revoked / not found / no longer available / already joined; 403 wrong identity says only that the invitation isn't linked to this account (no intended-recipient data).

## I. Failure and idempotency
- Join and confirm are idempotent server-side (`(operation, key)`, digest-checked; confirm additionally returns the existing active confirmation for the same participant+version even with a fresh key).
- Timeout/network/5xx is **uncertain**, never failure and never success: `join-uncertain` / `confirm-uncertain` ("We're not sure that went through… may or may not be…"), retried with the **same** key and body (previously shown as a generic error with Agent-chat wording "Your message is kept").
- 401 mid-flow → back to sign-in, remembering where to resume; nothing is assumed to have happened; the person presses Join/Confirm again.
- Joined but the version read failed → only the read is retried (`reloadVersion`), never Join.
- **Gap:** the Join key lives only in memory. If the page is reloaded after an uncertain Join, a new key gets "invitation already joined" (422); the message then points to their Agreements. No endpoint resolves invitation → Agreement.

## J. Verification (kept separate)
- **Real API:** not run.
- **Scripted mock in real Chrome** (mock shaped from the controllers above; proxied via a scratch config, never port 8080): A signed-out → orientation → sign-in/OTP → Join → review → confirm (desktop); B already-signed-in skips auth (desktop); C version superseded → confirm sent once, current v2 shown with the changed notice, not auto-confirmed (desktop); D lost Join response → uncertain → retry with the same key (log: two joins, one key); E lost confirm response → not shown as confirmed → retry with same body → confirmed (log: same key/version/hash); F expired and not-found invitations fail closed at 320. Long-title/participant flow at **320 and 375**: no horizontal overflow. Revoked: covered by unit tests only (the browser read raced the page load).
- **Render/unit:** `tests/ui-phase4.test.mjs` (26) + updated `tests/recipient.test.mjs`.
- **Not tested:** real sign-in/OTP, wrong-identity 403 in browser, real backend statuses, screen-reader focus, session expiry in browser (unit only).

## K. Tests
595 tests, 0 failing (`node --test tests/*.test.mjs`); `tsc`, `eslint src`, `vite build` clean.

## L. Changed files
`recipient/{controller,view,RecipientExperience}`, `components/{RecipientReview,JoinedStatus,CanonicalAgreement}`, `identity/view`, `api/securepay/agreements/index`, `types`, tests, this doc.

## M. Backend/API gaps
- No inviter identity in the public view; no terms pre-join.
- No decline; no participant "record review"; no recipient change request except the free-form-terms amendment (not exposed as a form).
- Participant list has roles/statuses but no names/KS Numbers.
- Invitation failures share one 422 code; only message text differs.
- No recipient-visible source provenance.
- No invitation→Agreement lookup for an already-joined invitation; Join key not recoverable after reload.
- `proposalVersionNumber` in the public view is hard-coded 1.
- "Confirm" is `AUTHENTICATED_SESSION`; no signature/legal model, so the UI makes no legal claim.

## N. Legacy classification
No banned phrases ("Accept invitation", "Join & Accept", "Sign contract", "Agreement complete", "Transaction confirmed") exist in production `src`. The recipient cards are also rendered by fixture/mock chat (`mockAgent`, `ConversationWorkspace`); those still work with the new optional fields and were not otherwise touched.

## O. Next phase
The creator side of a joined Agreement: seeing who has joined/confirmed, and issuing an invitation from the Phase 3 draft (`issueInvitation` exists in the gateway but has no UI).
