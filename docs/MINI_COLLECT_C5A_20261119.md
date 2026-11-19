# SecurePay Mini Collect — C5A Collection Types and Frequency

**Date:** 19 November 2026.  
**Status:** Implemented as an isolated stacked draft branch and Mini experience. **NOT production-complete; no live Money.**

## User intent

After C1 purpose discovery, a person should recognize their own collection, not read an engineering taxonomy. C5A asks two small questions before the existing C2 governance wizard: **what kind of collection?** and **how often?** It then explains the real-world promises that need examination. The chosen profile and cadence flow into C2, C3 and C4 as local review metadata.

C5A adds purpose-specific profiles to the existing C1 six purpose lanes:

- Buy together: shared item purchase.
- Get paid: school fees, learning/course enrolments, thrift-item sales, one bill or service.
- Collect regularly: estate dues, school transport, membership/subscriptions, rent.
- Group: chama cycles and shared projects.
- Giving: welfare/fundraising and church/community giving.
- Goal: education and event funds.

**One-time, monthly, school-term, agreed-cycle and instalment** schedules are allowed only where compatible with the selected purpose. Choosing a new type clears the previous cadence. A collection cycle is not the same as an automatic debit or pre-accepted future debt.

## Human examination to preserve

- **Headmaster:** every student has a distinct obligation, accepted invoice and term. Neither student identity nor class fees become a public donor listing.
- **Transport operator:** actual bus route, operator, agreed service dates, cancellation and missed service must be examined. Parent payments cannot silently fund a different service.
- **Trainer:** learner-by-learner acceptance, course start, access/support obligations, instalment and cancellation conditions must be tied to the actual course offer.
- **Thrift shop:** each buyer's item, source offer, condition, reservation, pickup and eligible return remain separate.
- **Estate/chama:** every month/rotation has a period identity, approved amount, authorization rules, exceptions and a separate immutable record. A calendar reminder is not a payment instruction.
- **Fundraising/church:** a gift is voluntary, not a default debt or refundable loan. Protect confidential giving and respect the exact beneficiary/purpose and authorized representatives.

## Source and authority boundary

This is **client-side preparation**, not an API that creates collection types or recurring obligations. The inherited C2–C4 backend is unchanged. C5A profiles carry no provider assertions and cannot:
- create or accept an Agreement;
- create, share or activate a SecureLink;
- mark money paid, held, returned or settled;
- direct a bank, issue Money instructions or auto-debit;
- invent a giver's refund right, school bill or organizer's mandate;
- substitute customer choices for independent provider verification and contributor acceptance.

The collectionTypes.mjs module exposes immutable human profiles and a fail-closed selection assessor; governanceDraft.mjs accepts the selection only when it matches the purpose and cadence. The existing C2–C4 review process remains untouched in its authority rules.

## Next C5 engineering work (not claimed complete)

C5B must bind type and recurring-cycle details into a versioned canonical backend Agreement, with explicit cycle dates/timezones, identity-scoped payer obligations, source offer/bill, verified recipient, unique per-period charge/collection, exact version acceptance, safe reminders and immutable history. It must fail closed when provider capabilities, lawful collection authority, and the agreed cancellation/return policy are absent. Additional backend migration, API, concurrency, authentication, privacy and doctrine tests are needed.

C6 then performs the intelligent fair-trade examination of the selected collection and underlying obligations; C7 handles provider-certified Money lifecycle and conditional financial options; C8 runs convergence, end-to-end and 20-person acceptance testing.

## Validation / release

Added tests/mini-collect-c5a-types.test.mjs with pure-purpose, boundary, mismatch, recurrence and UI-wiring checks.

- **Not claimed run:** full Node test suite, lint/typecheck, browser interaction, release build.
- **Never enabled:** real bank connections, provider mandates, live collection, spending, refund or notifications.
- **Merge authority:** human review required where canonical finance/governance authority is affected; source remains a draft until certified.
