# SecurePay Mini — owner Money self-test (13 Nov 2026)

**Scope: real Mini UI + synthetic source and provider outcomes. Not connected Money.**
Do not deploy to www.securepay.ke or call a provider.

## Entry
On the securepay-<sha>-james-8078.vercel.app isolated preview ONLY:
`/mini.html?demo=1&moneyTest=1`

This opens the same compact Mini shell in the existing synthetic
Amina/Njeri demo, with a dedicated **Test Money in Mini** view.
No new chat, Money system, KSN, credentials, ledger, fee quote or real API.
It reuses MiniFundingPreview and its 3-route state machine.

The amount must match the existing synthetic 40-chair Agreement
DEMO-AGR-041, KES 4000.00. If the fixture changes unexpectedly, fail
closed. The Money position remains NOT FUNDED always.

## Human test (owner)
1. Open `/mini.html?demo=1&moneyTest=1`. Choose **Amina · Buyer**.
2. For **Full amount after completion**, see KSh 4,000.00.
3. For **30% deposit + 70% balance**, see KSh 1,200.00 and KSh
   2,800.00, adding to KSh 4,000.00.
4. For **30/40/30**, see KSh 1,200.00 deposit, KSh 1,600.00 progress,
   KSh 1,200.00 completion. None are payable/approved.
5. Click **Test route** on ONE proposed stage. Choose **M-Pesa**
   and click **Try M-Pesa**. Open **Test a result** and choose
   **Confirm (test)**. Expected: fictional provider confirmation;
   **No money moved**; Money still NOT FUNDED.
6. Go back to the plan. Choose **Choice Bank**; try and select
   **Unknown (test)**. Expected: same attempt remains unresolved,
   no new debit/automatic retry and no "paid" message. **Keep waiting**
   may continue the fictional attempt.
7. Go back to the plan. Choose **PesaLink**; try and select
   **Fail (test)**. Expected: simulated failure, no payment; only
   then a *new* fictional attempt can be made.
8. On the same Mini, switch from **Amina · Buyer** to **Njeri · Seller**.
   The buyer's Money test options must disappear. Switch back to Amina.
9. Return to KS001, then **My SecurePay → Test Money** to confirm the
   same journey can be entered without the direct link.
10. Verify throughout: SIMULATION ONLY, source from fictional
    DEMO-AGR-041, no account/phone/bank detail requests, no fees invented,
    no STK prompt, no claim of real payment or settlement.

## What this test CANNOT certify
- Actual account and seller eligibility, agreement owner/consent, tariff
  amendments, verified tractor hours, km measurements or signed milestones
- Any real M-Pesa, PesaLink or Choice provider availability, webhook,
  idempotency, provider charges or regulatory safeguarded accounts
- Real funds held, captured, refunded, received or released
- Backend integration of M6 rate/milestone previews. This frontend remains
  guarded pending matched isolated SecurePayAPI deployment.

The separately connected **M6B1 measured-service pricing** candidate is
NOT a live authenticated backend in this browser demo.

## Evidence before 20-person cohort
- GitHub focused test `tests/mini-owner-money-test.test.mjs` verifies
  sample source, integer splits, role boundary and simulator reuse
- Vercel build must be READY with focused checks and TypeScript passing
- Real end-to-end Money safety tests require a **separate isolated API**
  with synthetic accounts, agreed and independently confirmed versions,
  authoritative measurement/evidence and provider sandbox, no actual funds.
- Never describe the success state as PAID. It is SIMULATED CONFIRMED.

**Product principle:** one Mini, one KS001, money follows a mutually
confirmed Agreement. This sandbox only teaches the UI behavior.
