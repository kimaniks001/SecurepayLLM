# SecurePay Phase 4 — Add a Financial Method in Mini **and** Main Site

**10 November 2026 · simulation only · SecurePayAPI unavailable.**

## Owner direction and unified behaviour

A person must be able to add, select, remember, or remove a financial-method
preference both from **SecurePay Mini checkout** and from the **main SecurePay
Money workspace**. This does NOT mean arbitrary institutions can join our
regulated payment system by customer request.

To preserve the single-journey architecture, both experiences use the **same
pure alias validator and per-tab fictional-method storage schema**:
`src/mini/miniAddedPaymentMethods.ts`. There are no new payment APIs,
payment engines, rails, accounts, external connectors or provider endpoints.

## Implementation surfaces

1. `MiniFundingPreview`: + Add payment method below the already-approved
   Choice Bank, M-Pesa and PesaLink fictional payment rails. Saved labels
   map back to one of those same three simulator rails; they never imply
   provider activation.
2. `MiniGate3Funding`: same add-method picker in the existing
   server-simulated checkout, but cannot start any attempt on an unconnected
   OTHER provider; no changed server payload, no additional rail codes.
3. `MoneyExperience`: compact, optional expandable
   "Payment methods · practise adding a method" manager below Money Home's
   canonical Agreement dashboard.
4. `MoneyRailCeremony` in the existing three-panel Living Workspace:
   the same manager is available **only in sample mode**; actual
   backend-reported rail options and `quoteAvailable` authority are
   unchanged.
5. `SamplePaymentMethodsPanel` renders mobile-friendly Tailwind on the
   main site; `MiniAddedPaymentMethods` renders native Mini styling.
   Both share validation, identical labels, routes and browser-tab storage.

## Privacy and limits

- User may store at most **five fictional nicknames**, 2–36 characters,
  with restrictive allowed characters.
- Form explicitly says **do not enter real bank/mobile account details,
  phone numbers, PINs, passwords or credentials**. Common sensitive
  patterns are rejected. Nothing is sent to a remote server.
- `sessionStorage` is tab-local, optional and safely unavailable;
  storage is not linked to a login, identity or device, and cannot prove
  an account exists. The identity/financial provider flows remain separate.
- Added method `route` must be one of `CHOICE_BANK`, `MPESA`,
  `PESALINK`, or `OTHER`. OTHER is a visible **not connected**
  preference and is never eligible to simulate payment.
- Every stored object always has:
  `simulationOnly:true`, `providerConnected:false`,
  `accountVerified:false`, `paymentEnabled:false`.
  Imported malformed or forged saved data is discarded.
- This feature **must never overwrite backend-listed eligible
  Agreement-funding options, capture funds, authorize a payment, mark
  an Agreement accepted, create a provider account or bypass a quote**.

## Owner acceptance

A. Open Store or ShortStays full journey in Mini and reach "Pay with".
B. Tap **Add payment method**; give a harmless nickname, choose M-Pesa test
   route, and save. Selection uses the **existing** simulator.
C. Add "Local SACCO" using "Other financial provider". This stays marked
   not connected and cannot start a payment.
D. Reload in the same tab. The labels remain; remove either. Attempt to
   save a phone number, account number, duplicate, or 6th label: blocked.
E. Open the main SecurePay Money page while signed in, expand
   **Payment methods · practise adding a method**. Add/select/remove
   a fictional method using exactly the same model and safety wording.
F. In the Living Workspace sample Money rail ceremony, expand
   **Add or manage a payment method (sample)**. The real-mode backend rail
   and pricing controls must be unchanged.
G. Trigger Mini's unknown provider status: adding or changing an alias
   cannot silently retry; the original unknown attempt remains unresolved.

## Future real connection

SecurePayAPI/provider onboarding later determines verified institutions,
account linking/ownership, eligible rails per Agreement/currency/participant,
fees, quote validity, payment initiation, settlement and monitoring.
Only then may verified user methods appear in authenticated account settings
and become selectable for real transactions. The current prototype is an
interaction model, not provider integration or a bank-account vault.

## Evidence

`tests/securepay-mini-phase4-add-payment-method.test.mjs` validates
alias privacy, limits, invalid/forged state, existing three rail mapping,
OTHER fail-closed, both Mini rail pickers, and the main-site Money/Living
Workspace integration. It runs inside the existing Mini focused preview
test script alongside the prior Phase 0–4 checkout regressions and the
TypeScript/Vite build.

**Status**: Draft branch. Owner browser acceptance outstanding. No real
payments or provider activation and no production merge.
