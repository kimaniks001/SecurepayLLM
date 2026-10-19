# SecurePay Phase 1 + 2 — Complete Inherited Diff Register

Date: 2026-10-19

## Commit authority

- Master integration baseline: `dfdc6bf4eaa31e96c15c330e71cb6c91ba1e8dfa`.
- Phase 1 approved PR #147 source: `bd788328b44af7fc0739de0e1bf187df00e7bd22` (still separately open before reconciliation).
- Phase 2 approved PR #148 source: `76c2e8359a2a517848d860be9c8f50f80960b7ff`.
- Combined candidate source: `feature/master-phase2-ks001-check-20261019` (plus integration-only CI manifest).
- Full compare: `677` commits ahead, `198` files, `0` behind. Every file below is inventoried.

## Retention and safety decisions

- **Retain:** same real `AgentController`, `FormationController`, `Phase1LivingWorkspacePreview` three-panel route, live Fair Trade version checks, and explicitly synthetic preview examples.
- **Retain:** source-file and browser tests for workspace, tools, responsive states, invitations, Money and authority.
- **Keep dormant, never route:** `prototypes/*` and historical `MockWorkspacePanel`, `LivingAgreementPanel`, and other historical demonstration source; the active `RuntimeApp` preview route uses `Phase1LivingWorkspacePreview`, not any retired #142 design.
- **Keep historical documentation inert:** phase 3–6 briefs, prior human-experience documents, and visual SVG evidence do not create routes or controllers.
- **Preview safety:** default relays hardcode upstream `https://securepay.ke` and refuse non-GET writes (HTTP 403); local test-only relay overrides accept literal loopback only. No production mutation permitted.
- **API integration:** not certified by these frontend CI jobs, separately tracked; no money, membership or invitation transactions.
- **Merge plan:** squash reviewed cumulative Phase 1+2 source into `integration/master-execution-20261019` only, pinned to exact PR SHA; avoid separately merging #147 and #148 because Phase 2 already includes Phase 1.

## Full file inventory

### CI / workflows (8)

- `.github/workflows/launch-tool-tray-validation.yml` — added, 46 line changes
- `.github/workflows/living-workspace-phase7-validation.yml` — added, 43 line changes
- `.github/workflows/living-workspace-phase7.yml` — added, 40 line changes
- `.github/workflows/master-integration-phase12.yml` — added, 73 line changes
- `.github/workflows/phase1-one-connected-securepay.yml` — added, 78 line changes
- `.github/workflows/phase2-brand-convergence.yml` — added, 90 line changes
- `.github/workflows/phase2-master-execution.yml` — added, 67 line changes
- `.github/workflows/phase3-certification-safety.yml` — added, 35 line changes

### Preview API relays (2)

- `api/preview-agent.js` — added, 139 line changes
- `api/preview-workspace.js` — added, 188 line changes

### Documentation / dormant prototypes (32)

- `docs/AGREEMENT_EDIT_CONTEXT_ADD_20261015.md` — added, 25 line changes
- `docs/CONVERGENCE_AUTHENTICATED_CERTIFICATION_20261016.md` — added, 51 line changes
- `docs/HUMAN_EXPERIENCE_REBUILD_PHASE2.md` — added, 312 line changes
- `docs/HUMAN_EXPERIENCE_REBUILD_PHASE3.md` — added, 491 line changes
- `docs/HUMAN_EXPERIENCE_REBUILD_PHASE4.md` — added, 507 line changes
- `docs/HUMAN_EXPERIENCE_REBUILD_PHASE5.md` — added, 600 line changes
- `docs/HUMAN_EXPERIENCE_REBUILD_PHASE6.md` — added, 510 line changes
- `docs/LAUNCH_TOOL_TRAY_CLEANUP_20261015.md` — added, 31 line changes
- `docs/LIVING_WORKSPACE_AGREEMENT_MONEY_READINESS_20261014.md` — added, 40 line changes
- `docs/LIVING_WORKSPACE_PHASE7_CERTIFICATION_20261014.md` — added, 47 line changes
- `docs/LIVING_WORKSPACE_PRODUCT_CONTRACT_20261014.md` — added, 49 line changes
- `docs/LIVING_WORKSPACE_STRUCTURAL_SLICE_S1_20261014.md` — added, 48 line changes
- `docs/LIVING_WORKSPACE_STRUCTURAL_SLICE_S2_20261014.md` — added, 38 line changes
- `docs/LIVING_WORKSPACE_STRUCTURAL_SLICE_S3_20261014.md` — added, 49 line changes
- `docs/LIVING_WORKSPACE_STRUCTURAL_SLICE_S4_20261014.md` — added, 56 line changes
- `docs/MONEY_HUMAN_EXPERIENCE_20261015.md` — added, 38 line changes
- `docs/PHASE1_ONE_CONNECTED_SECUREPAY_LEDGER_20261015.md` — added, 62 line changes
- `docs/PHASE2_SECUREPAY_BRAND_LEDGER_20261015.md` — added, 60 line changes
- `docs/PHASE3_AUTHENTICATED_HUMAN_CERTIFICATION_20261016.md` — added, 61 line changes
- `docs/PHASE3_SIMPLICITY_INTELLIGENT_TOOLS_LEDGER_20261016.md` — added, 57 line changes
- `docs/PRODUCTION_MIGRATION_LEDGER.md` — modified, 16 line changes
- `docs/QUICK_ASSIST_FIRST_USE_20261015.md` — added, 35 line changes
- `docs/SECUREPAY_SIGNATURE_TYPOGRAPHY_20261015.md` — added, 26 line changes
- `docs/phase2-human-shell-visual-certification.svg` — added, 14 line changes
- `docs/phase3-agreement-journey-visual-certification.svg` — added, 6 line changes
- `docs/phase4-intelligent-next-step-visual-certification.svg` — added, 6 line changes
- `docs/phase5-one-securepay-language-visual-certification.svg` — added, 6 line changes
- `docs/phase6-facilitator-session-protocol.md` — added, 135 line changes
- `docs/phase6-human-certification-results.md` — added, 98 line changes
- `docs/phase6-human-certification-visual-evidence.svg` — added, 10 line changes
- `prototypes/living-workspace-20261014.html` — added, 17 line changes
- `prototypes/phase1-hidden-tools-workspace-20261014.html` — added, 22 line changes

### Other (1)

- `package.json` — modified, 1 line changes

### Existing shared frontend (54)

- `src/RuntimeApp.tsx` — modified, 89 line changes
- `src/components/AgreementDetail.tsx` — modified, 14 line changes
- `src/components/AgreementEstablished.tsx` — modified, 64 line changes
- `src/components/AgreementPrintRecord.tsx` — modified, 16 line changes
- `src/components/AgreementSupport.tsx` — modified, 13 line changes
- `src/components/CanonicalAgreement.tsx` — modified, 283 line changes
- `src/components/CommunityHome.tsx` — modified, 10 line changes
- `src/components/DatePicker.tsx` — modified, 12 line changes
- `src/components/MoneyHome.tsx` — modified, 2 line changes
- `src/components/NavBar.tsx` — modified, 159 line changes
- `src/components/RecipientReview.tsx` — modified, 89 line changes
- `src/components/SignedInHome.tsx` — modified, 21 line changes
- `src/components/SignedOutHome.tsx` — modified, 90 line changes
- `src/components/StoreHome.tsx` — modified, 25 line changes
- `src/features/agent/AgentExperience.tsx` — modified, 560 line changes
- `src/features/amendments/AgreementChangeProposal.tsx` — added, 117 line changes
- `src/features/amendments/ChangesPanel.tsx` — modified, 53 line changes
- `src/features/brand/SignatureAgreementTitle.tsx` — added, 17 line changes
- `src/features/community/CommunityExperience.tsx` — modified, 21 line changes
- `src/features/ecosystem/EcosystemExperience.tsx` — modified, 9 line changes
- `src/features/entry/ContinueCard.tsx` — modified, 53 line changes
- `src/features/execution/ProgressPanel.tsx` — modified, 11 line changes
- `src/features/experience/entryIntent.ts` — modified, 91 line changes
- `src/features/formation/AgreementReview.tsx` — modified, 55 line changes
- `src/features/formation/AgreementShaping.tsx` — modified, 189 line changes
- `src/features/formation/NextQuestion.tsx` — modified, 23 line changes
- `src/features/handoff/HandoffPanel.tsx` — modified, 23 line changes
- `src/features/handoff/ReviewPreview.tsx` — modified, 54 line changes
- `src/features/handoff/view.ts` — modified, 10 line changes
- `src/features/invitations/InvitePanel.tsx` — modified, 26 line changes
- `src/features/money/MoneyExperience.tsx` — modified, 10 line changes
- `src/features/money/MoneyPaymentSettlementJourney.tsx` — modified, 53 line changes
- `src/features/money/handoff.ts` — modified, 13 line changes
- `src/features/public/PublicHome.tsx` — modified, 298 line changes
- `src/features/recipient/RecipientExperience.tsx` — modified, 28 line changes
- `src/features/recipient/view.ts` — modified, 50 line changes
- `src/features/shell/AgreementAttentionSummary.tsx` — added, 70 line changes
- `src/features/shell/humanNext.ts` — added, 176 line changes
- `src/features/skills/SkillsInstituteExperience.tsx` — added, 176 line changes
- `src/features/sources/ui/SourceMenu.tsx` — modified, 5 line changes
- `src/features/store/StoreExperience.tsx` — modified, 1 line changes
- `src/features/support/tabHint.ts` — modified, 2 line changes
- `src/features/trust/TrustProjectWelcome.tsx` — modified, 2 line changes
- `src/features/visionboard/VisionBoardExperience.tsx` — modified, 12 line changes
- `src/features/visionboard/dreams/DreamBuilder.tsx` — modified, 33 line changes
- `src/features/visionboard/dreams/VisionDreamExperience.tsx` — modified, 18 line changes
- `src/features/visionboard/dreams/VisionDreamHome.tsx` — modified, 12 line changes
- `src/features/visionboard/dreams/controller.ts` — modified, 21 line changes
- `src/features/workspace/AgreementNextStep.tsx` — added, 213 line changes
- `src/features/workspace/LivingAgreementOverview.tsx` — modified, 142 line changes
- `src/features/workspace/WorkspaceExperience.tsx` — modified, 46 line changes
- `src/features/workspace/controller.ts` — modified, 14 line changes
- `src/index.css` — modified, 245 line changes
- `src/types.ts` — modified, 2 line changes

### Frontend API adapters (7)

- `src/api/securepay/agent/dto.ts` — modified, 13 line changes
- `src/api/securepay/agent/index.ts` — modified, 6 line changes
- `src/api/securepay/agreements/index.ts` — modified, 15 line changes
- `src/api/securepay/agreements/refresh.ts` — modified, 2 line changes
- `src/api/securepay/index.ts` — modified, 2 line changes
- `src/api/securepay/skills-institute/dto.ts` — added, 56 line changes
- `src/api/securepay/skills-institute/index.ts` — added, 22 line changes

### Living Workspace runtime (33)

- `src/features/living-workspace/DateTimeTool.tsx` — added, 167 line changes
- `src/features/living-workspace/InlineCircleBoard.tsx` — added, 101 line changes
- `src/features/living-workspace/InlineCommunityHub.tsx` — added, 104 line changes
- `src/features/living-workspace/InlineVisionEditor.tsx` — added, 53 line changes
- `src/features/living-workspace/LiveKs001Session.tsx` — added, 114 line changes
- `src/features/living-workspace/LiveWorkResultPanel.tsx` — added, 217 line changes
- `src/features/living-workspace/LivingAgreementPanel.tsx` — added, 42 line changes
- `src/features/living-workspace/LivingCirclePanel.tsx` — added, 33 line changes
- `src/features/living-workspace/LivingCommunityPanel.tsx` — added, 20 line changes
- `src/features/living-workspace/LivingVisionPanel.tsx` — added, 55 line changes
- `src/features/living-workspace/MiniContextInput.tsx` — added, 63 line changes
- `src/features/living-workspace/MockWorkspacePanel.tsx` — added, 87 line changes
- `src/features/living-workspace/MoneyAgreementCards.tsx` — added, 68 line changes
- `src/features/living-workspace/MoneyRailCeremony.tsx` — added, 65 line changes
- `src/features/living-workspace/PeopleInvitationsTool.tsx` — added, 128 line changes
- `src/features/living-workspace/Phase1LivingWorkspacePreview.tsx` — added, 604 line changes
- `src/features/living-workspace/PreviewWorkNotes.tsx` — added, 208 line changes
- `src/features/living-workspace/QuickSupportPanel.tsx` — added, 159 line changes
- `src/features/living-workspace/SelectedWorkspaceRecord.tsx` — added, 86 line changes
- `src/features/living-workspace/StoreBuyingPlan.tsx` — added, 150 line changes
- `src/features/living-workspace/StoreDemoExperience.tsx` — added, 183 line changes
- `src/features/living-workspace/StoresTool.tsx` — added, 374 line changes
- `src/features/living-workspace/UnifiedMoneyTool.tsx` — added, 153 line changes
- `src/features/living-workspace/UniversalSourceTray.tsx` — added, 418 line changes
- `src/features/living-workspace/WorkspaceContinuityPanel.tsx` — added, 198 line changes
- `src/features/living-workspace/WorkspaceWelcome.tsx` — added, 60 line changes
- `src/features/living-workspace/answerActions.ts` — added, 34 line changes
- `src/features/living-workspace/livingLanguage.ts` — added, 37 line changes
- `src/features/living-workspace/personas.ts` — added, 67 line changes
- `src/features/living-workspace/phase2Examples.ts` — added, 48 line changes
- `src/features/living-workspace/practicalReadiness.ts` — added, 75 line changes
- `src/features/living-workspace/previewAgentGateway.ts` — added, 55 line changes
- `src/features/living-workspace/previewWorkspaceGateways.ts` — added, 40 line changes

### Verification / tests (61)

- `tests/activation.test.mjs` — modified, 7 line changes
- `tests/agent.test.mjs` — modified, 8 line changes
- `tests/agreement-edit-context-add.test.mjs` — added, 48 line changes
- `tests/agreement-money-human-convergence.test.mjs` — modified, 9 line changes
- `tests/certification/staging-guard.mjs` — added, 63 line changes
- `tests/convergence-living-handoff.test.mjs` — added, 0 line changes
- `tests/convergence-phase3-simplicity-date-time.test.mjs` — added, 0 line changes
- `tests/entry-perfection-phase6.test.mjs` — modified, 0 line changes
- `tests/entry-perfection-phase7.test.mjs` — modified, 0 line changes
- `tests/entry-perfection-phase8.test.mjs` — modified, 0 line changes
- `tests/entry-perfection-phase9.test.mjs` — modified, 0 line changes
- `tests/final-chat-human-usability.test.mjs` — modified, 0 line changes
- `tests/final-home-unification.test.mjs` — modified, 0 line changes
- `tests/four-surface-world-class-gate.test.mjs` — modified, 0 line changes
- `tests/human-convergence-phase2-money.test.mjs` — modified, 0 line changes
- `tests/human-convergence-phase3-vision.test.mjs` — modified, 0 line changes
- `tests/human-convergence-phase4-store.test.mjs` — modified, 0 line changes
- `tests/human-convergence-phase6-whole-product.test.mjs` — modified, 0 line changes
- `tests/human-experience-phase2-shell.test.mjs` — added, 0 line changes
- `tests/human-experience-phase3-agreement-journey.test.mjs` — added, 0 line changes
- `tests/human-experience-phase4-intelligent-next-step.test.mjs` — added, 0 line changes
- `tests/human-experience-phase5-one-securepay-language.test.mjs` — added, 0 line changes
- `tests/human-experience-phase6-human-certification.test.mjs` — added, 0 line changes
- `tests/ks001-decision004005.test.mjs` — added, 0 line changes
- `tests/launch-tools-cleanup.test.mjs` — added, 0 line changes
- `tests/life-business.test.mjs` — modified, 0 line changes
- `tests/living-agreement-overview.test.mjs` — modified, 0 line changes
- `tests/living-agreement-wow.test.mjs` — modified, 0 line changes
- `tests/living-workspace-phase7.test.mjs` — added, 0 line changes
- `tests/living-workspace-production-polish.test.mjs` — added, 0 line changes
- `tests/masterpiece-ui.test.mjs` — modified, 0 line changes
- `tests/mobile-viewport.test.mjs` — modified, 0 line changes
- `tests/money-build2-m3-m4.test.mjs` — modified, 0 line changes
- `tests/phase1-connected-securepay.test.mjs` — added, 0 line changes
- `tests/phase1-preview-production-write-guard.test.mjs` — added, 0 line changes
- `tests/phase1-public-browser.mjs` — added, 0 line changes
- `tests/phase2-brand-browser.mjs` — added, 0 line changes
- `tests/phase2-brand-system.test.mjs` — added, 0 line changes
- `tests/phase2-master-browser.mjs` — added, 0 line changes
- `tests/phase2-master-check.test.mjs` — added, 0 line changes
- `tests/phase3-certification-guard.test.mjs` — added, 0 line changes
- `tests/phase6-convergence.test.mjs` — modified, 0 line changes
- `tests/photo-tool-preview.test.mjs` — added, 0 line changes
- `tests/public-experience-phase2.test.mjs` — modified, 0 line changes
- `tests/public-experience-phase4.test.mjs` — modified, 0 line changes
- `tests/quick-assist-first-use.test.mjs` — added, 0 line changes
- `tests/recipient.test.mjs` — modified, 0 line changes
- `tests/securelink.test.mjs` — modified, 0 line changes
- `tests/securepay-brand-typography.test.mjs` — added, 0 line changes
- `tests/signed-in.test.mjs` — modified, 0 line changes
- `tests/simple-money-dashboard.test.mjs` — modified, 0 line changes
- `tests/sources-ui.test.mjs` — modified, 0 line changes
- `tests/ui-phase2.test.mjs` — modified, 0 line changes
- `tests/ui-phase3.test.mjs` — modified, 0 line changes
- `tests/ui-phase4.test.mjs` — modified, 0 line changes
- `tests/ui-phase5.test.mjs` — modified, 0 line changes
- `tests/ui-phase6.test.mjs` — modified, 0 line changes
- `tests/ui-phase7-trust-project.test.mjs` — modified, 0 line changes
- `tests/ur145-review-gate.test.mjs` — modified, 0 line changes
- `tests/user-ready-beta-gate1.test.mjs` — modified, 0 line changes
- `tests/workspace-three-refinements.test.mjs` — added, 0 line changes

