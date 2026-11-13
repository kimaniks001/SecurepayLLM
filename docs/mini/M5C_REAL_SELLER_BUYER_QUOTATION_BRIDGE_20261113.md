# SecurePay Mini M5C — real seller quotation → buyer-owned Agreement journey
**13 November 2026. Development candidate only. Tests deferred by owner, release stays NO-GO.**

## Frozen interface
The approved Mini experience stays one KS001 conversation with its existing
My SecurePay → My Store, My Agreements and Invitations surfaces. No second
agent, extra chat window, new checkout or new payment scheme.

## Step 1 — seller
Under My Store, the existing compact **Prepare buyer-specific quotation**
editor has a separate explicit **Record seller quotation for buyer** button.
It is shown only with the real first-party authenticated HTTP gateway; the
sample Mini demo continues to show its previous *conversation-only*
quotation discussion and cannot silently call SecurePayAPI.

The seller must be signed in and authorized by the existing
`BusinessGateway.representation`; the Store offer is re-read through the
existing `StoreGateway.offer`. The exact submitted buyer KS, published
offer revision, quantity, price in integer minor currency, delivery date/place,
responsibility and conditions are sent to:
`POST /api/v1/business/{businessKsNumber}/store/offers/{offerId}/quotations`.
The backend alone validates seller/active buyer/source, locks the offer,
issues the immutable historical quotation record and returns a reference.
The interface checks the returned seller/buyer/offer/total before showing
that reference. The seller can copy it and share privately. The quotation
is not an Agreement acceptance, an invitation, reserved stock or Money.

A complete identical retry uses the SAME idempotency key AND the SAME
material expiration instant; changing the seller's input generates a new
key. A network timeout is explicitly shown as an UNKNOWN OUTCOME, not
as failed delivery/absence of a server record.

## Step 2 — buyer
Under the existing **My Agreements** view, a compact expandable
**Review a seller quotation** section accepts the UUID reference. The
buyer must sign in independently; the backend verifies that this quote
belongs to their own ACTIVE Individual KS identity. GET returns the
recorded amount, quantity and delivery terms. Source changes or expiry
prevent a new Agreement draft.

A deliberate buyer click **Create my Agreement draft** invokes
`POST /api/v1/store/quotations/{quoteId}/agreement-draft` with a stable
idempotency key. The backend revalidates and creates the new DRAFT with
the full quotation embedded in immutable canonical Agreement version V1
and its content hash. No existing draft is silently overwritten.
The buyer explicitly clicks **Propose Agreement** through the SAME
existing `AgreementGateway.propose`, then **Invite the original seller**
via the M5C server-only invitation endpoint with the exact V1 ID/hash.

## Step 3 — original seller and independent consent
The original seller uses the existing authenticated **Invitations for me**
and **My Agreements**, not a new seller chatbot. Only the original human
who represented the Business and issued the quotation may join/confirm.
The buyer's own **Confirm this exact Agreement version** button invokes
the existing `AgreementGateway.confirmVersion` only after a real server
review confirms seller Joined. It cannot confirm for the seller.
The private review endpoint reports both people independently confirmed
against the same current Agreement version/hash.

## Step 4 — obligations still NOT payable
After the server reports both people confirmed, the original buyer may
explicitly click **Record agreed responsibilities (no payment)**.
The backend writes only the immutable
`market.store_quote_obligation_plans` record. Mini rejects any response
whose state isn't `STAGED_NON_EXECUTABLE` or whose executable and
paymentEnabled fields aren't both FALSE.

Do NOT remove existing quote-born `ObligationService` or
`AgreementProductService` guards. Do NOT issue SecureLinks, payment
intents, settlements or stock reservations from this flow.

## Known unfinished edges — NOT production ready
- The API branches #411–#415 are all still draft/stacked, not live and
  not build/runtime certified. The real Mini HTTP endpoints will fail
  closed (404/unavailable) until an isolated API deployment includes
  those branches. Do not point the prototype at www's shared sandbox API.
- This first connection uses an explicit reference copied privately
  from seller to buyer. Automated secure inbox delivery and seller quote
  listing are not yet part of this slice.
- A cancelled/expired/changed version requires a new authorized quote
  and buyer review; this code does not bypass those rules.
- User requested **build now, test later**. This PR adds no claim of
  npm compile, CI, PostgreSQL, real two-person test or live KS001 proof.
  Retain all pending certification tasks from API PR #415 and Mini M1–M5.

## Certification after build closure
Focused TypeScript build, authenticated seller and buyer browser flow,
proposal/share/reload/duplicate retry, exact payment-denial assertions,
buyer–seller distinct consent and same-version hash, review of stale seller
admin/stock/version, and isolated API deploy. Synthetic demo must never
pretend to call the real API; the approved UI remains unchanged.
