# UI Agent Capability Convergence — Phase 4

**Status:** Current architectural decision. Branch `feat/agent-capability-convergence-phase4`, based on
`main` @ `a889c8144f139998569d737872945785a4d4a46f`. Depends on the companion SecurePayAPI draft PR
(`fix/agent-trade-context-convergence-phase4`, stacked on Phases 1–3) — the new `/structured-inputs` and
`/identity-selections` endpoints this PR calls do not exist before that PR merges. Includes a subsequent
review-correction pass (generic detail display/editing, date-range UI, GPS-only submission, PERSON/
ORGANIZATION choice) — see "Review correction" below.

## What this frontend consumes — and does not define

This application is a consumer of SecurePay's **First-Party Agent Experience API**
(`/api/agent/conversations/{id}/...`) — SecurePay's own conversational/instrument integration boundary, kept
network-reachable for this frontend but never registered as, or described as, SecurePay's external
**Public Developer API** (`contracts/openapi/securepay-api-v1.yaml`). Nothing in this repository defines,
extends, or stands in for that public developer contract: the DTOs in `src/api/securepay/agent/dto.ts`
(`StructuredInputRequest`, `KsIdentitySelectionRequest`, ...) are this frontend's own bounded mirror of the
Agent Experience API's request/response shapes, not a public schema, and a third-party integrator building
against SecurePay would never need to know them. `attributeChanges: Record<string, string>`
(`CORRECT_ENTITY_DETAIL`) is likewise an internal/first-party mechanism only — this app never treats it as,
or advertises it as, a public primitive. See the companion SecurePayAPI PR's own
`docs/architecture/AGENT_CAPABILITY_CONVERGENCE_PHASE4.md` for the full three-layer classification (Public
Developer API / First-Party Agent Experience API / Internal Trade Context Domain).

## The locked principle this phase implements

Before this phase, every Interaction Instrument (Who/When/Money/Where) finished by constructing a
synthetic natural-language sentence (`statementFor`) and sending it through the ordinary conversational
`submitTurn` path — exactly as if the person had typed it. That was a necessary workaround for the old
free-text interpreter's own grammar limits (one-word names, KES-only, one-word places, a single date, no
KS check). It is retired here.

**After this phase:** an instrument selection or a direct UNDERSTOOD edit is an EXPLICIT, user-originated
STRUCTURED ACTION — `POST /api/agent/conversations/{id}/structured-inputs` (a closed, typed vocabulary:
`ADD_PARTICIPANT_CANDIDATE`, `CORRECT_ENTITY_DETAIL`, `ASSIGN_ROLE`, `SET_AMOUNT`, `SET_DATE`,
`SET_DATE_RANGE`, `SET_LOCATION`) or, for a real KS Number, `POST /api/agent/conversations/{id}/identity-selections`
— never a fabricated chat sentence. Both are idempotent on a client-controlled `clientActionId`, version-
checked against the real `TradeContext.version()`, and never append a synthetic `ConversationTurn`.

## Archaeology — what already existed, real vs. mock

- **Two parallel frontends exist.** The REAL runtime (`src/main.tsx` → `RuntimeApp.tsx` → `AgentExperience`)
  is fully wired to the real SecurePayAPI. A legacy Bolt fixture app (`src/App.tsx`, `mockAgent.ts`,
  `ConversationWorkspace.tsx`, `ContextPanel.tsx`, `SourceToTradeHandoff.tsx`) is reachable ONLY under an
  explicit `VITE_SECUREPAY_MODE=fixture` dev build — `.env.local`/`.env.example` both default to `real`.
  `PhotoUpload.tsx` and `MapCard.tsx` are used exclusively by that legacy path — **dead code from the real
  app's perspective**, confirmed by the fact the real `AgentExperience` tree renders an honest
  `UNAVAILABLE_INPUT` note for `PHOTO_UPLOAD` instead.
- **Real structured (non-sentence) endpoints already existed** for `adoptFact`, `submitAmount`/`submitDate`
  (external-fact intake from a quotation/document/Store listing), and `selectCommercialSource` — but none
  of them fit "edit THIS exact existing entity/relationship, with no fabricated turn," which is what
  UNDERSTOOD editing needed. This phase's new endpoints fill that specific gap; the pre-existing ones are
  unchanged and still used for their own real purpose.
- **`clientTurnId`/`clientActionId`/`idempotencyKey` conventions are mature and consistent repo-wide**
  (caller-generated UUID, reused unchanged on retry) — the new `submitStructuredInput`/`selectKsIdentity`
  methods follow this exact existing convention.
- **UNDERSTOOD rows were already keyed to real Trade Context entity/relationship ids** (`who:${id}`,
  `money:${id}`) — a solid foundation this phase builds real editing on top of, rather than inventing.
- **No real map/geocoding provider is configured anywhere** in this repository (no Mapbox/Leaflet/Google
  Maps dependency, no API key in `.env.example`). `MapCard.tsx` is a pure CSS placeholder with no lat/lng
  in its own type at all, and — see above — dead code from the real app's perspective already.
- **No `navigator.geolocation` usage existed anywhere** before this phase.
- **`PhotoUpload.tsx` had zero backend wiring** (a local `URL.createObjectURL` blob, never uploaded) and,
  again, is dead code from the real app's perspective.

## Acceptance fixtures are not ontology

Every concrete example in this document or in `tests/ui-phase1.test.mjs` — a shoe with `size = 43`, "Ray"
buying from "Maua Shoes" for KES 4,000 — is a TEST FIXTURE, never SecurePay's ontology. There is no
`size`/`shoeSize` field anywhere in this frontend's types, no product-category branching in `model.ts` or
`projection.ts`, and the generic detail editor (`DetailInstrument.tsx`) contains zero per-concept code. The
test suite proves this on purpose with a SECOND, unrelated domain (a painter's `finish`, matte → satin) and a
THIRD (a parcel's `area`, 1 acre → 2 acres) exercising the exact same code path as the shoe fixture. The
capability this frontend ships is "SecurePay can show and let a person correct whatever bounded descriptive
detail an entity already carries," never "shoes have sizes."

## Capability matrix

Four columns, matching the companion SecurePayAPI PR's own layer classification: what the **internal Trade
Context domain** supports, what this **first-party Agent Experience** frontend wires up, whether the
capability is exposed on the **public Developer API**, and the honest status/blocker.

| Capability | Internal domain support | First-party Agent Experience support | Public Developer API exposure | Status/blocker |
| --- | --- | --- | --- | --- |
| Natural conversation | Yes (`/turns`) | Real (`AgentExperience`) | Not exposed in this phase | Complete |
| Generic descriptive details | Yes (`CORRECT_ENTITY_DETAIL`, any bounded attribute) | Yes — generic WHAT-row projection + `DetailInstrument.tsx`, zero per-concept code | Not exposed in this phase | Complete internally/first-party |
| UNDERSTOOD editing | Yes (structured-input targets) | WHO/WHEN(date)/WHEN(range)/WHERE/MONEY/generic-detail rows all directly editable | Not exposed in this phase | Complete |
| Plain participant (person/organization) | Yes | Real, explicit PERSON/ORGANIZATION choice (`WhoInstrument.tsx`) | Not exposed in this phase | Complete |
| KS identity | Yes (`/identity-selections`, Phase 3 port) | Real, exact `KsNumber`-validated lookup + optional association | Not exposed in this phase | Complete |
| Store | Yes | Real (`StoreExperience`, discovery, `selectCommercialSource`) — unchanged | Not this phase's concern | Complete (pre-existing) |
| Money formation value | Yes (bounded decimal grammar, any real ISO-4217 code) | Real; edits target the exact existing row; a brand-new amount uses a real context-wide `SET_AMOUNT` | Not exposed in this phase | Complete |
| Date | Yes (`SET_DATE`) | Real, with optional time; existing `DATE` entities directly editable, exact readback (date+time both verified) | Not exposed in this phase | Complete |
| Time | Yes (`SET_DATE`'s `isoTime`) | `HH:mm` field on the Calendar instrument; no timezone invented | Not exposed in this phase | Complete |
| Date range | Yes (`SET_DATE_RANGE`) | Real range-picker UI (`CalendarInstrument.tsx` range mode) — completed in the review-correction pass | Not exposed in this phase | Complete |
| Location text | Yes (`SET_LOCATION`) | Bounded, free, multi-word text | Not exposed in this phase | Complete |
| GPS | Yes (`SET_LOCATION`'s optional `latitude`/`longitude`) | "Use my current location" via `navigator.geolocation`; GPS-only submission works with no typed place text | Not exposed in this phase | Complete |
| Real map / geocoding | GPS/location data only — no geocoding | No real map; no reverse-geocode | No map capability | Blocked — no map/geocoding provider is configured anywhere in this repository; introducing one is a separate provider decision, out of scope here |
| Photo | No durable pre-agreement media storage | Honest "unavailable" note | Not applicable | Blocked — genuine infrastructure gap on the API side |
| Document | Same missing capability as Photo | Honest "unavailable" note | Not applicable | Blocked — same infrastructure gap |
| Source reference | Yes | Real (`SourceReference`, `SelectedCommercialSourceDto`) — unchanged | Not this phase's concern | Complete (pre-existing) |
| Agreement handoff | Yes, version/digest-based staleness | Unchanged — a structured-input edit advances the SAME `TradeContext.version()` handoff freshness already checks | Not this phase's concern | Complete (pre-existing mechanism, now exercised by a new write path) |

## Provenance and idempotency

Every structured action is server-attributed to a fresh, non-turn-persisted provenance id on the backend
(see the API PR's own architecture note) — the frontend never fabricates a `ConversationTurn` for a UI
selection. `clientActionId` is generated once per submit attempt (`crypto.randomUUID()`) and reused
unchanged across a `retry()` — a network retry can never duplicate the action, mirroring the exact
`clientTurnId` discipline `sendStatement` already established. A changed draft (a genuine edit, not a retry
of the same failed attempt) always gets a fresh `clientActionId` on the next `open()`/reset, so this
frontend never reuses a `clientActionId` for a different semantic action — the exact discipline the
backend's own `structuredInputActionFingerprints` idempotency-key-misuse guard (review correction, Section
19) now also enforces server-side as a regression backstop.

## Stale/concurrent-edit UX

`AgentController#submitStructuredInput`/`#selectKsIdentity` distinguish a `409 AGENT_STRUCTURED_INPUT_STALE_VERSION`
from every other failure: the instrument's draft is never discarded, Trade Context is refreshed
automatically, and the instrument returns to `editing` (not `failed`) with an honest message — the person
can see the current value and deliberately retry, exactly as Part V of the phase mandate requires.

## Review correction — closed in this pass

The following were previously reported as "not built" or as UI-only gaps. The reviewer explicitly rejected
that framing ("do not treat date range UI or generic detail UI as external blockers — they are product work
and must be completed in Phase 4") — they are now real:

1. **Generic UNDERSTOOD detail editor** (`DetailInstrument.tsx`) — a WHAT row's own ordinary attributes are
   now projected as human-readable details (`projectWorkbench`'s `describeEntityDetails`) and directly
   editable via `CORRECT_ENTITY_DETAIL`, generically, with zero per-concept code. Reserved/identity/internal
   keys are excluded from both display and editing.
2. **Date range UI** (`CalendarInstrument.tsx`, range mode) — a real two-click start/end picker wired to the
   real `SET_DATE_RANGE` action, reachable both from an Agent-proposed `DATE_RANGE_PICKER` and from
   UNDERSTOOD editing an existing `DATE_RANGE` entity.
3. **GPS-only submission** — `primaryFor`'s readiness check and `structuredInputFor` both now accept
   coordinates alone with no typed place text (previously blocked at the UI layer even though the model
   already carried the coordinates).
4. **PERSON/ORGANIZATION choice** (`WhoInstrument.tsx`) — a plain candidate name is no longer hard-coded to
   PERSON; the person explicitly chooses "a person" or "a business."
5. **Exact date+time readback** (`verify.ts`) — an instrument no longer closes on date-only match when a
   specific time was also selected.

## What remains (honest, not carried-forward-as-done)

1. **Real map / geocoding.** No provider is configured; none was introduced. Only real, user-shared GPS
   coordinates are supported. This is a genuine external-provider decision, not product work this phase can
   complete on its own.
2. **Durable photo/document storage.** No such infrastructure exists on the API side; the UI continues to
   show an honest "not available yet" note rather than a fake upload. Genuine infrastructure gap.
3. **A live, two-repo browser walkthrough** (desktop/375px/320px) was not performed in this session: the
   real SecurePayAPI backend requires a full Postgres/Redis/Spring Boot stack via Docker Compose, which is
   unavailable in this environment (confirmed in an earlier session). All frontend behavior in this phase
   is instead verified at the unit level (`tests/ui-phase1.test.mjs`, 74 tests) against the real, unmocked
   production component/controller code, plus `typecheck`/`lint`/`build` all passing clean.

Only the map/geocoding provider and durable media storage remain genuine external blockers; both are
explicitly out of this phase's authority to resolve unilaterally (a paid/external provider decision).
