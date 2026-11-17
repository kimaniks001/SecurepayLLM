# SecurePay Mini — Fictional Trading Playground, 17 November 2026

Status: owner-only interactive sample data, strictly nonfinancial and isolated; NOT a source of real merchant stock or payments.

## Entry guard
Enable ONLY through `/mini.html?miniTradeDemo=1` on an approved owner preview Vercel hostname (`securepay-<id>-james-8078.vercel.app`) or localhost. The normal Mini entry does not activate sample Store data. The latest owner preview may have Vercel deployment protection.

## Try buying
1. Open the demo URL, choose **Buy something**. Published example goods appear without having to talk to KS001.
2. Select an example product, e.g. Solar floodlight or solar irrigation water pump, open Store and **Add to basket**.
3. Return to search, tap **Maintenance** (a SERVICE at another Store), and add **Water pump maintenance · 12 months**. These retain separate seller references.
4. Tap **View basket**, choose **I'll collect**, and **Check latest Store offers**. The **Review your proposal** button becomes available only when the necessary choices and offer freshness checks are complete.
5. Review the item subtotal and independent parties. Optional **Ask KS001 about this basket** opens only a scripted, explicitly marked sample explanation.
6. Select **Send sample requests to each Store**. Click **Simulate acceptance** or **Simulate decline** per seller to test how multiple obligations affect the next step.
7. When all simulated sellers accept, fixed prices are known and collection is selected, **Simulate one payment · no money moves** demonstrates the ending. No live Agreement, SecureLink, receipt, merchant notification, money instruction or external payment exists.
8. Add a **Delivery** quote-required service and observe that consolidated payment rehearsal is blocked until a price is known. Combined delivery likewise remains blocked pending provider quotation.

## Try selling
1. Back to Mini; tap **Sell something**, which opens the existing Mini Business Settings **My Store** local example (Kamakis Traders).
2. Add/edit an offer, check fictional quantity and visibility, publish it in the sample.
3. Go back to Mini → **Buy something**, search for that new offer. The buyer Store reflects the same *in-memory* Business demo state. This integration shares only local React state, never the real BusinessGateway or production stock.
4. Use **Customer view** and **Enquiries** in Business Settings for illustrative quotation and Living Agreements.

## What else is testable
- In Mini, **Collect money** prepares a local draft; it cannot create a live collection or enforce a membership obligation.
- Sample help is labelled explicitly as scripted KS001, not the production agent.
- Refreshing the page resets in-memory Business Settings and basket; no data is recorded in real accounts.

## Catalog
- Kamakis Traders: solar floodlight, cement, and editable sample offers.
- Ruiru Pump House: irrigation pump and garden hose.
- Pump Care Services: installation and one-year care.
- Kamakis Transport: combined pickups and local delivery (price to confirm).
- Njeri Events: chairs and folding tables.
- Ruiru Field Services: tractor per hour and garden maintenance.

## Safety and engineering
- `src/mini/miniTradePlayground.ts`: local read-only implementation of the public StoreGateway API contract, no live network.
- `src/mini/MiniExperience.tsx`: opt-in preview host guard, same-app demo Seller/Buyer acting state, optional sample help.
- `src/mini/MiniBuyStore.tsx`: user-accessible sample offers, simple readiness, separate simulated merchant responses and explicit no-money payment rehearsal.
- `tests/mini-trade-playground.test.mjs`: catalog, source identity, seller-to-buyer consistency, fixed-price and quote-needed and guard checks; wired into Vercel `prebuild`.
- A browser clickthrough / screenshot review is still needed to score ergonomics. Do not deploy sample trading toggle or fictional financial data to production; release audit must exclude or fail-close these test surfaces.

## Feedback record
Record **BUY-D1** multi-store item+service, **BUY-D2** decline and recovery, **BUY-D3** combined delivery not ready, **SELL-D1** offer edit to buyer discovery, **HELP-D1** optional basket context, **COLLECT-D1** local draft. For each: screen recording, exact action that felt wrong, expected behaviour, actual state, and score 1–5. All results are owner *rehearsal*, not staging financial certification.
