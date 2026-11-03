# SecurePay Digital Stores — Day 5 Gate 5: Convergence and Certification

**Date:** 3 November 2026  
**Classification:** Isolated full-stack release candidate only; no production deployment  
**Owner sign-off:** NOT GIVEN  
**Decision:** **NO_GO** until actual evidence passes and the owner expressly approves a release  
**Financial providers:** must remain disabled  
**Production C6:** leave unchanged, retain rollback

## Paired branch lineage

| System | Stacked PR chain (NOT merged) | Gate 5 candidate |
|---|---|---|
| API | Gate 1 #384 → Gate 2 #385 → Gate 3 #386 → Gate 4 #387 | `feat/day5-gate5-store-certification-api-20261103` |
| UI | Gate 1 #205 (dependent on #204) → Gate 2 #206 → Gate 3 #207 → Gate 4 #208 | `feat/day5-gate5-store-certification-ui-20261103` |
| Existing Day 4 | UI PR #202 (separate C6 backport; not yet merged) | Its work-switching changes are deliberately integrated into this Gate 5 UI candidate |

**Do not merge an early gate directly to main or replace C6 with one half of a stack.** The Gate 5 branches are separate integration candidates, not production branches. Compare the real C6 live backport before any later main convergence.

## Confirmed source-level convergence changes

- Preserved Day 4 `workNavigation.ts`, the current `LiveKs001Session`, New Work/Saved Work, unsent first-composer protection, mobile Agreement action and work-transition lock. Merged Day 4 changes into the Store-modified `Phase1LivingWorkspacePreview.tsx` without discarding Gate 3's `enquiryContext` in the right SecurePay Check.
- Fortified **two-device reply sending**. `StoreCustomerConnectionService.respond(..., expectedDraftVersion)` takes `SELECT status ... FOR UPDATE` on the same enquiry row that `StoreReplyDraftService.save` locks. It verifies `expectedDraftVersion` against the actual saved draft before transitioning REQUESTED → REPLIED/DECLINED. Any stale draft causes an explicit 409, and older clients without a version may only reply if no saved draft exists. UI now submits `expectedDraftVersion`.
- Kept Store notification events in the existing in-app `NotificationPublisher`, normal-priority and one-per-authoritative-transition. Neither a notification, Store reply nor selected KS001 source creates an accepted Agreement.
- Kept buyer enquiry recovery bound to the *same* saved conversation and the original authenticated buyer. Saving must be confirmed before navigation to Living Workspace. Private Business drafts remain representation-authorised.

These are **source-level changes, not certified browser/server performance**.

## Real environment blockers observed

1. Gate 4 UI PR #208 had a SUCCESS **Vercel build**, but five GitHub Actions workflows failed. The connector returned no successful job steps/logs, so the exact root cause is not yet proven; do not call any full UI suite passed.
2. API PR #387 showed a GitHub Actions `startup_failure`; this is not compile or test evidence. The preexisting Gate 1–4 PostgreSQL migrations, Spring wiring and Java tests have not been run successfully as a single verified build.
3. Day 4 PR #202 is divergent from Store Gate 4; its source patches were integrated here. The owner-reported live C6 backport bytes are server-local and have not been independently compared with this branch. Preserve exact production patches.
4. No real browser service-worker push, APNs/FCM, WhatsApp/SMS production-backed notification adapter, or user-consented locked-phone delivery has been certified. Default external adapter is fail-closed/SKIPPED. Business Store events addressed to a Business KS do **not** prove a human representative was notified; the Business Store inbox remains the authoritative route.

## Paul: exact isolated certification order

### A. Freeze candidate and prove safe staging

Record exact **40-character UI and API SHAs** and a staging-only HTTPS origin, e.g. `https://staging.securepay.ke/`. Use an isolated staging PostgreSQL volume and Redis, never production data or secrets. Confirm the live C6 API/frontend, proxy and financial rails remain unchanged. Record rollback image/checksum. Use two distinct ACTIVE KS test identities plus one Business represented by a separate, authorised identity; never put credentials into test reports.

### B. Compile/test application in both repositories

UI:

```bash
npm ci
node --test tests/day4-work-navigation.test.mjs \
  tests/day5-gate1-digital-stores.test.mjs \
  tests/day5-gate2-store-connections.test.mjs \
  tests/day5-gate3-store-agreement.test.mjs \
  tests/day5-gate4-store-continuity.test.mjs \
  tests/day5-stores-gate5-certification.test.mjs
npm run typecheck
npm run test:final-convergence
npm run lint -- --quiet
npm run build
```

API:

```bash
./gradlew :services:securepay-core:compileJava --no-daemon
./gradlew :services:securepay-core:test --no-daemon \
  --tests 'ke.securepay.core.store.StoreCustomerConnectionServiceTest' \
  --tests 'ke.securepay.core.store.StoreEnquiryKs001ContextServiceTest' \
  --tests 'ke.securepay.core.store.StoreActivityNotificationServiceTest' \
  --tests 'ke.securepay.core.store.StoreReplyAtomicVersionTest'
./gradlew :testing:doctrine:test --no-daemon \
  --tests 'ke.securepay.doctrine.Day5Gate3StoreEnquiryDoctrineTest' \
  --tests 'ke.securepay.doctrine.Day5Gate4StoreFreedomDoctrineTest'
```

Also run the existing `bash scripts/run_final_convergence_certification.sh` from the exact API commit using disposable local PostgreSQL/Docker, with NO real financial/provider credentials, retaining Flyway output, JUnit, logs and errors as artifacts. Reconcile any existing CI failures before certification; workflow green for code does not substitute for the human path.

### C. Test the complete two-identity journey

- Gate 1: trader signs in, publishes actual offer and Store URL with private GPS by default; another browser without login opens the exact live Store and offer.
- Gate 2: customer saves trader favourite, sends exactly one idempotent enquiry; trader sees the actual request, replies; buyer reads the same status. No invented send, stock hold or acceptance.
- Gate 3: customer chooses **Continue enquiry with KS001**, verifies original offer ID, seller KS, quantity, message, source version and status in existing right SecurePay Check. Changed/unpublished listing fails closed; actual Agreement formation/review is version-specific and separate.
- Gate 4: customer leaves on Phone A and logs in on Phone B to restore the SAME saved KS001 conversation. Merchant saves a private reply draft on Phone A and restores on Phone B; use two devices concurrently so Phone A's stale `expectedDraftVersion` is refused under `FOR UPDATE` and 409, with no buyer-visible reply. Test exact in-app notification event routing, category mute, event dedupe, refresh on focus and Business representation revocation.
- Formal Agreement: verify two parties' roles, consent, review, handoff and lifecycle in the **existing Agreements** domain, with all money rails disabled. Seller response does not itself establish an Agreement.

### D. Security and failure matrix

Wrong buyer’s enquiry, another trader’s Store, forged Business representation, changed identity after pending request, signed-out saved conversation, wrong shared Store URL, stale/offline replay, prompt-injection in buyer text, insufficient quantity, changed price or revised offer, duplicate POST, lost backend response, navigation while unsent composer exists, and an old draft edited on a second phone. Every attempt must be rejected or reconciled without unverified success or private data leakage.

### E. Phone alerts and independent device proof

Test iOS Safari and Android Chrome as real user agents on phones; separate **in-app foreground refresh** from **background OS push to a locked phone**. If the latter is not implemented, mark `gate4.locked_phone_delivery` **BLOCKED**, not PASS. For represented Businesses, mark `gate4.business_representative_delivery` BLOCKED until an actual authorised person receives an independent, permission-checked notification.

## Evidence & decision machine

Use `testing/day5-stores-gate5-evidence.json` and `scripts/day5-stores-gate5-certify.mjs`. Every one of the **29 required checks** needs a real, reviewable link/log, observation date and the exact UI/API candidate SHA. The script validates a staging-only origin, disabled financial rails, isolated database, unchanged production, rollback and non-reused credentials.

```bash
node scripts/day5-stores-gate5-certify.mjs \
  --evidence testing/day5-stores-gate5-evidence.json \
  --ui-sha "<exact-ui-commit-sha>" \
  --api-sha "<exact-api-commit-sha>"
```

Expected current outcome: `NO_GO`. Even if all checks are genuinely evidenced, the highest automated result is `OWNER_REVIEW_REQUIRED` — not deployment approval. The owner must separately approve convergence, migration, staging certification and production rollout/rollback after reviewing exact C6 preservation.

**Do not mark Gates 1–5 PASS solely from source-level check counts, Vercel PREVIEW success or test fixture results.**
