# Mini Sell Something — Phase 4 engineering close-out

**17 November 2026 — Draft integration handoff, NOT certification or deployment.**

## Completed on stacked draft PR #329

- Standard SecureLink only, no customization.
- Personal and verified represented Business sellers enter the existing native Mini Sell Something screen from first-party signed-in Store management, not from an unprivileged demo.
- Seller exits remain **Share with buyer**, **Add to my Store**, **Save for later**. Money is strictly buyer-controlled.
- Store draft is authenticated, server-ID-bound, private, text-only, without unverified media or quantity/stock representation.
- The separate seller answer pill **Publish text only** fetches the latest owner Store offer and compares current price/title/description/media/availability/revision before calling the dedicated backend CAS endpoint. No automatic retry after unknown write outcome.
- Seller's **personal** Share exit explicitly sends a bounded, complete human-authored statement into existing KS001 Trade Context, obtains a real server conversation ID and version, and requests a canonical handoff only after a review of the real server terms. If any terms exceed the existing 1,200-character message contract, nothing is silently truncated or submitted.
- Review now reads the authoritative handoff both before and after review and rejects changed candidate digest, version or summary. The seller must click the simple answer pill to confirm.
- Real draft Agreement creation uses server-owned Trade Context version and candidate digest; explicit proposal now checks its exact current Agreement version ID, version number and content hash before and after proposing. Immediately before SecureLink issuance Mini rechecks that the proposed version still matches.
- SecureLink URL can only come directly from the existing authoritative backend, never be synthesized from a Store offer, Agreement ID or base URL. Nothing is sent, joined or funded merely by issuing it.
- Source/account state is cleared on sign-out; the public playground continues without authenticated mutation gateways.

## Backend API companion (stacked draft PR #476)

- `POST /api/v1/store/me/offers/{offerId}/publish-text`
- `POST /api/v1/business/{businessKsNumber}/store/offers/{offerId}/publish-text`
- Both require real account authorization, seller confirmation and exact `updated_at` match.
- Require unpublished, image-free, inventory-unclaimed record in `NEEDS_CONFIRMATION`, with price zero/invalid constrained, and keep `availability_confirmed_at = NULL` on publication.

## Verification actually performed in this session

- 30 focused JS bridge behavior cases executed and passed in an isolated V8 harness using connector-fetched branch files.
- 8 UI source-contract checks executed and passed in the same harness.
- Five .mjs modules parsed successfully.
- Fixed a malformed `.d.mts` declaration and updated the prebuild script to include the new test.
- Java 21/Gradle, full TypeScript/Vite production build, Spring/authorization, PostgreSQL transaction/race/SQL and first-party end-to-end testing were **NOT executed**. Do not present isolated checks as a full build.

## Explicit blocking gates, not hidden TODOs

1. **Business Agreement representation:** Business Store authority is established; a personal Agreement must never be represented as binding the Business. Business Share remains disabled until the backend verifies exact Organization/Business role and creator/participant authority for that Agreement, not merely that the user administers the Store.
2. **Live integration:** Full staging checkout, Java 21, Spring authorization, PostgreSQL CAS, timestamp-precision, concurrent Store edit/publish, account change and real signed-in KS001 handoff tests are required.
3. **Offer/Agreement consistency:** The current existing Agreement `propose` endpoint does not accept an expected-version CAS field, so client checks before and after protect presentation but cannot guarantee an atomic server-side proposal under a simultaneous amendment. Add server version CAS before broad release.
4. **Legacy Store writes:** Generic Store create/update paths can still publish via their legacy contracts. Do not claim the new dedicated endpoint is a platform-wide publication policy until those routes are reconciled and clients migrated safely.
5. **Phase 3 images:** No public image delivery, Identimark or rights-approval certification. All Phase 4 public Store outputs remain text-only.
6. **Membership / phase 5:** Business subscription and seller settings/permission UX are separate from Phase 4; no membership capability should be guessed from a name.
7. **Release:** PRs #329 and #476, and preceding Phase 3 PRs, remain draft/unmerged. No production rollout, consumer invitations or Money were executed.

**Status: Phase 4 engineering slice implemented and ready for integration certification, NOT Phase 4 production acceptance.** Proceed to Phase 5 design/engineering only with the above release blockers preserved.

## 17 November 2026 final hardening continuation

- Mini's seller Agreement bridge now invokes `AgreementGateway.proposeReviewed`, the backend's new `POST /api/v1/agreements/{id}/propose-reviewed`. The required body sends the precise server-owned `versionId`, `versionNumber` and `contentHash`. The backend's AgreementProposalService also guards currentVersionId and optimistic row version inside the proposal transaction. The legacy `propose` endpoint remains for other consumers, not Mini seller.
- In Business seller mode, `MiniFirstPartyKs001` withholds BOTH the authenticated handoff gateway and the Agreement gateway; a Business Store role never authorizes a personal creator Agreement by implication.
- API PR #476 now includes a **default-OFF** `securepay.store.strict-versioned-publication` migration gate that can eventually prohibit legacy one-click publication via ordinary Store PUT/POST. It must be enabled only after all legacy Store clients are migrated and tested. `NEEDS_CONFIRMATION` Store drafts now carry null availability-confirmed timestamp.
- Added server-focused tests (auth, wrong hash/version, optimistic conflict, strict migration), and frontend contract tests (version-fenced route, source gating). **Java/Gradle/PostgreSQL/TypeScript complete repository tests are not executed in this session.**
- In the focused isolated JS V8 harness, 30 seller-bridge checks, 8 UI contract checks, and 3 reviewed-proposal/Business authority source checks passed. These do not certify the deployed API.

**Hold:** Real Business Agreement formation still needs a separately approved Organization-scoped, legally authorized process. Keep drafts unmerged and strictly preserve buyer-initiated Money, plain SecureLink, and Phase 3 photo restrictions.
