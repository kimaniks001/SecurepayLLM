# SecurePay Mini — customer-build housekeeping
Date: 18 November 2026 · Isolated review branch stacked on Mini Pay 2C–2F.

## What the customer sees
Mini starts **without sample Shops, fictitious workers, invented amounts,
scripted Agreements or simulated Money**. The approved Buy, Sell, Pay,
Collect and Ask KS001 routes stay in place. A deliberate payment, Agreement
or real Store read still requires a genuine first-party connection; an empty
account is shown honestly instead of being filled with demo transactions.

Recognisable live Agreement titles and the discreet-finances / show-on-tap
design from Phase 2B remain. No giant anonymous "Agreement" cards return.
A browser query such as `?miniTradeDemo=1`, `?miniBusinessPreview=1`,
`?sellPreview=1` cannot activate fixtures in the ordinary release build.
No simulated payee is ever marked paid.

## What was cleaned in engineering
1. Default and Vercel customer builds require a compile-time, NOT URL-controlled
   fixture gate. A separate `SECUREPAY_MINI_RELEASE_BUILD=0` with
   `SECUREPAY_MINI_OWNER_FIXTURES=1` is required for **isolated engineering
   fixtures only**; without both, the sample state is unavailable.
2. The live Mini initialises an **empty**, non-transactional local preview
   model rather than `copyDemo()`. The Pay example array compiles empty.
3. The real release swaps the scripted local Agent/API, fake account credentials
   and fake Money provider callbacks for an inert fail-closed module. It also
   omits the owner-only Money simulator, simulated store-checkout confirmation,
   fictional Business Settings, sample Agreements, sample KS001, and
   Community Saver test screens from customer compilation.
4. Standalone fake `business-settings.html` and checkout demo HTML entries
   are excluded from the release. Known copied demo host scripts are deleted
   from **build artifacts only**, not the source repository.
5. A release audit rejects known synthetic Agreement IDs, fictional merchant
   names, worker payees, automatic sample payment confirmations, fake session
   credentials, and test HTML/JS files. The Vercel build command runs checks
   and the release audit as a deployment gate.
6. Old three fixture-only `sessionStorage` keys are pruned only in a customer
   Mini tab. **Do not clear** canonical account tokens, pending real Agreements,
   genuine signed-in server records or a person's own locally saved draft.

## Preserved deliberately
- Canonical first-party read and identity contracts; Phase 2C–2F nonpayable
  verified-position gateway; Seller Store routes, Buy basket, SecureLinks,
  Business/Workspace boundaries, privacy and Pay new preparation.
- The source-only, clearly labelled fixtures and test doubles used in repeatable
  engineering tests (NOT imported into customer build). They have not been
  deleted from Git history, and no test will be replaced with a fake pass.
- The separate Living Workspace and SecurePay for Business applications. Their
  real data was not mutated. Only the obsolete **fictional** standalone
  Business Settings preview HTML entry was excluded from Mini release.
- No database deletion, live production deployment or regulated provider payment.

## Verification before approval
- Full Mini prebuild regression and focused stage checks; compile and typecheck.
- Customer release output audit must pass for all default build artifacts.
- Only the isolated review preview is shareable; production promotion is a
  separate decision, after the remaining Phase 2 Java 21/PostgreSQL gates.
