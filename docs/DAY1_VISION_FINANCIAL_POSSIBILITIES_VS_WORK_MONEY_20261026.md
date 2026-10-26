# SecurePay Day 1 — Financial Possibilities in Vision vs Agreement Money in My Work

**Date:** 26 October 2026 · owner-directed architecture correction  
**Status:** authoritative **design direction** for morning review; UI/API implementation and human acceptance **not yet complete**.  
**Scope:** redesign the existing Money tool/UX if necessary. Do **not** preserve the current four-tab tool just because it was previously built. Preserve server-owned Agreement truth and existing secured execution mechanisms where suitable.

**SUPERCEDES** the earlier assumption in `DAY1_FINANCIAL_SERVICE_HIERARCHY_20261026.md` that the five regulated families should be the first-level *execution* chooser in My Work. The five families are mainly **Vision's financial possibilities catalogue**. My Work has only eligible Agreement funding/settlement rails.

## Product law: two separate jobs

| Concern | Vision | My Work |
|---|---|---|
| Human question | How can I make this dream financially possible? | How do we fund/settle THIS Agreement? |
| Money UI | **Financial Possibilities** | **Agreement Money** |
| Time | Months / years, scenarios / milestones | Exact Agreement and obligation / authorised step |
| Relevant categories | Banks, Mobile Money financial products where appropriate, MMFs, insurers, SACCOs; finance, invest, protect and savings possibilities | **Only eligible payment/funding/settlement mechanisms**, grouped by provider/rail family (bank vs mobile money etc.) |
| Actions | Explore → Compare → Calculate → **Add possibility to Vision** → revisit over time | Agreement sufficiency/acceptance authority → eligibility → authoritative quote/terms → explicit authorisation → trace |
| Execution | NO payment, investment, loan application, insurance purchase or rail activation from Vision | Only independently authorised actions at the correct Agreement version; never inferred from Vision |
| Saved state | Dream-associated, user-controlled **planning scenario**, assumptions/version and provenance | Canonical Agreement, versioned funding/settlement authority and real provider state |
| Provider facts | Published terms, verified offers where genuinely quoted, models & conditions, connected/not connected distinction | Institution with actual connected, enabled/certified and eligible rail for precise Agreement and action |

There is **no requirement to preserve** the current My Money / Borrow / Invest / Protect tool. That conflates planning with execution. It may be replaced/refactored into two clear context-specific experiences rather than built as a third shadow Money engine.

## Vision — Financial Possibilities

A person opens a particular dream (house, business, education, trip, chama) and sees an embedded **Financial Possibilities** experience. The person can browse distinct regulated **financial families**:
1. **Banks** — financial products like credit, savings and guarantees, plus relevant bank service costs if they matter to the plan.
2. **Mobile Money services** — wallets, savings and legally offered financial products relevant to the plan. Distinguish PSP functionality from a separate lender or investment product; never imply a payment itself occurred.
3. **MMFs / investments** — CMA-approved scheme/manager with scheme, fees, taxes, risk, variable yield, min funding, withdrawal and access conditions.
4. **Insurance** — coverage, exclusions, deductible, premium, start/end and provider, where genuinely offered.
5. **SACCOs** — membership requirements, shares, savings, loan eligibility, security/guarantors, rates, charges and withdrawals, as appropriate.

The above are **financial product families** in Vision, not mutually interchangeable transaction rails.

### For each potential option
- Show provider name **only if verified**, regulator/licence in the precise activity, terms source/date, product availability status, eligibility dependencies, applicable currency, minimum, fees, risks and actual liquidity.
- Let the person **compare** alternatives with honest calculations and explanatory language: total repayment, interest/fees, premium, charges, cash contributions, indicative net investment outcome, timing/withdrawal windows, and impact on project budget.
- Clearly label **Provider-confirmed term / Current published information / Scenario assumption / Projection (not guaranteed) / Information unavailable**. An *exact total* is only possible when source terms and assumptions fix it; don't claim exact lender approval, future variable rate, MMF return or final fees.
- Allow **Add this possibility to my Vision**, never *Apply*, *Invest*, *Pay*, *Purchase insurance*, or *Fund Agreement* inside Vision. If a provider's external site is offered, it must be clearly external and require consent; not claim a SecurePay transaction.
- Save a coherent `FinancialPossibilityPlan` with a dream ID, source/product snapshot date, scenario version, assumed amounts and dates, finance/cost breakdown, known vs projected amounts, risks, links to milestones, and private ownership.
- On the Vision board, show the **big picture**: target project price, own funds, proposed contributions, forecast shortfall, cash flow and timeline, debt repayment obligations, premiums, expected investment redemption and sensitivity/risk. Funding sources are not treated as savings in expenditure; debt adds repayments/charges. Do not double-count projected investment gains or balance as immediately spendable cash.
- Permit more than one planned possibility and scenario; show **mutually exclusive** alternatives separately unless the person explicitly models a compatible mix. Editable/removeable at any time without changing an Agreement.

**Suggested first-time language:** `How might you afford this?` → `Explore financial possibilities` → `See the full cost over time` → `Add to my Vision`.

### Example: build a KES 1,200,000 house over 24 months
The user may compare saving monthly, MMF accumulation with variable *illustrative* returns, a bank loan with total projected repayment (interest + fees), SACCO borrowing with member/guarantor rules, and construction risk insurance. The Vision should show cash needed by construction milestone, projected funding gap and realistic timing (including MMF redemption windows), not only a small card saying “Invest”. No funds move.

### Long-term plans
A saved possibility is linked to project milestones and may be reviewed/recalculated as terms, rates and timelines change. It does **not** automatically refresh/replace provider offers, execute a financial action or alert other participants. Keep historical scenario snapshots and editable assumptions; label stale sources.

## My Work — Agreement Money

From current Agreement: `Build with KS001 → Review/read and correct → Save / Share / Connect Money`.
The Agreement Money experience has **only** two responsibilities: **FUND** the exact Agreement obligation, and **SETTLE / release/return** through the existing authorised governance where appropriate. Do not embed lending, MMF investment, insurance shopping or long-term financial plans here.

- Present only backend-returned **connected, technically certified and currently eligible** mechanisms, grouped by the correct operational type and institution (e.g., **Bank routes** including connected RTGS/PesaLink where certified; **Mobile Money routes** including connected M-PESA where certified). A bank is not itself a “rail”; PesaLink is not the same level as a bank; SACCO or insurer listing does not create a pay button.
- Exact amount/currency, source, destination, role, institution, provider limits, fees (additive to preserved principal), quote validity, version and authorisation must be checked server-side.
- KES 1.2M: normal mobile wallet single-transaction cannot be shown as eligible merely because it exists; show bank route *only* when real bank adapter is certified and eligible. If none, `No eligible payment route is connected for this Agreement yet`; do not invent RTGS or automatically fragment payments.
- “Settlement” may mean returning/releasing/settling according to the actual Agreement Money contract. It is **not** a claim that releasing money proves external bank settlement or service completion.
- A person can navigate back to their Dream/Vision to rethink financing, but the Agreement execution chooser must not become a finance marketplace.

## Vision → My Work boundary
- **No implicit conversion:** a Vision financial possibility is NOT a bank mandate, accepted loan, insurance policy, investment position, payment instrument, saved beneficiary, funded Agreement balance or payment authority.
- An explicit `Continue to My Work` carries only reviewed *planning facts* (goal, budget assumptions, milestone needs), clearly marked as proposals; KS001 establishes actual counterparties, terms, consent and sufficiency separately.
- If a Vision possibility affects the amount a person proposes to pay, KS001 must verify it rather than treating projected financing as money received.
- Cross-surface revisions/reloads need identity access control and optimistic versioning; no raw private fund/account details disclosed to Agreement counterparties without consent.

## Current source gap (inspected 26 Oct)
- `Phase1LivingWorkspacePreview.tsx` presently filters the `Money` tool out of Vision (`contextTools`). Therefore the intended Vision Financial Possibilities is **not currently available** inside Vision through that tool.
- `UnifiedMoneyTool.tsx` currently combines `My Money`, `Borrow`, `Invest`, `Protect` in the Agreement-oriented Money tool and can hand off to actual Money. This conflates two product purposes and must be redesigned; do not just relabel the tabs.
- `DreamBuilder.tsx` supports Vision objects, milestones, exploration and revision-safe saves but **does not yet have a server-backed FinancialPossibilityPlan** or coherent long-range cost/cash-flow scenario. A text/sticky note is not sufficient to claim complete structured functionality.
- API AgreementFundingRailService / AgreementRailEligibilityService and existing execution controllers should remain the separate secure Agreement Money authority. Current inbound discovery enumerates `MPESA_STK` and `PESALINK`, not a certified bank RTGS adapter.
- `MoneyRailCeremony.tsx` contains bank/mobile/PesaLink in one sample-level list and needs the correct operational hierarchy if it remains in My Work.
- Directory listing or a calculated estimate is not a certified, executable financial product offer.

## Engineering and human acceptance (NOT DONE)
1. **Design-first**, owner-reviewed clickable UI concept in exact approved Living Workspace visual language. Two context-specific Money experiences, not a new site or a third controller.
2. Vision has discoverable Financial Possibilities inside the private Dream, with provider/service hierarchy, cost model inputs/assumptions, side-by-side scenarios, save/add-to-Vision, big picture and milestone timeline.
3. My Work Money tool only displays exact Agreement funding and settlement options, with real backend permission/eligibility gates and correct bank/mobile hierarchy.
4. Test Vision no-execution guarantee: no POST payment, loan application, MMF subscription/redemption, insurer binding or rail initiation from browsing, calculating or saving. Avoid external provider disclosure without consent.
5. Test KES 1.2M, 24-month house long-term scenario (savings, MMF variable yield, bank/SACCO borrowing, insurance); test honest fee/interest/repayment math, scenario changes, provider terms missing, scheduled milestone gaps and no double counts.
6. Test Vision→My Work transfer of *proposal only*, user-selected, no authoritative Agreement mutations until KS001 review.
7. Test KES 400 delivery in My Work: Agreement's exact pay/settlement eligibility only, no lending/investing; high-value bank rail and empty states, no unsupported payment methods.
8. Desktop and phone human tests on an isolated preview with real permissions and exact SHA; no guessed provider facts.
9. Implement only on dedicated morning branches after owner reviews this architecture, with separately reviewed API needs, regressions and CI. Do not merge/deploy production from this specification.

**One-line principle:** `Vision shows how a dream might become financially possible; My Work moves only the money authorised by an Agreement.`
