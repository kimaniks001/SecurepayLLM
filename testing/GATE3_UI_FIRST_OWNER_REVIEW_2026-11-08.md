# Gate 3 UI-first owner review — 8 November 2026

## Purpose

Use the **existing SecurePay UI architecture** to experience and refine the human journey *before* connecting the four-family Agreement API. This is owner-facing UX prototyping, not technical or human acceptance certification.

**Review route (Vercel preview hosts only):**
`#/preview/living-workspace/human-journeys`

**Implementation:** `src/features/living-workspace/HumanJourneysExperience.tsx` mounted from `src/RuntimeApp.tsx` under an exact Vercel-only route guard. Existing `Phase1LivingWorkspacePreview`, its layout, production authentication, Money, Store, Vision, Circle and Community remain unchanged.

### Existing building blocks reused

- Original SecurePay wordmark, colour tokens, three-panel shell classnames, KS001 conversation middle, SecurePay Check right and mobile panel navigation.
- `CompactStoreBrowser` as the left-side Store tool, `StoreMasterpieceLayoutReview` as the deliberate expanded middle Store, and canonical client Store selection helpers `collectOffer`, `selectionToKs001`, `updateSelectedQuantity`, `removeSelected`.
- Store choices remain specific to the currently selected work. **Ask KS001 prepares an unsent draft for the person's explicit Send; it does not auto-send, purchase, place an order, create an Agreement or move Money.**
- Existing sample Store fixtures, with fictional seller identity and clearly labelled no-authority status.

### Five independent sample work items

| Work | Human situation | Future API family |
| --- | --- | --- |
| Home CCTV | One buyer, one seller/installer | SecureLink |
| Shared security light | Several neighbours, one supplier | GroupSecureLink |
| Gate and drainage | One budget, separate contractors | SecureFlow |
| Residents' CCTV | Multiple contributors and providers | GroupSecureFlow |
| Busy day | Store shopping while managing other work | Cross-work isolation |

**Human interaction:** Sample KS001 answers one material question at a time. The right summary gathers proposed details, names people and unconfirmed amounts, displays editable per-milestone responsibility/date/evidence and shows the next unanswered question. "Not sure yet" defers rather than confirms a fact and can be revisited.

**Privacy/continuity:** All five drafts, carts, notes and milestones are stored in browser-tab `sessionStorage` only. Refresh in that tab restores these **sample** records; switching projects cannot merge cart or draft. No private identifiers or media bytes are persisted. Real work requires server-owned saves with identity and version authority.

### Strict preview limits

- KS001 is a clearly labelled **scripted example**, not a connected LLM.
- Photo/document picker records a **filename** only; there is no upload, AI extraction or claim of verified location.
- Milestones are **proposals only**. No completion, consent, independent review or acceptance is performed.
- Twelve Fair Trade principles remain **not examined** until a real version-bound API examination; never invent 12/12 certificates.
- No real stores, payments, Money Ready, escrow transfers, invoices, invitations, legal conclusions or promises of future outcomes.
- No production route or production application layout modified. Do not merge without owner inspection.

### Owner's immediate experience checklist

1. Open the sample route and try home CCTV. Answer a few KS001 questions; watch the right summary update.
2. Open **Tools → Digital Stores**; explore example offers, add an item, View it in the middle, return to KS001. **Review the unsent Store request before manually sending.**
3. Switch to "Gate and drainage". Confirm CCTV details and cart do not appear. Return to CCTV and confirm its own draft and milestones survived.
4. Expand a milestone to adjust its proposed owner, deadline and evidence. Confirm it never claims to be completed.
5. Try shared security light and residents' CCTV scenarios. On mobile use Tools / KS001 / Summary bottom controls.
6. Refresh in the same browser tab. Confirm sample-only data returns, then use Reset samples.

### Later connection to backend, after owner approves UX

Replace the scripted demonstration *inside the existing actual Living Workspace*, not with an alternative production product or agent authority:
- `createAgentGateway` / `submitTurn` → live KS001 conversation and authoritative Trade Context.
- `readAgreementFormation`, `readFairTradeExamination` → current-version right summary and honest twelve-lens examination.
- `uploadSource`, `createPlaceSource` → confirmed server-side photo/document/place provenance and understanding.
- `saveBuild`, `resumeSavedBuild` → identity-scoped work continuity; server-authoritative cross-work isolation.
- Real Store `useOffer`/commercial-source selection → validated seller offer and explicit human review.
- Existing GroupSecureLink, DistributionPlan and Milestone/Obligation controllers → actual party authority and current version milestone evidence and challenge gates.
- Existing read-only Money snapshot and separate, authorized rail ceremony → trustworthy Money readiness, NEVER UI-owned settlement.

**Gate 2 remains open:** Current isolated backend unverified; 22 real technical scenarios not executed. A UI preview does not satisfy Gate 2 or Gate 3 human acceptance. After UX signoff, use the same evidence register, separate identities and controlled no-money test backend.

### Validation

The selected Vercel review project compiles TypeScript, builds Vite, and runs its existing 69 focused UI tests. Five additional bounded structural checks have been added to the same focused suite. Passing these confirms repository structure and build, **not** live backend behavior or uncoached usability. Evidence and owner feedback should determine any subsequent correction prompt.

## Next UX slice: Meeting minutes → three proposals → orange clarification

This is a **scripted sample-minutes demonstration**, not automated reading of user files.

The left **Minutes to Agreement** tool offers fictional Example Estate Works Committee minutes with three independent agenda decisions:
- One shared security light (many contributors, one supplier).
- Gate and drainage repairs (one budget, two separately inspectable contractors).
- A community CCTV project (many contributors and several providers).

**Prepare 3 separate drafts** keeps existing user-typed drafts and Store selections intact. Pressing it again does **not** replace or duplicate previously prepared minutes, corrections or conversations.

The centre has the original KS001 example conversation for the selected draft. Its message identifies the source's known intentions but explains that some WWWWWH details need clarification.

The compact right-hand **Minutes check** displays **orange** only for facts absent from the prewritten source and not yet proposed by the user. Each row opens an inline editor with the question and related principle themes, plus **Discuss with KS001** that *prepares an unsent draft*. Source-backed proposals appear under a separate expandable **Who · What · Where · When · Why · How** audit. An entered correction moves from **Clarify** to **Proposed correction**, not **Verified** or **Accepted**; all twelve Fair Trade principles remain **Not checked**.

The Documents tool still records a selected file's **filename only**. No uploaded PDF/DOCX is parsed, OCR'd, sent to a model, stored on a server, certified fair, or bound into a real Agreement. A real media-to-Agreement workflow requires the isolated SecurePayAPI, provenance, versioned examination, party consent and regulated financial controls.

### Owner's review

Open the same Vercel human-journeys preview, select **Tools → Minutes to Agreement**, reveal the fictional minutes, then choose **Prepare 3 separate drafts**. Visit the right **Minutes check** and open an orange item; save a proposed clarification, watch its open count change, and try **Discuss with KS001**. Switch to another draft, return, and confirm that the previous correction and any unrelated Store cart remain in their own work.

This is a usability prototype and does not advance Gate 2's real E2E case count or Gate 3's independent-participant pass count.
