# SecurePay Human Experience Rebuild — Phase 3 Completion Report

**Phase:** 3 — The Agreement Journey  
**Date:** 2026-10-12  
**Frontend base:** `human-experience/phase2-securepay-shell@9759243bf0f6226903998eb48ec58b7e9d396fda`  
**Branch:** `human-experience/phase3-agreement-journey`  
**PR:** #126 — Human Experience Phase 3 — Agreement Journey  
**PR base:** `human-experience/phase2-securepay-shell` because Phase 2 PR #125 remains unmerged  
**SecurePayAPI:** no repository changes  
**Production:** unchanged  
**Merge:** not performed

## 1. Executive result

Phase 3 makes the Agreement itself the centre of the human journey.

The user no longer has to pass through a sequence of “understanding”, correction, save, identity and navigation screens before they see the thing they came to make. As soon as the server-owned formation contains meaningful material, the live Agreement appears and remains in front while SecurePay asks the next material question.

The reference journey is now:

> **say what you want → see the Agreement taking shape → answer one material question → review the real Agreement → keep it → invite the other person → counterpart reviews the Agreement → changes remain explicit → agreement is recorded → print a useful record**

The implementation remains inside the Phase 2 shell and preserves SecurePay's existing authority boundaries.

## 2. Production files changed

| File | Phase 3 purpose |
|---|---|
| `src/features/formation/AgreementShaping.tsx` | Makes the emerging Agreement the primary artifact from early formation onward |
| `src/features/formation/NextQuestion.tsx` | Presents the one server-owned material question in ordinary human language |
| `src/features/formation/AgreementReview.tsx` | Converts Review into the actual readable/printable Agreement; adds natural correction/no-change handling |
| `src/components/CanonicalAgreement.tsx` | Simplifies canonical Agreement review and moves version/authority/source machinery into Details |
| `src/features/handoff/view.ts` | Human “Keep this Agreement” consequence while preserving DRAFT truth |
| `src/features/handoff/ReviewPreview.tsx` | Keeps the actual Agreement prominent during handoff review |
| `src/features/handoff/HandoffPanel.tsx` | Keeps the person with the Agreement after creation and points naturally to invitation |
| `src/features/invitations/InvitePanel.tsx` | Makes creator invitation explicitly an Agreement invitation, never acceptance |
| `src/components/RecipientReview.tsx` | Makes the public/counterparty doorway the Agreement instead of recipient architecture |
| `src/features/recipient/RecipientExperience.tsx` | Delays identity until consequential participation; preserves exact-version review |
| `src/features/recipient/view.ts` | Human invitation/join/agreement language while retaining version-pinned authority |
| `src/features/amendments/AgreementChangeProposal.tsx` | Adds explicit, version-pinned, idempotent change proposal authoring |
| `src/features/amendments/ChangesPanel.tsx` | Renders current vs suggested change and required human responses without version-control jargon |
| `src/components/AgreementEstablished.tsx` | Gives the agreed state quiet certainty without inventing Money readiness |
| `src/components/AgreementPrintRecord.tsx` | Improves the printable backend-record Agreement |
| `src/api/securepay/agreements/index.ts` | Exposes existing Agreement amendment proposal authority to the frontend gateway |
| `src/api/securepay/agreements/refresh.ts` | Keeps the amendment mutation inside authenticated session-refresh discipline |

No `SecurePayAPI` repository file was changed.

## 3. Old Agreement journey vs Phase 3

### Before

The person could experience the Agreement indirectly:

- an “understood” representation before the Agreement;
- separate correction mode;
- review as another state rather than the artifact;
- identity/save/security gates before sufficient value;
- creation followed by navigation away from the Agreement;
- recipient/invitation architecture rather than the Agreement itself;
- amendment/version language more visible than the human consequence.

### Phase 3

The Agreement appears early under:

> **Your Agreement is taking shape**

The surface shows the real human material — people, work, price, timing, responsibilities and conditions — and explicitly says:

> **Nothing is agreed yet.**

If something materially matters, the Agreement remains visible and the one server-owned question appears below it.

When reviewable, Review becomes a printable Agreement document.

After the draft is kept, the person remains in the Agreement journey and is told that nobody else has agreed yet; the next useful step is to open the same Agreement and invite the other person.

## 4. One material question

Phase 3 does not build a frontend questionnaire.

`AgreementShaping` consumes the backend formation's single `formation.question`, and `NextQuestion` renders its text and choices.

Example visual certification:

> **When should Peter be paid?**

The frontend does not invent a second list of required fields or deterministic question order.

Conflict resolution remains structured and pinned to authoritative formation state; the human copy is now consequence-first (“Which total should we use?” / “Choose what is right”).

## 5. Natural correction

Phase 3 fixes the specific failure that originally sent “nothing, everything is okay” into change-saving mode.

`AgreementReview.meansNoAgreementChange` recognises bounded no-change phrases including:

- nothing
- nothing change
- nothing to change
- no change / no changes
- everything is okay / ok
- all good
- looks good
- it is okay / ok

When such wording is submitted, SecurePay acknowledges:

> **Okay. I haven't changed anything.**

and does **not** send a correction mutation.

Real correction wording such as “make it KES 90,000 instead” remains on the normal correction path, preserving all unaffected Agreement material.

The living Agreement also renders material changes visibly, for example:

> **Changed**  
> Price: KES 95,000 → KES 90,000

## 6. Review is the Agreement

The review surface now has:

- `data-agreement-print`;
- “SecurePay Agreement”;
- “Not agreed yet”;
- actual Agreement sections;
- “Print Agreement”;
- correction through ordinary language;
- server-owned unresolved/open material where applicable;
- version, authority and provenance behind **Agreement details**.

Primary action:

> **Keep this Agreement**

The consequence remains truthful:

> SecurePay keeps a **draft** Agreement. Nobody else has agreed, nothing is funded or paid, and the user remains with the same Agreement after creation.

This changes presentation, not authority.

## 7. Identity and security timing

Phase 3 moves identity to consequential boundaries rather than the beginning of value.

A person can first:

- express the intention;
- see the Agreement;
- answer material formation questions;
- read the Agreement.

If sign-in is required to persist/formalise it, Review explains the value:

> **Keep this Agreement**

and explains that sign-in happens next and returns the person to the same Agreement.

For a recipient, opening the invitation does not join or agree. The public Agreement is visible first. Identity appears only when the person elects to take part.

The identity screen explicitly states that signing in proves who they are and does not silently join, confirm or accept anything.

## 8. Creator invitation

The creator-side invitation is now framed around the Agreement:

> **Invite someone to agree**

The form asks:

> **How should SecurePay send this Agreement?**

and then only asks for the information required by the selected real invitation route.

Creating an invitation:

- does not add a participant;
- does not create agreement;
- does not send automatically;
- preserves idempotent/uncertain-operation recovery;
- distinguishes VIEWED from JOINED;
- keeps the raw bearer token out of normal display.

The resulting state says:

> **Agreement invitation ready**

and makes clear that the other person has not joined or agreed.

## 9. Counterparty experience

The invitation doorway is the Agreement.

The recipient sees:

> **Agreement invitation**  
> James Kimani wants to agree this with you.

followed by the bounded public Agreement facts SecurePay actually returned.

Before identity/join:

> **You have not joined or agreed to anything. Review the Agreement first.**

Joining/taking part is still a separate authority from agreeing.

After joining, SecurePay reads the exact Agreement version and presents it through `CanonicalAgreementCard`.

The final Agreement action is human:

> **I agree to this Agreement**

but remains version-pinned underneath. Its consequence states that the choice:

- is recorded against the exact version;
- covers only this participant;
- must be repeated if the Agreement changes;
- moves no money.

## 10. Changes

Phase 3 provides an explicit human change-proposal route backed by the existing amendment authority.

A proposal carries:

- expected Agreement version ID;
- idempotency key;
- bounded proposed terms;
- safe retry/check behavior for uncertain mutation outcomes.

The current Agreement is never silently edited.

The responder sees:

> **Peter suggested a change**  
> **Nothing has changed yet.**

Then:

> Current: …  
> Suggested: …

and, where the backend says the caller must respond:

> **Looks good**  
> **Keep the current Agreement**

The proposer sees:

> **You suggested a change**

and may take back their suggestion where authoritative.

Change history/version mechanics remain under progressive disclosure.

### Current bounded authoring note

The newly exposed recipient change authoring is intentionally bounded to the Agreement description that the current UI can update without inventing schema semantics. The existing amendment read/response path can display broader backend-provided material changes (including payment-related change records) when those exist. Phase 3 does not fabricate arbitrary field editing in the browser.

## 11. Agreed state

`AgreementEstablishedCard` now uses quiet certainty:

> **Agreed**

followed by the actual Agreement summary.

It does not infer:

- funding;
- Money readiness;
- payment movement;
- completion.

Any next Money action remains governed by existing backend authority outside Phase 3.

## 12. Print

Phase 3 has two complementary print experiences.

### Formation/review print

A person can print the Agreement they are reviewing before it becomes agreed. Screen controls disappear in print media.

### Current Agreement record

`AgreementPrintRecord` is built from `AgreementDetailResponse`, not reconstructed chat text.

It includes, where authoritative:

- SecurePay Agreement identity/reference;
- version;
- status;
- title/purpose/description;
- parties;
- KS Number when returned;
- amount;
- obligations;
- milestones/timing;
- participant record/signature lines;
- record date.

It explicitly says that printing does not create or change anyone's agreement.

No JSON, digest, provider or internal developer state is printed.

## 13. Money boundary

Phase 3 does not redesign Money.

Price/financial terms may appear naturally inside the Agreement, but:

> **Agreement agreed ≠ Money ready**

No new frontend rule infers funding or release authority from agreement status.

All existing Money authority remains untouched.

## 14. Regression changes

Existing authority/security regressions were retained.

Legacy assertions were updated only where they explicitly demanded the human interface Phase 3 replaces, including:

- “Set this up securely” → “Keep this Agreement”;
- “Your agreement is forming” → “Your Agreement is taking shape”;
- old recipient Join/confirmation wording → take-part / Agreement wording;
- old invitation copy → Agreement-invitation copy;
- old amendment “Agree / Reject / Withdraw” wording → “Looks good / Keep current / Take back my suggestion”;
- old amendment-authoring absence assertion → authenticated, version-pinned proposal support.

Important authority tests remain intact:

- invitation opening performs no join/confirmation;
- authentication alone never joins;
- joining never confirms;
- exact version ID/number/hash are sent on confirmation;
- uncertain mutations retry the same idempotency key;
- stale/moved versions fail closed;
- one participant's agreement does not claim everyone agreed;
- no payment authority is introduced.

## 15. Tests

### Dedicated Phase 3 contract

`tests/human-experience-phase3-agreement-journey.test.mjs`

Result:

- **10 / 10 PASS**

It certifies:

1. natural no-change approval;
2. early living Agreement;
3. one server-owned question;
4. actual printable review;
5. creator invitation boundary;
6. counterpart Agreement-first/identity-later path;
7. proposal authority and uncertainty handling;
8. agreed/print Money separation;
9. Phase 2 one-plane shell remains intact;
10. print CSS.

### Focused Agreement regression set

Result:

- **215 / 215 PASS**

### Full frontend convergence

Command:

`npm run test:final-convergence`

Result:

- tests: **1,917**
- pass: **1,917**
- fail: **0**

### Build gates

- `npm run typecheck` — PASS
- `npm run lint` — PASS with existing/non-blocking warnings only; **0 lint errors**
- `npm run build` — PASS

A real lint error discovered during certification (unused Agreement handoff variable) was corrected in production code rather than suppressed.

## 16. Visual certification

Committed:

`docs/phase3-agreement-journey-visual-certification.svg`

The visual evidence was browser-rendered from the **real Phase 3 production components and compiled CSS**, using representative non-production state in an isolated temporary harness. The harness itself was not committed.

It covers all required views:

1. Agreement immediately taking shape;
2. one material question;
3. complete Agreement review;
4. correction/change;
5. creator invitation;
6. counterparty invitation/review;
7. proposed change;
8. agreed state;
9. print view;
10. 320px mobile Agreement;
11. desktop Agreement.

Browser text verification included:

- “Your Agreement is taking shape”
- “When should Peter be paid?”
- “Not agreed yet”
- “How should SecurePay send this Agreement?”
- “James Kimani … wants to agree this with you”
- “Peter Mwangi suggested a change”
- “Nothing has changed yet”
- “Agreed”
- printed Agreement reference/version/parties.

## 17. Required journeys A–L

| Journey | Result | Evidence / behavior |
|---|---|---|
| A — simple services Agreement | PASS | Bathroom tiling Agreement appears early and reaches printable Review |
| B — incomplete Agreement | PASS | server-owned material question shown with artifact remaining visible |
| C — user correction | PASS | normal correction path; changed material visibly identified |
| D — natural approval | PASS | “nothing/everything is okay” is no-change, never Save-change mode |
| E — counterpart invitation | PASS | creator keeps Agreement then prepares explicit Agreement invitation |
| F — counterparty review | PASS | public doorway is Agreement; identity/join follow only after choice |
| G — proposed change | PASS | version-pinned idempotent proposal; responder sees Current vs Suggested |
| H — ready/agreed state | PASS | quiet Agreed artifact; no Money inference |
| I — identity mid-journey | PASS | identity delayed; sign-in never silently joins/confirms |
| J — print | PASS | human Agreement print from review and authoritative current Agreement record |
| K — source-first Agreement | PASS via existing ingestion/formation regressions | source lifecycle remains contextual and formation promotes into same living Agreement |
| L — failure/uncertainty | PASS | source/mutation/invitation/amendment uncertainty remains fail-closed and idempotent |

## 18. 70% test

Major Phase 3 simplifications:

- Agreement artifact replaces “understood” summaries as the primary object;
- no duplicate Agreement sidebar;
- review machinery becomes the Agreement itself;
- version/provenance/authority moved behind Details;
- identity removed from the pre-value part of the journey;
- invitation terminology reduced to the human consequence;
- proposed-change history/mechanics moved behind progressive disclosure;
- agreed state reduced to a quiet Agreement summary.

No truth/safety capability was removed.

## 19. Remaining gaps / deferred work

- Cross-domain orchestration remains Phase 4 work.
- Money redesign remains outside Phase 3.
- The human change authoring surface is deliberately bounded; broader arbitrary Agreement-field editing is not invented in the frontend.
- Store, Community, Vision and Skills Institute remain later phases.
- Real-human usability certification remains Phase 6.
- Production hardening and pilot remain Phase 7.

## 20. Phase 3 gate

The Agreement:

- appears early;
- remains visually central;
- uses one server-owned material question;
- handles natural no-change language;
- presents a real printable review;
- delays identity to consequential moments;
- keeps the person with the Agreement after creation;
- makes invitation explicit and separate from agreement;
- gives the counterpart the Agreement first;
- presents proposed changes in ordinary consequence language;
- makes Agreed unmistakable without inventing Money readiness;
- works in the Phase 2 one-plane shell;
- preserves backend authority;
- passes full regression, typecheck, lint and build;
- has browser-rendered visual certification.

# **PASS — Phase 4 can begin**

Stop here. Do not merge, deploy production or begin Phase 4 automatically.
