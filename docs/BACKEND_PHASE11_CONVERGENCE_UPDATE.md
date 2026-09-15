# Backend Phase 11 Convergence Update

Date: 2026-09-15

SecurePayAPI PR #207 is now open on `feat/securepay-phase11-referrals-plugs-masters`, stacked on Phase 10.

This supersedes the migration ledger's earlier wording that Phase 11 was merely forthcoming.

## Product/backend convergence now verified

### Source -> Trade

The Phase 10 convergence audit found that Phase 5B's existing `ExternalFactSourceKind` + `FactAdoptionRequest` engine already provides the backend source/adoption continuity needed for the universal source-to-trade boundary. Phase 11 adds `MASTER_OPINION` as an external fact source kind rather than creating a second SourceReference authority engine.

Production implication:

- preserve Bolt's `SourceReference` view/provenance model;
- map explicit `Use this` to the backend candidate/adoption engine where supported;
- do not create a parallel frontend authority model merely because the Bolt type is richer than the backend DTO.

### Referral / Plug provenance

A mature pre-existing Market Network domain already contains:

- `CustomerPlugRelationship`
- `AgreementPlugAttribution`
- `AgreementPlugSharePolicy`

and already implements the locked KeyContract referral commercial rule under Agreement Plug Lifetime Share:

- reward is 10% of the SecurePay platform fee;
- qualification/entitlement is tied to authoritative settlement;
- it is not 10% of Agreement value;
- it does not rewrite protected Agreement Money.

PR #207 adds the customer-facing per-Agreement projection:

`GET /api/v1/agreements/{id}/plug-attribution/referral-status`

with backend-owned states:

- `NO_INTRODUCTION`
- `CANDIDATE`
- `NOT_QUALIFIED`
- `QUALIFIED`

Frontend implication: referral state must come from this projection / mature reward authority, never from SourceReference presence or local UI progression.

### Plug

Existing `PlugEnrollmentRepository` and `CustomerPlugRelationshipService` are the current backend foundation. PR #207 adds structural rules preventing Plug code from gaining Agreement or Money authority.

Retained backend gap: the rich Bolt Plug profile fields (connection domains, geography/service area, availability) are not yet all authoritative backend fields. Keep those demo-only unless a later backend projection supplies them.

### Master

PR #207 adds a real Master domain under `ke.securepay.core.master`:

- `MasterProfile`
- `MasterRequest`
- `MasterOpinion`

Locked boundaries are preserved:

- Master designation is separate from licence/accreditation;
- request has an explicit question/scope;
- cost is known before appointment;
- requesting identity is the authenticated caller;
- opinion is immutable/append-only and superseded rather than silently rewritten;
- Master cannot mutate Agreement or Money authority;
- evidence access is bounded to explicitly submitted references.

New endpoints are under:

`/api/v1/master/...`

The exact controller contract should be inspected from PR #207 before frontend coding because OpenAPI entries for the new MasterController endpoints were explicitly retained as a gap in that PR.

### Dispute Master remains separate

PR #207 deliberately does not duplicate Phase 9B `DisputeMasterEscalation`.

The dispute path remains:

Problem -> Isolate -> Agreement Code -> Positions -> Match -> no match -> dispute-scoped Master escalation -> opinion -> Match again.

General MasterRequest has no `DISPUTE` source context by design.

### Attention

PR #207 wires Phase 9B AgreementAttentionEvent into the new Master lifecycle for agreement-scoped requests only. Delivery channels remain out of scope.

Referral attention-event wiring into the mature settlement/reward path remains a documented gap and must not be faked by the frontend.

## Community / Circle conclusion from Phase 10 convergence audit

The backend audit deliberately keeps:

- Community content objects as frontend composition where no backend authority is required;
- Circle-as-named-group as a deferred product-shape decision rather than inventing a persistence domain.

This means the rich Bolt Community/Circle experience can still be the production experience, but only canonical data with a real backend source may be presented as authoritative. Persistent membership/feed/group state must remain behind an explicit adapter until a real contract exists.

## Partner / Solution status

Backend Phase 12 has NOT begun.

It is intentionally blocked on human confirmation of regulated/institutional assumptions involving bank products, insurance terms, credit decisions, partner accreditation and regulatory relationships.

Therefore Bolt Partner/Solution remains an experience contract / demo adapter and must not be presented as real institutional authority yet.
