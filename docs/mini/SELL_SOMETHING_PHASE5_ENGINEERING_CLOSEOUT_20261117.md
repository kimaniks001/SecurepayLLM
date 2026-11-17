# SecurePay Mini — Sell Something Phase 5 Engineering Closeout
17 November 2026 · **feature-engineering closeout, not release certification**

## Baseline / non-negotiable product decisions

The approved Mini experience remains unchanged: ordinary elegant Sell Something, Fair Trade examination with pill answers, and the three seller exits **Share with buyer / Add to my Store / Save for later**. Seller never connects Money. Accepted Agreement versions cannot be modified by Store visibility, invitation, directory or tax requests. SecureLink is **one** server-issued Agreement link presented via Copy / Share / WhatsApp / QR, not another Agreement.

## Phase 5A complete — SecureLink sharing and basic real-account Store settings

- Real authenticated Mini seller uses the exact backend-issued SecureLink URL for copying, native sharing, deliberate WhatsApp compose, and QR (shared SecureLink component). QR scanning/opening is NOT buyer acceptance or payment.
- Owner walkthrough shows an unscannable layout example, never a fake URL or invented live link.
- Verified personal/represented Business Store settings expose actual offer counts, account membership status and server-rechecked Business representation; demo never pretends to be authority.

## Phase 5B complete — Store visibility and readable Business authority

- Explicit double-confirmed **Make private** updates ONLY public Store visibility through a backend owner + exact-revision CAS. Works even for old media/quantity-bearing offers, but never authorizes republishing without their rights gates. Old Agreements remain untouched.
- Seller can inspect the Business Organization's active member count and the caller's actual Organization-scoped permissions. Business Store management does NOT grant Agreement signature or regulated Money rights.
- All external directories and client-app visibility remain separate from public Store search.

## Phase 5C complete in feature code — intentional account settings

### Invite and accept people

- Business admin can invite by **KSNumber** only after checking fresh Business representation + exact Organization permission `ORGANIZATION_MANAGE_MEMBERS`, with two-step human review. Backend creates a **PENDING membership**, not a role.
- Invitee can independently **accept Business invitation** with their own authenticated identity and Business KSNumber, with a separate confirmation. It does NOT grant a role, Store publishing authority, Agreement signature or Money capability.
- API companion updates the existing void membership endpoints to use **204 No Content** so the frontend HTTP transport no longer mistakes successful empty 200/201 responses for a failed request.
- Removing or changing roles remains a separately authorized management workflow. A **safe Mini member-removal picker cannot be built from the existing API's opaque identity IDs alone** without grounded identity display; maker-checker role approval has no pending-actions list API. No unsafe one-person role grants are introduced.

### Membership

- The authenticated person's `/subscriptions/me` status is read directly. ONLY an exact `404 + NO_SUBSCRIPTION` permits presenting new plan choices.
- Explicit two-stage For You / For Business choice opens **one PENDING account-level subscription**, not a Business-KS-specific paid entitlement. An existing account plan is read back; the UI never claims switching plans by reopening an existing subscription.
- After a plan exists, the person may explicitly load, establish and review their **canonical activation Agreement** (actual server title, purpose, description, agreementVersionId, contentHash), and confirm it in a separate action after a fresh exact-version/content review. **No billing-cycle payment intent or Money operation is created by the settings UI.**

### Voluntary directory and eTIMS setup requests

- A represented Business admin can read and explicitly set/withdraw `DIRECTORY` and `ETIMS` *request* choices through version-fenced backend records. All default FALSE. User must choose a setting, review, then confirm.
- **Directory request is not publication or community membership.** No cross-app listing, staff identity, or personal contact sharing follows. Host/community rules and separate connection approval remain mandatory.
- **eTIMS request is not KRA connectivity.** No tax PIN, invoice, customer records, VAT input-credit entitlement or tax data is transmitted. Provider eTIMS integration, invoice provenance, buyer attribution and statutory compliance remain independently gated.
- Confirmed results say `REQUESTED_NOT_PUBLISHED` / `REQUESTED_NOT_CONNECTED`; errors or mismatched versions fail closed, never report activation. Revoking an internal request does not magically remove external records.

## Evidence

- New frontend features and tests are on stacked draft branch `feat/mini-sell-phase5-final-settings-20261117` from Phase 5B PR #331, itself stacked on Phase 5A PR #330.
- The Vercel Mini preview build for commit `59fb9c800bc34242de1c19e98f817fe3bcf7a42d` reached **READY**, with configured frontend tests (293 in the aggregated suite), TypeScript verification, and Vite production compilation. Preview contains simulated owner data; signed-in operations require the unreleased API branch.
- Backend code is on `feat/mini-sell-phase5-final-consent-20261117` stacked on API Phase 5B PR #477 and API Phase 4 PR #476. It adds a PostgreSQL/Flyway business preference table, optimistic versioned request writes, per-request represented Business authorization, 204 membership response correction and focused Java tests.
- Full Java 21/Gradle tests, Flyway on isolated PostgreSQL, concurrent CAS, authorization/permission-revocation tests, signed-in UI/API journeys and external KRA integration certification **have NOT been executed** in the full repository checkout. **No merges and no production deployment.**

## Remaining release gates — do not confuse with Phase 5 scope

1. Complete Java 21, database/Flyway and real actor/tenant concurrency certification for all Phase 3–5 API PRs.
2. Verify personal/Business account activation, actual invitation acceptance and revoked/expired authority in integrated staging.
3. Complete unrelated historic media rights + old Store client migration; strict versioned-publication switch remains OFF until certified.
4. Business Agreement signature/representation beyond Store admin and separate maker-checker role changes remain gated; no hidden exception.
5. eTIMS actual KRA provider connection, legal invoice attribution and buyer PIN/data transfer need their own approved technical contract and legal/privacy certification; permission request alone does nothing externally.
6. Keep Gate 7 payment safety, Gate 8 canonical Agreement lifecycle/evidence, Gate 9 provider callbacks, Gate 10 twenty-person acceptance and Gate 11 controlled release. No Money initiated or simulated transaction presented as real.
7. Do not merge or switch on backend writes in a production client until signed-in backend version and migration are confirmed.

**Engineering phase progression:** Close Phase 5 UI/business-settings feature scope (gated where backend lacks safe endpoint). Proceed to Phase 6 only on the agreed Mini roadmap; preserve all release gates.
