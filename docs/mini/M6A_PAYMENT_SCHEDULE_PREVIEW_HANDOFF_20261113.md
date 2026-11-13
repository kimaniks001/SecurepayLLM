# M6A — compact payment-timing comparison inside frozen Mini
**13 Nov 2026 — code candidate, tests/deployment deferred**

The existing **My Agreements → Review a seller quotation** continues to
carry the one true quote → buyer draft → original seller invitation →
independent current-version confirmations → NON-EXECUTABLE staged plan.

After that explicit staged plan is recorded, a compact expandable
**Compare payment timings — Preview only** tool becomes available in the
same Agreement detail; no extra KS001, checkout, Money panel or Store layout
change. It is hidden from the synthetic Amina/Njeri demo together with M5
real quote actions.

The customer can compare:
- full amount after delivery/verification;
- proposed deposit plus final balance;
- proposed deposit, evidenced progress and completion shares;
- optional route preference (M-Pesa, PesaLink, Choice Bank, another,
  or *To agree*) with no real provider eligibility claim;
- direct or regulated partner safeguarding **preferences** (or To agree);
  safeguarded arrangements are optional and not activated.

Mini never calculates a canonical payment amount for authority; it sends
only a schedule choice/percentages, route/handling preferences and the exact
staged plan/version IDs/hash to SecurePayAPI. The response has to reconcile
to the server's canonical principal in integer minor currency; all
paymentEnabled/executable/recorded/sellerScheduleApproved fields must be
FALSE. Any mismatch fails closed.

No proposed schedule is stored, accepted, sent, signed, funded or settled
from M6A. A changed schedule is a *new set of terms* requiring the buyer
and original seller to independently accept a canonical Agreement amendment
before a future qualified payment rail could ever execute. Prior seller
confirmation is not approval of the new percentages.

The M5 gate `VITE_SECUREPAY_M5_QUOTATIONS=disabled` still hides the entire
real quoted Agreement pathway by default. Only matching isolated API and
Mini development candidates can enable it for later staging. No live
`www`, no 20-person group yet, no API payment mode change.

Testing deferred as agreed: TypeScript compile, unit/schema/client contract,
two different authenticated accounts, stale and revoked seller source,
price rounding, UI reload, route preferences not mistaken for provider
eligibility, and independent seller confirmation.
