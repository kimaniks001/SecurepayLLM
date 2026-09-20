# UI Completion — Phase 1: The Conversational Workbench

Branch `feat/ui-phase1-conversational-workbench` · UI-only · SecurePayAPI **read-only, not modified** · Not merged, not deployed.

Central idea: **talking to KS001** and **directly refining what SecurePay understands** are two interfaces onto the **same** Trade Context — never two systems.

---

## 1. Capability archaeology matrix

Verified against SecurePayAPI `main` @ `75a490bc` and SecurepayLLM `main` @ `884fb5b`.

| Capability | API support | API authority / limit | Agent can request? | Frontend component existed? | Production adapter (before) | Production action real? | Experience (before) | Phase 1 decision | Later / backend gap |
|---|---|---|---|---|---|---|---|---|---|
| Person (`PERSON_PICKER`) | Enum + model-proposable; `data` is an undocumented loose bag | Presentation only; model may not supply people. Formation reads `<Name> is the <role>` (`NAME_IS_THE_ROLE`, one capitalised word, stoplist) into a PERSON + canonical ROLE; no supersession for an existing person | Yes (safe set) | Bolt `PersonPicker` fixture only | **Dropped** (unknown type → null) | No | Not reachable | **ADD A PERSON** (name + role → `John is the seller.`), first-add only; read-back of the same entity + canonical role. No identity claim, no participant, no invitation | Re-roling an existing person = **BACKEND GAP** (supersession) |
| KS Number picker (`KSNUMBER_PICKER`) | Enum + model-proposable | No participant-safe check/attach path exists (see KS rows) | Yes | none | Dropped | No | Not reachable | **Honest unavailable note, no control** | **BACKEND GAP** |
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

Lifecycle: `open → edit → submit (one statement) → read back → close`. If delivery fails, the state is **uncertain, not "unsent"** (§4a): the choice freezes, `Retry` re-sends the *same* turn (`clientTurnId`), `Check what SecurePay understands` re-reads Trade Context and closes only if the fact is proven, and `Close` closes the instrument without touching the transcript.

Agent bridge: `api/securepay/agent/instruments.ts` maps the eight proposable component types → `INSTRUMENT_PROMPT` / `UNAVAILABLE_INPUT`. The type is the whole instruction; only optional hints (`label`, `role`, `currency`, ISO `date`) are read, strictly validated; malformed/unknown components are ignored while the message survives.

## 3. Actionable UNDERSTOOD model

`workbench/projection.ts` projects the **real** entities/relationships into rows. It is not a form: no fixed schema, no "required" slots, no invented "Not set". A row exists only for what the backend holds; the "Add" chips are just instruments that could genuinely be opened.

| Row | Actionable? |
|---|---|
| WHO (person/org) | **Read-only** when recorded (re-roling can't be proven safe). New people are **added** through "Add a detail → Person" |
| WHEN | Only a **first** date, via the calendar; a recorded date is read-only |
| MONEY | Amount editor **only** for a plain **KES** amount+currency fact; contribution plans/recurring/non-KES stay read-only |
| WHERE | Only a **first** single-word place; a recorded place is read-only |
| WHAT, responsibilities, conditions, rules, documents | Read-only |

State shown on a row is the backend's, verbatim (`CANDIDATE` → "Suggested" + the real **Use this** adopt; `CONFIRMED` is never labelled "Confirmed" in this surface). The Agent's `AGREEMENT_PREVIEW` no longer renders a third copy of the same facts — its "still worth settling" lines and disclaimer are kept; it remains as a fallback only if Trade Context is unreadable.

## 4. WHO: Add a person, and the KS Number route

**Two separate concepts** (no dead-end control): **A. Add a person** and **B. find/resolve by KS Number**.

**A. Add a person (production-enabled).** Name + role → ONE ordinary statement in the exact shape the real interpreter reads: `John is the seller.` (`NAME_IS_THE_ROLE` → `entity.<name>.role` → a PERSON with a canonical ROLE). Accepted: a **first-name single word** (`[A-Z][a-z]{1,30}`, not on the interpreter's name stoplist), a name SecurePay does not already hold, and a role from the closed vocabulary (`roles.ts`, mirroring `RoleVocabulary`; "service provider" is absent because the backend would file it as `OTHER`; contractor/supplier map to `SERVICE_PROVIDER`). **Read-back:** the SAME PERSON entity (named exactly as entered) must hold a ROLE whose canonical role is the chosen word's. Candidate vs confirmed does not change what was recorded. It claims **no** identity resolution, creates **no** participant, attaches **no** KS Number and issues **no** invitation. An existing person is read-only (correction/re-role has no supersession) and is changed in conversation.

**B. KS Number route (unavailable, honestly).** *KS format finding (from source):* platform identity accepts `^KS[0-9]{3,}$` (KS001…KS003); formation (`KSNumberFormatPolicy`, `KS_NUMBER_TOKEN`) accepts **exactly `KS` + 9 digits** and attaches only when exactly one entity is mentioned, so `"KS003 is the seller."` is not read as an identity. *Transport finding:* `GET /api/v1/identities/by-ksnumber/{ks}` returns the full identity record (internal UUID, sequence, status, timestamps), with no visible authorization; dropping fields in the browser is a **UI-safe projection**, not a **safe transport/API projection**. **Production never calls it** (test-enforced). The Agent's `KSNUMBER_PICKER` renders a plain note, not a control. Inside *Add a person*, a secondary "I have a KS Number" disclosure keeps whatever is typed, says SecurePay can't check or attach it from here yet, sends nothing and never gates the primary action. No padding, no frontend-only association. **BACKEND GAP:** a participant-safe KS projection and one KS format across identity and formation.

`isWhoLinked` (KS + same-entity role + canonical role) remains implemented and tested for a future KS-linked path but is **not reachable** in production.

## 4a. Uncertain delivery (client failure ≠ proof of non-delivery)

A timeout, dropped response or 5xx can happen **after** SecurePay committed a turn. Therefore:
- A failed statement is **never erased** from the transcript; the same `clientTurnId` is kept, so `Retry` replays the same turn (the backend deduplicates by `clientTurnId`) and the step is applied at most once.
- The message says SecurePay *could not confirm whether the step completed* (not "failed").
- While an earlier step is unresolved (`pending`), **no different statement is sent**: the instrument's choice is frozen (Retry / Check / Close only) and other instruments show "An earlier step hasn't been confirmed yet".
- `Check what SecurePay understands` re-reads Trade Context; the instrument closes only if the exact fact is proven, otherwise it stays retryable.
- `Close` closes the instrument only. `discardFailedTurn()` was **removed**; a test asserts it no longer exists.
- Regression tests model "POST committed / response lost" with a server that commits then throws a timeout, and assert: transcript kept, same `clientTurnId` retried, applied once, a different statement not sent, Close doesn't erase.

## 4b. Contextual instruments, not an implied form

UNDERSTOOD lists only what SecurePay holds. It no longer shows Who/When/Where/Amount chips just because those sections are absent. One quiet **"Add a detail"** control reveals only the instruments that could really record something *now* (Person always; Date/Place/Amount only while none is recorded). Nothing says a field is required or missing, and an empty context shows just the invitation to talk. Instruments otherwise open from an Agent-proposed component or a row that can safely be refined (today: a plain KES amount). An Agent prompt whose instrument can't record anything gets an honest note instead of a control.

## 5. Registered / unregistered participants

Production **does not check registration** (§4B), so it never shows "registered/not registered" for a typed KS Number and never creates or implies a participant.
- A person added by name + role is shown as **John · Seller · KS Number not set · Suggested/…** — the backend's state, verbatim: a named person with a role, not a verified identity.
- A typed KS Number is kept and explained; nothing is sent.

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

## 18. Mobile verification (final, after the corrections)

Real production app in same-origin iframes at **375px and 320px** (real media queries), against a scripted local mock that now commits a turn and then drops the response. Verified visually / by DOM measurement:
- normal conversation and **auto-follow** (reply and thinking follow; a long reply opens at its first line);
- **deliberate history reading + "New reply ↓"** at 375 — this found the pill was clipped by the taller mobile composer; it is now anchored to the scroll region;
- BUILD ↔ UNDERSTOOD tabs and the "What SecurePay understands · N" strip;
- **Add a detail → Person**: sheet, focus lands in Name, primary disabled until name + role are valid; "I have a KS Number" **unavailable state** with the typed KS kept; person then appears as a read-only row;
- calendar sheet at 375 and 320 (40px day cells, sticky actions, no time field), amount sheet (KES-only, value selected on focus, an unchanged amount is not submittable), place;
- **failure/retry**: "could not confirm whether this step completed", choice frozen, Retry (BUILD banner) replays the same turn with no duplicate bubble, and "Check what SecurePay understands" proved the place and closed the instrument;
- **no horizontal overflow** (document and sheet `scrollWidth ≤ clientWidth`) at 375 and 320.

**Limits, stated plainly:** the sheet's keyboard lift (`visualViewport`) was reviewed and its layout checked with tooling, but a physical/on-screen keyboard was **not** exercised; **no screen reader** (VoiceOver/NVDA/TalkBack) was run — roles/labels are asserted in tests only. At 320px the *existing* SignedOutHome composer sits partly behind the bottom nav; that pre-dates this work and was not changed.

## 19. Accessibility

Sheet: `role=dialog`, `aria-modal`, labelled, focus trap, Escape (closes the instrument only), backdrop close, initial focus on the working field, focus returns to the invoker. Panel: labelled region. Calendar: `grid` with roving tabindex, arrows/Home/End/PageUp/PageDown, day buttons named with the full date (and "today"), `aria-pressed`. Rows are buttons with `aria-expanded` and descriptive names; state uses text ("Suggested"), not colour alone; ≥44px targets; visible focus rings; conversation is an `aria-live` log; errors are `role=alert`. `prefers-reduced-motion` respected for the jump scroll.

## 20. Test results

`tests/ui-phase1.test.mjs` — **53 tests**, including contract tests built from the inspected backend rules (a port of the real interpreter regexes; SecurePayAPI neither modified nor run): KS format incompatibility; **add-a-person** grammar (`John is the seller.` → a named person with a role and nothing else), taken/stoplisted/unknown-role refusals, same-entity + canonical-role read-back (right person/wrong role, role on another entity, PLACE named like a person, candidate vs confirmed); KS route has no send path; amount + currency; single date; time/date-range deferred; real place grammar; **uncertain delivery** (commit-then-lose, same `clientTurnId`, no different statement while unresolved, Close never erases, `discardFailedTurn` gone); contextual "Add a detail" presentation (no chips by default).
Full suite: 22 files, **504 tests, 0 failures**. `tsc --noEmit`, `eslint .`, `vite build`: clean.

## 21. Recommendations for Phase 2

1. Discovery instruments: WHO → "Find on SecurePay", provider/Store results as selectable, factual rows feeding the same statement/`selectCommercialSource` path.
2. Ask backend for: a user-stated fact endpoint with supersession (dates/places/currency), a participant-safe KS projection **and** one KS format across identity and formation, structured time and a date-range fact. Then enable the KSFinder, date/place replacement and range instruments.
3. Structured formation time and (separately) real location/GPS once a backend fact exists.
4. Agreement-stage "Invitation ready to share" once WhatsApp delivery is real.
5. Retire the fixture app and its locked components.
