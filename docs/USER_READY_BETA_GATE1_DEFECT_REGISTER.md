# User-Ready Beta — Gate 1 Defect Register (UX & Product Convergence)

Classification labels follow AGENTS.md. Defect IDs are the observed IDs from live beta/certification sessions and are kept
verbatim so the evidence is never softened into "enhancements".

Base: API `main` 467b8540 · UI `main` 24bac01 · Branches `fix/user-ready-beta-gate1-api`, `feat/user-ready-beta-gate1-ui`.

## Product decisions for this gate (locked by human approval, 2026-09-29)

| # | Decision |
| --- | --- |
| D1 | Anonymous continuity keeps ONE tab-scoped possession record. Starting new while meaningful anonymous work is unsaved asks first: **Start fresh? This work hasn't been saved.** — Save for later · Start fresh · Stay here. |
| D2 | Input ≤ 1,200 characters is a turn; > 1,200 characters is automatically a pasted source. No browser-side truncation; no lower heuristic. |
| D3 | Contextual invitation = Web Share / copy-link with contextual copy only. No new invitation backend, membership or referral semantics. |
| D4 | Explicit total + explicitly complete schedule that disagree → blocking Review point. Partial/unknown completeness → needs checking only. |
| D5 | KS001 character contract version is bumped for adaptive brevity; it is a new certification subject (Gate 2 re-runs the corpus). |

## Register

| ID | Observed | Owning layer | Status |
| --- | --- | --- | --- |
| EP-CERT-001 | A substantial pasted agreement exceeded the chat turn limit and failed. The conversation composer silently truncated to 1,200 chars (`maxLength`); the Home composer had no limit and a retry re-sent the same invalid body. | UI controller / presentation | see closure |
| EP-CERT-002 | Review correction text cleared on Submit although the canonical update had not applied (`setCorrection('')` after a fire-and-forget `send`, which no-ops while a turn is pending). | UI controller / presentation | see closure |
| EP-CERT-003 | Conflict/open-point Review has no direct resolution controls: SecurePay knows the alternatives but tells the person to explain the answer to KS001. Target: structured "Use this" resolution. | API transport (side targets) / UI | see closure |
| EP-CERT-004 | "Two different active price figures exist for this trade." shown for TOTAL 95,000 + DEPOSIT 30,000 + MILESTONE 35,000 + BALANCE 30,000. | API domain (`AgreementCandidateProjector`) | see closure |
| EP-CERT-005 | Build/Understood lacks obvious direct structured editing; visible money/date/person facts force the person back into chat. Target: direct edit where semantically safe, via canonical structured input. | UI presentation (+ API guard reuse) | see closure |
| EP-CERT-006 | Current-agreement escape is visually buried; the person feels trapped and cannot easily start unrelated work. Target: persistent + New and an explicit conversation identity/mental model. | UI presentation / controller | see closure |
| EP-CERT-007 | One unresolved issue sent the person into the full-document Review. Target: micro-review for single decisions. | UI presentation | see closure |
| EP-CERT-008 | After simple corrections KS001 recapped most of the agreement. Target: adaptive brevity. | Orchestration / model policy | see closure |
| EP-CERT-009 | Home felt assembled: floating composer, separate Add button, Principles separated, dead vertical space, many example pills, no proof of output. | Design system / presentation | see closure |
| EP-CERT-010 | KS001 and the 12 Principles are visually/conceptually separated. Locked doctrine: KS001 = voice, 12 Principles = compass, Agreement = output. | Presentation | see closure |
| EP-CERT-011 | Public Entry functionally present but visually fragmented: disconnected components, dead space, weak boundaries, insufficient depth. | Design system / presentation | see closure |
| EP-CERT-012 | Public pages give no easy way to invite someone with context. | Presentation (D3) | see closure |
| EP-CERT-013 | Returning Home to start a new task added a new document into the old bathroom-tiling conversation (old people, price conflict and new source collided). | UI controller | see closure |
| EP-CERT-014 | A failed DOCX showed the failure on the card and the same error again below it. | UI presentation | see closure |
| EP-CERT-015 | Failed source: an obvious Retry but no clear escape; the person felt stuck. | UI presentation | see closure |

## EP-CERT-004 reproduction (API, `Gate1MoneyRoleConflictTest`)

Deterministic fixtures, written and run BEFORE the projector was changed:

| Fixture | Before fix | After fix |
| --- | --- | --- |
| Role-qualified PAYMENT_CONDITIONs (total/deposit/instalment/balance) | pass — no conflict | pass |
| Schedule figures as MONEY entities with `moneyRole` | **FAIL — false CONFLICTING_AMOUNTS** | pass |
| MONEY entities referenced by role-qualified PAYMENT_CONDITIONs | **FAIL — false CONFLICTING_AMOUNTS** | pass |
| Role synonyms (down payment / milestone payment / final payment) | pass | pass |
| Two totals 95,000 vs 105,000 (two sources) | pass — conflict, two named sides | pass |
| Two total MONEY entities | pass — conflict | pass |
| `grand total` 105,000 vs total 95,000 | **FAIL — conflict hidden (false negative)** | pass |
| Two role-less figures (legacy shape) | pass — conflict (fail closed) | pass |

Root cause (confirmed): suspected path 1 — `activeAmountCandidates` counted EVERY active MONEY entity as a price candidate with
no role filter, so any MONEY-typed deposit/milestone/balance competed with the total. The resulting matter has no sides (the
separate `UnderstandingConflicts` engine, which is role-aware, found nothing) — exactly the observed sideless message.
Suspected path 2 (role-less PAYMENT_CONDITION) is legacy fail-closed behaviour and is deliberately unchanged.

## Closure table (end of Gate 1)

Status vocabulary: **CLOSED** (fixed + automated regression + where possible browser-verified) · **CLOSED (unit/source)** (fixed
and regression-tested; not observable in a keyless local browser) · **PARTIAL** · **OPEN**.

| ID | Status | Fix | Regression evidence | Browser (local, no model key) |
| --- | --- | --- | --- | --- |
| EP-CERT-001 | CLOSED | One input door: ≤1,200 turn / >1,200 pasted source (`routeInput`, `submitInput`); no `maxLength` anywhere; composers keep words until accepted; refused pastes re-open the paste panel with the words. | gate1: boundaries 500/1199/1200/1201/2000/10000/150000; 10,000 chars reach the endpoint whole | 1,584-char paste → source card in a new conversation, not a chat failure |
| EP-CERT-002 | CLOSED (unit/source) | Review correction awaits the outcome: ok clears + KS001 ack; failed/unknown/blocked keep text, retry re-sends the SAME pending turn. | gate1: 5 outcome cases + source assertions | needs a working model turn to observe |
| EP-CERT-003 | CLOSED (unit/source) | Review/micro-review "Use this" per side → `RESOLVE_CONFLICT`; words fallback kept. | API `Gate1ConflictResolutionTest` (9); gate1 UI | no conflicts without source understanding |
| EP-CERT-004 | CLOSED | Projector role semantics (see API report). | API `Gate1MoneyRoleConflictTest` (8, 3 failed before the fix) | — |
| EP-CERT-005 | PARTIAL | Source-derived money directly editable ("Change"), history kept; responsibilities/conditions/exclusions still via KS001 (UR-276). | ui-phase1 + gate1 + API provenance test | — |
| EP-CERT-006 | CLOSED | Persistent + New (44px) in the KS001 identity header, conversation title, Refresh ≠ reset. | gate1 | + New visible at desktop/390/360/320; dialog focus/Escape/return verified |
| EP-CERT-007 | CLOSED (unit/source) | Contextual CTA (Resolve price / Check date / Choose person / Review N points / Review agreement) and one-decision `MicroReview` sheet. | gate1 + updated phase6/7 tests | needs formation open points |
| EP-CERT-008 | PARTIAL | `ReplyScope` + contract v2 (API). Real-model behaviour unverified (UR-277). | API `Gate1AdaptiveBrevityTest` (4) | no model |
| EP-CERT-009 | CLOSED | Composed entry object; 3 examples; compact lockup; illustrative outcome; next chapter in first view at 1440×900. | gate1 + updated composition tests | desktop 1440 two-column, How it works at 812px of 900 |
| EP-CERT-010 | CLOSED | KS001 + "Guided by the 12 Principles of Fair Trade" fused above the composer and in the conversation header; KS001 introduced in the compass sheet. | gate1 | verified Home + conversation |
| EP-CERT-011 | CLOSED | Surface hierarchy (canvas/region/info/decision/moment), wisdom voice, connected How it works. | gate1 | Understood recessed plane, decision cards visible |
| EP-CERT-012 | CLOSED (share-only, D3) | Trust Project "Invite someone" with optional note → existing Join share doorway. Persisted invitation-with-note later (UR-275). | gate1 | — |
| EP-CERT-013 | CLOSED | Every Home entry goes through `requestFresh`; explicit Continue card; "Start fresh?" for unsaved meaningful work. | gate1 incl. Journey G isolation | Home → café task: "Start fresh?" → new conversation, zero bathroom leakage |
| EP-CERT-014 | CLOSED | Failure shown once (on its card); page notice only when no card, dismissible. | gate1 | exactly one alert |
| EP-CERT-015 | CLOSED | Try again · Remove · Start fresh (when fitting); nothing blocked. | gate1 | Remove worked; chat continued |

Later product work: persisted contextual invitations (UR-275); structured edits for responsibilities/conditions (UR-276); Store /
Community "Use this" still adds to the CURRENT conversation (intentional for discovery inside a conversation; revisit from standalone
Store). Pre-existing concurrent-ingestion price loss on main: UR-274.

## Local browser verification needs a same-origin dev proxy (not a defect)

Anonymous conversations send `X-SecurePay-Conversation-Token`, a custom header. From `http://localhost:5173` to
`http://localhost:8080`, the browser's CORS preflight is refused by the API (HTTP 403), so the first POST (create
conversation) works and every token-carrying call (turns, sources) never reaches the API. This is the API correctly
refusing an origin it has not allowed. It must NOT be "fixed" by widening CORS or weakening the conversation token.

Verify locally through a same-origin proxy that is never committed. The author already keeps one in a stash: add
`server.proxy['/api'] = { target: 'http://localhost:8080', changeOrigin: true }` to a local Vite config and run with
`VITE_SECUREPAY_API_BASE_URL=http://localhost:<vite port>`. Deployed topology is same-origin, so this is not a Gate 1 blocker.

## Closure pass status (2026-09-29)

- UR-274 (concurrent sources erasing facts): RESOLVED in the API (draft PR #278).
- Real-model checks, KS001 v2 behaviour, browser verification of EP-CERT-002/003/004/007 against real extracted facts, and
  the Golden corpus: NOT RUN — no `ANTHROPIC_API_KEY` in the environment; the corpus also needs a real handwriting set and
  a full-stack runner (API UR-278).

## Real-model closure attempt (2026-09-29, funded access)

Browser proof of EP-CERT-002 / 003 / 007 against real model state was **not run**: it depends on real source understanding,
which does not complete within the product's bounds on claude-sonnet-5 (API UR-280). The real model also exposed a false
`CONFLICTING_AMOUNTS` for a complete one-sentence deal, which would put a wrong "Resolve price" CTA in front of the person
(API UR-281, EP-CERT-004 not closed against the real model's shape). These entries therefore stay at their previous status
(CLOSED (unit/source)); EP-CERT-004 is reopened as PARTIAL pending UR-281. Gate 1 verdict: NOT COMPLETE (see API
`docs/operations/USER_READY_BETA_GATE1_API_COMPLETION.md`, draft PR #278).

## Phase 1.6 (UI half) — Blockers 5 and 6 in the understanding panel

Real claude-sonnet-5 shapes from the final paid run: the excluded thing marked on the item itself (ITEM "Tiles" {excluded},
CONCEPT "Drinks excluded" {excluded}) fell under "Also understood" / "What we're making happen"; a responsibility with no
description (Maji Bora → pump) was dropped. The panel now shows "Not included: Tiles" (explicit marker only) and names a
description-less responsibility by the work it points at, exactly as the API's Review does. `tests/gate1-phase16.test.mjs` (5; 3
of the 4 behavioural cases fail on the pre-fix projection). Browser evidence for EP-CERT-003/007 was recorded in the Phase 1.5 run;
EP-CERT-004 remains open until the final paid rerun (API Blocker 2, false schedule mismatch, now fixed in code).

## Phase 1.8 (UI half) — A02 exclusion markers

The panel's "Not included" reading now uses the same explicit marker vocabulary as the API (keys `excluded`, `notIncluded`,
`negated`, `exclusion`, `isExcluded`, case-insensitive; values `true`, `yes`, `y`, `1`, `excluded`, `not included`); no phrase
handling. `tests/gate1-phase16.test.mjs` +1 (7). The exact A02 funded-run shape was not retained, so A02 is not proven closed
(API UR-286).

## Phase 1.8B (UI half) — exclusions carried by a CONDITION

Captured live (claude-sonnet-5): A02 recorded ITEM "Paint" --CONDITION{excluded}--> (none); C02 recorded ITEM "Tiles"
--CONDITION{excluded}--> SERVICE "Tiling". The panel listed the note under completion and never said "Not included". It now
reads a CONDITION's explicit exclusion marker and names the thing by the API's rule (`excludedRelationThing`; never a party,
never the work when a thing points at it). `tests/gate1-phase16.test.mjs` +3 (all failed before). API UR-287.
