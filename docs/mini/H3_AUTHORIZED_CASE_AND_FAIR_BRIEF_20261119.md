# H3 Mini — canonical review discovery and fair questions in the native Mini product

19 November 2026 · Draft / isolated preview · No production.

This extends approved native Mini `mini.html` and the existing `spm-*`
one-product styling. It does NOT reintroduce the separate Living Workspace
or the old generic H3 prototype.

## Authorized flow
1. Use Mini's existing first-party KS001 session and **My Agreements**,
   never a case ID from a URL, AI response, or synthetic demo.
2. Open a real Agreement; Mini verifies current `details.currentVersion.id`.
3. Only on a dedicated isolated preview host, and only for a real (non-demo)
   signed-in session, show **Check my Agreement reviews**.
4. Use the existing authenticated **legacy participant Review** list, filter
   by exact Agreement ID and current version, and let the person explicitly
   choose a returned case. A v2 Review case is NOT treated as a legacy case.
5. On demand, authenticate and read the case under the Core H3 exact-case
   authority. An unverified or stale case gives an honest error; never show
   invented submissions or another participant's case.
6. Only after the reader has checked the case may the person request **What
   should we check together?**. The read-only Core fair brief provides
   source-grounded questions. No real KS001 model call or automatic sharing
   of private party responses occurs.

The app already contains a separate, explicitly fictional H3 example under
`/mini.html#/preview/mini/h3`, using the same Buy/Sell/Pay/Collect Mini
shell; it is not a live formal-review or provider preview. The real source
selection is under **My Agreements** in the first-party Mini session and
remains disabled for synthetic demo actors.

## UX and privacy constraints
- Human guidance can be available without opening a formal dispute.
- Keep the simple answer pills, compact cards and onion-layered explanations.
- Submitted statements are not findings; submitted evidence metadata is not
  reviewed proof. Display no uploaded file bytes, identity document filenames,
  precise Places or storage IDs.
- No helper gets original trade records merely from linked service membership.
- The product has no new Money or Agreement acceptance authority.
- Keep no case/account data in client-side persistent storage.
- Refresh auth before each source call; on error wipe the section's old data.
- Session/Agreement/version switch must remount and clear all old cases.
- No real provider booking, disputed payment release or KS001 adjudication.

## Still required
Core H3 backend deployment is pending. Full Java21 and PostgreSQL/Flyway,
auth/BOLA/revocation, multi-party, timing/duplicate-event, real browser and
cross-journey UX certification remain outstanding. The current review
source is the *legacy* formal Review service; newer v2 Review needs audited
mapping or its own compatible records before production convergence.

No live Money, production changes, or model inference may be claimed from
this draft build.
