# SecurePay Master Execution — Phase 6 Community Capability Audit

**Date:** 20 October 2026  
**Baseline:** SecurepayLLM Phase 5 merge `48c360d0be1eb1548d90f5613f932cd07c697db2`  
**Source:** inspected repository code (SecurepayLLM + SecurePayAPI `main`) and live GitHub workflow evidence. This is a code/contract audit, **not** a claim that a signed-in multi-identity production test has passed.

| Capability | Actual pre-Phase-6 foundation | Phase 6 status / action |
| --- | --- | --- |
| Community HOME | `CommunityExperience.tsx`, `TrustProjectImpactHome.tsx`; HOME/LIVE separate | **WORKING but disconnected in Living Workspace:** connect a central member-scoped Discovery Home |
| Trust Project membership and invitations | `community.membership.me/join/accept/decline/invite`; canonical current Principles | **WORKING API boundary:** show verified status and route to existing Join, never auto-join |
| LIVE | `community.feed/create/close/search`, `CommunityExperience` | **WORKING authority:** display member-scoped LIVE; hide Circle material |
| Named Circles | `community.circles.*`, existing Circle Board and invitation flow | **WORKING authority:** discover PUBLIC ACTIVE only; separately display own pending PRIVATE invitations; ID-only handoff to existing controller |
| Events | `community.events.list/create/rsvp` | **WORKING API:** show factual event discovery; RSVPs only in existing authorised Community |
| Service Opportunities | `community.serviceOpportunities.list/create/volunteer` | **WORKING API:** surface opportunities without claiming assignment or compensation |
| Community Projects | `community.projects.*`, TrustProjectImpactHome | **WORKING API:** reveal verified project purpose/status; existing project and contribution paths remain authoritative |
| Apprenticeship Projects | `community.apprenticeships.*` | **WORKING API:** show public-scope projects; no apprentice KS Number disclosure, fake qualification or funding |
| Plug/Master capacities | `TrustProjectCapabilityPanel`, `PlugExperience`, `MasterExperience` | **PARTIAL as in-workspace discovery:** open existing human capability and learning pathways; no independent roster/authority |
| Skills Institute | `skills-institute` API and capability panel | **PARTIAL as in-workspace discovery:** link rather than duplicate training and credentials |
| Moderation/stewardship | `community.moderation.report/mutes/reviewCircleReport`, existing reports UI | **WORKING API:** keep existing moderation and review, no new automated judgment |
| Knowledge candidates | `community.knowledge.capture/submit/mine`, approved Knowledge Core elsewhere | **WORKING API boundary:** no official KS001 knowledge from unapproved user posts |
| Impact/evidence | `TrustProjectImpactHome`, contribution and interest endpoints | **WORKING API:** existing full Community handles evidence; discovery surfaces factual origin instead of fake impact counters |
| Store/Vision | Existing Store-to-Vision and Community transition gateways | **WORKING handoff boundaries:** no new trade/Agreement engine |
| Community KS001 | Existing Community and Circle-context agents | **PARTIAL orchestration:** Community guides participation; personalised intelligence remains subject to real backend authorisation |

## What Phase 6 changes

- `InlineCommunityHub.tsx`: connects existing authoritative data in the central Living Workspace on desktop and mobile, with real Discover, LIVE, Circles, personal invitations, opportunities, projects, events and learning.
- `communityDiscovery.ts`: projects only appropriate LIVE/public records and ACTIVE PUBLIC Circle discovery; no recommendation score.
- `Phase1LivingWorkspacePreview.tsx`: an ID-only navigation hint connects discovered Circles to the existing full Community controller, which checks membership again.
- Frontend regression, guard tests, browser viewport evidence and a dedicated Phase 6 workflow added.

## Boundaries requiring isolated API/human certification

- First invitation/acceptance/decline across real identities with current 12 Principles.
- Public LIVE vs Circle privacy under different authenticated identities, including revocation and old URL read attempts.
- Plug interest and qualification, Master independent reviews, apprenticeships and event RSVP with actual permissions.
- Real moderator report/review and candidate knowledge approval.
- Community impact events and contribution provenance; no financial promise implied by community activity.
- KS001 private-data isolation across Circle/Community boundaries.

**Release truth:** A Vercel READY preview and UI tests do **not** certify the full backend identity, permissions or production participation. No changes to `SecurePayAPI` are made when an existing authorised endpoint already exists; integration gaps are recorded rather than mocked. **Do not merge or deploy to production before owner approval.**
