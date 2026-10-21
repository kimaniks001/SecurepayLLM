# Gate 3B — Protected UI staging relay contract (21 October 2026)

**Draft only: code prepared, no Vercel setting changed or deployment authorised.** This PR sits on the exact Phase 7 UI candidate `45a6322de45e966212e8e48be74fa1afd9b2fff7`, independently of all public preview routes.

## Why

The current `securepay-ks001-staging` Vercel project (ID `prj_bnd17Uacp36N38RuE12wluwtHLlV`) has no deployed preview and its `VITE_SECUREPAY_API_BASE_URL` points to a deliberately invalid address. The existing `api/preview-agent.js` and `api/preview-workspace.js` have `securepay.ke` as upstream and block writes.

An isolated UI must be able to use a separate *verified* staging API without ever redirecting staged write requests to production. Browser-supplied URLs, headers and query strings must never select an upstream.

## New server-side boundary

`api/preview-staging-policy.js` selects one of:
- **Ordinary existing preview, no staging variables:** production `https://securepay.ke`, **read-only** (same behavior as before).
- **Dedicated staging project, missing staging variables:** **503 unavailable, no production fallback**.
- **Any partial/mis-scoped/unsafe staging configuration:** **503 unavailable**.
- **Dedicated project with explicit isolation confirmation and valid HTTPS staging API origin:** upstream may be used for the restricted Gate 3 certification routes.

All conditions must be satisfied for the last case:
1. `VERCEL_PROJECT_ID` must equal the dedicated Vercel project ID `prj_bnd17Uacp36N38RuE12wluwtHLlV`.
2. Server-only `SECUREPAY_STAGING_TEST_ONLY` must equal `I_CONFIRM_ISOLATED_SYNTHETIC_STAGING`.
3. Server-only `SECUREPAY_STAGING_API_ORIGIN` must be an HTTPS origin under `*.securepay.ke` **explicitly marked** `staging`, `sandbox`, `qa` or `test`; no user/password, custom port, path, query, redirect, IP, `.invalid` or `.vercel.app`.
4. The **client** variable `VITE_SECUREPAY_API_BASE_URL` must have the exact same origin. Browser and server independently enforce supported SecurePay origins.
5. A human infrastructure owner independently proves this domain is a standalone staging API with separate host, PostgreSQL, Redis, signing keys, synthetic identities and disabled external rails. **The label alone does not prove isolation.**

This PR makes *no automatic changes* to any Vercel environment variable. Do not set these variables on the production `securepay-llm` Vercel project or any other project.

## Certification write scope

- **KS001**: anonymous/synthetic conversation creation and turn POST, plus narrow GETs needed for formation. No photo uploads, identity selection, retries or invitation-like mutations in Gate 3.
- **Workspace**: POST test authentication login, completion, token refresh, MFA resend, or resume a test saved build. Backend still owns all auth and access.
- **Forbidden**: Store offer writes, Dream/Vision writes, Circle/membership/Community writes, Agreement acceptance, payment intents, bank requests, releases, settlements, bookings, real invitations, any PUT/PATCH/DELETE. Do not use real SMS/email.
- Existing same-origin host checks, request limits, endpoint allowlists, bearer forwarding boundaries, token protection and no-cookie-forwarding remain unchanged.

## Operator procedure after independent API isolation is verified

1. Obtain the deployed protected staging API HTTPS domain and verify server routing, backend DB/Redis identity, migrations and disabled outward providers; never proxy to `securepay.ke`.
2. Scope `VITE_SECUREPAY_API_BASE_URL`, `SECUREPAY_STAGING_API_ORIGIN`, `SECUREPAY_STAGING_TEST_ONLY` and (if not supplied by Vercel's runtime) `VERCEL_PROJECT_ID` to **only** the `securepay-ks001-staging` project. Set `VITE_SECUREPAY_API_BASE_URL` and `SECUREPAY_STAGING_API_ORIGIN` to the same independently verified staging API origin. The confirmation must be explicitly granted by the infrastructure operator after isolation verification.
3. Deploy the reviewed, exact frontend commit only to that protected staging project; **not** to the public main project or SecurePay production.
4. Prove in server-side request logs that one synthetic `POST /api/agent/conversations`, login and an authorised workspace GET reach the dedicated staging API, and that production sees none. Avoid logging tokens, passwords or personally identifiable information.
5. With two synthetic users, verify own agreements list, forbidden cross-KS reads, auth refresh and safe return to the same conversation. No money, real invitations or provider execution.

## Limitations and gates

- Tests in this PR mock server-to-server `fetch` and show only routing/control correctness; they do not prove live staging, credential safety of actual infrastructure or authenticated human journeys.
- Vercel project ID is a runtime variable to verify; if absent, the policy deliberately refuses staging writes. Operator must not bypass the gate in code.
- API draft #330 → #331 → #332 remains the reviewed backend/staging series; UI PR #155 remains the leading Phase 7 frontend review candidate.

**Status: staging-safe preview transport engineering only. PR must remain draft until full CI and operator staging certification.**
