# Mini Collect C5B–C6 targeted certification diagnosis

**19 November 2026. Code corrected; GitHub-hosted certification remains blocked.**

## Concrete defects corrected

1. C5B period regression file contained an unescaped apostrophe in a test title, preventing the JavaScript file from parsing. Fixed on C5B base and C6 child branches.
2. C6 Mini used an incomplete regular-expression heuristic for material changes, missing such decisions as “the term is different,” “a new period is required,” and “the membership is different.” Replaced with an explicit set of known material-change answer IDs. Added coverage for school terms, estate renewal, transport routes, chama rotation, giving and education changes.
3. Added a focused `test:mini-collect` package script that runs all ten Mini Collect regression files before broader typecheck/build tests.

## Evidence actually obtained

- Both C5B and C6 test bodies were executed in an **isolated JavaScript evaluation harness** built from the exact GitHub branch source; 13/13 selected C5B/C6 assertions passed. They include all fifteen collection types and answer-code mapping, genuine-calendar checks, type/cadence windows, C2→C5B→C6→C3 wiring and no client-side Money.
- All ten Mini Collect *.test.mjs files were parsed in the same JavaScript environment; ten parsed without syntax errors.
- This is **not** equivalent to a Node/Vite/TypeScript/browser test against a complete repository checkout. No claim of full build pass.
- At diagnosis time, the most recent 100 GitHub Actions backend runs returned `startup_failure`; the most recent 100 frontend runs returned `failure`. The examined jobs had no recorded executed steps/runner instance. Logs were unavailable. The cause may be an account Actions budget/quota, runner policy or platform issue; it has NOT been established.
- A successful Vercel deployment status does not establish functional acceptance or production readiness, and Vercel is not used as a substitute for security testing.

## Required release gate

Keep PRs #347 (C5B), #348 (C6) and their API partners in draft. After genuine GitHub Actions runner availability is restored, run `npm run test:mini-collect`, `npm run test:final-convergence`, `npm run typecheck`, `npm run build`, `npm run lint`, and authenticated browser/security/20-person acceptance tests. Real finance stays disabled until certified providers, source/Agreement rights, bank mandates and callback/return reconciliation exist.

This diagnosis must never be interpreted as a live issuer/source verification, a paid contribution, lawful debt or authority to connect Money.
