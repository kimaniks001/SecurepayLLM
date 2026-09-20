# UI Completion — Phase 8: Agreement Money Authority, Funding, Payment Ready, Release & Settlement Truth

Branch `feat/ui-phase8-money` from UI `main` @ `304c7808f26b263067fc3076c46f757056fc64c6` (Phase 7 / PR #33 merged). SecurePayAPI `main` @ `75a490bc7bdbe0b213dad00037d7f72be579c13b` (read-only, **not modified**; the API was **not run**). Not merged, not deployed.

## Decision in one paragraph
SecurePay's participant financial commands cannot be proven **environment-safe** (`FinancialParticipantCommandEnvironmentGuard` allows local/test/sandbox only, and **no read exposes that capability**) nor **atomic against a concurrent Agreement version change** (no command carries or compares an expected version). Exactly as Phase 6 Apply and Phase 7 Start/Review/Complete, every financial *command* is therefore **withheld**; the whole **read** journey is kept and made honest. Environment is never inferred from hostname, `import.meta.env`, rail or URL.

## Archaeology matrix (final Phase 8 state)
| Capability | Read | Mutation | Bound to current version | Env gate | Idempotency | Final UI |
|---|---|---|---|---|---|---|
| Funding authority | `funding-authority` | — | n/a | no | n/a | **Read** (bounded reason copy) |
| Rail discovery | `funding-options` | — | n/a | no | n/a | **Read** (information only, no ranking, no hardcoded rails) |
| Quote | — | `funding-quotes` | no | guarded, unreadable | none | **Withheld** |
| Create intent | `payment-intents` list | `payment-intents` | no | guarded, unreadable | body key | **Withheld**; in-flight intents rediscovered on refresh |
| Initiate | attempts/get | `initiate` | no | provider-dependent | body key | **Withheld** |
| Open / Fund / Progress / Return-unused position | `funded-authority`, `transactions` | POSTs | no | guarded, unreadable | header key | **Withheld**; positions and history read |
| Payment Ready | `money-status` | — | evaluation-bound | no | n/a | **Read** |
| Release authority | `release-authority` | — | evaluation id+sequence | no | n/a | **Read**, separate from funding authority |
| Create release instruction / Reserve / Execute settlement | `instructions`, `settlement-status` | POSTs | instruction binds evaluation, not Agreement version | guarded; execute is sandbox-only | header key | **Withheld** |
| Hosted redeem / shareable link | `resolve` | `redeem`, `create` | no | guarded | header key | **Withheld** |
| Settlement destination register/replace | `current`, `history` | POSTs | account-level (not Agreement-bound) | no | header keys | **Kept**, now with stable per-attempt keys |
| FX / Business FX | list/get | POST | account-level | no | header key | **Kept**, exact parse + stable keys + uncertain lock |

## What changed
- **Convergence.** Agreement Detail → Money is now a compact doorway ("Open Money"); the old `MoneyWorkspace` is no longer used by the workspace. The handoff is **in memory** (`handoff.ts`): `#/money` stays the one route, no agreement/obligation/intent ids in URL/storage/history. Money opens on the chosen Agreement with context ("Bathroom retiling · version 1"). Direct or refreshed `#/money` opens Money Home.
- **Idempotency.** All Money gateways take **caller-supplied** keys (no gateway mints a fresh key per call). Account-level mutations use `createAttemptStore`: one logical attempt = one key + exact request; uncertain (network/timeout/5xx) locks to "Try the same request again"; definite outcomes release the key.
- **Exact amounts.** `parseMinorUnits` (BigInt, ≤2 decimals) replaces `Math.round(Number(x)*100)`; rejects exponent/NaN/Infinity/negatives/commas/excess precision/unsafe integers. String amounts go through `minorFromString`.
- **Amount authority.** Agreed amount (Agreement row) and "Evaluated for Payment Ready" (`money-status`) are separate labelled sources; a same-currency mismatch is **surfaced**, never reconciled.
- **State vocabulary.** Authorised maximum ≠ Funded ≠ Ready to progress ≠ Progressed ≠ Returned to funder(s). "Progressed within SecurePay" while `providerSettlementCertified` is false. Returning unused money is "not a settlement". History label FUNDED → "Funded". The list is "Money activity", not "Transactions".
- **Settlement truth.** The backend phase `SETTLED` is emitted whenever an *execution record* exists (a dispatch outcome, sandbox-only) — the response carries no bank/provider proof — so the UI says "SecurePay recorded an execution…isn't shown as settled". Instruction ≠ reserved ≠ executed.
- **Bounded copy.** Payment Ready reasons, funding reasons, release reasons, intent statuses (PROVIDER_PENDING vs CONFIRMATION_PENDING distinct), money records and settlement phases each have a closed mapping; unknown → "can't describe yet". No raw provider metadata dump or redirect link exists anywhere in the Money layer (`PaymentIntentFunding.tsx` was deleted).
- **Partial failure.** Each panel reads independently; failure text is first-class ("Payment readiness couldn't be loaded", "Settlement status couldn't be confirmed", …), never zero/none/pending.
- **Session refresh.** `MONEY_AUTHENTICATED_METHODS` (typed table) drives every Money-family `withSessionRefresh`; a test parses each gateway source and fails if a method is missing/extra.
- **Settlement destination.** Hardcoded `currency: 'KES'` removed (explicit 3-letter input).
- **Hosted Money.** Confirm/redeem withheld with the limitation copy; the page still resolves and displays the session, shows no raw ids. The embeddable contract (origin-verified `postMessage` ready/cancelled) is unchanged; nothing was expanded.

## Disclosure: earlier "tsc clean" claims were vacuous
`npx tsc --noEmit -p .` checks nothing (root `tsconfig.json` only has references). The real check is `npx tsc -p tsconfig.app.json --noEmit`; it found **3 pre-existing type errors** (ReconfirmPanel diff narrowing, InvitePanel nullable link, WorkspaceExperience Gateway Pick) that Phases 5–7 statements of "tsc clean" did not cover. They are fixed here; the real command now passes.

## Verification (stated separately)
- Automated: `node --test tests/*.test.mjs` 790 pass / 0 fail; `tsc -p tsconfig.app.json` clean; `eslint src --quiet` clean; `vite build` ok. Older Money tests were updated to the withheld-command / caller-key contract (`payment-intent.test.mjs` replaced by `ui-phase8.test.mjs`).
- Browser (scripted mock only; the API was not run): desktop viewport — Payment Ready (not ready / ready / unknown reason code / evaluated-vs-agreed mismatch), funding authority, PROVIDER_PENDING intent rediscovered, positions with Funded/Progressed/Returned wording, money activity, release authority, settlement phase and "execution recorded, not settled", independent partial failures (money-records 503, settlement-status 503), Agreement → Open Money handoff (URL `#/money`, no query, context line), and **zero financial POSTs sent** (mock log empty).
- **Not verified in a browser:** 375/320 widths (this browser window would not shrink below ~839px; layout relies on existing flex/wrap tokens only), and journeys involving mutations (there are none to run — they are withheld). No live backend coverage.

## Gaps / backend work needed to un-withhold
1. A readable environment capability for participant financial commands.
2. Expected-Agreement-version (or in-transaction current-version comparison) on quote/create/initiate, funded-authority commands, hosted redeem and release commands.
3. A provider/bank-certified settlement field on `settlement-status` (today `SETTLED` means an execution record exists).
