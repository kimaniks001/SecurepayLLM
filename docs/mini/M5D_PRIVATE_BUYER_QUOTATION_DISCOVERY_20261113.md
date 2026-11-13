# M5D — “Quotations for me” in existing Mini My Agreements
**13 November 2026 — draft build, no test certification or production deploy.**

M5C [Mini PR #289](https://github.com/kimaniks001/SecurepayLLM/pull/289)
established authenticated seller quotation issuance and buyer quote-to-Agreement
handoff. M5D closes the manual reference discovery gap. The buyer opens the
existing My SecurePay → My Agreements → **Review a seller quotation** details,
where a bounded **Quotations for me** list appears above the original manual
reference input.

The new `StoreQuotationGateway.received(limit=10)` only calls
`GET /api/v1/store/quotations/received?limit=10` with the existing
first-party authenticated HTTP client. The API derives the ACTIVE individual
buyer KS and ID, never accepts a buyer KS search field. Mini validates every
server-recorded SellerQuote before displaying, clearly marks a stale/expired
Store source, and refetches the individual quote by UUID on the **Review**
action. Creating a DRAFT Agreement remains a separately chosen action.
The original reference entry still works for a seller sharing privately.

The fake Amina/Njeri demo continues to *hide* the real backend quote flow;
this build adds no synthetic quotation visibility or invented buyer permission.
The single KS001/AgentController conversation, Store layout and Agreement
invitations were not duplicated.

**Financial safety:** listing, viewing or refreshing is NOT buyer consent,
seller acceptance, stock reservation, SecureLink creation, escrow, payment,
execution or settlement. Gate 2B's blocking guards still apply to actual
quote-born Agreement products and executable obligations.

**Final certification deferred by owner:** the backend M5D branch must be
built together with #411–#415 and Mini #288–#289. Verify private buyer and
seller accounts, wrong KS cross-account denial, only the named buyer sees
their items, no deduced other buyer IDs, stale and expired states, reload
after login/signout, selecting an item re-reads the server, exact Agreement
version/hash and no Money throughout. The final tests must confirm both
endpoint authorization and correct UI behavior. GitHub Actions currently
reports startup_failure; no claim that this UI or API compiled or deployed.

This step adds **pull-based private discovery**, not automatic push
notifications; notification delivery is a separate follow-up to make buyer
handoffs more convenient without weakening identity safeguards.
