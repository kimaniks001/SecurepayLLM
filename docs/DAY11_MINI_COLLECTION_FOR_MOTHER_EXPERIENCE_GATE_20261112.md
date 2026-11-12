# Day 11 — SecurePay Mini: collect for mother (human-first working interview)
2026-11-12 · candidate implementation · **No live customer money authority**.

## Owner's acceptance scenario
A person writes: "I want to collect money for my mother."

The approved experience is **not a new store screen**. Mini asks one relevant question at a time, lets a person tap familiar answers or type brief words, notices if the mother has not approved, and carefully establishes the money recipient, authority, purpose, target and contributor reporting. It does not force a form, presume fraud, claim to have confirmed consent, or open the full Living Workspace.

### Concrete visible path
1. Mini home → type "I want to collect money for my mother" → Continue → "Collect money".
2. Mini's existing starting options and container are preserved. It recognises the explicit beneficiary support request and opens a lightweight interview. It already knows "my mother" from the initiating words; avoids repeating that question.
3. KS001 guided prompts (local prototype) ask:
   - What the contributions are for, without asking for diagnosis or records
   - Whether she knows and agrees (yes / not yet / unable)
   - Who will receive/control money (beneficiary / direct provider / organiser / another)
   - If someone other than the beneficiary receives money, whether that person has authority
   - Proposed target (or flexible contributions)
   - How contributors can receive updates or receipts
   - What beneficiary information can safely be shown
4. The conclusion is a compact factual review, not an accepted contract. "Not yet" and "unable" remain explicit outstanding consent / verified lawful representation checks; an organiser receiving money requires separate verified authority.
5. An intentional **Prepare local draft for review** hands the summary back to the *existing* Mini draft review. The new beneficiary path **does not offer simulated funding controls** in that review, because no permission or collection entitlement has been verified.
6. No number, PIN, OTP, ID, account, exact address or medical detail is requested, stored in a server or shown publicly. No real messages sent, collection link issued, invitations created or payment rails activated.

### Ordinary collections remain ordinary
A trader who clicks "Collect money" without stating they represent a beneficiary stays in the original short Mini collection flow. A small optional help action appears in the existing description step for someone who wishes to collect on behalf of a parent/person. This is intentional: extra questions show up only on a grounded need.

## Implementation files
- `src/mini/miniCollectInterview.mjs`: deterministic branching question/answer model, explicit non-authority contract, review and local draft composition
- `src/mini/miniCollectInterview.d.mts`: TS signatures
- `src/mini/MiniCollectConversation.tsx`: one-at-a-time conversational rendering in the existing Mini shell, with options, brief typed reply, back, local review
- `src/mini/MiniExperience.tsx`: exact contextual launch integration and local draft continuation without altering Store, workspace or payment authority
- `src/mini/mini.css`: additive compact question card styles, no root layout changes
- `tests/day11-mini-beneficiary-collection.test.mjs`: 8 focused model / route / safety cases
- `api/mini-store-offer-preview.js`: only extends the **existing gated read-only** Store review branch list so Mini Buy is not disabled by this new preview branch. Existing secret/host/preview-only limits remain.

## Source-of-truth and what is NOT built
This is a **working local guided conversation**, NOT live KS001 LLM generation. This is not evidence that the mother consented, that a person has authority to represent her, or that the proposed destination account belongs to any beneficiary. None of those verifications currently happen through this component.

There is NO server collection draft/Agreement from this feature, no regulated settlement authority, no authenticated contributor invitation, no SecureLink, no real funds, no bank or mobile money integration, and no automation to fetch medical evidence. All statements are unverified and must be made clear to contributors *after* legally and operationally approved publication.

## Next real-API gate (separate build)
- Create or extend **one canonical API collection/beneficiary case model** with identity representation, audience and privacy permissions, source evidence and each party's authorisation in existing Agreement/Community systems (not a parallel donation ledger).
- Use real KS001 conversation intent and authenticated party actions, preserving each answered point and asking only a question whose truth is still unknown; no forced forms.
- If mother can't personally consent, support **appropriate independently verified legal representative** where lawful; never infer authority solely from a family relationship.
- Once eligible: verify intended beneficiary and recipient/regulated rail; show transparent allocation, target, purpose, contributor rights and appropriate reporting; request independent approval. Only then issue a purpose-bound SecureLink or collection invitation under the existing fair-trade policy.
- Provide contributors a clear actual account/provider destination and traceable updates; no platform-operated pooling or escrow as default.

## Test gate
- Run `node --test tests/day11-mini-beneficiary-collection.test.mjs` and `npm run typecheck`.
- Verify build on each Vercel project; run in mobile browser to test previous/back, option pills, typed free-text, invalid amounts, consent pending/unable, receiver authorisation, explicit draft prep, ordinary collection regression, refreshing Mini.
- The Vercel build success does **not** certify the new node tests, authenticated backend or real-money flow. No production merge, no real beneficiary information in preview tests.
