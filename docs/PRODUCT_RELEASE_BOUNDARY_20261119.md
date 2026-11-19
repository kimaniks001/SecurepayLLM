# SecurePay Mini — product ownership and integration release gate

**Product:** SecurePay Mini. **This repository is the Mini delivery repository**, not the release source for Living Workspace or SecurePay for Business. Existing shared code in this repository is transitional legacy code, not permission to publish other products under the Mini name.

**Non-production integration branch:** `integration/three-products-20261119`, created from H4E Mini commit `4fad03e129830c27be524c757c78469ce291e248`. All work on this branch is release-HOLD pending branch convergence and certification. Do not merge this branch to main or deploy it to production as a substitute for validation.

## Required first-party Mini experience
- Phone-first `mini.html` / `src/mini/main.tsx` and native Mini user experience, not generic `index.html`, Workspace or old Business.
- Buy Something: basket quietly checks fairness, source/offer version, delivery, maintenance coverage and start date. When ready, independent actions **Send SecureLink**, **Connect to Money**, **Save for later**.
- Sell Something: trusted source, image-use authority, offer publication, store, seller-only SecureLink; **never** offer seller-side Connect to Money.
- Pay Someone or Something; Collect Money and contribution governance; original payment-specific refund rights; no fictional provider settlement.
- My Agreements, SecureLink inbox, KS001 assistance, Need a hand? / H4 journeys, genuine user-authorized human engagements.
- Business Settings inside Mini may manage a business account without turning Mini into the separate Business product.
- No sample customer records, live-money claims, synthetic verified helpers, fake receipts or unauthorized securelink issuance.

## Branch integration ledger — not yet complete
1. Current H4E Mini draft: [#364](https://github.com/kimaniks001/SecurepayLLM/pull/364); paired Core H4E [#520](https://github.com/kimaniks001/SecurePayAPI/pull/520).
2. **Missing independent Collect C8 line**: [#351](https://github.com/kimaniks001/SecurepayLLM/pull/351), SHA `9bf91e580412cd6ea703805d772f4aadbf9f768b`, and Core C8 counterpart on `feat/mini-collect-c8-certification-gates-20261119`. C8 and H4E are DIVERGED; do not treat H4E as a superset.
3. Validate independent seller work: [Mini #333](https://github.com/kimaniks001/SecurepayLLM/pull/333), SHA `e6baee4d086e06d0c37ccb114bc56649217b07b2`; Core [#479](https://github.com/kimaniks001/SecurePayAPI/pull/479).
4. Validate Community Saver 7E non-Money branch and safety constraints, and standalone Business/Workspace handoffs, without relabeling them as Mini product screens.
5. Integrate with explicit reviewed commits / cherry-picks and source/version proof. Preserve all release changes without blindly bulk merging branch histories.

## Own Vercel project
**Proposed stable project:** `securepay-mini-test`. Own deployment from the dedicated Mini repository and its verified integration branch only. Force an explicit Mini entry page; forbid silent fallback to Workspace or Business. Use preview-only public API base URL; no regulated live credentials or Money dispatch.

## Release gate (all mandatory)
- Repo-specific CI build, strict typecheck, lint and Mini release audit.
- Buy / Sell / Pay / Collect / Help end-to-end routes and 20-person usability acceptance.
- Shared Core API compatibility by fixed SHA; auth, privacy/consent, version and Agreement authority checks.
- Full Core Java 21, PostgreSQL/Flyway, concurrency, BOLA and regulated financial-partner certification.
- A real verified deployment URL opening Mini as Mini, followed by independent approval for production.

**Status: HOLD — integration preparation only, not a deployable release.**
