# SecurePay Phase 1 — One Connected SecurePay
## Engineering integration ledger and certification checkpoint — 15 October 2026

**Status: CONDITIONAL engineering improvements; Phase 1 is NOT human/production certified.** This document is a build record, not a claim that all journeys pass.

### Branch and dependency truth
- SecurePayLLM build branch: `feature/phase1-one-connected-securepay-20261015` (draft PR #136).
- Stacked on draft PR #135 (Agreement Edit + Add), #134 (typography study), #133 (tool cleanup), #132 (Quick Assist), #131 (Living Workspace), and their unmerged parent branch.
- These PRs were verified as **open draft, not merged** at Phase 1 start. Their dependency chain is not production main.
- SecurePayAPI PR #321 (Fair Trade examination) remains an unmerged draft; its GitHub Actions runs at SHA `87f89455...` reported failure. Engineering claims that depend on that API must **not** be treated as live API availability.
- No production deployment, merge, API change, `securemain` modification, money movement or paid model call as part of Phase 1.

### Connected product map (canonical authority and handoff)

| Human area | Canonical owner/source | Existing entry / handoff | Phase 1 state and remaining gap |
| --- | --- | --- | --- |
| Home | Runtime `AgentExperience`, existing auth + agent gateway | Entry intents and legacy canonical source menu | Production Home remains separate from preview Living Workspace; needs deliberate migration and real user testing |
| KS001 conversation | `AgentGateway`, `createAgentController`, server conversation ID | Living Work `LiveKs001Session`; source / selected offer → explicit KS001 turn | Real model/controller in opt-in preview only; live personal journey needs certification |
| Living Agreement draft | `AgentGateway` formation endpoint, `FormationController` | Same conversation ID/version; Edit and contextual + Add | Backend owns facts; draft not accepted; Fair Trade read depends on API #321 |
| Accepted Agreement | `AgreementGateway`, `AgreementReviewGateway` | Saved Work and Money links use IDs and server reads | Full review/actions use existing canonical experience; leaving preview still feels like a new shell |
| People / invitations | `AgentGateway.selectKsIdentity`, invitation authority | Exact KS lookup; People & Invitations | Pure lookup without `expectedTradeContextVersion` is lookup-only; candidate association/acceptance separate |
| Money | SecurePayAPI Money gateways (preflight, agreements, rails) | Real Agreement → Money; now supports one-shot in-memory Back to same KS001 conversation | Live money execution NOT certified; backend remains sole authority and payee verification gate |
| Vision | `VisionDreamGateway` with revision/ownership | Real private Dream editor; explicit separate Agreement initiation | Cross-Dream-to-Agreement versioned handoff not shown end to end |
| Stores | `StoreGateway` offer owner KS and offer IDs | Public search, refresh exact offer, explicit KS001 continuation | Added optional Quick Assist task continuity; Store seller Quick Contract still an aided draft, not a bookable contract |
| Quick Assist | UI session-local collection, Store and KS001 | Short Stays / My Ride → service offers → chosen offer to KS001 | Provider availability, dispatch and booking unintegrated; session-local preferences |
| Source intake | Canonical AgentSourceArtifact / conversation ID | Photo/Document/Place → review → explicit Send → KS001 source task | Phase 1 repairs premature file upload; any source is not automatically approved evidence |
| Community / Circles | `CommunityGateway`, membership / named Circle scopes | Member-only LIVE and Circle panels; authorised dedicated trade handoffs | Membership/gating covered by source contracts; community-to-trade real transaction not tested |
| Plugs / Masters | Existing referral/master/community backends | Qualified human assistance, service opportunities | User-specific matching and agreement-bound human support not full E2E certified |
| Returning to work | `listSavedBuilds`/`resumeSavedBuild`, exact conversation ID | Sign in → Saved Work → resume; **Money Leave → same KS001** via one-shot ID | Re-entry reauthorises server access; browser refresh or closing tab does not persist new transient Money return hint |

### Implemented in PR #136
1. `UniversalSourceTray.tsx`: selecting a supported photo/document and showing its preview no longer uploads automatically. A labelled **Send photo/document to KS001** performs the existing canonical upload with conversation and source-ID checks. An uncertain outcome requires checking sources before another upload, not a blind retry.
2. `QuickSupportPanel.tsx` / `StoresTool.tsx` / `Phase1LivingWorkspacePreview.tsx`: the original Short Stay/My Ride request follows the person into Store discovery **locally**, without being disclosed in category/location search. It is sent only after they choose a specific real Store offer; the listing is re-read and the source owner/offer ID checked.
3. `entryIntent.ts` / `RuntimeApp.tsx` / Living Workspace: Back/Leave from existing Money can return to the **same KS001 conversation** using only a one-shot, in-memory conversation reference. The backend controller rechecks access; no private ID in URL or localStorage. The existing real Money screen remains the money authority.
4. `tests/phase1-connected-securepay.test.mjs`: source-level integration contract tests. These verify implementation seams, **not** a completed transaction.
5. `tests/phase1-public-browser.mjs` and `.github/workflows/phase1-one-connected-securepay.yml`: Chromium smoke on the isolated preview with 390px and desktop screenshot artifact. This is **public-preview**, not a signed-in/live backend end-to-end certification.

### Six mandatory real-person journeys

| Scenario | Certification state | Evidence available / what remains |
| --- | --- | --- |
| A — Chair delivery | **NOT TESTED end to end** | Store listing and Agreement source pathways exist; real buyer → agreement → authorised Money sequence not run |
| B — Bathroom tiling + KS/photo | **NOT TESTED end to end** | Draft correction and contextual + Add with explicit source send; actual participant confirmation and milestone acceptance not run |
| C — Eight-person chama | **NOT TESTED end to end** | KS001/backend needs purpose/governance/acceptance checks; real eight-invite and Money-gate run absent |
| D — Vision → Agreement | **NOT TESTED end to end** | Private Vision editor exists; correct provenance/permission/version handoff to Agreement not run |
| E — Short Stay or My Ride | **NOT TESTED end to end** | Local request → Store service search → offer KS001 handoff has boundary tests; real provider booking/dispatch not connected |
| F — Community project | **NOT TESTED end to end** | Membership/Circle scoping in code; live project participation → human support → authorised trade not run |

### Release blockers, in priority order
- **P0**: Commit and certify the whole stacked frontend integration on one verified head, not isolated draft PRs; resolve full UI convergence failures, compare to inherited baseline.
- **P0**: Restore/certify backend CI for dependent Fair Trade and money/Agreement operations; API #321 remains unmerged and failing.
- **P0**: Real authenticated six-journey certification, including participants, money/Agreement authority and failures; browser screenshot smoke alone is insufficient.
- **P1**: Migrate/bridge the actual signed-out/signed-in Home into Living Workspace with consistent identity, source intake and accessible return links; current new Workspace is an opt-in preview, not the canonical production route.
- **P1**: Accepted Agreement → full authorised review → return into the same work context without forcing a separate shell.
- **P1**: Vision and Circle to Agreement source-handoff continuity and human Plug/Master service matching, tested with private data boundaries.
- **P1**: Mobile, keyboard, input zoom, weak connectivity and older-trader human walkthrough.
- **P2/future provider work**: Third-party live Short Stays/ride inventory, booking, dispatch, persisted personal tool preferences.

### Evidence and exit
Review `Phase 1 — One Connected SecurePay` workflow for source-contract tests, typecheck, lint and build. If the Chromium job succeeds, screenshots are downloadable from that workflow as `phase1-public-browser-screenshots`. They demonstrate navigation/layout only, not money or participant transactions. Record any inherited regressions separately from Phase 1 changes.

**Exit decision at this checkpoint: CONDITIONAL — scoped integration fixes are built, but core production convergence and six real journeys are not certified.** Do not merge or deploy as a finished Phase 1.
