# SecurePay — Day 1 Gate D: End-to-End Certification Charter

**26 October 2026. Release authority: HOLD until all conditions are proven.**

## What Gate D is

Gate D certifies that the **approved three-column Living Workspace** works as one real product across My Work, Vision, Money, Active Agreement and Signup. Gate D is **not** approval to deploy, merge or accept real payments.

**Branch ancestry:** API Gate A PR #341 remains draft. UI Gate A PR #169 → Gate B PR #171 → Gate C PR #172 are layered drafts; Gate D is based on corrected Gate C. None of those PRs has been merged to production.

## Critical owner-observed failure

The owner opened the previous Gate C preview root and was shown the **retired public homepage**, not the approved masterpiece. The draft preview-root correction now opens the masterpiece (tested by generic source/build checks), but the canonical SignupForm still leaves it via `#/sign-up`. A standalone three-column signup mockup on an old page is **not** equivalent to having signup inside the approved Workspace with its original conversation, tool rail and SecurePay Check.

This remains a **blocking product gap** even if all ordinary UI build tests are green.

## Acceptance matrix

| ID | Proof needed |
|---|---|
| D01–D02 | Exact deployed root opens three-column masterpiece with left tools, KS001 and right-hand live status on desktop and mobile |
| D03–D05 | From live KS001, Get KS Number opens inside this Workspace, verifies genuine SMS/email challenge, shows backend-issued KS, and returns to exact original conversation without duplicate controller or membership |
| D06 | New Nakuru intention first turn, KES400 delivery currency pills and Agreement reader, signed-out and signed-in, with real model and Agreement-version evidence |
| D07 | Agreement reader → backend-authorised Save / Share / Connect Money in one shell; no acceptance or funding before readiness |
| D08 | Vision financial planning never executes; My Work selects only eligible institution and rail, exact amount, fee, provider quote, consent and Agreement version |
| D09 | Real ACTIVE Agreement shows participant's top action, obligation-specific photo/document caption and location provenance, contextual KS001 and permission-gated human help; evidence submission, review and Money release are separate |
| D09 | Actual current obligation TEXT_STATEMENT submission, idempotent and version-bound. Display the server-returned submission/review status without implying completion or payment. This is supported by current API. |
| D16 | **BLOCKING media requirement:** real private photo/document bytes + caption, GPS/Plus Code provenance, server digest, obligation/version/participant binding, secure viewer and reviewer authority; see [API #345](https://github.com/kimaniks001/SecurePayAPI/issues/345). Existing API stores only participant-declared references, not media bytes; geo handoff photos are separately purpose-bound. |
| D10 | Activation Agreement and backend funding components remain independent from identity issuance and Trust membership |
| D11–D15 | Real-model staged trade cases; real OTP/DB issue-and-login; consented Trust/Business roles; provider sandbox callbacks and accounting; mobile/desktop evidence |

## Isolation and scenario protocol

1. Record **frontend SHA, API SHA, model SHA, database/schema version, provider sandbox IDs, environment and timestamp**. Do not use a public-production money rail or customer identity for certification.
2. Use synthetic participant identities and test-controlled contact destinations. Test first signup, returning KS, invalid/expired OTP, interrupted session, resend limits, concurrent retry and duplicate issuance.
3. Preserve original anonymous work, KS001 turn transcript, Trade Context version, secure review state and draft edits across signup and sign-in. A user must never land on the legacy page.
4. Test the `i want to plan for a trip to Nakuru` production repro, then `KES 400 letter to Tom`: clarify exact service, participant and destinations; show currency pills; read Agreement; return without losing conversation.
5. For an appropriately formed and accepted example Agreement, inspect the authorised Money quote, institution family → provider → rail → cost → consent → intended funding, with 400 KES and a high-value example outside mobile rail limits.
6. With a separately *actually* activated synthetic Agreement, add captioned evidence and proven location metadata, review from the other participant's true authorised identity, then release only with server approval and provider settlement evidence.
7. Complete financial activation from a separately confirmed Activation Agreement and **all** backend funding components. Do not confuse a prepared payment intent with successful payment.
8. Capture screen recordings/screenshots at 1440px, 390px and 320px and link exact CI/browser/API traces. Check fail-closed behaviour: unavailable provider, stale version, permissions, partial funding, timed-out server, duplicate callbacks and wrong identity.
9. Publish a **single final matrix** of PASS / FAIL / NOT TESTED. Do not replace an untested item with a static code assertion.

## Preflight automation

`node scripts/day1-gate-d-certify.mjs --strict` generates `gate-d-preflight.json` and `gate-d-preflight.md`, returning nonzero until source conditions and externally verified staging evidence are complete. The dedicated Gate D workflow uploads artifacts **even when blocked**. Its red status is intentional; do not bypass it to deploy.

This is a source-and-evidence **preflight**, not a full browser or backend suite. Real-provider operations and live-model tests require independently linked evidence before formal owner release signoff.

**Actual source snapshot (26 October 2026):** 10/11 source checks ready (D01–D10), D16 **BLOCKED** because secure Agreement-obligation photo/document upload does not exist; D11–D15 **NOT CERTIFIED** pending real staging. Written evidence already works at the source-contract level and displays the returned status, but media does not. Keep the fail-closed workflow red until the API #345 media work and real multi-service staging evidence are proven.

**Required isolated staging environment before release:** exact frontend SHA, certified API/model SHAs, disposable PostgreSQL + migration set, safe SMTP/SMS OTP test adapters, signed/verified payment provider sandbox callbacks, encrypted private-media storage with retention and malware checks, certified institution rail catalog, and real synthetic role identities. The Vercel preview is **not** proof of this infrastructure. Gate D may be signed off only after each acceptance journey has linkable test output, screenshots and an evidence owner; no fake accounts or real-money funding are required.

**Merge instructions only after Gate D PASS:** Merge API P0 repair PR #341 after real-model certification; merge the stacked UI changes in dependency order #169 → #171 → #172 → #173 (or reconcile into one reviewed integration PR against main preserving authorship and avoiding duplicate commits). Verify main post-merge exact SHAs and run staging again. Do **not** deploy by merging on its own; a separate production release gate and owner authorisation are mandatory.

**Current release verdict: HOLD.** Do not rebuild/reimagine the approved masterpiece, do not mark declared file references as stored photo evidence, and do not waive real identity/payment tests because a component CI build is green.
