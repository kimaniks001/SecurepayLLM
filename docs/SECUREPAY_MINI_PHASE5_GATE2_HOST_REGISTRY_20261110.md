# SecurePay Mini — Phase 5 Gate 2: simulated registered-host handoff

**10 November 2026 · PREVIEW ONLY, NOT LIVE API OR FINANCIAL CERTIFICATION**

## Goal and scope

The owner has accepted Phase 4 offline development. Gate 1 supplied **one** Mini
launcher on two reference host pages. Gate 2 upgrades that **same launcher**:
the browser must request a **short-lived signed ticket from a server-side
preview issuer**, and Mini independently resolves it before showing the
already-approved Agreement/checkout simulator.

No API, bank, PSP, KYC, signed commercial Agreement, room, inventory or
live merchant data is accessed. The full securepay.ke workspace and the
Varsityville Estate site remain unchanged.

## Registry (simulated)

| Host | Exact allowed host path | Source | Return alias | State |
| --- | --- | --- | --- | --- |
| Digital Store | `/phase5-store-host.html` | `STORE-DEMO-01` | `STORE_RETURN` | Simulated registration |
| ShortStays | `/phase5-shortstays-host.html` | `STAY-DEMO-01` | `STAY_RETURN` | Simulated registration |
| My Ride | — | — | — | Disabled |
| Storage | — | — | — | Disabled |
| Varsityville Estate | — | — | — | Disabled |

The registry exists **only inside**
`api/mini-phase5-host-ticket.js`; it is not a merchant onboarding
database or proof that either host's real backend is integrated.

## Exact read-only protocol

1. An approved same-origin host opens `/api/mini-phase5-host-ticket`
   with `POST {"action":"ISSUE","hostId":"STORE"|"SHORTSTAYS"}`.
   Issuer validates HTTPS Vercel preview environment, exact Git branch,
   preview-only encrypted project signing secret, request host, Origin,
   `Sec-Fetch-Site` if supplied, and registered Referer page path.
   Arbitrary amount, merchant, return URL, account, or extra POST fields
   are rejected.
2. The **server**, not the browser, derives fixed fictional source:
   host identifier, return alias, immutable sample version, fixture digest,
   5-minute expiry, randomly generated nonce and preview origin.
3. The server HMAC-SHA256 signs an opaque-looking, base64url ticket,
   using a domain-separated preview secret. A browser cannot legitimately
   alter the source, amount, return alias, version, origin or expiry.
   This is **not encrypted**: never put private or payment details inside.
4. Host uses the original single Mini launcher and sends **only the ticket**
   to `/mini.html?embedded=1&phase5Ticket=...` in the existing popup.
   Failed issuance has **no unsigned fallback**.
5. Mini GETs the ticket from the same preview-server endpoint. Its response
   must match a fixed check-in fictional Store or ShortStays fixture,
   including source, version, amount, currency, merchant, return alias,
   expiry and **all false financial authority flags**. Otherwise it
   refuses checkout without starting a new financial attempt.
6. Mini reuses `MiniHostedCheckoutDemo journeyMode` and the existing
   approved Mini layout/linked logo. Clicking the host Pay button never
   forces opening the KS001 chat.
7. Browser `postMessage` is **only a hint**: same origin and frame,
   precise demo fixture/event/known simulated outcome. It can only update
   sample copy labelled **NOT PAID**, never booking, order, inventory,
   money, fulfilment or settlement state.
8. A valid ticket can be GET-resolved multiple times during its lifetime
   **to resume the same read-only preview**. There is no redeem/fund
   endpoint, so replay has zero financial effect. **Do not claim this
   stateless preview provides a durable single-use/one-time capability**:
   real paid or signed operations require an atomic durable redemption /
   idempotency store and registered-host credentials after the API exists.
9. Unknown simulated status is not a retry licence. Reopen the same valid
   ticket; do not silently issue a new one on unknown/expired outcome.

## Security and production boundary

The host registry only proves *the page/path was allowed by the sandbox*;
Referer is a browser check, not authentication. The preview HMAC signs
fictional claims, **not independently attested seller, real order,
participant or Agreement consent**. Real third-party hosting must use
authenticated backend-to-backend issuance, registered host/domain,
CSP/frame-ancestors, signed/nonce-bound capability, durable replay and
idempotency controls, a real settlement route eligibility/quote, trusted
provider callbacks or authenticated original reads.

The dedicated preview secret
`MINI_PHASE5_HOST_PREVIEW_SECRET` is configured for
`feat/mini-phase5-gate2-host-registry-20261110` **only in Vercel
Preview**. It is not in the repository or production environment.
If the secret, branch or origin is wrong, all ticket calls return 503/403.

## Owner tests

- Open `/phase5-store-host.html` and `/phase5-shortstays-host.html`.
  Tap Pay/Book; the existing Mini should open only after ticket issuance
  and server verification (same fictional price/terms as in Phase 4).
- Close and reopen Mini; the current sample review continues without
  issuing another ticket.
- Explore sample success/failure/unknown. Host NEVER says Paid/Booked.
- Try Mini ticket after expiry: it must show unavailable. Alter a ticket:
  unavailable. Try an unregistered host, wrong Origin or cross-host
  source: issuer/validator rejects it.
- Temporarily make the preview endpoint unavailable: the host must show
  no checkout, **not** fall back to client-known price or synthetic success.
- The official SecurePay logo remains linked. Main workspace, Estate UI,
  existing Gate 4 recovery endpoints and earlier sample test entry
  points are unchanged.

## Focused checks

`tests/securepay-mini-phase5-gate2-host-ticket.test.mjs` tests HMAC
integrity, branch/secret/origin, fixture digest/version, expiry, replay,
wrong host and path, body injection, fake actions, and no payment authority.
`tests/securepay-mini-phase5-shared-host-bridge.test.mjs` validates the
upgrade of the one launcher, safe failure, resume, unknown outcome, and
forged client message rejection. Both run within the same focused Mini
suite plus TypeScript and Vite build.

**Gate 2 remains awaiting owner's browser acceptance**; no production
merge, domain integration or real payment certification.
