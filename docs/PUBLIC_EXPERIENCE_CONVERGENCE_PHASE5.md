# Trust Community Redo — Phase 5 — Full convergence, end-to-end product truth and launch verification

**Status:** draft branch `feat/trust-community-phase5-full-convergence` in SecurepayLLM and SecurePayAPI (2026-09-28). Not merged. Not deployed.
**API record:** SecurePayAPI `docs/operations/TRUST_COMMUNITY_PHASE5_CONVERGENCE_COMPLETION_REPORT.md`.

Classification used below: **Verified live** means the step was driven against a running local API (SANDBOX, real PostgreSQL and Redis) and the real UI in a browser. **Code/test only** means it is pinned by an automated test but was not driven in a browser. **NOT VERIFIED** means it was not verified, with the reason given.

---

## 1. Baseline

| Repo | `main` at start | Branch | Drift |
| --- | --- | --- | --- |
| SecurePayAPI | `db7147a0f232cdfa991ccdffc36063632f2f11c2` (Phase 4D merge) | `feat/trust-community-phase5-full-convergence` | None; verified exactly |
| SecurepayLLM | `18423a22b6884bad32381395b394bbe2e45de419` (Phase 4D merge) | `feat/trust-community-phase5-full-convergence` | None; verified exactly |

**Environment limits.**
- The local agent model provider was `none`. No Anthropic key was available in the environment (the shell had none that worked), so **KS001 understanding was NOT VERIFIED live**. That covers structure appearing, follow-up questions, and item extraction from sources.
- Production refuses provider `none`. Every result below that depends on the model is marked as model-dependent.

## 2. Archaeology matrix

What exists on `main` at the baseline, and where it lives.

| Area | UI owner | Backend authority | State at baseline |
| --- | --- | --- | --- |
| Public Home | `features/public/PublicHome.tsx`, `publicContent.ts`, `components/SignedOutHome.tsx` (`SecurePayHero variant="public"`) | none (static) | Phase 2–4 chapters; hero still had the Phase 3 "Bring the plan" copy |
| Public shell / nav | `features/public/PublicNav.tsx`, `publicShell` | none | Signed-out visitors get the public nav (UR-213 part 1 already fixed) |
| KS001 conversation | `features/agent/*`, `features/conversation/ConversationSurface.tsx` | `/api/agent/**` (Layer 2, UR-221) | Anonymous-first with a possession secret in `sessionStorage` (`securepay.agent.anonymous.v1`) |
| Sources | `features/sources/*` | agent sources API | Upload / paste / link / place; provider `none` receives but does not understand (UR-212) |
| Auth | `features/public/signInFlow.ts`, `RuntimeApp` session | `/api/v1/auth/**` | Password + OTP/MFA; refresh via `withSessionRefresh` |
| Trust Project (individual) | `features/join/*`, `TrustProjectSection` | `/api/v1/community/membership/me|join` | 4A direct Join |
| Business capacity | `features/business/*` | ADR-0022/0023 (`/business`, `/community/membership/business/{ks}`) | 4B/4C |
| Organization capacity | `features/business/*` (shared acting-as group) | ADR-0024 (`/organization`, `/community/membership/organization/{ks}`) | 4D |
| Community | `features/community/*`, `CommunityHome`, `CommunityObjectDetail` | community + discovery + public store search | LIVE feed / Circles are membership-gated; Store offers appear as references |
| Store | `StoreHome`, `OfferDetail`, `OfferToTradeHandoff`, `offerTradeSnapshot.ts` | public store + agent handoff | "Use this" starts KS001 with provenance |
| Agreements | `AgreementHub`, `features/invitations/*` | agreement core | Invitation by KS Number preview then issue |
| Account | `features/account/*` | auth, subscription, logout-all | Businesses & Organizations link |
| Fixture/demo app | `src/App.tsx`, `demoData`, `storeData`, `moneyData`, … | none | Lazy-loaded only when `import.meta.env.DEV && VITE_SECUREPAY_MODE === 'fixture'`; `runtimeMode` throws for fixture in production |

## 3. Convergence matrix

| Concept | Home | KS001 | Trust Project / Join | Community | Store | Agreements | Account | Converged? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Promise ("Tell SecurePay what you're trying to make happen") | Hero h1 (**fixed**) | Composer is the same promise | — | — | Handoff says "Talk it through with KS001" (**fixed**) | Empty state points back to Home (**fixed**) | — | Yes |
| Nothing is agreed until reviewed and confirmed | Trust line | Review gate | "Joining isn't an agreement" | Need/offer line (**fixed**, plain) | Handoff "Nothing is agreed yet." (**fixed**) | Hub empty state | — | Yes |
| Who belongs | People, businesses **and organizations** (**fixed**) | — | Join intro (**fixed**) | Header (**fixed**) | "People and businesses keep a Store" (true: Organizations have no Store, UR-235) | — | "Businesses and Organizations you act for" (**fixed**) | Yes |
| Plug / Master are individual people | Capacities chapter (**fixed** to add that businesses and organizations belong as Members) | — | — | — | — | — | — | Yes |
| Who you trade with | — | — | — | Store reference "Offers and prices always come from the Store itself." | "Who you would agree with" = the seller of record, never the showcasing Store (**fixed**) | Business KS cannot be invited (**UI fail-closed**, UR-231) | — | Yes (UI); backend gap recorded |
| Acting capacity | — | — | Named in identity line, acceptance and button (4C/4D) | — | — | Individual only | One acting-as group | Yes |
| Doctrine notation ("≠") | — | — | — | removed | removed | — | — | Yes in runtime; remains only in the DEV-only fixture app |

## 4. Customer-journey map (as it actually works now)

1. **Arrive signed out.** The public Home leads with "Tell SecurePay what you're trying to make happen." The composer is the first input. No KS Number is needed to start.
2. **Talk to KS001 anonymously.** The conversation is held by a possession secret in this tab only. Pasted text and uploads become source cards. *Understanding depends on the model (NOT VERIFIED here).*
3. **Sign up or sign in.** The same conversation is carried and claimed into the account. Nothing becomes a membership or an agreement by signing in.
4. **Join The Trust Project** (optional, explicit) after reading the 12 Principles. Membership is independent of any agreement or money.
5. **Act for a Business or an Organization** (Account → Businesses & Organizations). Each is its own KS Number. Joining for it is a separate, explicit Join. SecurePay re-checks authority on every step.
6. **Discover.** Community (LIVE feed and Circles for members) and the Store. A Store offer in Community is a reference; opening it goes to the Store's own current details.
7. **Use this.** Starting from a Store offer opens KS001 with a provenance chip ("STARTED FROM SecurePay Store · {offer} · {KS}"). The trade handoff names who you would agree with.
8. **Agreement.** Only after review and explicit confirmation. Invitations go to people, by their own KS Number. A Business or Organization KS cannot be invited (UR-231).
9. **Leave.** Signing out, or "sign out everywhere", ends this session in this tab and starts a fresh, empty conversation.

## 5. Capability matrix

| Capability | Individual | Business (acting for) | Organization (acting for) |
| --- | --- | --- | --- |
| Own KS Number | Yes | Yes (ADR-0022) | Yes (ADR-0024) |
| Sign in | Yes | Never (humans represent it) | Never |
| Trust Project Join | Yes (4A) | Yes, explicit, administrator only (4C) | Yes, explicit, administrator only (4D) |
| Store | Yes, where eligible | Yes, where eligible | **Not available** (UR-235) |
| Agreement participant | Yes | **Not available.** The UI fails closed; the backend still issues (UR-231) | **Not available.** Backend and UI both refuse (4D firewall) |
| Governance / members / succession | — | Founder only (UR-225) | Founder only (UR-230) |
| Money / accounts / Payment Ready | Existing flows | Not through this capacity | Not available (UR-234) |
| Claim a pre-existing identity | — | Not available (UR-224) | Not available (UR-229) |

## 6. Copy audit

Read as a customer, for accuracy, warmth, brevity, authority safety and Quiet Trust.

| Where | Before | After | Why |
| --- | --- | --- | --- |
| Hero h1 | "Bring the plan. Leave with an agreement." | "Tell SecurePay what you’re trying to make happen." | Human decision (2026-09-28). The old line promised an agreement as the outcome of every visit |
| Hero support | "…paste what you already have, or give KS001 a document or photo…" | "It helps you bring the people, plans and agreements together so everyone knows what happens next — and money can follow what was agreed." | Same decision; shorter; "money follows the agreement" doctrine |
| Trust line (signed in) | "Start without a KS Number. …" | "Nothing becomes an agreement until you review and confirm it." | A signed-in person already has a KS Number; the public Home keeps the full line |
| `<title>` | old headline | "SecurePay — Tell SecurePay what you’re trying to make happen" | Consistency |
| Belonging (Home, Join, publicContent, Community, Trust Project section) | "People and businesses…" / "A community of people…" | "People, businesses and organizations…" | Organizations exist since 4D (ADR-0024) |
| Capacities | — | "Plugs and Masters are individual people. Businesses and organizations belong as Members, and can work with Plugs and Masters." | Truthful to the backend: Plug/Master are individual capacities |
| Store trade handoff | Claimed "Business KS identity — authoritative" for an INDIVIDUAL seller; "≠" notation | "Who you would agree with", "Offered by", "Nothing is agreed yet. These details come from the offer — you can change them before anything is confirmed." | False claim removed; internal notation removed |
| Offer detail | "≠" and jargon | "{store} only shows this offer. If you go ahead, you agree it with {seller}, not {store}." | Plain; the truth about the seller of record |
| Community object detail | Doctrine shorthand | "A need, or an offer to help, isn’t an agreement…", "A work story is shared experience, not a rating." | Plain language |
| Circle / Plug / Offer builder / Trade help | "≠" notation | Plain sentences | Internal notation in a customer surface |
| Agreements empty | Generic filter message when you have none | "You don’t have any agreements yet." plus how one starts | Wrong empty state |
| Account | "Business" only | "Your identity, the Businesses and Organizations you act for, and your security." | 4D capacity |
| Sign out everywhere | Stayed signed in on this device | "You’ve been signed out everywhere, including here." | Truth + state |
| Invite a Business KS | Looked invitable | "…is a Business. Businesses can’t take part in agreements on SecurePay yet — invite the person you’re dealing with, using their own KS Number. Nothing was sent." | UR-231 fail-closed |

Retained, checked true: "People and businesses keep a Store…" (Organizations cannot own a Store, UR-235).

## 7. Authority audit

- **No new authority was created in the UI.** Every capacity, Join and invitation still comes from the backend. The UI never nominates a represented identity.
- **Business invitation (UR-231).** Live: the backend preview for a BUSINESS KS returned 200 (`identityType: BUSINESS`) and issuance returned 201, creating an invitation nobody can accept. Phase 5 makes the UI fail closed: the preview state is `not-a-person` and `issue()` sends nothing. The backend change (refuse like the 4D Organization firewall) is an Agreement-authority change and is **deferred to UR-231** rather than done silently (§50/§57).
- **Organization invitation (J15).** Live: preview 404, issue 422, nothing written. It passes.
- **Session authority (API, fixed).** See §10 A1–A2. These are changes to an authentication security control, so **human review is required before merge**.
- **Sign-out.** Session end now also ends the in-tab conversation (privacy), and "sign out everywhere" clears this device's session.

## 8. Source / provenance audit

| Source | Provenance shown | Verified |
| --- | --- | --- |
| Store offer → Use this | Chip "STARTED FROM SecurePay Store · Bathroom plumbing repair · KS012" | Verified live (J13) |
| Store offer in Community | Reference card; detail says "Offers and prices always come from the Store itself." Opening it no longer fetches (it used to 400 with "SecurePay request failed") | Verified live (J11) after the fix; pinned by test |
| Pasted text | Source card; failure states are truthful | Verified live, including prompt injection (§12) |
| Community LIVE object | Real object detail from the feed | Code/test only this phase (4A/Phase 6 evidence) |
| Understanding of any source | — | **NOT VERIFIED** (model unavailable; UR-212) |

## 9. Dead-end register

| # | Entry point | Expectation | What happened | Severity | Safe to fix in Phase 5? | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| DE1 | Community → Store offer card | See the offer | 400 "SecurePay request failed" | P2 | Yes | **Fixed.** Reference opens locally; the link goes to the Store |
| DE2 | Agreement → invite a Business KS | Business can join the agreement | Invitation issued; nobody can ever accept it | P1 | UI only | **Fail-closed in UI**; backend deferred to **UR-231** |
| DE3 | Join page while signed in | "You are joining as {me}" | Name missing until another page loaded capacity | P3 | Yes | **Fixed** (Join page loads capacity) |
| DE4 | Account → Sign out everywhere | Signed out here too | Stayed signed in with a dead session | P2 | Yes | **Fixed** |
| DE5 | Session expiry / refresh | Stay signed in | Every refresh returned 500, so every session ended when its access token expired | P1 | Yes (API defect) | **Fixed** (API A1/A2, **UR-236**); human review |
| DE6 | Sign out, then the next visitor in the same tab | Fresh start | Previous signed-in conversation still open | P1 privacy | Yes | **Fixed** |
| DE7 | Store → Use this → Continue → Review (provider `none`) | Review becomes ready | Item never set, so Review is never ready | — | No (model-dependent) | **NOT VERIFIED**; production forbids provider `none`; **UR-238** |
| DE8 | Agreements (none yet) | Know how to start | Filter-style empty message | P3 | Yes | **Fixed** |
| DE9 | Nav activation (keyboard) | Focus lands in the new view | Focus falls to `<body>` | P3 a11y | Partly | **Observed, not fixed**; **UR-237** |

## 10. Fixes made

**API (SecurePayAPI) — authentication; human review required.**
- **A1** `JdbcRefreshTokenRepository.rotate`. The code pointed the old token's `replaced_by_token_id` at a replacement not yet inserted. The FK is non-deferrable, so every refresh failed with 500. Now it inserts the replacement first, then marks the old one ROTATED. If the guarded update loses a race, it deletes the just-inserted ACTIVE replacement and returns false.
- **A2** `DefaultRefreshAuthenticationSessionService`. On replay of a rotated token, the session compromise was written in the transaction that then threw. It was rolled back, so the session stayed usable. The compromise now commits in its own `REQUIRES_NEW` transaction before the failure. The old constructor is kept.
- `SessionRefreshIntegrationTest` (real PostgreSQL, 3 tests):
  - with both fixes: 3/3;
  - without A1: 2 fail;
  - without A2: 1 fails.

**UI (SecurepayLLM).**
- Copy: §6.
- Store-reference open without fetch (`community/controller.ts`).
- Business invite fail-closed (`invitations/controller.ts`, `InvitePanel.tsx`).
- Seller-of-record truth (`offerTradeSnapshot.ts`, `OfferToTradeHandoff.tsx`, `OfferDetail.tsx`).
- Sign-out conversation reset and logout-all session clear (`AgentExperience.tsx`, `account/controller.ts`).
- Join page loads the acting capacity.
- Composer focus after starting from Home, deferred to the next frame.
- `businessGateway` session-refresh for `mine` and `representation` (`RuntimeApp.tsx`).
- 44px targets: `dna/Button`, hero chips, composer Send and textarea, Community, Store, Agreements, Notifications, Account, Workspace and Source-card controls.

## 11. Intentionally retained limitations

- Business/Organization Agreement participation (UR-231), Organization governance (UR-230), claims (UR-224/229), finance (UR-234) and surfaces (UR-235) were **not built** (§50).
- Backend still issues invitations to a Business KS (UR-231); only the UI refuses.
- The fixture app (`App.tsx` and its data) keeps demo data and "≠" notation. It is DEV-only and absent from the production bundle (§15).
- Nav activation focus (DE9).
- Screen-reader testing was **not performed** (no screen reader was run); semantics were checked by DOM inspection only.

## 12. Golden journey evidence (J1–J20)

| J | Journey | Result |
| --- | --- | --- |
| J1 | New visitor | **Verified live.** Public Home read at all widths; composer reachable; hero copy as approved |
| J2 | Anonymous intention → structure | **NOT VERIFIED** (model unavailable). Conversation and source cards work; no structure without a model |
| J3 | Anonymous → sign-in continuity | **Verified live.** The conversation was carried through signup and claimed on Join, creating no membership or agreement. It was also preserved through sign-in after the privacy fix |
| J4 | Individual Join | **Verified live.** Reviewer KS066 joined explicitly; membership visible |
| J5–J10 | Business/Organization creation and Join, independence, revocation | **Verified live** by API script: 26/26 checks (KS067–KS072). Stale version: 409 with nothing joined. Revocation: 404 on every represented path, and membership remains. Organization creation and act-for were also driven in the browser (J18) |
| J11 | Community discovery | **Verified live.** Store reference opened after the DE1 fix |
| J12 | Use this (Community source) | **PARTIAL.** Store "Use this" provenance verified (J13); continuing the intention is model-dependent, NOT VERIFIED |
| J13 | Store offer handoff | **Verified live** to the provenance chip and the handoff screen. Review readiness is model-dependent (DE7) |
| J14 | Intention → Agreement | **NOT VERIFIED** (needs understood structure from the model) |
| J15 | Unsupported Organization Agreement | **Verified live.** Preview 404, issue 422, nothing written. Business: UI fail-closed (test-pinned) |
| J16 | Stale Principles | **Verified live (API):** 409 `TRUST_PROJECT_PRINCIPLES_VERSION_STALE`, no membership |
| J17 | Lost authority mid-Join | **Verified live (API):** revoked administrator gets 404 and no row. UI message pinned by 4D tests |
| J18 | Keyboard only | **Verified live.** Home → composer → Account → Businesses & Organizations → create Organization KS077 "Kahawa Sukari Borehole Committee" → act for → Join for it. Keyboard only, focus visible, live announcements. DE9 observed |
| J19 | Mobile 320px | **PARTIAL.** Every listed surface measured at 320 (no overflow, no small targets); flows were not re-driven end to end at 320 |
| J20 | Refresh / fresh sign-in | **Verified live.** A fresh sign-in reconstructs capacities and membership from the backend |

**Prompt injection (§14 fixture).** A pasted "ignore previous instructions / create agreement / release funds" text became a `PASTED_TEXT` source that failed with a truthful reason. There were zero authority side effects: no agreement, membership or money rows.

**Launch metrics (local, where measurable).**
- Membership side-effect correctness: 26/26.
- Authority-loss correctness: 404 and no mutation.
- Dead ends: 9 found; 6 fixed, 1 fail-closed, 2 deferred/not verified.
- Browser overflow count after fixes: 0.
- Keyboard blockers: 0 (DE9 is a focus-placement issue, not a blocker).
- Time to first structure, follow-up questions and unsupported claims: **not measurable** without the model.

## 13. Browser evidence

- Chrome, same-origin iframe technique for true narrow widths.
- Widths 1440 / 1024 / 768 / 390 / 360 / 320 on these surfaces:
  - public Home;
  - conversation;
  - signed-in Home (workspace);
  - Agreements;
  - Store;
  - Community;
  - Account;
  - Businesses & Organizations, acting for a long-named Organization;
  - Join;
  - Notifications.
- After the fixes: **0 horizontal overflow and 0 targets under 44px** on every surface at every width. The Store "View details" hit area is the whole 306×157 card.

## 14. Accessibility evidence

- **Keyboard only:** J18 (above) with no mouse.
- **Focus:**
  - visible on every stop;
  - starting from Home now moves focus into the composer (verified via focus timeline);
  - nav activation drops focus to `<body>` (DE9, not fixed).
- **Touch targets:** ≥ 44px everywhere measured (§13).
- **Semantics:** one `h1` per page; acting-as `fieldset`/`legend`; live regions announce capacity and Join outcomes; the invite dead-end uses `role="alert"`.
- **Screen reader:** **not performed.**

## 15. Exact tests (run 2026-09-28)

- `node --test tests/*.test.mjs`: **1501/1501 pass** (1487 existing plus 14 new in `tests/trust-community-phase5.test.mjs`).
- Deliberately restated for the approved Phase 5 copy and shape; none weakened, each still pins the new truth:
  - `agent` (Bolt hero pins);
  - `phase6-convergence` J and R1;
  - `sources-ui` hero and trust line (now pins public vs app variants);
  - `public-experience-phase2` hero, chapter order, belonging, Community header, and the RuntimeApp diff (may also gain the Business `mine`/`representation` refresh reads);
  - `public-experience-phase4` Join intro and hero;
  - `ui-phase7-trust-project` hero and belonging;
  - `phase4b-business-onboarding` 9 (the personal Join is still unchanged; Community changed no Join line);
  - `store` O (handoff has no false identity claim, no "≠", plain CTA).
- `npm run typecheck`: clean.
- `npm run lint`: 0 errors, 7 warnings (the pre-existing baseline).
- `npm run build`: clean.
- **Production bundle audit:** none of the sampled fixture strings are present (`Peter Mwangi`, `Peter_Quote_Sept.pdf`, `Bathroom_photo_1.jpg`, `Agreement_v2.pdf`), and neither are "≠", "Business KS identity — authoritative" or "Bring the plan. Leave with an agreement." The new headline is present.

## 16. Unresolved items

These are recorded in the SecurePayAPI register.
- **UR-213 RESOLVED** with evidence:
  - public nav verified live;
  - no "Sign in through 'Review this'" notice remains in runtime code;
  - "Activate SecurePay" appears only in the signed-in app hero, Account and Activation;
  - public signup was verified live in J3.
- **UR-231** is updated with the Phase 5 live Business-invitation finding and the UI fail-closed; it stays OPEN.
- **UR-236 RESOLVED** (refresh 500 and replay rollback fixed; human review before merge). **UR-237 OPEN** (nav focus). **UR-238 OPEN** (KS001 live verification pending a real model).
- UR-202, UR-224, UR-225, UR-226, UR-228, UR-229, UR-230, UR-232, UR-233, UR-234 and UR-235 are unchanged. UR-212 is unchanged and remains the reason KS001 understanding is not verified.

## 17. Final launch classification

Two kinds of work stand between this and launch.

- **Code convergence:** complete for everything Phase 5 may fix.
- **Launch verification: BLOCKED** on one environmental dependency. KS001 understanding (J2, J12 continuation, J13 review readiness, J14 Agreement) could not be run without a working model key, and production forbids provider `none`. Until those journeys are run with the real model, the exit gate items "KS001 is coherent" and "Agreement handoff is truthful" cannot be certified.
- Also required: **human review before merge** for the API authentication fixes (A1/A2), and a product decision on UR-231 before a Business can take part in agreements.
