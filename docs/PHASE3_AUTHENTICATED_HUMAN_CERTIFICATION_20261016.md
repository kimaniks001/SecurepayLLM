# Phase 3 — Authenticated Human Convergence Certification

**State:** PREPARED / BLOCKED ON ISOLATED STAGING, TEST KS IDENTITIES AND HUMAN SESSIONS. Not certified.

## Why the old preview is not a test environment

At UI head `64a31e6144cab5a2dbdf124ab5d750909be1f35f`, both `api/preview-agent.js` and `api/preview-workspace.js` set `UPSTREAM = 'https://securepay.ke'`. Their client gateways likewise constrain the upstream to that production host. A Vercel **preview is an alternative frontend, not an isolated database**. Do not run artificial funding, pretend confirmations, test invitations or trial bookings against this path. Never use a real person's KS Number as a dummy.

The production backend authority stays unchanged and closed to simulated transactions.

## Mandatory provisioning before running a real human scenario

1. **Isolated frontend and backend** with a documented deploy SHA, database, independent test data and production-separate API origin; prove the browser's actual requests reach that isolated API (not merely that an env variable says so). Ensure the Vercel production-pinned preview relays are not used.
2. **Six+ synthetic KS identities**, created using approved test procedures: buyer, supplier, organiser, invited member, community non-member, Plug, and an explicit unauthorised different owner. The credentials and OTPs belong in a secure staging secret vault or direct human handoff—never in PRs, logs or screenshots.
3. **Known scoped fixtures** from the staging API: one Store product offer, one Store service offer, a saved Agreement build, a Dream with a revision, a private named Circle with a member-only project, and one deliberately inaccessible record.
4. **No live external rails**. Funding, provider payments, subscription activation, Money execution, identity changes, real notifications to outside people, invitation dispatch, booking/dispatch and third-party requests are disabled. Review status and simulated negative gating only.
5. Test on 320 px, 390 px, desktop and 200% browser zoom; include keyboard-only interaction, weak connections, back/refresh, logout/identity switch, one older first-time trader and a second inexperienced trader.

### Zero-network configuration sanity check

With approved isolated origins (replace the examples with genuinely provisioned staging URLs):

```bash
SECUREPAY_CERT_SITE_ORIGIN=https://staging.securepay.ke \
SECUREPAY_CERT_API_ORIGIN=https://staging-api.securepay.ke \
SECUREPAY_CERT_TEST_ONLY=I_CONFIRM_TEST_ONLY \
SECUREPAY_CERT_MONEY_MODE=NO_EXECUTION \
node tests/certification/staging-guard.mjs
```

This checks **URL configuration only**. It makes **zero HTTP requests**, grants **no permission** and does **not** certify routing or any human journey. The next human independently verifies deployed routing, staging data and access tokens without recording secrets. `node --test tests/phase3-certification-guard.test.mjs` runs local guard tests. These must not be reported as E2E authentication evidence.

## Human journey sheets

For each exercise record: test identity role (no KS Number or name), site and API deploy SHAs, browser/viewport, date, steps observed, request IDs stripped of secret headers, screenshot/video without personal data, PASS/FAIL/BLOCKED, exact failure, and owner of correction. If a key fact is not witnessed, mark **NOT RUN**, not PASS.

| Journey | What the human attempts | Required authority/negative checks | Verdict |
|---|---|---|---|
| A · Chair delivery | Home → KS001: 200 chairs → identify Store offer → delivery place and entrance → living draft → review → read-only Money explanation → return to identical KS001 thread | Server conversation ID same at both handoffs; alternate KS denied; draft is not payable; no invented seller/fee/delivery verification | NOT RUN |
| B · Bathroom tiling | Bring quotation/photo → read price/scope → Edit People → optionally add KS Number or supporting image → review milestones and what remains open | Source explicitly sent and traceable, lookup not participant consent; KES 95,000 example never promoted to agreed amount without review; no silent invitation | NOT RUN |
| C · Eight-person chama | Organiser describes purpose, rules, people, schedule → KS001 clarifies governance → review invitation readiness | Eight actual recipients must not be contacted in this gate; no implied acceptance; no Money action before approved authority | NOT RUN |
| D · Dream to Agreement | Open owned Dream → revision/notes → deliberate draft Agreement invitation → back to Vision | Revision and owner preserved; no automatic binding or cross-user private Dream read | NOT RUN |
| E · Short Stays/My Ride | Submit request → Find Store service offer → inspect exact live listing → KS001 draft | No false availability, booking, payment, dispatch or assumption that seller agreed | NOT RUN |
| F · Community project | Member discovers named Circle project → scoped coordination → optional Plug/Master help → separate explicit trade intent | Non-member/Circle outsider sees no Circle content; community member status never grants Agreement consent | NOT RUN |

## Extra negative tests before passing

- **Wrong identity after logout:** no private draft, Circle, Vision, Agreement or Money status bleeds into next account.
- **Unreliable network:** timeout or 5xx leaves previous turn uncertain; same idempotent turn is retried or safely checked, never silently sent twice.
- **Home ↔ KS001 ↔ Living ↔ Money ↔ Back:** server read resolves to same accessible conversation; stale version is refused; draft cannot be funded. Verify status/fees/rails only against backend authoritative test fixtures.
- **Source lifecycle:** selecting photo/document stays local until explicit Send. Removing a source cannot leave its extracted proposal looking accepted.
- **Accessibility and language:** person finds the one next action in under two minutes without coaching; record hesitations and wrong taps honestly, including Swahili where applicable.
- **Printed Agreement:** clear names/capacities, verifiable amount and obligations, agreement version, real participant confirmations, signature/evidence treatment and honest open points; do not print a misleading confirmed status for a draft.

## Exit decision and change control

The automated frontend green gates and SecurePayAPI CI green gates are necessary, **not sufficient**. Actual authenticated staging and human evidence are required. The canonical signed-in Home must connect the Living Workspace experience without leaking preview/demo truth; that migration remains a separate, reviewable release change.

Only after all six journeys pass with no privacy, funds or evidence issue should the product owner approve merging stacked UI PRs and API PRs in dependency order. Deployment to `securepay.ke` remains a separate explicit approval.

No one should treat the site as production-ready based on this procedure alone.
