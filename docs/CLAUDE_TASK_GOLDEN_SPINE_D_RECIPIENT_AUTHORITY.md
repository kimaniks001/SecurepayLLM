# Claude Task — Golden Spine D: Recipient Invitation → Review → Join → Exact Version Confirmation

Work only on branch `feat/golden-spine-recipient-authority`.

Read first:

- `AGENTS.md`
- `docs/PRODUCTION_MIGRATION_LEDGER.md`
- `docs/GOLDEN_SPINE_COMPATIBILITY_AUDIT.md`
- `docs/CLAUDE_TASK_GOLDEN_SPINE_C_HANDOFF_AUTH.md`
- the merged Golden Spine C implementation on `feat/production-foundation`

The frozen Bolt experience tagged `bolt-reference-pass11` remains the experience authority. SecurePayAPI remains the backend authority.

## Goal

Make the recipient half of the locked Golden Journey real without redesigning it:

`real draft Agreement -> real invitation -> public recipient review -> Secure Identity -> explicit Join -> exact current Agreement version review -> explicit confirmation`

This is the hard authority boundary where these MUST remain separate:

- opening an invitation != authentication
- authentication != joining
- joining != acceptance/confirmation
- reviewing a version != confirmation
- confirmation applies only to one exact immutable Agreement version/hash
- a changed/superseded version must fail closed and require fresh review

Do not start Money, Payment Ready, release, settlement, Store, Community, Circles, or broad signed-in Home work in this PR.

## Preserve Bolt

Reuse the existing locked recipient components/choreography where compatible, including the existing recipient review, Secure Identity, Join prompt, joined-but-not-confirmed state, exact-version review/acceptance prompt, and changed/stale treatment.

Do not redesign the recipient journey because backend DTOs differ. Add presentation adapters.

Do not use this task for logo/colour/discovery redesign.

## Verified backend authority

Re-inspect current SecurePayAPI source before coding. Existing verified contracts include:

```text
POST /api/v1/agreements/{agreementId}/invitations
GET  /api/v1/agreement-invitations/{token}                 # public, no auth
POST /api/v1/agreement-invitations/{token}/join            # auth required
GET  /api/v1/agreements/{agreementId}/versions
GET  /api/v1/agreements/{agreementId}/versions/{versionId}
POST /api/v1/agreements/{agreementId}/versions/{versionId}/confirm
```

The existing frontend gateway already has `issueInvitation`, `invitation`, `join`, `version`, and `confirmVersion`; extend it only where an actually verified endpoint is needed, e.g. list versions for authoritative stale/current-version recovery.

The public invitation view must not expose private Agreement data beyond the backend projection.

The real join response includes authoritative `agreementId`, `joinedVersionId`, `joinedVersionNumber`, participant/status fields, and `confirmationRequired`.

The exact version read includes `versionNumber`, `contentHash`, snapshot, versionStatus, and immutable version id.

The confirmation request must send a stable idempotency key plus the exact `expectedVersionNumber` and `expectedContentHash` from the version that the recipient just reviewed.

## Invitation issuance

If the locked initiator journey after Slice C includes sending/inviting the recipient, wire that action to the real invitation endpoint.

Rules:

- issuing an invitation does not confirm or establish the Agreement;
- use a stable idempotency key per explicit send action;
- never log the raw invitation token;
- do not persist the raw token in localStorage/sessionStorage;
- display/copy/share only the token/link returned by the backend;
- do not invent a recipient role code.

Inspect the locked Bolt flow and backend role vocabulary. If the intended recipient role is already explicit and maps unambiguously to a backend-supported role, use it. If a role must be invented or product doctrine decided, STOP and report that as a genuine blocker rather than guessing.

If invitation issuance is blocked solely by missing role doctrine, still complete the recipient-from-token side of this slice where possible, but do not fake the sender side.

## Public invitation review

Opening the invitation link/token must call the public invitation view endpoint before authentication.

Render only backend-supplied public facts through the locked recipient review visual.

The public review must make clear:

- this is an invitation to review;
- opening it has not joined anything;
- opening it has not accepted anything;
- the proposed amount/role/version shown are backend facts only;
- invalid/expired invitation errors fail closed.

Do not require authentication merely to review the invitation.

## Secure Identity

Only when the person explicitly chooses to proceed toward joining should the real existing KSNumber/password/OTP flow appear.

Reuse the one in-memory session boundary created in Slice C.

Do not create another token/session store.

Authentication must not auto-call confirmation and must not visually imply the person has joined.

## Explicit Join

After authentication, render the locked explicit Join boundary.

Only an explicit user Join action may call:

`POST /api/v1/agreement-invitations/{token}/join`

Use a stable idempotency key for that explicit action.

A successful join must be represented truthfully as `JOINED_UNCONFIRMED` or whatever authoritative participant status the backend returns.

Do not translate Join into acceptance.

Wrong intended identity / wrong KSNumber / invitation ownership failure must fail closed.

## Exact version review after Join

After a successful Join:

1. use the authoritative `agreementId` and `joinedVersionId` returned by Join;
2. fetch that exact Agreement version from the backend;
3. render the exact version snapshot in the locked recipient confirmation/review visual;
4. preserve exact `versionNumber` and `contentHash` from that version read;
5. do not use the public invitation preview as the confirmation snapshot;
6. do not use frontend-computed hashes.

If the joined version is no longer current before confirmation, fail closed. Re-read authoritative versions/current state using verified backend endpoints and require the person to review the new current version before any confirmation action.

Never silently switch the version under the person's confirmation click.

## Explicit confirmation

Only the locked explicit recipient action equivalent to:

`Yes, this is what I agree to`

may call the real exact-version confirmation endpoint.

The request must contain:

- stable idempotency key for this explicit confirmation action;
- exact version id in the URL;
- exact `expectedVersionNumber` from the reviewed version;
- exact `expectedContentHash` from the reviewed version.

On success, render only what the backend confirmation response proves.

Do not infer:

- that all parties have confirmed;
- that the Agreement is ACTIVE unless backend authority says so;
- that Payment Ready is READY;
- that funding/payment/release/settlement is available.

## Version change / stale confirmation

Backend confirmation rejects stale number/hash or superseded versions.

On `AGREEMENT_CONFIRMATION_ERROR` / 422 or another verified stale/superseded response:

- do not retry the POST automatically;
- do not reuse the prior idempotency key against a different version/body;
- re-read authoritative Agreement versions/current version;
- show the locked changed-review-required treatment;
- require a fresh user review;
- generate a new idempotency key only for a new explicit confirmation action against the newly reviewed version.

## Routing / token handling

Inspect existing Bolt route/demo conventions and current production runtime before choosing the smallest production route seam.

Requirements:

- invitation token may exist in the current route/URL as required to open the invitation;
- never log it;
- never copy it into analytics/debug state;
- no local/session storage persistence;
- once recipient authority no longer needs the token, keep state minimal;
- production API failure never falls back to demo recipient state.

Do not import the legacy SecurepayBDUI route architecture.

## State architecture

Create a narrow recipient controller/orchestration layer separate from Agent/handoff authority.

It should track only what this journey needs, for example:

- invitation token in-memory/current route context
- public invitation remote state
- identity state via existing identity/session boundary
- join remote state/result
- exact reviewed version remote state
- reviewed version id/number/hash
- confirmation remote state/result
- changed/stale/error state

Do not duplicate Agreement lifecycle authority locally.

## Tests

Add focused tests proving at minimum:

1. public invitation review works without auth;
2. opening invitation never calls Join;
3. opening invitation never calls confirmation;
4. auth alone never calls Join;
5. Join requires explicit user action;
6. Join uses a stable idempotency key on deliberate retry;
7. successful Join retains authoritative agreementId/joinedVersionId and remains unconfirmed;
8. exact version review comes from the version endpoint, not public invitation preview;
9. confirmation is impossible until exact version has been fetched/reviewed;
10. confirm sends exact reviewed version id/number/contentHash unchanged;
11. retry of the same explicit confirm reuses the same idempotency key only for the same exact body/version;
12. stale/superseded confirmation never fabricates success and never auto-retries;
13. changed version requires a fresh backend version read and fresh human review;
14. wrong recipient/403 fails closed;
15. invalid/expired invitation fails closed;
16. production recipient path cannot fall back to fixtures;
17. Golden Spine A/B/C tests remain green.

If invitation issuance is wired, also test that one explicit Send action creates at most one invitation through the same stable idempotency key and that raw invitation token is not logged/persisted.

## Browser acceptance

Verify desktop and mobile for at least:

- public invitation review signed out
- proceed -> Secure Identity
- OTP
- explicit Join
- joined-but-not-confirmed state
- exact version review
- explicit confirmation
- wrong recipient/auth failure
- invalid/expired invitation
- changed/superseded version before confirmation
- backend unavailable

Compare with `bolt-reference-pass11` and preserve the locked choreography.

## Validation

Run:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run test:foundation`
- `npm run test:agent`
- `npm run test:handoff`
- new Slice D focused tests
- `npm run build`
- `git diff --check`

Do not mix dependency upgrades into this slice.

## Delivery

Proceed autonomously through ordinary implementation, tests, validation, commit, push, and PR creation.

Open the PR against:

`feat/production-foundation`

Suggested title:

`Golden Spine D: real recipient join and exact-version confirmation`

Final report must state:

- locked Bolt recipient components reused;
- exact invitation/join/version/confirm contracts wired;
- whether sender-side invitation issuance was fully wired or retained as a role-doctrine blocker;
- public-review-before-auth proof;
- auth != Join proof;
- Join != confirmation proof;
- exact-version/hash confirmation proof;
- stale/superseded behavior;
- token handling/privacy proof;
- desktop/mobile verification;
- full validation results;
- exact remaining Slice E work.

Stop only for a genuine blocker involving:

- recipient role doctrine that cannot be derived from existing locked product/backend truth;
- identity/auth semantics materially different from inspected backend;
- invitation ownership semantics;
- exact-version/confirmation authority ambiguity;
- security/privacy issue;
- missing backend authority;
- destructive repository operation.

Otherwise finish the slice completely.