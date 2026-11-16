# SecurePay Mini — One Product Convergence Contract
Date: 17 November 2026
Status: Implementation roadmap; not production certification.

## Product decision (frozen)
SecurePay Mini is the principal SecurePay application for personal and Business use.
We will not create a different full-size desktop product to rescue missing functionality.
When useful, the SAME Mini components and Agreement records may expand to use a larger viewport.
Desktop Business Desk previews are design references only, not a second required workflow.

Preserve the approved Mini visual identity: warm ivory, forest green, small Kenyan bangle and
proudly.ke, human-facing KS001, four everyday actions, quietly unfolding layers.
No simulated data, developer notes, phase labels, or internal governance is permitted
in customer release surfaces.

## Source-of-truth boundaries
1. A signed-in individual KSNumber is not interchangeable with a Business KSNumber.
   Business representation must be checked server-side per action, including Store
   edits, staff roles, discovery settings, quotations and permissions.
2. Store offers, stock and versions are server-owned. Only verified availability
   may be asserted to buyers by Store Guide/KS001. Seller changes must trigger
   fresh source checks before relying on a quote.
3. SecureLink carries the authorised evolving Agreement record across channels.
   It is not the channel and may not expose unauthorised conversations.
4. Agreement acceptance is independently authorised by each party against a
   known version. Work, evidence, dispute and completion must follow that record.
5. Money follows the Agreement. Provider execution, reconciled credits, releases,
   refunds and fee quotes remain separately gated. No simulation can ever become
   live funding status or permission to pay.
6. Community discovery, Shortstays, transport and storage each require host
   eligibility/verification. Being a Store or Business alone grants no publishing right.
7. eTIMS integration is a supported opt-in connection, not an exemption from
   legal invoicing requirements or a shortcut for VAT claims.

## End-to-end acceptance journey — single Mini, same KS001
- Buy: search for something, inspect a real offer, discuss with KS001,
  review seller terms, form an Agreement, follow fulfillment and only
  then see relevant Money status.
- Sell: switch to an authorised Business, manage a real Store and offers,
  confirm availability, answer an enquiry, prepare the seller quotation,
  issue a SecureLink, monitor both-party review and actual work.
- Collect/pay: build clear obligations and recipients; quote routes/fees
  only from canonical sources; never send an unsupported payment.
- Business: invite/revoke roles, manage Store Guide knowledge and connected
  communities, invoices, plan and security without leaving Mini.
- Recover: reload, network loss, retries, stale offers, rejected approvals,
  disputed milestones, missing provider callbacks, revoked authority and
  abandoned flows never create duplicate accepted terms or payment instructions.

## Gates retained (do not renumber or skip)
- Gates 7/8: canonical Agreement and Money safety, evidence and transition proof.
- Gate 9: certified provider integration, callbacks, reconciliation and recovery.
- Gate 10: 20-person acceptance once builds and engineering converge.
- Gate 11: controlled production release, no synthetic identities or Money enabled.

## Verified current implementation vs unfinished work
- Approved compact Mini: retained.
- Authenticated Store, Business representation, public Store search,
  quotations and My Agreements: existing first-party modules; require
  integrated staging verification with authorised roles.
- Business Settings visual interaction: currently fictional in-memory
  demo records; DO NOT present as stored Business profile or real stock.
- First convergence slice: Business Settings can hand off to the EXISTING
  MiniSellerStore via the first-party KS001 session; gated by approved API
  origin and existing identity/Business permissions.
- Still unfinished: real Business Settings persistence, cross-surface
  permissions, certified provider stages, browser E2E across signed-in
  seller/buyer and release audit.

## Engineering rule
Whenever a Business capability is added, the acceptance test must show
how it works in Mini, which existing authority it uses, which persistent
records changed, and how a user recovers from a failure. A menu entry
or functional fictional prototype is not sufficient.
