# SecurePay Mini / KS001: Answer-pill interaction contract

Date: 2026-11-17
Source: Product decisions across the 13 October, 15–16 October and 17 November 2026 discussions.
Status: Design contract, progressively implemented in the Phase 1 seller owner preview, **not** production authorization.

## What a pill must do

A contextual pill is **a small, honest next action**. It may:
- Answer the current question with a concise proposal (choice, quantity, status or role).
- Correct a previously captured answer (pen icon), preserving version and traceability.
- Open the matching mini-tool to supply a real date/calendar selection, KSNumber/person, map/place, photo, supporting document, drawing/plan, video, numeric amount or structured item.
- Reveal additional meaningful choices without moving to a dashboard.
- Say **Not sure**, **To agree later**, **Other** or **Change answer** without suggesting an unsupported fact.

The approved interaction is: short human acknowledgement of captured facts → **one relevant bold question** → a few short answer pills → move naturally to the next unresolved important detail. Any answer should preserve the existing draft. Do not ask again for information already understood, do not repeat scripted questions, and do not force typing. Freetext is a fallback for genuinely specific names, details, unusual circumstances or corrections.

## Example answer families

- **Image origin:** I took it · Supplier's image · I have permission · Not sure · Remove photo. Supplier origin and permission to reuse the image are two *different* questions, and neither response independently proves copyright title or stock.
- **Right to offer:** It's mine · I'm an authorised reseller · I'm an authorised agent · Supplier agreement · Not sure. These are seller declarations, not verified rights.
- **Availability:** Available now · Limited stock · Made to order · By appointment · Need to confirm. Never silently treat a seller declaration as verified stock or a guaranteed booking.
- **When:** Choose date · Date range · Repeating · After an event. Open a true date/time input and save the resulting timing proposal, not free-form guesswork.
- **People:** Buyer · Agent · Provider · Witness · Decide later · Share with buyer later · My People. Connected, verified My People and KSNumbers must come from real authorized sources; no fake or device-scraped contacts.
- **Where:** Buyer collects · I can deliver · Work location · To agree later. Offer place/map/Plus Code when the seller actually knows it, separate private meeting directions from public location.
- **Optional enrichment:** Choose a date · Add a person · Pickup or delivery · Supporting documents · Photos · Improve description · More options. None should hold up a simple, adequately clear offer without a substantive reason.
- **Money:** Concise amount/currency choices when the value has a legitimate source; no invented prices. A delivery charge (e.g. KSh 400) does not answer what goods are being delivered.

## Tool and input vocabulary

TEXT, CHOICE, MONEY, DATE_TIME, CONFIRMATION, KSNUMBER, PHOTO, DOCUMENT, MAP_LOCATION, PLAN_OR_DRAWING, VIDEO, and STRUCTURED_VALUE. An answer pill may open any available supported tool; it does not manufacture a capability if the source/permission service is unavailable.

## Progression and guardrails

1. The quiet Fair Trade examiner should show **understood / needs attention / next action**, with full 12-principles detail available on request, not a long checklist.
2. Ask the next necessary question by dependency, materiality and cognitive cost. Capture multiple facts at once if the seller supplies them.
3. Use answer pills to close a gap, then immediately update the offer preview. One ambiguity at a time, not a whole blocking questionnaire.
4. For an unanswerable or regulated concern, offer **Add evidence**, **Correct details**, or **Save** without claiming a self-declaration clears legal eligibility or server verification.
5. Provide direct correction where the concern arose and a one-tap **Back to offer review** from any opened tool. Do not lose photos, people, dates, private notes or the draft.
6. Keep proposed, confirmed, authorized and independently verified facts distinct. All offers and Agreement terms must be tied to the right source/version and accepted independently; a pill cannot sign for another person.
7. **Sell Something** finishes with Share with buyer (SecureLink when server-supported), Add to my Store (authorized published Store), or Save; there is no seller-side Connect to Money.
8. **Buy Something** finishes with Send SecureLink, Connect to Money directly when ready/authorized, or Save; SecureLink is not a prerequisite for a straightforward payment.
9. KS001 is optional deeper help; Mini performs quiet offer preparation. Store, Mini and Workspace should feel written by the same hand and reuse the same source contracts.

## Current Phase 1 implementation truth

- Owner-preview Mini seller review now has single-question answer pills and direct handoffs to Photos, Documents, Places, Date & Time and People.
- Native calendar is a proposal-only input; People is a manual name/KS fallback until signed-in contacts exist; files are local preview/filename metadata only, not transmitted.
- Supplier photo permission is separately requested; no real Identimark/fingerprint, originality or legal eligibility checking is connected.
- No real SecureLink, Store publication, invite, Money or Agreement acceptance is executed.
- The design contract above applies when server-backed source, identity and permissions are connected in subsequent phases.

## Human acceptance

A seller who sees a warning should always know *what happened, what question to answer, what each answer does, and how to change it*. They should not type anything to resolve the typical photograph-source, seller-authority or availability questions. They should not have to scroll through unrelated controls just to pick a date, add a known person or decide to leave a term for agreement.
