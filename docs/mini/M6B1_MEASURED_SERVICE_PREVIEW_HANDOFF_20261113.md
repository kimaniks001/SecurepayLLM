# M6B1 — Tractor and transport per-unit pricing inside Mini
**13 Nov 2026 — committed source code, NOT a certified app.**

The frozen, signed-in one-KS001 Mini → My Agreements → any existing
authorized Agreement detail now includes a compact expandable
**Hourly or distance-based charges — Proposal only** row.
It is enabled only with the same isolated M5 quotation staging flag
(`VITE_SECUREPAY_M5_QUOTATIONS=enabled`); it is NEVER in the synthetic
Amina/Njeri demo or unconfigured production UI.

The caller may compare:
- Tractor: KSh 5,000 per hour × 4.00h = KSh 20,000; optionally 6h cap.
- Transport: KSh 400 per trip + KSh 50/km × 50.00km = KSh 2,900;
  optionally max 100km.
- Distance-only, alternative rates, reported units (hundredths),
  alternative caps and proposed usage-verification method.

Mini reads the canonical Agreement version ID/content hash from the
existing authenticated AgreementGateway.version, then sends proposal
facts to `POST /api/v1/agreements/{id}/measured-service/preview`.
The API rechecks current Agreement version and private read permission,
performs exact integer money arithmetic and returns only proposal status.
Mini checks all numbers, rate/version/cap echoes and the truth flags
`tariffAgreed=false, usageVerified=false, supplierApproved=false,
paymentEnabled=false, executable=false` before displaying.

The user has **not** contracted a tractor or ride merely by selecting
this calculator. This slice neither persists tariffs nor records verified
journeys, crew hours, deposit, payment method or money received.

The next M6B step must add canonical, separately confirmed rate terms
and evidence-based measured usage, **then** treat the calculation as a
contracted amount subject to any actual regulated payment choices.
The existing CappedMeasuredSettlementEngine must be reused for money
rather than duplicated or auto-enabled by this UI.

Release status: draft PR only. Compile, rate precision, real buyer/operator
roles, route and timesheet evidence, account isolation, 20-person UAT and
separate staging are deferred to later certification; no production changes.
