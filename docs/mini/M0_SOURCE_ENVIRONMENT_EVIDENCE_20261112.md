# Mini-as-SecurePay: M0 source/environment evidence and first M1 continuity repair
**Checked:** 12 November 2026. **Verdict:** M0 partial; M1 partial; **NO-GO** for real payments, public production promotion or declaring live KS001 certified.

## The exact product decision
- Mini is the **primary SecurePay** experience. Do not create a second consumer product or visually redesign approved Mini, original Digital Store or Living Workspace.
- Workspace is a preserved, optional deeper workbench.
- Product continuity is one canonical source-backed Agreement + authenticated conversation; financial authority rests with SecurePayAPI and certified regulated provider(s).
- The Onion principle and 22 marketing law gate are at `docs/mini/SECUREPAY_MINI_AS_PRODUCT_PRODUCTION_MASTERPLAN_20261112.md` and `docs/marketing/SECUREPAY_22_LAWS_DECISION_GATES_20261112.md`.

## Source inventory — observed, not assumed
| Component | Exact branch / PR | Status |
| --- | --- | --- |
| Approved small Mini Phase 4 | `restore/mini-phase4-approved-clean-20261110` / base of PR #270 | Design reference only, **not production certified** |
| Day 11 Mini consistency | `feat/day11-agreement-commerce-mini-unification-20261112` / #270 | Draft |
| Mini Buy real public Store reads | `feat/day11-mini-buy-live-store-entry-20261112` / #274 | Draft, not accepted seller order |
| Mother collection guided interview | `feat/day11-mini-collect-for-someone-conversation-20261112` / #276 | Draft, deterministic local preview, not live KS001 |
| Product charter and marketing gates | `plan/mini-as-securepay-production-20261112` / #277 | Draft |
| This continuity/honesty patch | `feat/mini-m0-m1-continuity-gate-20261112` / new PR | Draft candidate |
| Owner-approved original Store | `feat/day11-agreement-commerce-store-unification-20261112` / #271 | Separate draft and base; do not blanket merge |
| Workspace contextual Store cards | `feat/day11-ks001-store-suggestions-20261112` / #275 | Separate draft |
| API human qualification boundary | `SecurePayAPI` PR #409 | Draft |

**GitHub compare at audit:** Mini #270 head versus Store #271 head: `diverged`, **Store head 353 commits ahead and 322 commits behind** Mini's head. A direct code/content merge is NOT an acceptable M0 step without component-level reconciliation and visual golden checks. Product position and domain contract can converge before the two frontend histories do.

## Environment and proof
- Vercel `securepay-llm` project `prj_C8t8l9Q3eAt5cFsfsxHJoNB6w8GJ`: existing preview builds reported READY. A Vercel READY build is **not** a live API, model, identity, Agreement or payment certification.
- Vercel `securepay-ks001-staging` project `prj_bnd17Uacp36N38RuE12wluwtHLlV`: deployment listing returned **0** at audit. This does **not** prove that every service answering at `staging.securepay.ke` is absent; a separate hosting/runtime inspection is required.
- Vercel `securepay-llm` project environment-variable names were checked with decryption disabled: **neither** `VITE_MINI_GUEST_SITE_ID` **nor** `VITE_MINI_GUEST_API_ORIGIN` was present. Therefore the existing `getMiniPilotConfig()` remains null in this project absent another deployment source. Do NOT invent site IDs or set unregistered API URLs.
- `public/embed/securepay-guest-agent.js` does already implement a legitimate site-registered SDK, version 0.5.0, with an approved-origin manifest, server history, pending idempotent turns and read-only Agreement Formation/handoff. The visible Mini `MiniGuestChat` refuses to simulate an AI reply when site/API is unconfigured. Preserve that boundary.
- GitHub Actions: no PR-triggered workflow runs were returned for LLM plan commit `392e13f1`. API PR #409 head `7b919f27` returned a `startup_failure` run. This is **not passing CI evidence** and must not be treated as a code-test success/failure without job logs.
- Prior staging acceptance: live 12-turn Ruiru chairs scenario failed on repeated quantity/question, fragments, fallback/generic delivery and omitted delivery from final summary; reload had a valid token but UI reset and context request stalled. These remain hard M1 blockers until full rerun.

## First concrete M1 repair in this branch
**Root UI defect:** guest SDK formerly set `status='ready'` before server history, then swallowed a history 404, invalid JSON or temporary outage while leaving `ready=true`; Mini could present an empty, apparently healthy chat after reload.

**Correction:**
1. `public/embed/securepay-guest-agent.js`: server history failure now sets `continuity-unavailable` or `expired`, with `ready=false` and send disabled. Retain the original possession token for transient recovery and even 404 until the human explicitly clears it; do not silently generate a new conversation. Successful retry restores genuine server history. Reset requires deliberate user action.
2. `src/mini/MiniGuestChat.tsx`: preserve original layout; plainly explain when the previous chat cannot be loaded, permit Recheck, and expose a two-step explicit Clear only for expired sessions; update status after explicit reset.
3. `tests/mini-m1-guest-continuity.test.mjs`: six focused Node tests, covering 503 outage, retry/recovery, 404 persistence/explicit clear, malformed history, new authorised chat and visible error handling.
4. Add the six tests to existing eight beneficiary collection tests in `package.json` preview prebuild. On commit `0faa102a92f9c8b6e3333894492bc09d956d01f6`, Vercel project `securepay-llm` reported READY, and the backward build log exposed `pass 14 / fail 0`. This is **candidate source/preview test evidence**, not a live API acceptance pass.

## Unresolved M0 exit conditions — assigned operator actions
| Gate | What must be proven | Current |
| --- | --- | --- |
| M0-A | Frozen, exact Mini & Store screenshots, component/API interface comparisons; no silent overwrite | **OPEN** — branch divergence measured |
| M0-B | Current independent staging API deployment, DB/Redis, model keys and configured provider; no production data | **UNPROVEN** — Vercel staging project's 0 deployments is insufficient |
| M0-C | Register Mini's intended exact preview browser Origin with SecurePayAPI as an authorised guest site; owner-managed **non-secret** site ID, strict staging API origin in Vercel Preview; verify backend manifest | **OPEN** — two public config keys absent |
| M0-D | Restore GitHub Actions execution/billing; obtain genuine green job/step logs for current exact candidate | **OPEN** — LLM no runs, API startup failure |
| M0-E | API + Mini exact git SHA and migration/image provenance; no payment or identity on unisolated staging | **OPEN** |
| M0-F | One written owner lock of design and one PR integration order; no broad merges | **PARTIAL** — this audit and #277 |
| M1-G | 12-turn real KS001 chairs scenario and reload/continuity from same session | **FAIL/UNPROVEN** until server rerun |
| M1-H | Live mother collection with verified intent, no repeated questions, proper permission/authority and canonical Agreement slots | **UNPROVEN** (only local interview tests passed) |

**Never put API secrets, database credentials, anonymous conversation access secrets, phone/health details, production account numbers or private logs in PR discussion.** Vercel public configuration keys have non-secret values but require legitimate pre-registration and exact Origin matching.

### Operator-ready focused task
1. Recover GitHub billing/CI runner; don't infer pass from statuses. Record running commit and test log only.
2. Verify `staging.securepay.ke` API process/commit and staging-only DB/Redis/model; record **non-secret** health/version/isolation evidence.
3. Register the exact Mini preview origin as a site-bound guest installation, set only its *approved* site ID and staging API origin in scoped Vercel preview variables. Never add production scope and never paste credentials into issue/chat.
4. Rerun precisely: one guest conversation, response under normal controls, reload same conversation, forced history 503 → no false ready, retry restores, 404 requires clear, then 12-turn Ruiru chairs with 15 vs 40, delivery and source-truth acceptance.
5. Record acceptance report + screenshots; only then promote M1 from CANDIDATE to TESTED, keeping real Money off.

## Release decision
- **M0:** partial; reconciliation and live environment proof outstanding.
- **M1:** fail-closed continuity correction tested in preview, live model and stable backend not yet approved.
- **M2–M12:** no false completed milestones added. Backend history/Phase 42 authority work must be reused, not restarted.
- **Production:** **NO-GO**. Never merge these drafts to production, activate an external rail, or solicit genuine family contributions without independent eligibility and operational approval.
