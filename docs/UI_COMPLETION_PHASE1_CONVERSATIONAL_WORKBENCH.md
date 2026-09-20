# UI Completion — Phase 1: The Conversational Workbench

Branch `feat/ui-phase1-conversational-workbench` · UI-only · SecurePayAPI **read-only, not modified** · Not merged, not deployed.

Central idea: **talking to KS001** and **directly refining what SecurePay understands** are two interfaces onto the **same** Trade Context — never two systems.

---

## 1. Capability archaeology matrix

Verified against SecurePayAPI `main` @ `75a490bc` and SecurepayLLM `main` @ `884fb5b`.

| Capability | API support | API authority / limit | Agent can request? | Frontend component existed? | Production adapter (before) | Production action real? | Experience (before) | Phase 1 decision | Later / backend gap |
|---|---|---|---|---|---|---|---|---|---|
| Person / KS pick (`PERSON_PICKER`, `KSNUMBER_PICKER`) | Enum + model-proposable; `data` is an undocumented loose bag | Presentation only; model may not supply people | Yes (safe set) | Bolt `PersonPicker` fixture only | **Dropped** (unknown type → null) | No | Not reachable | **KSFinder instrument**; bridge reads only validated optional hints | Discovery ("find someone") = Store/provider instruments (Phase 2+) |
| KS identity lookup | `GET /api/v1/identities/by-ksnumber/{ks}` (strict `^KS[0-9]{3,}$`, 404 not found, 400 malformed) | Returns the **full identity record** (internal id, sequence, timestamps); no authz visible in controller (Phase42 GAP-24) | n/a | none | none | — | none | Wired via `agent.lookupKsIdentity`; adapter **drops everything but** KS, display name, kind, active | **BACKEND GAP** — no dedicated participant-safe public projection endpoint |
| Date (`DATE_PICKER`, `DATE_RANGE_PICKER`) | Enum + proposable; `POST …/external-facts/date` | External-evidence endpoint: CANDIDATE only, `date` free string ≤40, **no supersession**, source kinds are all external (no "the person said so") | Yes | Bolt `DatePicker` with **hard-coded Oct 2026** | Dropped | Gateway had `submitDate`, never used | Not reachable | **Calendar instrument**, real clock; sends an ordinary statement (see §7) | Structured user-stated fact endpoint (**BACKEND GAP**) |
| Time | No structured pre-Agreement time; `date` is a free string; Agreement calendar/KSCalendar is post-Agreement | — | No | none | none | — | none | Optional time is folded into the same statement | **BACKEND GAP** — structured formation time |
| Amount (`AMOUNT_INPUT`) | Enum + proposable; `POST …/external-facts/amount` (`amount` string, `currency`) | Same external-evidence limits as date; lands CANDIDATE, appended not superseded → two active amounts | Yes | Ad-hoc inputs in Store | Dropped; gateway had `submitAmount` (Store "Use this" only) | Store only | Not reachable | **Amount instrument**, decimal strings only, statement path | Same **BACKEND GAP** as date |
| Location (`LOCATION_PICKER`) | Enum + proposable; `resolve_service_location` tool = place normalisation + listing count | **No geocoder, coordinates, or distance** in the Agent. Lat/long/accuracy/time conditions exist only in Agreement location conditions (`LocationConditionEvaluator`) | Yes | Bolt `LocationPicker` / `MapCard` (artificial map positions) | Dropped | No | Not reachable | **Place-name instrument** (text only, says it is not map-checked); MapCard/LocationPicker unreachable from production | **Later phase**: real GPS/map, blocked on a backend location fact |
| Photo (`PHOTO_UPLOAD`) | Enum + proposable; `POST …/photo-observations` takes an **already-uploaded `mediaRef`** + observations | Raw upload/storage is an explicit backend gap; no formation upload endpoint | Yes | Bolt `PhotoUpload` uses `URL.createObjectURL` (not durable) | Dropped | No | Not reachable | **Not wired.** Honest inline note; blob URLs are never treated as evidence | **BACKEND GAP** — durable formation media upload |
| Document (`DOCUMENT_UPLOAD`) | Enum + proposable | Evidence upload exists only inside Agreement review/obligations (post-Agreement) | Yes | Bolt `DocumentList` fixture | Dropped | No | Not reachable | Honest inline note | **BACKEND GAP** |
| Provider/Store discovery (`PROVIDER_RESULTS`, `PROVIDER_PROFILE`, `PROVIDER_COMPARISON`, `PRICE_CONTEXT`) | Real tools: `search_providers`, `get_provider_profile`, `search_store_listings`, `get_price_context`; tool-derived only | Facts only — no rank/rating/"best match"; model cannot propose these | Via conversation ("show me") | Cards | Already parsed → `DISCOVERY` → FOUND ON SECUREPAY | Read-only | Works | Untouched; the instrument grammar reserves a `discover` slot (WHO → "Find on SecurePay") | Phase 2 |
| Agreement invitation (`/agreements/{id}/invitations`, `/agreement-invitations/{token}`) | Targeted (intended KS) or open; token; expiry; revoke; view; join | Exists **only for an Agreement**; view ≠ join ≠ confirm | No | Recipient flow | Recipient/Handoff features | Yes, post-Agreement | Works | **Not reachable from any instrument** (test-enforced) | WhatsApp delivery is not real → never say "sent" |
| Trade Context read/adopt | `GET …/context`, `POST …/facts/adopt` | Active facts only; CANDIDATE→CONFIRMED only through adopt | — | `TradeContext` accordion | Flattened `facts` list | Adopt real | Accordion of raw type/state text | Workbench projection; **fixed a parse bug** (below) | — |
| Conversational statement | `POST …/turns` | Person's own words; backend correction rules (`explicitCorrection`) | — | Composer | Real | Real | Works | **Every instrument sends exactly one statement** | Conversation tuning (§10) |

### The mismatches that mattered

1. **Every real Trade Context with a role, amount or date was being rejected as "unreadable".** The backend serialises `default-property-inclusion: non_null`, so `objectEntityId` is *omitted* for ROLE / PAYMENT_CONDITION / CONDITION relationships; the production validator required a string. Fixed (optional/null) and covered by a regression test.
2. The Agent's component vocabulary was richer than production rendered: the eight model-proposable input components were silently discarded.
3. The external-fact endpoints are built for **external evidence** (quotation, Store listing…). There is no "person stated this" source kind, and they append rather than supersede. Using them for a person's own edit would mis-attribute provenance and create two competing active amounts (see §7).
4. The KS identity endpoint returns far more than a participant should see.

## 2. Interaction Instrument architecture

`src/features/instruments/`

- **`model.ts`** — the grammar. `InstrumentSpec` (which fact is being settled: `who | when | when-range | money | where`, plus origin), `InstrumentDraft` (in-progress input), pure helpers (decimal-string money, calendar arithmetic with an injected clock), and `statementFor(spec, draft)` — the **only** thing an instrument can produce.
- **`controller.ts`** — one active instrument. State (`active`, `draft`, `phase: editing | sending | failed | unrecorded`) lives **outside components**, so it survives BUILD⇄UNDERSTOOD switching, desktop⇄mobile resize, and recoverable failure.
- **`verify.ts`** — read-back: an instrument closes only if Trade Context really shows the fact. Otherwise `unrecorded` keeps the draft.
- **`ui/InstrumentHost.tsx`** — one presentation, two forms: desktop = anchored panel **portalled into the top of the UNDERSTOOD column** (conversation stays fully visible); mobile = bottom sheet (`dvh`, safe-area, rides above the keyboard via `visualViewport`, focus trap, backdrop, sticky actions). Escape cancels; focus returns to the invoker.
- **`ui/WhoInstrument | CalendarInstrument | MoneyInstrument | WhereInstrument`** — the four instruments; **`ui/InstrumentPrompt`** — the in-chat face of an Agent proposal.

Lifecycle: `open → edit → submit (one statement) → read back → close`; on failure `Retry` (re-sends the same turn/`clientTurnId`, never duplicates) or `Cancel` (withdraws the unsent turn). Extending later = add an `InstrumentKind`, a `statementFor` branch, an `isRecorded` check and a body component.

Agent bridge: `api/securepay/agent/instruments.ts` maps the eight proposable component types → `INSTRUMENT_PROMPT` / `UNAVAILABLE_INPUT`. The type is the whole instruction; only optional hints (`label`, `role`, `currency`, ISO `date`) are read, strictly validated; malformed/unknown components are ignored while the message survives.

## 3. Actionable UNDERSTOOD model

`workbench/projection.ts` projects the **real** entities/relationships into rows. It is not a form: no fixed schema, no "required" slots, no invented "Not set". A row exists only for what the backend holds; the "Add" chips are just instruments that could genuinely be opened.

| Row | Actionable? |
|---|---|
| WHO (person/org) | KSFinder (attach/replace a KS Number; role prefilled from the fact) |
| WHEN (date) | Calendar |
| MONEY | Amount editor **only** for a plain amount+currency fact; contribution plans/recurring stay conversational |
| WHERE | Place-name instrument |
| WHAT, responsibilities, conditions, rules, documents | Read-only |

State shown on a row is the backend's, verbatim (`CANDIDATE` → "Suggested" + the real **Use this** adopt; `CONFIRMED` is never labelled "Confirmed" in this surface). The Agent's `AGREEMENT_PREVIEW` no longer renders a third copy of the same facts — its "still worth settling" lines and disclaimer are kept; it remains as a fallback only if Trade Context is unreadable.

## 4. KSFinder

Type/paste a KS Number (normalised to the backend's strict format; malformed never leaves the browser) → participant-safe card → the person **chooses the role** → "Use KS003 as seller". A KS Number implies no role; no ranking, inference or relationship. Inactive identities (PENDING/SUSPENDED/CLOSED) are described as "not active" and cannot be used. "Don't have a KS Number? Ask KS001 to look on SecurePay" hands off to conversation — **"I know the person" (KSFinder) and "I need to find someone" (SecurePay discovery) are deliberately separate**.

## 5. Registered / unregistered participants

1. KS exists & active → resolved.
2. Valid format, no identity (404) → "This KS Number isn't registered on SecurePay." No person is created; nothing usable.
3. "John is the seller" with no KS → shown as **John · Seller · KS Number not set · Suggested** — candidate understanding, not a participant; tapping opens KSFinder to attach a KS Number (`KS003 is John, a seller in this.`).

## 6. Invitation authority boundary

Untouched and unreachable: `mentioned/resolved → intended counterparty → emerging agreement → review → auth → Agreement → invitation issued → view → join → confirm exact version`. No instrument, workbench or finder source references any invitation, handoff, Agreement, join, confirmation or Money call (asserted by test). No "sent" language exists; "Invitation ready to share" belongs to the Agreement stage once a real invitation exists.

## 7. Date capability — and why statements

The `external-facts/date|amount` endpoints are **external-evidence** intake (verified: `ExternalFactSourceKind` has no user-stated kind; results are CANDIDATE, appended without `supersedesId`). Using them for a person's own edit would (a) mislabel provenance and (b) turn "change 4,000 → 5,000" into two active amounts. The backend's own doctrine for corrections is the conversational path (`RuleBasedAgreementInterpreter` recognises "Correction:" and "5,000, not 4,000"). So each instrument sends **one exact ordinary sentence** through the real Agent turn endpoint — identical authority to typing it, backend-owned supersession, and it appears in the transcript. The external-fact gateway methods remain for genuine external evidence (Store "Use this"). The calendar uses the real clock, opens on an existing/hinted month, marks today, resolves a bare weekday by highlighting the real Fridays ("Which Friday?"), supports range selection and full keyboard navigation. No hard-coded year/month exists (test-enforced).

## 8. Time capability

No structured pre-Agreement time exists (`date` is a free string; KSCalendar is post-Agreement). An optional time is included **inside the same statement** ("…at 3:00 pm"); the UI says SecurePay doesn't store a separate time. **BACKEND GAP.**

## 9. Amount capability

Decimal strings end to end (`parseAmount`, `groupAmount`; verified beyond `MAX_SAFE_INTEGER`), ≤2 decimals, 3-letter currency, live preview, "Tells KS001: …" transparency line, "not a payment" footer. First amount → `The amount is KES 5,000.`; change → `Correction: the amount is KES 5,000, not KES 4,000.` Never Agreement Money, funding or settlement.

## 10. Conversation density

Frontend duplication removed: the mobile accordion copy of understanding, the inline `AGREEMENT_PREVIEW` card, and the third preview in UNDERSTOOD. The KS001 prose itself is untouched. **BACKEND CONVERSATION-TUNING GAP:** if the Agent stays verbose, the fix is the Agent prompt (out of scope); nothing is truncated or rewritten client-side.

## 11. Location findings

Agent location = place normalisation + count of listings mentioning the place; no geocoder/coordinates/distance. Coordinate + accuracy + time conditions exist only in Agreement location conditions. Therefore only a **named place** is honest today, and the instrument says it isn't map-checked. Legacy `MapCard`/`LocationPicker` (artificial positions) are unreachable from production. GPS/map = later phase, needs a backend location fact.

## 12. Store / provider findings

Real, read-only, tool-derived tools exist and already render into FOUND ON SECUREPAY. Phase 1 does not redesign them; the instrument grammar leaves a `discover` kind for WHO → "Find on SecurePay" and "show me" (Phase 2).

## 13. Media findings

Formation has no durable upload; `photo-observations` requires an already-uploaded `mediaRef`; evidence upload is post-Agreement. `PHOTO_UPLOAD`/`DOCUMENT_UPLOAD` therefore render an honest note ("can't be added here yet — describe it in words"), never a dead control. **BACKEND GAP.**

## 14. Frontend component gaps

- Discovery results are still generic label/value rows (Phase 2).
- No dedicated Store/provider instrument.
- `WHAT` isn't directly editable (no safe path).
- Old `TradeContext` component is no longer used in production (kept only because existing tests pin its markup).

## 15. Backend gaps discovered, **not modified**

1. No participant-safe public KS projection endpoint (identity record returns internal id/sequence/timestamps; authz unverified — Phase42 GAP-24).
2. No user-stated fact endpoint / source kind; external-fact endpoints append without supersession.
3. No structured formation time.
4. No durable pre-Agreement photo/document upload.
5. No geocoder/coordinates/distance in the Agent.
6. Agent `data` payloads for proposable components are undocumented loose bags.
7. Conversation verbosity (prompt tuning).

## 16. Components replaced / retired from production paths

- `ConversationWorkspace` → `ConversationSurface` (auto-follow, live region, composer).
- `ContextPanel` → workbench pane. `TradeContext` accordion → `UnderstoodWorkbench`.
- Fixture `DatePicker`, `MapCard`, `LocationPicker`, `PhotoUpload`, `DocumentList` are now referenced **only** by the lazy-loaded fixture `App.tsx` and byte-identity tests; they are unreachable from `RuntimeApp`. They were **not deleted** because those tests lock them; recommend removal in the phase that retires the fixture app.

## 17. Desktop verification (real production app in Chrome, against a scripted local mock of the SecurePay API; harness not committed)

Verified by screenshots: normal conversation; actionable UNDERSTOOD; instrument anchored in the right column; ambiguous "Friday" → real Fridays marked, today (20 Sep 2026) dotted; date submitted → statement appears → UNDERSTOOD updates → instrument closes; KSFinder not-registered (KS404) and found (KS003 → role chosen → row); amount correction 20,000 → 4,000; place; **backend failure → draft kept → Retry succeeds with the same turn**; long reply opens at its first line; sending follows the new message and the thinking indicator; scrolling up while KS001 thinks is respected and **"New reply ↓"** appears; tapping it returns to the latest.
Bugs found *by* this verification and fixed: amount prefill appended instead of replaced; Enter didn't submit the amount form; a failed turn blanked UNDERSTOOD; "still replying" shown during failure; duplicate disclaimer; "not Friday" quoted as a correction.

## 18. Mobile verification

Real app in same-origin iframes at **375px and 320px** (real media queries). Verified: BUILD/UNDERSTOOD tabs + "What SecurePay understands · N" strip; Agent prompt chip; calendar bottom sheet; UNDERSTOOD tab with unresolved John row; KSFinder sheet with prefilled role at 320px; no horizontal scrolling. **Not verified:** a physical on-screen keyboard (the `visualViewport` lift is implemented but only reviewed, not exercised); screen-reader behaviour (labels/roles are asserted in tests, not run through VoiceOver/NVDA).

## 19. Accessibility

Sheet: `role=dialog`, `aria-modal`, labelled, focus trap, Escape, backdrop cancel, initial focus on the working field, focus returns to the invoker. Panel: labelled region. Calendar: `grid` with roving tabindex, arrows/Home/End/PageUp/PageDown, day buttons named with the full date and "today"/weekday candidates, `aria-pressed`. Rows are buttons with `aria-expanded` and descriptive names; state uses text ("Suggested"), not colour alone; ≥44px targets; visible focus rings; conversation is an `aria-live` log; errors are `role=alert`. `prefers-reduced-motion` respected for the jump scroll.

## 20. Test results

New `tests/ui-phase1.test.mjs` — 35 tests (auto-follow model; amount precision; calendar/no hard-coded dates; KS finder; component bridge incl. malformed/unknown/no fixture leakage; Trade Context `objectEntityId` regression; workbench projection and render; instrument lifecycle incl. failure/unrecorded/cancel; controller statement + failed-turn behaviour; no invitation/Agreement/Money reachability).
Two existing tests were updated for intentional changes: `phase6-convergence` Q3 (panel title literal now lives in an `<h2>`) and the agent controller retains last-known context while re-reading (a *failed read* still clears it, as the existing test requires).
Full suite: 22 files, 0 failures. `tsc --noEmit`, `eslint .`, `vite build`: clean.

## 21. Recommendations for Phase 2

1. Discovery instruments: WHO → "Find on SecurePay", provider/Store results as selectable, factual rows feeding the same statement/`selectCommercialSource` path.
2. Ask backend for a user-stated fact endpoint + a participant-safe KS projection, then move instruments off statements.
3. Structured formation time and (separately) real location/GPS once a backend fact exists.
4. Agreement-stage "Invitation ready to share" once WhatsApp delivery is real.
5. Retire the fixture app and its locked components.
