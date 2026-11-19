# SecurePay Mini — H4D human requests and bilateral decisions

19 November 2026 · native Mini preview · draft only

## Intended human experience
Mini's existing **Need a hand? → Talk to someone** choice opens H4C verified discovery. When a real, currently vetted opted-in helper is returned, **Prepare a private request** opens a quiet H4D task form within the same 366px native Mini shell. The customer selects a useful sentence pill or supplies a short task brief, chooses how to judge completion, reviews the actual published unit rate and unit count, and separately checks **Share this task brief only** before choosing **Send this request**.

The selected person sees their own new request in **My SecurePay → My human requests** after signing in; they can accept or decline. The customer must separately confirm the request if accepted. A provider-declared availability is not a reservation, and the actual quoted rate is rechecked against its source by Core at send, helper acceptance and customer confirmation. A change requires review again.

No old Living Workspace UI, desktop dashboard, new identity, mock helper, automatic local location, or custom checkout surface is introduced. No typing of personal identifiers, original Agreement contents, locations, provider bank details or evidence is required. A task-specific description remains necessary because the customer is authorizing a **new disclosure** to the selected helper.

## Real vs preview

- **Real request/inbox gateway**: `src/api/securepay/human-engagement/index.ts` calls only authenticated first-party Core routes. Validation rejects forged issued SecureLinks, Agreement creation, Money authority, work authorization, original source access, invalid totals, malformed states and swapped request IDs/versions.
- **Native UI**: `MiniHumanEngagements.tsx`, from H4C `MiniHumanDiscovery.tsx`, inside `MiniFirstPartyKs001.tsx`. Helper/customer roles are supplied by the authenticated server rather than guessed. Requests carry a stable idempotency key across uncertain outcomes, and never silently retry after a network failure.
- **Backend activation**: only an explicitly configured staging preview host, aligned first-party staging API and `VITE_SECUREPAY_MINI_H4D_ENGAGEMENT=enabled`; production and demo fixtures cannot issue real requests.
- **Design review**: `/mini.html#/preview/mini/h4d` opens a native UI with a truthful unavailable-service state. It does not seed mock people, create fake SecureLinks, auto-book work or run Money.
- **Status**: REQUESTED → HELPER_ACCEPTED → READY_FOR_AGREEMENT (or decline/withdraw/expiry). READY_FOR_AGREEMENT is still an invitation, **not** a canonical Living Agreement or live SecureLink.

## H4D boundary / remaining

The canonical separate Agreement formation, accepted version, Fair Trade and SecureLink product activation is **not yet connected by H4D**. A public URL or QR must only be surfaced after the existing backend has actually issued the correct source-bound product. No actual provider can be contacted or charged on the current isolated H4D design preview.

H4E must cover end-to-end consent, real reviewer and catalogue provisioning, Java21/Postgres/Flyway, 3+ identities, BOLA, simultaneous acceptance, rate mutation, publication revocation, data sharing, 20-person mobile usability, original-source privacy, canonical Agreement activation and any legally necessary regulated provider review. Production and live Money remain untouched.
