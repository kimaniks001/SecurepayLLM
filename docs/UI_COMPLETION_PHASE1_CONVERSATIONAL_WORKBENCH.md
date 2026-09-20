# UI Completion — Phase 1: The Conversational Workbench

Branch `feat/ui-phase1-conversational-workbench` · UI-only · SecurePayAPI **read-only, not modified** · Not merged, not deployed.

Central idea: **talking to KS001** and **directly refining what SecurePay understands** are two interfaces onto the **same** Trade Context — never two systems.

---

## 1. Capability archaeology matrix

Verified against SecurePayAPI `main` @ `75a490bc` and SecurepayLLM `main` @ `884fb5b`.

| Capability | API support | API authority / limit | Agent can request? | Frontend component existed? | Production adapter (before) | Production action real? | Experience (before) | Phase 1 decision | Later / backend gap |
|---|---|---|---|---|---|---|---|---|---|
| Person / KS pick (`PERSON_PICKER`, `KSNUMBER_PICKER`) | Enum + model-proposable; `data` is an undocumented loose bag | Presentation only; model may not supply people | Yes (safe set) | Bolt `PersonPicker` fixture only | **Dropped** (unknown type → null) | No | Not reachable | **KSFinder architecture kept; identity resolution and linking OFF** (see §4) | **BACKEND GAP** — see KS rows below |
| KS identity lookup | `GET /api/v1/identities/by-ksnumber/{ks}` | Returns the **full identity record** (internal id, sequence, timestamps, status); no authz visible in controller (Phase42 GAP-24). Dropping fields in the browser is a *UI-safe projection*, **not** a *safe transport/API projection* | n/a | none | none | — | none | **NOT CALLED by production.** No re-archaeology found a participant-safe compatible endpoint (Store public view answers only for traders and proves nothing about registration) | **BACKEND GAP** — participant-safe KS projection |
| KS Number format | Platform: `^KS[0-9]{3,}$`, canonical `KS001…KS003` (`KsNumberParser`/formatter). Formation: `KSNumberFormatPolicy` = `KS` + **exactly 9 digits**; `RuleBasedAgreementInterpreter.KS_NUMBER_TOKEN` = `KS\s?[0-9]{9}`; attaches only when exactly **one** entity is mentioned | A real platform KS (KS003) is a valid identity but **cannot be attached** to Trade Context by `"KS003 is the seller."` | — | — | — | — | — | No workaround: no zero-padding, no frontend-only association | **BACKEND GAP** — aligned KS format/link path |
| Date (`DATE_PICKER`) | Enum + proposable; `POST …/external-facts/date` | External-evidence endpoint: CANDIDATE only, **no supersession**, no user-stated source kind. Formation reads only `D Month YYYY` (`NATURAL_DATE`) and stores an ISO `deadline.value`; a differing second date is appended, never superseded (no correction flag) | Yes | Bolt `DatePicker` with **hard-coded Oct 2026** | Dropped | Gateway had `submitDate`, never used | Not reachable | **Calendar instrument for a FIRST single date only**; sentence proven against the real grammar (§7) | Structured user-stated fact endpoint + date supersession (**BACKEND GAP**) |
| Date range (`DATE_RANGE_PICKER`) | Enum + proposable | Two natural dates both become `deadline.value`; the adapter's flat map keeps the **last** — the start date is lost | Yes | Bolt fixture | Dropped | No | Not reachable | **Deferred: honest "can't hold a range yet" note** (bridge still parses it) | **BACKEND GAP** — date range fact |
| Time | No structured pre-Agreement time; the parser discards a time of day; Agreement calendar/KSCalendar is post-Agreement | — | No | none | none | — | none | **Removed** from the instrument — it could be selected but never read back | **BACKEND GAP** — structured formation time |
| Amount (`AMOUNT_INPUT`) | Enum + proposable; `POST …/external-facts/amount` (`amount` string, `currency`) | External endpoint appends (two active amounts). Conversational path: `extractAmount` always emits `value.currency = KES`; `Correction: … 5,000, not KES 4,000` is masked/flagged and supersedes | Yes | Ad-hoc inputs in Store | Dropped; gateway had `submitAmount` (Store "Use this" only) | Store only | Not reachable | **Amount instrument, KES ONLY**, decimal strings, proven statements; non-KES amounts are read-only | **BACKEND GAP** — arbitrary-currency formation fact |
| Location (`LOCATION_PICKER`) | Enum + proposable; `resolve_service_location` tool = place normalisation + listing count | **No geocoder, coordinates, or distance.** Formation reads a place only as `(in\|at) <[A-Z][a-z]{1,30}>` (one word), creates one PLACE entity per name and never replaces it. "The location is X" is **not** read as a place | Yes | Bolt `LocationPicker` / `MapCard` (artificial positions) | Dropped | No | Not reachable | **Place instrument for a FIRST single-word place only** (`The place is in Kilimani.`), says it is not map-checked; MapCard/LocationPicker unreachable | **Later phase**: place replacement, multi-word places, real GPS/map — backend |
| Photo (`PHOTO_UPLOAD`) | Enum + proposable; `POST …/photo-observations` takes an **already-uploaded `mediaRef`** + observations | Raw upload/storage is an explicit backend gap; no formation upload endpoint | Yes | Bolt `PhotoUpload` uses `URL.createObjectURL` (not durable) | Dropped | No | Not reachable | **Not wired.** Honest inline note; blob URLs are never treated as evidence | **BACKEND GAP** — durable formation media upload |
| Document (`DOCUMENT_UPLOAD`) | Enum + proposable | Evidence upload exists only inside Agreement review/obligations (post-Agreement) | Yes | Bolt `DocumentList` fixture | Dropped | No | Not reachable | Honest inline note | **BACKEND GAP** |
| Provider/Store discovery (`PROVIDER_RESULTS`, `PROVIDER_PROFILE`, `PROVIDER_COMPARISON`, `PRICE_CONTEXT`) | Real tools: `search_providers`, `get_provider_profile`, `search_store_listings`, `get_price_context`; tool-derived only | Facts only — no rank/rating/"best match"; model cannot propose these | Via conversation ("show me") | Cards | Already parsed → `DISCOVERY` → FOUND ON SECUREPAY | Read-only | Works | Untouched; the instrument grammar reserves a `discover` slot (WHO → "Find on SecurePay") | Phase 2 |
| Agreement invitation (`/agreements/{id}/invitations`, `/agreement-invitations/{token}`) | Targeted (intended KS) or open; token; expiry; revoke; view; join | Exists **only for an Agreement**; view ≠ join ≠ confirm | No | Recipient flow | Recipient/Handoff features | Yes, post-Agreement | Works | **Not reachable from any instrument** (test-enforced) | WhatsApp delivery is not real → never say "sent" |
| Role vocabulary | `RoleVocabulary`: closed single-word map (seller, buyer, landlord, tenant, organizer, lender, borrower, recipient, counterparty, client/customer; contractor/supplier/vendor/fundi/mason… → `SERVICE_PROVIDER`); anything else → `OTHER` + descriptor | "service provider" is **not** in it | — | — | — | — | — | UI vocabulary restricted to words with a known canonical outcome (`api/securepay/agent/roles.ts`); "service provider" removed, "contractor"/"supplier" added | — |
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
- **`ui/WhoInstrument | CalendarInstrument | MoneyInstrument | WhereInstrument`** — the four instruments (WHO in its bounded state); **`ui/InstrumentPrompt`** — the in-chat face of an Agent proposal.

Lifecycle: `open → edit → submit (one statement) → read back → close`; on failure `Retry` (re-sends the same turn/`clientTurnId`, never duplicates) or `Cancel` (withdraws the unsent turn). Extending later = add an `InstrumentKind`, a `statementFor` branch, an `isRecorded` check and a body component.

Agent bridge: `api/securepay/agent/instruments.ts` maps the eight proposable component types → `INSTRUMENT_PROMPT` / `UNAVAILABLE_INPUT`. The type is the whole instruction; only optional hints (`label`, `role`, `currency`, ISO `date`) are read, strictly validated; malformed/unknown components are ignored while the message survives.

## 3. Actionable UNDERSTOOD model

`workbench/projection.ts` projects the **real** entities/relationships into rows. It is not a form: no fixed schema, no "required" slots, no invented "Not set". A row exists only for what the backend holds; the "Add" chips are just instruments that could genuinely be opened.

| Row | Actionable? |
|---|---|
| WHO (person/org) | KSFinder architecture: opens the bounded, honest "can't check or attach a KS Number from here yet" state (no linking in Phase 1) |
| WHEN | Only a **first** date, via the calendar; a recorded date is read-only |
| MONEY | Amount editor **only** for a plain **KES** amount+currency fact; contribution plans/recurring/non-KES stay read-only |
| WHERE | Only a **first** single-word place; a recorded place is read-only |
| WHAT, responsibilities, conditions, rules, documents | Read-only |

State shown on a row is the backend's, verbatim (`CANDIDATE` → "Suggested" + the real **Use this** adopt; `CONFIRMED` is never labelled "Confirmed" in this surface). The Agent's `AGREEMENT_PREVIEW` no longer renders a third copy of the same facts — its "still worth settling" lines and disclaimer are kept; it remains as a fallback only if Trade Context is unreadable.

## 4. KSFinder — safety decision

**KS format finding (from source).** Platform identity accepts `^KS[0-9]{3,}$` and issues `KS001, KS002, KS003…`. The formation path (`KSNumberFormatPolicy`, `RuleBasedAgreementInterpreter.KS_NUMBER_TOKEN`) accepts **exactly `KS` + 9 digits**, and attaches it only when exactly one entity has been mentioned. So KS003 can exist and be looked up, but `"KS003 is the seller."` is not read as an identity by formation. Backend's own doctrine adds that *"a KS Number/contact lookup is not available before authentication"*.

**Transport finding.** `GET /api/v1/identities/by-ksnumber/{ks}` returns internal identity UUID, sequence number, status and timestamps, with no visible authorization. Dropping those fields *in the browser* is a **UI-safe projection**; it is **not** a **safe transport/API projection**. The earlier version of this PR called that endpoint and called the result participant-safe; that was wrong and has been removed. **Production no longer calls it at all** (test-enforced: no source file mentions `api/v1/identities`).

**Decision.** The KSFinder instrument architecture is retained, but resolution and linking are **off**. Opening it (from WHO "Add", an unresolved person row, or an Agent `KSNUMBER_PICKER`) shows the typed number kept in the field, a plain statement that SecurePay can't check it or attach it to this conversation from here yet, and **Back to the conversation**. It never sends anything, never pads a number, never stores an association in frontend state, never claims a match. A number typed and then set aside is kept for when it is reopened. **BACKEND GAP:** a participant-safe KS projection endpoint, and one KS format across identity and formation.

**WHO read-back is still implemented and tested** (`isWhoLinked`) so that a future enablement cannot succeed loosely: the *intended entity* must carry the selected KS, a ROLE relationship must have *that same entity* as subject, and the role must be the **canonical** role of the chosen word. Tested: correct KS + role; correct KS + wrong role; wrong KS + right role elsewhere; same role on another entity; unresolved identity; candidate vs confirmed does not change linkage.

**Role vocabulary.** Labels ≠ backend semantics. UI roles are now only words with a known canonical outcome (`roles.ts`, mirroring `RoleVocabulary`); "service provider" (would be `OTHER`) was removed; contractor/supplier map to `SERVICE_PROVIDER`.

## 5. Registered / unregistered participants

Production **does not check registration** (§4), so it neither shows "registered" nor "not registered" for a typed KS Number, and never creates or implies a person.
- A typed KS Number is kept and explained; nothing is sent.
- "John is the seller" (said in conversation) is shown as **John · Seller · KS Number not set · Suggested** — candidate understanding, not a participant.
- The "Registered / not registered / inactive" states designed for the first version were removed with the lookup; they return only when a participant-safe projection exists.

## 6. Invitation authority boundary

Untouched and unreachable: `mentioned/resolved → intended counterparty → emerging agreement → review → auth → Agreement → invitation issued → view → join → confirm exact version`. No instrument, workbench or finder source references any invitation, handoff, Agreement, join, confirmation or Money call (asserted by test). No "sent" language exists; "Invitation ready to share" belongs to the Agreement stage once a real invitation exists.

## 7. Date capability — and why statements

The `external-facts/date|amount` endpoints are **external-evidence** intake (no user-stated source kind; CANDIDATE; appended, not superseded). Each instrument therefore sends **one exact ordinary sentence** through the real turn endpoint — the same authority as typing it — chosen from the grammar the real interpreter reads (proved in `tests/ui-phase1.test.mjs` against a port of the actual regexes).

- **Offered:** a **first, single** date. `The date is Friday, 25 September 2026.` → `NATURAL_DATE` → ISO `deadline.value`, filed as a **CANDIDATE** (no "by/starting" cue). The row shows "Suggested" and the person's separate explicit **Use this** adopts it — editing is not confirming.
- **Not offered:** changing a recorded date. The parser sets no correction flag for dates, so a second date is *appended beside* the first (a conflict, not a replacement). The recorded date is read-only; the calendar is never offered while one exists (an Agent `DATE_PICKER` then shows a note); changing it stays in conversation.
- **Read-back:** exactly that ISO date must be the active deadline, with no different stale one alongside.
- **Removed:** the weekday-ambiguity ("Which Friday?") marking — formation never stores a bare weekday, so there was no honest source for it.

## 8. Time and date-range capability

**Time — removed.** No structured formation time exists; the parser drops a time of day. The "Time (optional)" field could be selected but never read back, so it is gone. **BACKEND GAP — structured formation time.**

**Date range — deferred.** Start and end both become `deadline.value`; the adapter keeps the last (`flat.put`), so the start is lost. `DATE_RANGE_PICKER` is still parsed by the bridge but renders an honest note ("SecurePay can't hold a range of dates yet — it keeps one date"). **BACKEND GAP — date range fact.**

## 9. Amount capability — KES only

`RuleBasedAgreementInterpreter.extractAmount` emits `value.currency = "KES"` for **every** amount it recognises, and "USD 4,000" is not recognised as money at all. Letting the UI validate three letters would only invite a currency that could not be read back, so the instrument is **KES only**; the currency box is gone. `Correction: the amount is KES 5,000, not KES 4,000.` is proven to resolve to 5,000 (the rejected figure is masked) with the correction flag set, so the backend supersedes. Read-back requires **amount and currency**: `KES 4,000 ≠ USD 4,000`; an amount with the same figure but another currency is not "recorded". A non-KES amount is read-only. A currency-only change cannot occur in the UI (and the statement builder returns nothing for non-KES). **BACKEND GAP — arbitrary-currency formation fact.**

## 10. Conversation density

Frontend duplication removed: the mobile accordion copy of understanding, the inline `AGREEMENT_PREVIEW` card, and the third preview in UNDERSTOOD. The KS001 prose itself is untouched. **BACKEND CONVERSATION-TUNING GAP:** if the Agent stays verbose, the fix is the Agent prompt (out of scope); nothing is truncated or rewritten client-side.

## 11. Location findings

Agent location = place normalisation + count of listings mentioning the place; no geocoder/coordinates/distance. Formation reads a place only as `in|at <one capitalised word>`, creates one PLACE entity **per name** and never replaces one. The earlier sentence `The location is Kilimani.` is **not** read as a place at all (proved). The instrument now sends `The place is in Kilimani.`, accepts **one word** (multi-word entries would be truncated to the first word by the parser, so they are refused with an explanation; stopword-listed words such as days/months are refused), and is offered only for a **first** place. Read-back: the selected place must be the only active PLACE — `Westlands → Kilimani` would leave both, which is a conflict and never closes. A recorded place is read-only; correction is conversation. GPS/map remain a later phase needing a backend fact.

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

1. No participant-safe public KS projection endpoint (identity record returns internal id/sequence/timestamps; authz unverified — Phase42 GAP-24), and **KS formats disagree** (platform `KS`+3+ digits vs formation `KS`+9 digits, single-entity attach only).
2. No user-stated fact endpoint / source kind; external-fact endpoints append without supersession.
3. No structured formation time, no date range, no date/place supersession, KES-only amounts.
4. No durable pre-Agreement photo/document upload.
5. No geocoder/coordinates/distance in the Agent.
6. Agent `data` payloads for proposable components are undocumented loose bags.
7. Conversation verbosity (prompt tuning).

## 16. Components replaced / retired from production paths

- `ConversationWorkspace` → `ConversationSurface` (auto-follow, live region, composer).
- `ContextPanel` → workbench pane. `TradeContext` accordion → `UnderstoodWorkbench`.
- Fixture `DatePicker`, `MapCard`, `LocationPicker`, `PhotoUpload`, `DocumentList` are now referenced **only** by the lazy-loaded fixture `App.tsx` and byte-identity tests; they are unreachable from `RuntimeApp`. They were **not deleted** because those tests lock them; recommend removal in the phase that retires the fixture app.

## 17. Desktop verification (real production app in Chrome, against a scripted local mock of the SecurePay API; harness not committed)

> **Limits of that evidence.** The mock is not the backend. It concealed real contract problems in the first version of this PR, so the *semantic* certification is now the contract tests in `tests/ui-phase1.test.mjs`, which port the actual interpreter rules; the screenshots certify layout and interaction only. Re-verified visually after the correction: first date (calendar → statement → "Suggested" row → read-only), bounded KSFinder with the typed KS kept after "Back to the conversation", multi-word place refusal and single-word place, KES-only amount correction via Enter.

Verified by screenshots (first pass, before the correction): normal conversation; actionable UNDERSTOOD; instrument anchored in the right column; real-clock calendar with today dotted; statement appears → UNDERSTOOD updates → instrument closes; amount correction; **backend failure → draft kept → Retry succeeds with the same turn**; long reply opens at its first line; sending follows the new message and the thinking indicator; scrolling up while KS001 thinks is respected and **"New reply ↓"** appears; tapping it returns to the latest.
Bugs found *by* this verification and fixed: amount prefill appended instead of replaced; Enter didn't submit the amount form; a failed turn blanked UNDERSTOOD; "still replying" shown during failure; duplicate disclaimer; "not Friday" quoted as a correction.

## 18. Mobile verification

Real app in same-origin iframes at **375px and 320px** (real media queries). Verified (first pass): BUILD/UNDERSTOOD tabs + "What SecurePay understands · N" strip; Agent prompt chip; calendar bottom sheet; UNDERSTOOD tab with unresolved John row; sheet at 320px; no horizontal scrolling. **Not re-run after the correction:** the mobile sheet layouts for the changed instruments (the components share the same host, but I did not re-screenshot them at 375/320). **Not verified:** a physical on-screen keyboard (the `visualViewport` lift is implemented but only reviewed, not exercised); screen-reader behaviour (labels/roles are asserted in tests, not run through VoiceOver/NVDA).

## 19. Accessibility

Sheet: `role=dialog`, `aria-modal`, labelled, focus trap, Escape, backdrop cancel, initial focus on the working field, focus returns to the invoker. Panel: labelled region. Calendar: `grid` with roving tabindex, arrows/Home/End/PageUp/PageDown, day buttons named with the full date (and "today"), `aria-pressed`. Rows are buttons with `aria-expanded` and descriptive names; state uses text ("Suggested"), not colour alone; ≥44px targets; visible focus rings; conversation is an `aria-live` log; errors are `role=alert`. `prefers-reduced-motion` respected for the jump scroll.

## 20. Test results

`tests/ui-phase1.test.mjs` — **45 tests**, now including **contract tests** built from the *inspected backend rules* (a port of `EXPLICIT_KES_AMOUNT`, `AMOUNT_NOT_AMOUNT_CORRECTION`, `EXPLICIT_CORRECTION`, `NATURAL_DATE`, `PLACE_PREPOSITION`, `KS_NUMBER_TOKEN`, the name stoplist, and the adapter's `flat.put` overwrite; SecurePayAPI is neither modified nor run): KS format incompatibility and no false association; amount + currency (KES→KES ok, KES→USD never closes, same amount wrong currency not recorded); single natural date → one ISO candidate; time cannot be certified (removed); date range cannot be represented (deferred); the real place grammar (old sentence proven *not* a place) and place replacement conflict; WHO association/role read-back (six negative + positive cases incl. the previously wrong buyer/seller fixture); role vocabulary; production never references the identity endpoint.
Two earlier existing-test updates stand (`phase6-convergence` Q3; controller keeps last-known context while re-reading, and now also after a *failed request* — a failed context *read* still clears it).
Full suite: 22 files, **496 tests, 0 failures**. `tsc --noEmit`, `eslint .`, `vite build`: clean.

## 21. Recommendations for Phase 2

1. Discovery instruments: WHO → "Find on SecurePay", provider/Store results as selectable, factual rows feeding the same statement/`selectCommercialSource` path.
2. Ask backend for: a user-stated fact endpoint with supersession (dates/places/currency), a participant-safe KS projection **and** one KS format across identity and formation, structured time and a date-range fact. Then enable the KSFinder, date/place replacement and range instruments.
3. Structured formation time and (separately) real location/GPS once a backend fact exists.
4. Agreement-stage "Invitation ready to share" once WhatsApp delivery is real.
5. Retire the fixture app and its locked components.
