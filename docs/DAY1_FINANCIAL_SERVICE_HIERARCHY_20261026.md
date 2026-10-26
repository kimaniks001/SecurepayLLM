> **REVISED 26 October 2026 — superseded navigation decision:** This document remains useful for regulatory families, provider verification, dynamic limits and rail certification, but its original proposal to present **all five families as the My Work execution chooser is withdrawn**. Financial product families and multi-year scenario planning belong in **Vision → Financial Possibilities**. My Work Money is **only** Agreement funding/settlement via eligible bank/mobile payment mechanisms. Use [DAY1_VISION_FINANCIAL_POSSIBILITIES_VS_WORK_MONEY_20261026.md](DAY1_VISION_FINANCIAL_POSSIBILITIES_VS_WORK_MONEY_20261026.md) as the controlling user-experience and tool-design specification. No production code change or certification is implied.

# SecurePay Day 1 — Money institution hierarchy & Agreement eligibility
**Owner direction:** 26 October 2026, morning session  
**Status:** DESIGN + ACCEPTANCE SPECIFICATION; NOT implemented or certified.  
**Branch:** `SecurepayLLM:day1/morning-fixes-20261026`  
**Issue:** https://github.com/kimaniks001/SecurepayLLM/issues/166  
**Cross-repo register:** https://github.com/kimaniks001/SecurePayAPI/issues/342

## Product decision
The person must not see "Bank", "M-PESA", and "PesaLink" as equivalent list items. Offer five separate, consistently ordered **financial service families**:
1. **Regulated Banks** — CBK-regulated banks, bank accounts, high-value settlement, transfers, and verified financing/guarantee products. Rails underneath an eligible participating bank may include RTGS/KEPSS, PesaLink and other authorised bank mechanisms, depending on the exact adapter and product.
2. **Mobile Money** — CBK-authorised PSP/wallet services (e.g., M-PESA only if enabled/certified), with provider/transaction/wallet/day limits distinguished.
3. **Insurance** — IRA-regulated insurers and relevant approved intermediaries, covering insurable Agreement risks. **Protection product, not a payment rail**; no implied cover before insurer issuance.
4. **Money Market Funds (MMFs)** — CMA-regulated/approved collective investment schemes and responsible licensed managers, relevant for suitably held/invested funds where contractual/regulatory conditions allow. **Investment product, not an escrow/payment rail or automatic holding account.** No guaranteed return or instant liquidity assumption.
5. **SACCOs** — SASRA-licensed/authorised SACCOs for their specific regulated activities; membership/loan/payment capability must be verified. Not every cooperative is supervised by SASRA.

The UI family is for human understanding; internal domain must distinguish **institution class**, **regulatory authority and scope**, **licensed service/product**, **payment/settlement rail (where applicable)**, **the institution that actually performs each regulated role**, and **Agreement-specific eligibility**. One institution may offer different services across families under distinct approvals. Do not conflate regulator approval with a live technical connection or issued offer.

## Agreement → Money interaction
**KS001 Build → Read/Correct Agreement → Save / Share / Connect Money → choose service family → verified institution → applicable service/product → actual eligible rail/quote/terms, where available → explicit consent under backend authority.**
- Save a draft with its actual status. Do not imply counterpart acceptance.
- Share/invite only where permission/version/recipient/identity consent permit; invitation is not acceptance.
- Connect Money may open exploratory discovery before the Agreement is accepted, but executable funding controls require backend-established Agreement state, payer authority, valid version, money preflight, compliant provider economics and actual eligible method.
- Preserve canonical Agreement context and a reversible KS001 return, not a new Agreement engine or a second Money controller.

## What the chooser should actually show
**Top-level families** always have their own headers. Inside each family:
- Show **Connected and eligible for this Agreement** from authoritative backend capabilities only (including verified institution, supported currency, maximum/minimum per transaction, daily/cumulative constraints where relevant, funded obligation/current agreement version, originating payer channel, destination requirements, technical certification/enablement and availability).
- Show **Explore other regulated institutions** separately from executable rails. A directory is not a partner offer, rate quotation, approved loan, active insurance policy or available settlement rail.
- If no eligible routes exist, say so truthfully and explain which constraint is known. Do not suggest trying arbitrary transfers or silently fragmenting the principal to evade rail limits.
- Present fees/provider charges, taxes and SecurePay fees separately from preserved Agreement principal. Quote and preflight must use the exact Agreement/obligation/version and current authorised provider economics.
- Show future/known products only with explicit **Not connected / Information only** wording; never fabricate banks, insurers, rates, savings returns, availability, live credit approvals or partner commitments.
- Categories can be browsed to learn about financing, savings or protection, even if they do not directly carry a payment.

## Large-value scenario
**Illustration: KES 1,200,000 Agreement.**
- Standard mobile-money payment is **ineligible for a single KES 1.2M transfer** under published Kenyan wallet/payment limits. PesaLink's publicly stated per-transfer limit is KES 999,999 subject to participant-specific rules. The frontend must use *provider-certified dynamic limits and real actor/Agreement eligibility*, not these static explanatory figures as platform-enforced financial policy.
- If a *genuine connected and certified* bank route supports the complete KES 1.2M receivable, it may appear under Banks; otherwise show **No verified funding route yet** and an **Explore regulated banks** path.
- Do not display "Pay with Bank" if SecurePay lacks an actual eligible bank funding adapter; bank presence in a directory is not proof of executable RTGS integration.
- Never automatically split the payment into fragments, change the payer, change the receiving institution or reclassify insurance/MMF/SACCO as a payment method.
- The body of the Agreement determines rights; the chosen financial arrangement must respect this.

**Small-value scenario: KES 400 delivery of a letter to Tom.**
- A suitable enabled/certified mobile rail might qualify for the amount. Tom is an *intended recipient of the letter*, not necessarily the payee.
- Material performance details/parties/conditions remain subject to KS001's canonical sufficiency check; `reviewable` does not itself authorise money.
- Present other categories for exploration, not all as equal one-click ways to pay KES 400.

## Current implementation facts from source (as of 26 Oct morning)
- `SecurePayAPI/AgreementRailEligibilityService.java` currently enumerates only inbound `MPESA_STK` and `PESALINK`, and checks certification, adapter eligibility, currency/amount, payer source mapping (PesaLink) and ability to initiate.
- `SecurePayAPI/AgreementFundingRailService.java` returns executable quote-capable funding options only, after Agreement funding authority and economic checks. The API response `AgreementFundingOptionResponse` is flat (`railCode`, `displayName`, `currency`, min/max, `quoteAvailable`); it has no family/institution/product metadata.
- `SecurePayAPI/FinancialInstitutionClass.java` already names BANK, SACCO, ASSET_MANAGER, INSURER, INSURANCE_INTERMEDIARY, PAYMENT_PROVIDER and OTHER_APPROVED_FINANCIAL_ENTITY. Not enough for family-specific live product/rail certification.
- `SecurepayLLM/MoneyRailCeremony.tsx` currently has M-PESA, Bank, PesaLink example options in a single row; samples are not live availability.
- `SecurepayLLM/SimpleMoneyDashboard.tsx` displays backend funding options and separate categories Banks/SACCOs/MMFs/Insurance, but not this connected, institution-first journey.
- `SecurepayLLM/MoneyPartnerFacts.tsx` lists directory facts with explicit non-offer qualifications. Do not promote it to a verified-offer engine.

## Engineering acceptance and certification (not yet met)
1. Preserve the approved Living Workspace. Build one recognisable financial-service family selector, institution/service/rail drilldown, and separate informational discovery; no one flat row of banks + individual rails.
2. Server-backed mapping and filtering must be the authority for eligibility. **Do not infer bank service, product class or provider availability solely from rail display names.**
3. Verify regulatory status and **specific licensed capability** for each institution; enforce environment, adapter certification, eligibility, user/member identity, KYC/AML and appropriate banking/service boundaries.
4. On KES 400, KES 250,000, KES 999,999 and KES 1,200,000 synthetic scenarios, no ineligible/uncertified rail appears as executable. Test boundary conditions independently for transaction/day/wallet/provider-account limits, including fees if relevant.
5. Quote→intent→initiation require explicit human review and immutable, version-bound Agreement economics. Include strict negative tests: no money by browsing/selecting a family, no quote from directory-only listing, no invented credit/insurance/MMF offer, no silent split.
6. Test Bank vs Mobile Money hierarchy in desktop/mobile, empty states, institution unavailable/suspended or regulatory status unknown, switching categories, return to Agreement and KS001 continuity.
7. Validate current source gaps with `SecurePayAPI`; implement missing authoritative metadata/eligibility as a separate API patch only on API morning branch. Do not invent frontend-only capabilities.
8. No PR release, main merge or production change without owner approval and passing real staging integration tests.

## External source references (for regulatory/explanatory review, NOT hardcoded commercial rules)
- CBK National Payments: https://www.centralbank.go.ke/national-payments-system/
- CBK mobile-money limits release: https://www.centralbank.go.ke/uploads/press_releases/823121420_Press%20Release%20-Increase%20in%20Mobile%20Money%20Transaction%20and%20Wallet%20Limits.pdf
- CBK bank supervision: https://www.centralbank.go.ke/bank-supervision/
- PesaLink description (IPSL): https://www.ipsl.co.ke/about-us
- CMA approved CIS list: https://licensees.cma.or.ke/licenses/15/
- SASRA regulated SACCOs: https://www.sasra.go.ke/regulated-saccos/
- Kenya National Treasury subsectors: https://fsad.treasury.go.ke/mandate
