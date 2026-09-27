# Public Experience Convergence — Phase 3 — Universal KS001 Source Intake & Continuity (UI)

**Status:** Implemented on branch `feat/public-experience-convergence-phase3`. Draft PR. **Not merged. Not deployed.**
**API companion:** SecurePayAPI `docs/PUBLIC_EXPERIENCE_CONVERGENCE_PHASE3_API.md`.

## 1. Anonymous continuity (Slice 3A)

`src/api/securepay/agent/continuity.ts` is the **only** place the browser keeps the conversation possession secret.

- `sessionStorage` only, under one versioned key, `securepay.agent.anonymous.v1` = `{conversationId, secret, anonymousExpiresAt}`. Never `localStorage`, a cookie or the URL.
- If storage is blocked, the record lives in memory for that page only.
- A same-tab reload resumes: `AgentExperience` finds the record, proves it with one context read, then calls `resumeConversation`.
- A new tab has its own `sessionStorage`, so it has no access.
- The record is forgotten:
  - on a claim (`saveBuild`, `adoptHandoff`, and — final hardening — a signed-in `createHandoff` whose response carries the server's `conversationClaimed: true`);
  - on the server's non-leaking `404 AGENT_CONVERSATION_NOT_FOUND`;
  - on expiry, and when a record is malformed;
  - on "Start new conversation".
- **Gateway propagation** (`src/api/securepay/agent/index.ts`) is central. `X-SecurePay-Conversation-Token` is attached only to paths of the conversation the token belongs to, plus its handoff routes. It is never sent to another conversation or to a non-agent route.
- `createConversation` strips the secret before returning, so it never reaches React state.
- The earlier repository invariant "no browser storage anywhere" (`tests/phase6-convergence.test.mjs` C, W4) was narrowed, not removed, to reflect the human decision in the Phase 1 contract §5:
  - exactly one module may use `sessionStorage`, with the one versioned key;
  - `localStorage` stays forbidden everywhere;
  - `AgentExperience` itself still holds no storage-backed state.

### 1.1 Secret lifecycle (final hardening)

| Operation | Claimed on the server? | Token kept? | Token cleared? |
| --- | --- | --- | --- |
| Signed-out `createHandoff` | no (`conversationClaimed: false`) | **yes** — the visitor still needs it to read the conversation and to prove possession when they sign in and adopt | no |
| Signed-in `createHandoff` (auto-claim) | yes: saved build created, digest retired | no | **yes, immediately**, on `conversationClaimed: true` |
| Save for later | yes | no | yes, after success |
| Explicit adopt | yes | no | yes, after success |
| Failed create, save or adopt (wrong or expired token, outage) | no | yes | no. An attempt alone never clears it; only the server's non-leaking conversation 404 does |

- The signal comes from the server's own ownership record. The client never infers it from the handoff status, local session state or a timeout.
- An older server that omits the field is treated as not claimed.

## 2. The one "+" source menu (Slice 3B)

`src/features/sources/ui/SourceMenu.tsx` replaces `AttachSourceMenu` and the Home hero's three intake buttons. The **same component** is used by both Homes (through `SecurePayHero`) and by the conversation.

| Item | Goes to | Notes |
| --- | --- | --- |
| Paste a plan | `BringPlanPanel` | unchanged |
| Document | `DOCUMENT` upload | PDF, Word, text, Markdown, CSV |
| Spreadsheet | `DOCUMENT` upload | **XLSX; values only**, said on the card |
| Photo | `PHOTO` upload | JPEG/PNG |
| Camera | `PHOTO` upload | `capture="environment"`; the same kind as Photo |
| Link | `DeclaredSourcePanel` (link) | kept as text; **SecurePay never opens it**; `type="url"`; client hint for `http(s)://` only |
| Place | `DeclaredSourcePanel` (place) | the person's own words; **no device location** |
| Voice note | — | **hidden.** It renders only if a caller passes `onPickVoiceNote`, and nothing does, because no transcription provider is approved (UR-211). The consent line is ready (`VOICE_NOTE_CONSENT`). |

- Accessibility:
  - the trigger has `aria-haspopup="menu"` and `aria-expanded`; the popover is `role="menu"`;
  - items are `role="menuitem"` and ≥ 44px;
  - Arrow keys, Home and End move focus; Escape closes and returns focus; Tab or a click outside closes;
  - only wired items render, so there are no dead controls.
- Placement: the conversation menu opens **downward**. Live verification found an upward menu clipped at the top of the scrolling panel. At 375px the popover fits the viewport with no horizontal scroll (verified in an iframe).

## 3. Source cards

`SourceCard` now:

- Shows a kind icon: document, spreadsheet, photo, link, place or voice.
- Shows human states: "Received", "Reading this…", "Read — suggestions to check", "Partly read — suggestions to check", or the server's honest failure sentence with **Try again**.
- **Link:** titled by its label, with the address as **plain text (never an anchor)** and "Kept as the link you shared. SecurePay doesn't open links."
- **Place:** titled by the typed words, with "In your words. SecurePay doesn't look up locations."
- **Spreadsheet:** "Values only — formulas and formatting are not read."
- The remove control is now a 44px target.

Remove and retry semantics are unchanged. Presentation helpers live in `src/features/sources/presentation.ts`.

## 4. Copy

- Source failure, UI and API alike: "SecurePay received this, but couldn't read it right now. Nothing from it has been added to this conversation."
- 429: "SecurePay needs a short pause before taking more. Try again in a little while."
- Unavailable kind: "This kind of source isn't available yet."
- Lost conversation: "This conversation is no longer available here. Start a new one to continue."

## 5. Boundaries

- No Phase 4: no Join CTA or `#/join`, no invitation links, no referral, no Business or Organization surfaces.
- No geolocation, EXIF, fetching or speaker identification anywhere in the intake UI (tested).
- The token never appears in a URL, `localStorage` or a query string (tested).

## 6. Tests

`tests/public-experience-phase3.test.mjs` (new) covers:
- the continuity store: versioned key, same-tab reload, new tab, expiry/malformed records, memory fallback, `forget(id)`;
- the gateway: secret stripped, header only to its own conversation and handoffs, never in a URL; 404 forgets while an outage keeps; claim forgets;
- link/place through the controller;
- 429 and unavailable copy;
- the menu's kinds, Voice gating and boundaries.

`tests/sources-ui.test.mjs` adds the `SourceMenu`, `DeclaredSourcePanel` and `SourceCard` (link/place/spreadsheet/touch target) cases.

Updated and pinned: `mobile-viewport`, `ui-phase2`, `public-experience-phase2`, `phase6-convergence`, `sources`.

## 7. Locked review decisions (human, 2026-09-27)

- Legacy window = 0 is approved (UR-216).
- `/api/agent/**` stays a first-party Layer 2 API, outside the public OpenAPI (UR-221).
- Voice notes remain hidden, **capability-blocked with a safe boundary complete** (UR-211).
- Source retention stays open (UR-204). The PRs may merge, but public production promotion of the anonymous funnel is blocked until a retention rule exists and the proxy configuration is verified. See the API doc §10 for the full promotion gates.

## 8. Phase 4 decisions recorded (not implemented)

1. The Sign in page will add "Don't have a KS Number? Get one" → an identity-only signup: "This creates your SecurePay identity. It does not join The Trust Project or any Agreement."
2. Quick Trust Project invitations from Member, Plug and Master (WhatsApp, share sheet, copy link):
   - every link goes to the same Join flow;
   - the context is interest/provenance only and never grants capacity, membership, authority or a referral reward;
   - an invitation is not a referral.

   UR-210: direction confirmed, implementation Phase 4A.
