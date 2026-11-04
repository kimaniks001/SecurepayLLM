# SecurePay Digital Stores — approved Masterpiece staging deployment handoff

**Owner decision (4 Nov 2026):** the Store's read-only P0 layout was visually approved. The next release is a **functioning isolated owner-testing staging deployment**, NOT an unreviewed production release or completion of Gate 5 certification.

## Exact source of truth

- UI: `kimaniks001/SecurepayLLM`, P0 draft PR #211, branch `fix/p0-store-masterpiece-convergence-20261104` (stacked on Gate 5 UI #209 → #208 → #207 → #206 → #205/#204; also preserves Day 4 PR #202).
- API: `kimaniks001/SecurePayAPI`, Gate 5 API draft PR #388, branch `feat/day5-gate5-store-certification-api-20261103` (stacked on #387 → #386 → #385 → #384).
- **Freeze exact 40-character heads at the moment of deployment** and record them in the handoff report. Never substitute live Gate 1 API/C6 for the combined Store API or vice versa.
- UI source detail: `src/RuntimeApp.tsx` is the real entry point; `src/App.tsx` is an old fixture. `Phase1LivingWorkspacePreview.tsx` is the approved authenticated Living Workspace; `StoreExperience.tsx` is mounted in its `embedded` mode and retains all Store business features.

## Isolated staging requirements — do not use production resources

1. Use a HTTPS isolated staging hostname under `securepay.ke` with a hostname containing `staging`, `sandbox`, `qa` or `test`. Treat `https://staging.securepay.ke` as an **example, not an existing verified address**. Report the actual working hostname.
2. Serve the UI and API on that SAME staging origin, routing `/api/**` to the isolated staging API. This avoids the Vercel preview's intentionally restricted JSON-only relay and prevents browsers writing against production through a cross-origin proxy.
3. Build the UI with `VITE_SECUREPAY_MODE=real` and `VITE_SECUREPAY_API_BASE_URL=https://<actual-isolated-staging-host>`; verify the build has no production API hostname or fixture mode. This is a build-time Vite variable; changing it after `npm run build` does not retarget a built asset.
4. Isolated PostgreSQL database/volume and staging Redis only. Verify database/user and environment with real evidence **before applying any Gate 1–4 Flyway migrations**. Never run Gate 2–4 migrations on live C6 PostgreSQL.
5. Use separate staging authentication/test KS identities. No production bearer tokens, payment keys, identity credentials, Vercel write relay or real provider secrets. Keep ALL financial execution, payment intents, disbursement, release and settlement disabled.
6. Preserve C6, current Gate 1 deployment, Day 4 backports, existing production proxy and backups. Never replace `securepay.ke`, merge into `main`, or remove rollback during this owner test.

## Minimum executable source and startup preflight

Run against the exact frozen candidate heads. Stop on the FIRST error; attach unredacted stack traces internally but omit credentials and personal data from owner-facing reports.

```bash
# UI — from exact P0 commit
npm ci
node --test tests/p0-store-masterpiece-convergence.test.mjs \
  tests/day4-work-navigation.test.mjs \
  tests/day5-gate1-digital-stores.test.mjs \
  tests/day5-gate2-store-connections.test.mjs \
  tests/day5-gate3-store-agreement.test.mjs \
  tests/day5-gate4-store-continuity.test.mjs
npm run typecheck
npm run build

# API — from exact paired Gate 5 API commit
./gradlew :services:securepay-core:compileJava --no-daemon
```

Follow the existing repository's Docker/PostgreSQL staging scripts for application startup, Flyway and security preflight, **after checking their exact staging-only environment variables and database target**. Do not assume Gradle build is enough to validate migrations or Spring Boot startup. Record migration and health endpoint outputs.

GitHub Actions currently report failures/startup_failure without usable logs; do not say those CI jobs passed. A Vercel preview build also does not prove typecheck, backend health or functional Store workflows.

## Ten owner-testing journeys (minimal proof, no broad Gate 5 certification required)

1. `https://<staging-host>/` enters the APPROVED My Work masterpiece, not the old AgentExperience shell; desktop and phone.
2. Sign in as **test trader A**, open **Store icon**. One existing Tool Shelf, KS001 centre and authoritative SecurePay Check are still present; no second Store header.
3. Create/customise PERSONAL Store A (name, description, hero, GPS/location/service area), ensure GPS is private by default and deliberate public pin alone reveals coordinates.
4. Create and publish one real PRODUCT, one SERVICE and one CAPACITY offer. Refresh and re-open the same saved offers; no fake publication confirmation.
5. Copy the current public Digital Store URL `/#/shop/<real-slug>`; open it as an anonymous customer in a different browser. Verify correct merchant, public offers, any privacy-safe location, and absence of private KS001 work.
6. Exercise one **legacy short URL** `/#/s/<real-existing-slug>` (with record-backed Store address) and one existing SecureLink slug. Neither may silently display the wrong product; ambiguous collisions must offer explicit choice.
7. Sign in as **test customer B**, save Store A as a favourite, create one actual enquiry with quantity/message. Confirm trader A's authorised inbox receives that exact saved enquiry; buyer cannot read another buyer's private enquiry. No Agreement/funding is created by an enquiry.
8. Trader A saves a private reply draft, signs in from another browser, resumes the saved draft, explicitly replies. Buyer B sees the actual status. Two-device newer-draft conflict must not overwrite the newer draft.
9. Customer B explicitly chooses **Continue enquiry with KS001**. Same approved Living Workspace, canonical Store offer owner/ID/quantity/source, proposed not agreed, true SecurePay Check; return to chat without losing previous unsent words or unrelated work.
10. From inside Store, **Open my Agreements** must show current signed-in authorised Agreements in the existing right-side workspace; return to KS001 and Store with no loss of existing conversation, unfinished offer or attachments. Test mobile Chat/Agreement switch.

## Known limits (do not assert completed)

- Store cover, galleries and photo uploads were previously reported unfinished. Verify and report their real current status; this P0 preserves their intended surface but does not fabricate a finished media backend.
- Full locked-phone push, SMS/WhatsApp delivery and Business KS→human representative fanout remain unfinished/unverified. In-app activity does not prove external delivery.
- Formal Gate 5 CI, full phone/identity abuse suite, financial and provider certification are deferred for this **owner-testing staging milestone**; do not label them complete.
- Any API compile, Flyway, auth, missing Store contract, private-data leak, or canonical source mismatch is a STOP for the affected feature. Never replace a failing real action with sample data or a success toast.
- Keep financial providers disabled and production entirely untouched.

## Return exactly one testing URL and a truthful report

```text
SECUREPAY DIGITAL STORES — MASTERPIECE OWNER TEST DEPLOYMENT
UI preview URL:
Exact UI SHA:
Exact API SHA:
Isolated staging database and API health (evidence):
Staging financial execution DISABLED: YES/NO
Production securepay.ke, DB and C6 UNCHANGED: YES/NO
Masterpiece + Store visible together: PASS/FAIL
Trader's saved real Store + published offer: PASS/FAIL
Public #/shop and legacy #/s links: PASS/FAIL
Buyer enquiry and trader inbox: PASS/FAIL/BLOCKED
Store→KS001 + authoritative Agreement panel: PASS/FAIL/BLOCKED
Saved Work/reply drafts across device: PASS/FAIL/BLOCKED
Mobile screenshots and Store management screenshots:
Media, notifications and other incomplete features:
Real errors/blocks and logs:
Staging rollback path:
Owner-ready for hands-on testing: YES/NO
```

**No production merge or switch is authorised by this instruction.** If the isolated API does not boot, return the failing build/migration logs and leave the already approved read-only visual preview available rather than claiming a working Store test.
