# SecurePay Gate D — staging and merge-unblock runbook

**Verified:** 26 October 2026. **Release state:** HOLD; this is a plan, not evidence of a completed staging test.

## 1. Exact code to qualify

- API `kimaniks001/SecurePayAPI` PR #346: commit `6cad975e950c4725e2497053abd5cebe0d4632ea`, latest inspected API implementation. Source CI 7/7 green. Feature is OFF by default.
- UI `kimaniks001/SecurepayLLM` PR #174: commit `23f3376fb253ae5e57b9a7dc7b474e51ce55f49d`, stacked on Gate D #173 → Gate C #172 → Gate B #171. Source CI 8/8 standard checks green; Gate D release check red.
- API KS001 P0 #341 and UI Gate A #169 remain separate prerequisites; inspect their current heads, ancestry and acceptance status before qualification. Do not silently treat their draft source as merged into these SHAs.

## 2. Confirmed staging infrastructure gap

The intended Vercel project `securepay-ks001-staging` (ID `prj_bnd17Uacp36N38RuE12wluwtHLlV`) had **zero deployments** when inspected. Its only preview environment variable, `VITE_SECUREPAY_API_BASE_URL`, held the deliberate fail-closed placeholder `https://ks001-staging-api.invalid`. The normal `securepay-llm` project has a Vercel preview for the UI commit but that does **not** prove a writable API staging environment.

Therefore **Gate D cannot legitimately pass today merely by editing CI assertions**. Never turn a source-only check into a false live integration PASS.

## 3. Operator provisioning — isolated from securepay.ke

1. **Paul / infrastructure:** Provision a dedicated HTTPS `*.securepay.ke` hostname containing `staging`, `qa`, `test` or `sandbox`; a separate PostgreSQL database and Redis, synthetic identities and test OTP destinations, isolated logs and retention, and an exact deployment of API PR #346 SHA. Prove the host is **not production** by instance identifiers, database ID, credentials boundary, provider settings and a documented isolation check. Do not route staging through production DB, payment rails or customer identities.
2. **Evidence private storage:** Create a dedicated S3-compatible non-public bucket with enforced encryption, block-public-access policy and least-privilege app identity; privately networked ClamAV `clamd` service. Prove disabled scanner/storage denies uploads; do not use in-memory fake receipts. Configure lifecycle cleanup, retention and deletion before asserting D16-S passed.
3. **Backend feature:** After step 2 passes, enable only on isolated API staging: `SECUREPAY_EVIDENCE_MEDIA_ENABLED=true`, `SECUREPAY_EVIDENCE_MEDIA_S3_REGION`, `SECUREPAY_EVIDENCE_MEDIA_BUCKET`, `SECUREPAY_EVIDENCE_MEDIA_CLAMD_HOST`, `SECUREPAY_EVIDENCE_MEDIA_CLAMD_PORT` and `SECUREPAY_EVIDENCE_MEDIA_STAGING_UI_ORIGIN`. If applicable use `SECUREPAY_EVIDENCE_MEDIA_S3_ENDPOINT` with HTTPS; keep storage credentials in a protected secret manager, never a PR or screenshot. Verify actual Spring property binding in the running application. Use one exact protected preview Origin in CORS, not `*`.
4. **Protected Vercel staging project:** Connect `securepay-ks001-staging` to the reviewed SecurepayLLM revision #174 (its stacked Gate A/B/C/D ancestry must be present). Create a protected Preview deployment and pin the exact UI SHA. Replace the `.invalid` placeholder only after independent staging-API isolation is certified. Set preview-only `VITE_SECUREPAY_API_BASE_URL` to the approved staging HTTPS origin and `VITE_SECUREPAY_MEDIA_EVIDENCE_STAGING_ENABLED=true` only after API media is ready. The Gate 3 relay also requires `SECUREPAY_STAGING_API_ORIGIN` and `SECUREPAY_STAGING_TEST_ONLY=I_CONFIRM_ISOLATED_SYNTHETIC_STAGING` when used; its other write endpoints remain narrowly restricted. Do not broaden the proxy for file uploads: media bytes use the direct approved staging API with backend CORS and bearer authorization. Protect this deployment by Vercel authentication.
5. **Review effective environment:** Inspect the deployed root; verify no `securepay.ke` production origin or real Money provider is called for test writes. Record frontend SHA, API SHA, KS001/model SHA, migration version and staging infrastructure IDs **without secrets**.

## 4. Execute the Gate D matrix; one evidence bundle per item

| ID | Run for real in isolated staging | Acceptance proof |
|---|---|---|
| D01–D02 / D15 | Open the actual staged root at 1440, 390 and 320 px. Verify masterpiece shell, KS001, tools, right-hand check and mobile continuity | Screenshots/video and browser test trace from exact deployed UI SHA |
| D03–D05 / D12 | Guest work → real test OTP → server-issued KS → return to the same saved conversation; invalid, expired, duplicate and interrupted OTP paths | API identity IDs/status, audit events and UI trace; no pre-created KS |
| D06 / D11 | New Nakuru plan, then KES 400 letter-to-Tom delivery → one relevant clarification, currency pills, truthful SecurePay Check and canonical Review | Actual model transcript, API correlation ID, agreement/version snapshots |
| D07–D08 / D10 | Review → authorised Save/Share/Connect Money; distinguish Vision planning, fee/rail/quote, funding and Activation Agreement | Versioned API responses and denied-before-ready checks; no fake monetary state |
| D13 | Explicit Trust membership consent, current public principles and represented Business authority | Identity- and role-scoped pass/deny API audit, not UI assertions |
| D14 | Accepted synthetic agreement funded through **provider sandbox only**, signed callbacks, accounting, evidence, review and independently authorised release/settlement | Sandbox provider event IDs, immutable financial ledger balance and separate authorities |
| D09 / D16-S | Real JPEG/PNG/PDF upload with caption → server receipt/digest → exact obligation binding → authorised beneficiary reads original bytes and review state. Retry/replay; wrong identity, stale version, broken scanner, malformed MIME, file too large, expiry and private cleanup | Storage SHA readback, DB receipt/binding, rejection status, reviewer trace; no automatic completion or Money release |

For each item record **PASS / FAIL / NOT TESTED**, exact tested SHA, isolated environment ID, test timestamp, reproducible API/browser CI links, synthetic identifiers, responsible reviewer and redacted evidence. A screenshot of a prototype, static source check or test against production does **not** count.

## 5. Fix the certification-plumbing limitation

`scripts/day1-gate-d-certify.mjs` currently adds D11–D15 and D16-S as `NOT_CERTIFIED` unconditionally. This is intentional fail-closed behaviour, but means **the status can never turn green from app code alone**.

After the real matrix runs, implement an independent, protected certification job that:
- runs or verifies those tests on the exact reviewed UI/API/model SHAs and staging environment;
- stores timestamped, redacted test artifacts, per-test PASS/FAIL/NOT TESTED and content digests;
- fails automatically for missing/failed/ambiguous coverage, stale SHAs, production endpoints or untrusted evidence;
- consumes **only independently verified test outcomes**, never a PR author's editable `passed: true` JSON or manual checkbox.

Keep the existing Gate D fail-closed check red until a reviewed attestation verifier and actual staging evidence are present. Do not reclassify a failing release gate as optional to obtain a green merge.

## 6. Merge and release decision

Safe preliminary work: consolidate the **reviewed** stacked UI branch on an isolated integration target for testing, without enabling production exposure or altering the main branch. This is not equivalent to a main or production release. Check ancestry and conflicts before doing so.

**Main merge requires:** API #346's exact-head checks and security acceptance, full D11–D16-S evidence, required identity/financial approvals, no open blockers or review changes, a green trusted Gate D certification result, and explicit owner release decision. Merge only the exact reviewed commits in dependency order, then verify the merged main build. **Production deployment is a separate action after merge.**

### Operator handoff

Infrastructure owner: provide a private staging API hostname, isolated DB/Redis, ClamAV and private encrypted bucket, protected Vercel preview at the exact SHA, plus provider test identities/OTP and Money sandbox. No production secrets or personal data should be placed in GitHub comments or this file. Engineering then executes the above matrix, files CI-backed evidence and requests owner sign-off.
