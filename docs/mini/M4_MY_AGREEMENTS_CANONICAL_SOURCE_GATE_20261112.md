# M4 — Living My Agreements inside SecurePay Mini
**12 November 2026** · Mini remains SecurePay · Code/test candidate, **NOT** production-certified.

## Approved product behaviour
- The approved Mini layout and original Store stay frozen. From the KS001 conversation, an optional compact **My SecurePay** expander opens saved work, established Agreements, invitations, or creator actions only when deliberately requested.
- **My saved work ≠ My Agreements.** M3A Saved Builds are an account's unfinished KS001 conversations. M4 lists **only canonical Agreements that the authenticated backend returns** from `GET /api/v1/me/agreements`. There is no locally minted Agreement, separate storage, customer lookup by typed KSNumber or fallback to fake data.
- A person's own Agreement summary supplies **their next actions** and **attentionRequired**; no browser-side guesses about whose turn it is, late deadlines, confirmation, completion or missing stock.
- The detail is an authorised `GET /api/v1/agreements/{id}/detail` for the selected Agreement. M4 verifies the returned Agreement ID and its *same current version ID* as the selected list card before showing people, milestone statuses and obligations.
- Money detail is **read-only, source-labelled**; the view never initiates, clears, holds or releases money. Amounts and payment receipts are not fabricated. Other people's KSNumbers deliberately do not appear in the small Mini detail view.
- When the API is unavailable, the account expires, the list changes, a record is malformed or its version is superseded, the viewer blocks and offers a targeted refresh/re-authentication. A failed read is never an approval or a blank but apparently valid Agreement.
- The first page contains no more than 20 authoritative records. Explicit 'More Agreements' respects backend pagination; no pretending 20 is the entire user's history. Existing signout clears the account-scoped view.

## Implemented source
- `src/mini/miniAgreementHome.mjs` and `.d.mts`: read-only, fail-closed projections for existing Agreement list and requested exact-version detail. Unknown statuses are labelled 'Status needs checking' rather than called ACTIVE.
- `src/mini/MiniMyAgreements.tsx`: compact list of **Needs your attention** vs **Other Agreements** (based *only* on backend `attentionRequired`), next actions by server `reason`, and expandable People/Milestones/Responsibilities. No status-changing buttons, Money rail or Agreement mutation.
- `src/mini/MiniFirstPartyKs001.tsx`: optional signed-in **My Agreements** doorway using the **same** first-party `createAgreementGateway(createHttpClient(apiOrigin,session.getAccessToken))` as M3B. Each read uses existing `ensureFreshSession`; re-authentication returns to the existing Mini identity flow. No new app screen or identity controller.
- `src/mini/mini.css`: small additions for expand-on-demand Agreement details and a simple **My SecurePay** expander that prevents secondary account actions filling the Mini conversation.
- `tests/mini-m4-living-agreements.test.mjs`: source-model checks for exact backend statuses, next-action provenance, owner/role boundaries, malformed records and pagination, changed-version fail-closed, visibility/privacy of other people's KS Numbers, verified milestone/term separation and no Money mutation.
- The `prebuild` gate retains all prior M1–M3B tests plus M4 and checks TypeScript before Vite. No broad repository tests or production migration.

## User-facing entry and actual source limits
1. In Mini, start or resume a KS001 conversation. **Save for later** is available directly for unfinished work, when signed in.
2. For existing Agreements, expand **My SecurePay → My Agreements**. Sign in with KS Number/password/OTP via the existing SecurePay IdentityController if needed.
3. Review the backend's attention group and next actions. Opening a row re-checks the current Agreement version, then reveals participant state, milestones and obligations only when requested.
4. **No invented 'Take action now' mutation**: a next-action summary is not enough to start, complete, sign, amend or fund a milestone. Those operations must use their dedicated backend version, role, evidence, appointment and financial gates. M4 is first read-only layer, not a replacement for full Workspace.

## Live acceptance and next phase
- **M0/M1:** the ordinary Vercel Mini preview still points to `https://securepay.ke`; first-party KS001 and M4 are intentionally NOT live until the isolated SecurePayAPI staging runtime (API SHA, separate DB/Redis/queue/model/providers, strict CORS and non-production callback configuration) is verified. Vercel build success is not staging or legal certification.
- **M4 live checks:** signed-in buyer versus seller see their own Agreement list and different backend next actions; other actor cannot open another's ID; stale version is blocked; sign-out/account switch clears prior data; a changed milestone refreshes the summary; Money stays provider-authenticated and separate. The original 20 synthetic personas are auxiliary cases, not a separate work programme.
- **M4 further work:** contextually open the existing canonical milestone/evidence/appointment instruments from server-supplied next-action types. Do not infer commands from arbitrary AI text or implement a second action engine.
- **M5:** bring the locked Digital Store into the same Agreement journey with real seller offers and buyer confirmation, keeping exact source/identity consent.
- Production Money and public family collection remain separately blocked by certification.

**Release call:** M4 code candidate; live M4 **NO-GO** until isolated staging, real-person role/Agreement checks and first-party KS001 model acceptance. Production untouched.
