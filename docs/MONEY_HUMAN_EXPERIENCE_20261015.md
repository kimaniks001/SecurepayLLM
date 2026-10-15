# Money as a human experience — 15 October 2026

## Product contract

**Money follows the agreement.** Financial possibilities support a KS holder's existing Agreement, trade, dream or future plans; the KS holder is not shopping through institution advertisements. The four doors are **My Money · Borrow · Invest · Protect**. An institution's regulated Store/capability catalogue is a supply-side surface, not the buyer's starting page. Pay this Agreement remains simple and prominent when appropriate.

## This development slice

Branch: design/living-workspace-vision-circle-20261014, draft PR #131. Development preview only; not merged or deployed to production.

- Authenticated KS holders land in **My Money** with real Agreements. Signed-out visitors may explore clearly marked sample Agreements.
- Human Agreement cards show purpose, proposed amount (not payment confirmation), attention status, **Read Agreement**, and **Pay this Agreement / View Money & next step**. Next-actions are drawn from the backend.
- Selecting an Agreement exposes verified funding positions, movement preflight, and an explicit payment-rail ceremony.
- The rail ceremony shows only backend-listed funding options for real Agreements; signed-out examples are labelled illustrative. The chosen rail is a UI preference, never authority.
- **Read Agreement** opens the existing Agreement experience with an ID-only in-memory handoff. The selected Agreement is reloaded and independently authorised.
- **Pay this Agreement** hands off to the canonical Money journey with Agreement and selected-rail preference carried in memory, never in a URL. That journey revalidates funding options and Agreement version before generating a real backend quotation. No preview payment mutation.
- Canonical Money now exposes the financial decision at the point where it is useful, including explicit alternative rails, current quote review and payment attempts separated from browsing. Changing rail/requoting is blocked while a payment attempt is unresolved.
- **Borrow, Invest, Protect** explain possibilities in the context of a specific Agreement or dream and may ask KS001. No application, loan, investment account or insurance policy is fabricated.
- Authenticated regulated-partner list remains factual discovery. Listing status and capability flags never imply a product is approved for the buyer.

## Institutional identity and product boundaries

The current AgreementFundingOptionResponse identifies a rail and quotation availability, but **does not verify the legal institution handling that particular transaction, its binding service role, or provider product terms**. The UI therefore says **institution not yet confirmed**. A separately listed financial partner cannot be silently assigned as provider. To deliver the final complete institution ceremony, the backend must supply and verify legal provider identity, service role, terms, version-bound economics, and alternatives as appropriate.

An insurer's coverage requires verified quotes, policy terms and exclusions, underwriting/acceptance, and confirmation of effective cover. A loan requires real financing approval and repayment disclosures. Investment recommendations need appropriate risk and suitability controls, with no guaranteed return. These actions are **not live features of this preview**.

## Test journeys

1. Signed-out: Tools → Money → My Money. Select the sample bathroom, furniture and chama; inspect next steps and illustrative M-PESA, Bank and PesaLink choices. No payment results.
2. Signed-in: Tools → Money loads actual Agreements before sample. See Needs you / Taking shape / In progress / Completed, then open an Agreement; no proposed amount is represented as funded.
3. **Read Agreement** routes to real Agreement review. **Pay this Agreement** routes to its exact canonical Money context. No private identifiers in the URL.
4. Real Money must show backend-provided rails only, their limits, quotation availability and alternatives. Select a rail, request a fresh Agreement-bound quote and examine principal, charges, payers, total payable and expiry. Do not initiate by selecting.
5. A changed Agreement or expired quote must not authorise funding. Unresolved payment attempts must not invite a new rail/requote.
6. Return to Borrow, Invest, Protect; discover suitable possibilities without invented provider approvals, insurance coverage, investment returns or applications.

## Boundaries

The preview bridge remains strictly allow-listed, providing authenticated read-only Agreement Money and regulated-partner discovery and no payment mutations. The original approved Store baseline remains on branch baseline/stores-approved-20261015 at commit 1a2b91278cc726ebb314cfe7e12a32d26b50248e. Focused tests, wider certifications and manual human walkthroughs must be reported separately. Do not merge or deploy to production without explicit user permission.
