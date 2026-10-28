# SecurePay — True North Gate 7 Integration and Release Register

**28 October 2026 · Decision: NO-GO for production**

Gate 7 tests the *one connected* member journey rather than approving disconnected screens:
**Community Live → Project opportunity → Circle coordination → KS001 and 12 Fair Trade principles → individually accepted SecureLink → funding authority → evidence, review and completion → consented Community outcome → new opportunity.**

This document is a test and release register, **not an executed authenticated API certificate**.

## Immutable candidate boundaries

| Component | Candidate | Included | Never inferred |
|---|---|---|---|
| UI | `feature/true-north-gate7-integrated-cert-20261028` | Gates 1–6 plus Gate 1.1 media, via **isolation-only PR #191** | Original UI #185 remains open; production UI is unchanged |
| API | `feature/true-north-gate7-api-certification-20261028` | Community media PR #366 via isolation-only API PR #368; Fair Trade PR #367 via isolation-only API PR #369 | API `main` untouched; no Java tests or deployment implied by composition |
| Release | None | Read-only previews, independent frontend tests and evidence register | No activation of Money, production deploy, automatic merge, worker acceptance or public financial report |

Use the **actual branch head SHA at execution** in every evidence record. Any source change invalidates a stale test receipt. Do not substitute a UI Vercel READY state for an API integration pass.

## Source-backed results already observed

1. Combined UI Gate 1.1 + Gates 1–6: 41/41 focused tests passed; 2,316/2,316 full frontend suite passed; TypeScript, Vite build and lint exit 0 (39 lint warnings, no errors).
2. Existing approved workspace browser suite: PASS 1440px, 390px, 320px, in an isolated Vite/Chromium test environment; this covers the **unauthenticated preview**, not thirteen real members.
3. Gate 7 release-evidence unit tests: 6/6 pass; default evidence register is intentionally **NO-GO**.
4. Gate 7 read-only Community browser: PASS 1440px, 390px, 320px; no private Agreement/evidence controls or API writes appear in the signed-out sample.
5. The API integrated source branches merged cleanly into the isolated certification branch; **no Java/API execution has been verified**. Recent API GitHub Actions runs report `startup_failure`; UI job logs have returned `BlobNotFound` for some failed runs. The failure mechanism has not been established.
6. Gate 3 `testing/gate3-12-to-4-live.mjs` is executable and its synthetic-adapter tests passed, but **the real 12-applicant/4-Join API scenario has not been executed**. Do not call it a live pass.

## Mandatory release evidence — all must be externally reviewed

The executable fail-closed register in `testing/true-north-gate7-certification.mjs` requires twelve checks, all with exact SHA, CI run URL, notes and human reviewer. The file `testing/true-north-gate7-evidence.json` deliberately has no invented PASS claims.

| ID | Required demonstrated outcome | Current state |
|---|---|---|
| ui_full_convergence | Combined source TypeScript, lint, full tests and build | **Locally demonstrated**; GitHub CI still not green |
| ui_responsive_browser | Authenticated Living Workspace with member, invitee, organiser, and mobile | **Only signed-out/preview passed** |
| api_java_and_migration | Combined API Java 21/Gradle unit+integration tests, Flyway in disposable Postgres | **BLOCKED** — runner startup; no alternative API execution |
| gate11_media_safety | Authenticated 2-user photo/PDF upload, private scope, retry, MIME, EXIF, AV/retention | **BLOCKED** |
| gate2_discovery_scope | No private Circle leakage, revoked members fail closed, consented preferences | **BLOCKED** in real API |
| gate3_twelve_to_four | 12 real interested, 4 selected, four independent acceptances, eight with no rights | **BLOCKED**; tester exists |
| gate4_real_ks001 | Provider-backed KS001 asks material questions and grounds all 12 lenses | **BLOCKED**; Java/credentials unverified |
| gate5_agreement_evidence | Actual participant-only evidence, beneficiary review, current-version completion | **BLOCKED** |
| gate5_money_authority | Funding movement and release gating read-only with all execution disabled | **BLOCKED** |
| gate6_public_consent | Actual public outcome with explicit consent, privacy and retry; no certified-cost claim | **BLOCKED** |
| integrated_live_journey | Entire chain in one isolated environment, the exact UI/API commits | **BLOCKED** |
| rollback_and_release | Working independent staging, rollback rehearsal, owner visual and release approval | **BLOCKED** |

### Exact developer execution path

1. **Keep production isolated.** Check out the two Gate 7 branches by full SHA in disposable staging; verify Java 21, PostgreSQL 16 and independent test accounts. Disable financial execution at every applicable rail and backend boundary. Do not reuse real customer money, customer evidence or production webhook credentials.
2. **Run combined backend** from SecurePayAPI repo: `./gradlew :services:agreement:test :services:securepay-core:test` followed by the appropriate existing `:services:securepay-core:integrationTest` task and migration checks on disposable Postgres. Preserve failed test names and logs, not just the job badge. The core module has a separate `integrationTest` source set. Confirm provider credentials are present in isolated staging before attempting document/photo-reading assertions.
3. **Run combined frontend** from SecurepayLLM repo: `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test:final-convergence`, `npm run build`. Execute `tests/gate5b-approved-browser.mjs` and `tests/true-north-gate7-browser.mjs` against an isolated Vite preview with Playwright.
4. **Do real 12→4 acceptance**: pre-seed a fresh PROPOSED Agreement and thirteen disposable authenticated identities. Execute `GATE3_DISPOSABLE_ACK=YES GATE3_FIXTURE_PATH=/safe/fixture.json node testing/gate3-12-to-4-live.mjs` from SecurepayLLM against **loopback** API (non-loopback hosts are refused). Confirm four selected participants individually join and confirm their *own* terms; eight unselected have no Agreement join authority. Do not assume one Agreement with four participants provides four separately funded worker payments.
5. **Verify the next steps:** exact-version Fair Trade examination and continued missing-material questioning; Circle coordination cannot accept or close obligations; 2-user photo/PDF upload receipt is distinct from beneficiary review and completion; no Money transfer/release occurs; Community report contains no private Agreement, identity, evidence or authoritative spend details. Capture screenshots at 1440px, 390px and 320px.
6. **Proof and sign-off:** for each check add exact repository CI run, SHA, reviewer and substantive findings to the Gate 7 evidence JSON. Independently inspect the linked run; the script does *not* cryptographically authenticate links. Only after all twelve are verified may Gate 7 move to **READY_FOR_MANUAL_RELEASE_REVIEW**. That is **not** automatic deployment permission.
7. **Release planning after explicit owner approval only:** reconcile stacked UI PRs #184/#186/#187/#188/#189/#190 and the Gate 1.1 UI overlap. Do not double-merge the original #185 into a branch already including it. Separately reconcile API PRs #366/#367 against the combined API test result. Confirm a reversible production deployment and rollback rehearsal with Paul; execution/rail enablement requires independent approval.

### How to run the fail-closed release evaluator

```bash
node testing/true-north-gate7-certification.mjs \
  --evidence testing/true-north-gate7-evidence.json \
  --ui-sha "$(git rev-parse HEAD)" \
  --api-sha "<exact tested Gate 7 API SHA>"
```

Expected now: **NO_GO**, non-zero exit. This is intentional: evidence for actual API, Money, consent, provider and rollback journeys has not been supplied. Never edit a check to PASS merely to turn a workflow green.

## Financial and privacy doctrine

- Community stories are member-reported; project cost summaries are **not bank-reconciled or audited expenditure**.
- A Circle quick reply is never an Agreement action. Interest is never hiring; selection is never acceptance.
- Upload receipt is not evidence approval; evidence approval is not completion; completion is not an authorised Money transfer.
- Money snapshot is a read-only authority. Funding verified means actual canonical financial records, not a price, budget, bank name or self-report.
- Do not publish private Agreement provenance or other parties' records by reconstructing them in a Community message.
- **Production unchanged. Financial execution remains disabled in every Gate 7 test.**

**Decision: Gate 7 integrated frontend source verified; end-to-end Gate 7 production certification is NO-GO pending the enumerated mandatory evidence.**
