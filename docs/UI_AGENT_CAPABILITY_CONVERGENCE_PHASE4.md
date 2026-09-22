# UI Agent Capability Convergence — Phase 4

**Status:** Current architectural decision. Branch `feat/agent-capability-convergence-phase4`, based on
`main` @ `a889c8144f139998569d737872945785a4d4a46f`. Depends on the companion SecurePayAPI draft PR
(`fix/agent-trade-context-convergence-phase4`, stacked on Phases 1–3) — the new `/structured-inputs` and
`/identity-selections` endpoints this PR calls do not exist before that PR merges.

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

## Capability matrix

| Capability | Existing UI | Existing API | Phase 4 wiring | Final status | Known blocker |
| --- | --- | --- | --- | --- | --- |
| Conversation | Real (`AgentExperience`) | Real (`/turns`) | Unchanged | Complete | — |
| UNDERSTOOD | Real, read-mostly | Real (`/context`) | WHO/WHEN(date)/WHERE/MONEY rows now directly editable via real structured-input targets | Complete for these four; generic non-reserved detail correction (`CORRECT_ENTITY_DETAIL`) wired at the API/gateway level, not yet exposed as its own UI control | A dedicated "edit any ordinary detail" UI affordance (e.g. the shoe's own `size`) is not built — only the four named instruments are |
| Name/person | Real, one-word-only | Real (was sentence-based) | Multi-word names; `ADD_PARTICIPANT_CANDIDATE`/`ASSIGN_ROLE` real structured actions | Complete | — |
| KS identity | UI present, honestly disabled | Did not exist | Real, exact `KsNumber`-validated lookup + optional association via `/identity-selections`, reusing Phase 3's real identity port | Complete | — |
| Store | Real (`StoreExperience`, discovery, `selectCommercialSource`) | Real | Unchanged | Complete (pre-existing) | — |
| Money | Real, KES-only | Real (was sentence-based) | Any real ISO-4217-shaped currency; edits target the exact existing row; a brand-new amount uses a real context-wide `SET_AMOUNT` | Complete | Client-side format check only (`^[A-Z]{3}$`); the real currency-exists check is the backend's `java.util.Currency` |
| Date | Real, single date, no time | Real (was sentence-based) | Real `SET_DATE` structured action with optional time; existing real `DATE` entities directly editable | Complete for single date + time | — |
| Time | Absent | New (`SET_DATE`'s `isoTime`) | `HH:mm` field added to the Calendar instrument; no timezone conversion invented | Complete | — |
| Date range | Absent | New (`SET_DATE_RANGE`), real | Not wired into a UI control in this pass | **Not built** | UI-only gap — the backend action is real and tested; a range-picker UI was out of this pass's time budget |
| Location text | Real, single capitalized word | Real (was sentence-based) | Bounded, free, multi-word text via `SET_LOCATION` | Complete | — |
| GPS | Absent | New (`SET_LOCATION`'s optional `latitude`/`longitude`) | "Use my current location" via `navigator.geolocation`, with explicit permission/denied/unavailable states | Complete | — |
| Real map | Absent (placeholder only) | None | Not attempted | **Blocked** | No map/geocoding provider is configured anywhere in this repository; introducing one was explicitly out of scope for this pass (no paid/external provider silently added) |
| Photo | Honest "unavailable" note | `photo-observations` exists but is `mediaRef`-only (not a binary upload system) | Not attempted | **Blocked** | No durable pre-agreement media/blob/object-storage capability exists on the API side; building one was explicitly out of scope |
| Document | Honest "unavailable" note | None | Not attempted | **Blocked** | Same missing capability as Photo |
| Source reference | Real (`SourceReference`, `SelectedCommercialSourceDto`) | Real | Unchanged | Complete (pre-existing) | — |
| Agreement handoff | Real, version/digest-based staleness | Real | Unchanged — a structured-input edit advances the SAME `TradeContext.version()` handoff freshness already checks, so no new wiring was needed | Complete (pre-existing mechanism now exercised by a new write path) | — |

## Provenance and idempotency

Every structured action is server-attributed to a fresh, non-turn-persisted provenance id on the backend
(see the API PR's own architecture note) — the frontend never fabricates a `ConversationTurn` for a UI
selection. `clientActionId` is generated once per submit attempt (`crypto.randomUUID()`) and reused
unchanged across a `retry()` — a network retry can never duplicate the action, mirroring the exact
`clientTurnId` discipline `sendStatement` already established.

## Stale/concurrent-edit UX

`AgentController#submitStructuredInput`/`#selectKsIdentity` distinguish a `409 AGENT_STRUCTURED_INPUT_STALE_VERSION`
from every other failure: the instrument's draft is never discarded, Trade Context is refreshed
automatically, and the instrument returns to `editing` (not `failed`) with an honest message — the person
can see the current value and deliberately retry, exactly as Part V of the phase mandate requires.

## What remains (honest, not carried-forward-as-done)

1. **Date range UI.** The backend `SET_DATE_RANGE` action is real and tested; no range-picker control was
   built in this pass.
2. **Generic UNDERSTOOD detail editor.** `CORRECT_ENTITY_DETAIL` is real and reachable via the gateway; a
   dedicated small "edit this ordinary detail" UI (e.g. the shoe's own `size`) was not built.
3. **Real map / geocoding.** No provider is configured; none was introduced. Only real, user-shared GPS
   coordinates are supported.
4. **Durable photo/document storage.** No such infrastructure exists on the API side; the UI continues to
   show an honest "not available yet" note rather than a fake upload.
5. **A live, two-repo browser walkthrough** (desktop/375px/320px) was not performed in this session: the
   real SecurePayAPI backend requires a full Postgres/Redis/Spring Boot stack via Docker Compose, which is
   unavailable in this environment (confirmed in an earlier session). All frontend behavior in this phase
   is instead verified at the unit level (`tests/ui-phase1.test.mjs`, 59 tests) against the real, unmocked
   production component/controller code, plus `typecheck`/`lint`/`build` all passing clean.

None of the above were silently declared complete; each is a genuine, explicitly scoped gap.
