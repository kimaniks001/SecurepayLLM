# SecurePay Human Visibility Failures Register

Verified baseline:
- SecurepayLLM main: `1929b96eda3f99cfc8b0b39d6ec5479a7a8894e8`
- SecurePayAPI main: `8a6270de591c49c8a843944904515b254ba20df1`

This register records visibility/interaction failures only. Phase 0 does not fix them.

## P0 — blocks basic human use

| ID | Area | Failure | Why it matters | Assigned phase |
|---|---|---|---|---|
| HV-P0-01 | Agreements | Agreement list has no browse-friendly preview; first tap enters full detail. | A person cannot safely look before entering complexity; browsing several Agreements becomes tedious. | Phase 1 |
| HV-P0-02 | Agreements | Search/locate-one behavior is not yet permanently certified for ordinary use at 3/20/100/1,000 records. | “Find the Agreement with Kamau” is a basic task. | Phase 1 |
| HV-P0-03 | Agreements | Reviews/issues/support can become hidden behind the full record when they are the thing that needs the person. | Action-required review state must rise to the overview. | Phase 1 |
| HV-P0-04 | Money | “Can money move now?” is technically available but competes with architecture/explanation. | The core money decision can be slower to see than the machinery behind it. | Phase 2 |
| HV-P0-05 | Money | Charges are too prominent/permanent relative to the immediate decision. | A person should be able to answer the payment question first and inspect architecture on demand. | Phase 2 |
| HV-P0-06 | Money | Agreement chooser uses a card pattern that is philosophically wrong at 100–1,000 Agreements despite paginated backend reads. | Correct pagination does not rescue an unscalable human selection pattern. | Phase 2 |
| HV-P0-07 | Money | Release/settlement actions are not yet permanently certified to rise clearly only when the person can/should act. | Money authority must be obvious at the right moment and quiet otherwise. | Phase 2 |
| HV-P0-08 | Vision | First-time Add/Search/working tools are not all self-evident from the landing experience. | A first-time person can admire the Vision page without knowing how to save/find something. | Phase 3 |
| HV-P0-09 | KS001 Entry | The complete source-ingestion doorway is not permanently guaranteed as immediately discoverable from signed-in entry. | Photo/document/paste are foundational “bring what you have” actions. | Phase 4 |
| HV-P0-10 | Store | “Add offer” is not yet permanently guaranteed as the obvious first owner action. | A Store owner’s basic job is to publish what they sell. | Phase 5 |
| HV-P0-11 | Plug | Practical help is real but buried under Ecosystem/Help instead of surfacing when work needs a Plug. | Users must not know the internal ecosystem map to ask for help. | Phase 6 |
| HV-P0-12 | Master | Master discovery currently requires a specific Master reference/identity id; there is no human directory/discovery path. | “Find experienced help” is not a reasonable first-use task when a technical reference is required. | Phase 6 |
| HV-P0-13 | Master | Requesting experienced help is buried instead of appearing where relevant work/review requires it. | Human expert support should be contextual. | Phase 6 |
| HV-P0-14 | Projects | Work already associated with a Project does not reliably surface that Project context from the work itself. | Users should not have to leave work, visit Account, then rediscover the Project. | Phase 6 |
| HV-P0-15 | Skills Institute | Public awareness/search/assets are backend-only in the first-party product. | An entire promised learning world is effectively invisible. | Phase 7A |
| HV-P0-16 | Skills Institute | Participation/steps/evidence/completion have no first-party human frontend. | A participant cannot actually live the Institute journey in SecurePay UI. | Phase 7A |

## P1 — important capability is hard to discover/use

| ID | Area | Failure | Assigned phase |
|---|---|---|---|
| HV-P1-01 | Agreements | Milestone readiness/effective state is present but needs five-second clarity and human wording. | Phase 1 |
| HV-P1-02 | Agreements | Pending amendments/changes do not always dominate the overview when action is required. | Phase 1 |
| HV-P1-03 | Agreements | Evidence/review pathways are real but can require too much detail navigation. | Phase 1 |
| HV-P1-04 | Agreements | Money handoff exists but must remain obvious without turning Agreement detail into a finance dashboard. | Phase 1 |
| HV-P1-05 | Money | Authorised/funded/remaining/released/progressed values need one consistent glance hierarchy. | Phase 2 |
| HV-P1-06 | Money | Funding should be obvious only when funding is actually the next step. | Phase 2 |
| HV-P1-07 | Money | Settlement destination currently exposes more system structure than most users need. | Phase 2 |
| HV-P1-08 | Money | Rail/provider naming can dominate the person’s money task. | Phase 2 |
| HV-P1-09 | Vision | Quotation/invoice/receipt generation exists but is not naturally discoverable. | Phase 3 |
| HV-P1-10 | Vision | Store matching/fulfilment is capable but can be hard to discover from the idea being worked on. | Phase 3 |
| HV-P1-11 | Vision | Link/place source actions are secondary and need a coherent Add model. | Phase 3 |
| HV-P1-12 | KS001 Entry | Link/place source ingestion is less obvious than text conversation. | Phase 4 |
| HV-P1-13 | KS001 Entry | Correction/review capability needs permanent “what SecurePay understood” discoverability without exposing internal formation terms. | Phase 4 |
| HV-P1-14 | Store | Confirm-availability action must rise strongly when due. | Phase 5 |
| HV-P1-15 | Store | Demand matches/opportunities need a clearer owner-action hierarchy. | Phase 5 |
| HV-P1-16 | Store | Fulfilment/supply-route capability needs contextual human language rather than supply-chain terminology. | Phase 5 |
| HV-P1-17 | Plug | Candidate selection/open relationship works but is multiple levels deep. | Phase 6 |
| HV-P1-18 | Plug | Plug availability is real but not naturally visible to a qualified Plug. | Phase 6 |
| HV-P1-19 | Master | Master opinion/review pathways work but require prior knowledge of the request machinery. | Phase 6 |
| HV-P1-20 | Projects | Project list/create is reachable mainly from Account rather than current work context. | Phase 6 |
| HV-P1-21 | Projects | Attaching Agreements to Projects is functional but buried. | Phase 6 |
| HV-P1-22 | Skills Institute | Programs/sessions publishing has no first-party human surface. | Phase 7A |
| HV-P1-23 | Skills Institute | Learning/synthesis/project learning/Master backing/knowledge candidate worlds are backend-only. | Phase 7A |
| HV-P1-24 | Financial Institutions | Institution enrollment gateway exists but there is no dedicated human experience. | Phase 7B |
| HV-P1-25 | Financial Institutions | Capability application/list/transition authority exists in API but is not exposed as a human journey. | Phase 7B |
| HV-P1-26 | Notifications | Generic notification actions often navigate away even where an inline/contextual response could satisfy the task. | Phase 8 |
| HV-P1-27 | Notifications | Circle quick responses are excellent inside Circle Board but not yet a universal actionable-notification interaction pattern. | Phase 8 |
| HV-P1-28 | Notifications | OPEN_FINANCIAL_SERVICES exists in typed action vocabulary, but there is no corresponding mature human Financial Institutions destination. | Phase 8 (routing), Phase 7B owns destination |
| HV-P1-29 | Community/Circles | Coordination responses must remain visible without ever being confused with Agreement milestone acceptance. | Phase 8 |
| HV-P1-30 | Business / Organization | Administration language is heavier than the simpler human language elsewhere. | Phase 9 |

## P2 — friction but usable

P2 issues include:
- Vision lock/unlock/version lineage wording.
- Agreement documents/calendar/tags/SecureLink depth.
- Payment-attempt/history depth.
- Store edit-offer, Mini Agreement and Business Store navigation.
- Plug referral/attribution depth.
- Master cost proposal wording.
- Project detail/archive/calendar depth.
- Notification channel preferences/quiet hours discoverability.
- Business/Organization acting context and membership administration.
- Developer/Connect technical density (appropriate for the audience, but still needs Phase 9 consistency).

## P3 — polish

No Phase 0 P3 item blocks a later phase. P3 should be recorded during each phase but not allowed to displace P0/P1 work.

## Cross-cutting failure patterns

1. **Architecture before intention** — Money is the strongest example.
2. **Full-page navigation before preview** — Agreements is the strongest example.
3. **Capability exists but entry point is buried** — Plug, Master and Projects.
4. **Backend world with no human product** — Skills Institute and Financial Institutions.
5. **Context should promote an action but does not** — reviews, availability, funding/release, Project association.
6. **Small-data attractiveness mistaken for scalability** — Agreement/Money card selectors.
7. **Internal nouns leaking outward** — Master references, fulfilment/supply-route language, provider/rail mechanics where not needed.

## Non-failures worth preserving

- Community/Circle project-first activity model.
- Circle Board and typed quick coordination responses.
- Notification quiet hours and delivery preferences.
- Developer / Connect as an Account-level secondary capability.
- Money backend authority and version-bound economic truth.
- SecureLink and Agreement authority separation.
- Store/Agreement/Vision handoff boundaries.
