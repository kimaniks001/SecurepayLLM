# Day 7: one KS Number, continue the same KS001 work

**Status:** frontend receiver and product-side contract adapters implemented in isolated branches, awaiting real staged multi-origin certification. Nothing deployed to production.

## User's true north
A person may start their work in **ShortStays**, **My Ride**, **Storage** or **Estate.ke**. They should not have to repeat their request or create a second account when SecurePay identity is needed. Each host product retains its own approved UI.

**Human dialogue:** "Do you already have a KS Number?" → "Yes, I have one" or "No, get my KS Number". Returning people use normal SecurePay sign-in. New people use normal SecurePay signup (name, phone/email, password, OTP, canonical KS Number). **Signup does NOT claim or enrol the task.** The person then confirms "Yes, continue in My Work". Same canonical KS001 conversation is claimed by SecurePayAPI.

## Implemented
- SecurePay-owned, exact-origin receiver `EmbedTransferReceiveExperience`: same existing `SignInExperience` and `SignupForm`/auth/session; explicit separate claim after confirmed sign-in; source page remains open; transfer ticket remains in memory and never enters a URL, storage, analytics, or app link.
- Guest SDK wording is now general instead of pretending that all sites are Estate.ke. Original Phase 5 window/nonce/source/origin verification remains.
- Invalid, expired or mismatched transfer remains unclaimed. On expiration, the source tab still contains the guest work; user can ask it for a new transfer. **If they closed or reloaded the original tab, the source's guest continuity and its own saved-task rules apply. Do not promise automatic recovery without an accessible original conversation.**
- ShortStays [PR #15](https://github.com/kimaniks001/kenya-stay-stories/pull/15) and My Ride [PR #15](https://github.com/kimaniks001/agreement-mover/pull/15): typed, opt-in, privacy-minimal local context adapters. Each may pass only a short *public task reference*, never phone, email, location precision, payment, password, guest token or private booking description. Adapters do not yet render or activate the SDK.
- Storage remains a direct Vercel owner prototype without a dedicated GitHub repository. Do not silently copy the untrusted publisher SDK into it.

## Security gates already preserved
1. Guest conversation, possession token, site ID and browser Origin must be validated by SecurePayAPI, not site JavaScript.
2. Short-lived, random, hashed and single-use transfer ticket; exact browser window + nonce + SecurePay receiver origin; authenticated actor and matching guest token at claim; idempotent same-owner retry.
3. No booking, platform membership, transport dispatch, escrow, signature, physical handover or payment from signup or lookup.
4. Product source receives only a generic saved receipt after claim, not a password/OTP/KS profile/payment/private conversation.
5. No external origin automatically becomes trusted because it imported the adapter. **The Estate pilot's guest credential lives in host-tab sessionStorage**. For independent untrusted partner sites, credentials must be isolated in a SecurePay-origin iframe/credential vault approved by backend and tested before enabling. Never reuse an Estate bearer token or expand a wildcard allowed-origin setting.
6. Verified source task restoration is not a SecurePay session login to the original app: source-specific authentication remains separate unless an explicit, approved SSO integration is built.

## Staging work still required
- Register exact approved HTTPS origins and installation IDs for each separate site, with independent rate-limit/guest budget and permissions. Never treat a preview Vercel subdomain as a general trusted origin.
- Design and certify SecurePay-origin iframe isolation for ShortStays / My Ride / Storage; no host-accessible guest proof on untrusted sites.
- Use test-only KS identities and isolated API + DB. Exercise 4 site flows: existing KS sign-in, new KS signup, same conversation ID across claim, original site's task still open.
- Fail-closed tests: wrong Origin/site/nonce, stale or reused ticket, wrong authenticated actor, expired OTP, unavailable SMS/email delivery, deleted/reloaded source tab, interrupted claim, rejected access, popup blocked.
- Source-dependent restoration: return to the exact source task from the original tab, with a validated public task ref and source-owned state. No URL authority or arbitrary return paths. Do not let a generic saved receipt mark a booking/Agreement as complete.
- Owner GO/NO-GO, narrow PR merge sequence, staged certification; then and only then consider live pilot.

## Exact test gate
Frontend isolated certification: `node --test tests/day6-embed-phase5-transfer.test.mjs tests/day6-embed-phase5-window.test.mjs tests/day7-embed-one-identity-continuation.test.mjs tests/day1-gate-c-signup-activation.test.mjs && npm run typecheck && npm run build`.
Backend Phase 5 API work remains a separate stacked draft and must pass Java compile, PostgreSQL race tests and live cross-origin staging before it can be claimed production-ready.

**Do not merge into production or activate Money.**
