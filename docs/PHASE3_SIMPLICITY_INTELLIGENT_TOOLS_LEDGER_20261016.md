# SecurePay Production Convergence — Phase 3 implementation ledger
16 October 2026 · **Draft, never production-certified**

## Dependency and release boundaries
This branch is stacked **on frontend PR #140** (`test/phase3-authenticated-journey-readiness-20261016`), after #139 KS001↔Living Workspace, #138 regression fixes, #137 visual identity, and #136 connected product. All five were open, draft and unmerged at inspection. API PR #324 is open/draft on #323/#321; API Fair Trade privacy and Agreement authority cannot be assumed deployed. No SecurePayAPI, `securemain`, payments, merges, paid inference or deployments were changed by this Phase 3.

The existing `api/preview-agent.js` and `api/preview-workspace.js` target `https://securepay.ke` even on Vercel previews. Thus **do not run authenticated end-to-end journeys, send real invitations, write Agreements or test Money execution on Vercel preview**. Tests and visual screenshots from public preview are layout checks only, not backend certification.

## Implementation by slice

| Slice | Real change | Authority and follow-up |
| --- | --- | --- |
| 3A Home & navigation | Signed-in legacy Home keeps the KS001 composer primary; redundant “Start with KS001” button removed; secondary quick starts tucked into one optional disclosure. Canonical signed-in Home and conversation now expose the same Date & Time entry within their existing + menu. | The existing source upload and Continue logic is preserved. |
| 3B Agreement | Read-only real formation summary shows “Working draft · Not yet accepted” and the next question/review state without opening More. Existing Edit retains its unsent text when + Add opens another tool; context Add now offers Date & Time alongside photo, document, place and relevant KS Number. | Edits and added sources still go through existing KS001 controller and backend formation. Display-only title remains explicitly unpersisted. |
| 3C Date & Time | One compact date, date-range, weekly/monthly recurrence and “after event” picker with native calendar/time controls, local zone display, typed approximate language, purpose and optional milestone context. Invalid calendar dates, reverse intervals and offset values outside 0–365 are rejected. | Explicit user action submits a **proposal to the existing KS001 conversation**, not a direct Agreement/Milestone/Condition/Money write. No accepted term, booking, verified trigger or money release is created by UI selection. Unknown backend outcomes fail closed. |
| 3D Money and contextual actions | Compact Money surface shows selected Agreement identity and backend-derived status before the next action. Navigating to Money says “Review funding”, never misleading “Pay this Agreement”; financing/insurance options remain contextual requests to KS001. | The authoritative Money routes and Store gallery are unchanged. |
| 3E Simplicity safeguards | Corrected legacy DatePicker starting month/year to device current date; added accessible month-nav labels; stale selection clears when month changes. Added isolated executable timing tests and no-network source/authority wiring tests. | Run CI first, then manual 320/390/desktop/200%-zoom/reduced-motion/keyboard testing in isolated staging. |

## Specific timing doctrine
- **Exact:** 2026-10-24 at 10:00 device local. The parties must review it before it becomes binding.
- **Period:** start and end local dates/time, checked for ordering.
- **Repeat:** every Friday or on day five of the month. Months missing a 29–31 date and holiday/missed-installment rules are **unresolved**; no recurrence engine schedules money.
- **Conditional:** e.g., final instalment two calendar days **after independently verified client inspection and acceptance**. No fixed due date is calculated before verification.
- **Uncertain:** typed “next Friday morning” is kept as the person's words, labelled unresolved; no silent model date-to-obligation conversion.
- **Working days:** not yet translated to a holiday-aware schedule; users can state them naturally in KS001 for explicit review, but the picker does not falsely claim to calculate them.
- **Booking:** Short Stays/My Ride dates are requests only, never vendor-confirmed reservations.

## Proposed minimum backend follow-up (not implemented)
1. A versioned, server-validated **timing proposal** attached to the caller's authorised Agreement/Formation context, with purpose, local date/time, IANA zone, confidence, provenance, recurrence rule and conditional trigger reference.
2. An explicit transition from suggestion → proposed → other-party review → accepted version, with amendment rules for already accepted commitments.
3. Server-owned condition evidence/trigger verification and any eventual eligibility for Money; never computed by frontend or unverified KS001 prose.
4. Recurrence semantics for short months, holidays, time zones, daylight saving, missed dates, business days, and schedules dependent on service/provider confirmation.
Until those capabilities exist, the implemented picker passes human-readable proposed timing through existing KS001, and its real structured Agreement/Milestone persistence is **not certified**.

## Test and scenario ledger
Zero-network test `tests/convergence-phase3-simplicity-date-time.test.mjs` exercises the real proposal builder via TypeScript transpilation plus static integration guards. Run:
```bash
node --test tests/convergence-phase3-simplicity-date-time.test.mjs
npm run typecheck
npm run lint
npm run build
npm run test:final-convergence
```
GitHub CI outcomes, inherited failures, browser screenshots and authenticated integration status must be appended after actual runs; **not claimed PASS without results**.

| Real human journey | Intended interaction | Authority evidence still needed |
| --- | --- | --- |
| Chairs | delivery date/time, add Place, review next Agreement question | staging formation version and consent review |
| Bathroom | commencement, completion, inspection, conditional instalment | authoritative milestone/trigger mapping |
| Eight-person chama | monthly fifth, late rules, invite flow | no unaccepted member treated as participating |
| Vision→Agreement | choose transition without losing vision plan | current authorised transfer and return |
| Short Stay/My Ride | date range or pickup, provider confirmation pending | live provider confirmation without fabricated booking |
| Community project | dates and participation action | member permissions and real project session |
Screen sizes/200% zoom, actual assistive technology, tab order/escape, timezone switches, daylight saving, network disconnect and saved return paths remain unobserved here.

## Exit decision — CONDITIONAL
**Code committed to draft branch, not production-certified.** Actual CI outcome must be checked. Even green CI cannot replace signed-in browser sessions against **isolated staging**. Screenshots of before/after functioning frontend, real user hesitation measures, confirmed server timing persistence, API authority gates and human sign-off are missing. Do not advance to Phase 4 automatically. Do not merge/deploy without owner approval.
