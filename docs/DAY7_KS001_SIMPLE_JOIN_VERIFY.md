# Day 7 — Invite, check KS Number, get KS Number: one human journey

**Owner direction:** Recruiting/inviting another person, checking their KS Number and signing up should be simple enough to understand immediately. A visitor arrives from ShortStays, My Ride, Storage, Estate.ke or SecurePay itself and should never be forced to create another account just to use a new service.

## Words the person should see

**Do you have a KS Number?**
- **Yes, I have one** → for the *owner*, use the existing SecurePay sign-in/reauthentication flow; for an *inviter*, allow exact, authorised, read-only KS Number lookup before proposing a person.
- **No, I need one** → open the **same existing SecurePay signup** (name, phone/email, password, OTP, issued KS Number), then return to the original consented journey.
- **Invite someone** → explain why, draft/share a link/message or create a specific authorised invitation. The recipient chooses. Never claim an invitation was sent when only the WhatsApp composer was opened.

There is no separate ShortStays signup, Storage signup, My Ride signup or Estate signup; they link to one first-party SecurePay identity authority. But the embedded/site-origin handoff is **not yet certified** and must use the secure origin-scoped flow in the Day 6 Embed integration plan.

## Three different checks (never blur them)

1. **KS Number lookup:** Exactly one known KS Number, canonical format; returns only approved public display name, canonical number and eligible person/organisation type where the caller and purpose permit it. Does **not** prove the user owns the number, a natural person's real-world identity, or consent.
2. **Sign in / contact verification:** Proves the person can authenticate through SecurePay's approved route. Signup OTP proves access to the chosen phone/email for initial identity issuance, not legal KYC. No number is issued before successful OTP verification.
3. **Financial/legal verification:** Separate, authority-checked requirements only when that service truly needs them; not part of getting a KS Number.

Important: `gateway.selectKsIdentity(id,{ksNumber})` omits `expectedTradeContextVersion`, so the documented API path performs **pure lookup**. Supplying a trade-context version can associate a CANDIDATE participant and must not be used by this simple checking interface.

## Current Phase A UI implementation

- Compact centered first-party `SignUpExperience`; the **same `SignupForm`, `createSignupController`, `/api/v1/auth/signup/start|resend|verify` and `SessionStore`** remain. No new identity store, OTP service or session.
- Miniature People & Invitations tool says **“Already has a KS Number?” → “Check KS Number”** and explicitly distinguishes an account record from physical identity or acceptance; no name-search or reverse phone/email lookup. Delayed results from an old typed number are ignored.
- **“No KS Number yet? Invite them”** allows a friendly personalised WhatsApp draft even without a lengthy reason. This is **not** an official invitation token and does not sign anyone up, join them or create referral entitlement. A binding Agreement invitation still needs the existing permission-checked invitation service.
- The full registration/Trust Project/activation/Business flows remain separate choices after identity issuance; no auto-enrolment, forced purchases or money action.

## Required next integration gates

- Map authorised arrival context (site, public offer reference, intended action, chosen surface) to a one-use, scoped continuation. It is not a substitute for authentication or consent.
- When the recipient signs in or gets a KS Number, safely resume their own explicit task using the **same** KS001 conversation after the approved secure handoff; never copy invitation/estate secrets, another person's work, or financial credentials into the frontend.
- On an already registered contact, do not reveal whether that phone/email has an account. Provide a neutral sign-in/sign-up recovery route instead.
- Add functional testing on a registered KS Number, unknown KS Number, malformed value, delayed swapped lookup, lost OTP, existing signup recovery, rejected invitation and cross-origin access.
- No changes to regulated Money, Agreement acceptance or referral earnings; user action and backend truth are mandatory.

## UX review targets
A newcomer can describe the task first; if an identity is genuinely needed, they choose **“I have a KS Number”** or **“Get my KS Number.”** After confirmation they return to that exact request. The steps are self-explanatory; no three-panel onboarding, multiple accounts or platform technical language.

**Rollout status:** Phase A frontend simplification only. Cross-product registration continuation and embedded KS001 must still pass their own security and staging gates.
