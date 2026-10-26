#!/usr/bin/env node
/**
 * SECUREPAY Day 1 Gate D: deterministic fail-closed CERTIFICATION PREFLIGHT.
 * Source contracts are NOT a substitute for user-journey or real payment/identity tests.
 * This script never calls API, OTP providers, identity, banks, real users or production.
 * --strict returns nonzero while *any* criterion is blocked or lacks real staging evidence.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const files = Object.fromEntries([
 ['runtime','src/RuntimeApp.tsx'],
 ['identityOverlay','src/features/living-workspace/WorkspaceIdentityOverlay.tsx'],
 ['workspace','src/features/living-workspace/Phase1LivingWorkspacePreview.tsx'],
 ['signup','src/features/join/SignUpExperience.tsx'],
 ['signupController','src/features/signup/controller.ts'],
 ['ksWelcome','src/features/join/SignupIssuedWelcome.tsx'],
 ['answerActions','src/features/living-workspace/answerActions.ts'],
 ['agreementReview','src/features/formation/AgreementReview.tsx'],
 ['money','src/features/living-workspace/UnifiedMoneyTool.tsx'],
 ['rails','src/features/living-workspace/MoneyRailCeremony.tsx'],
 ['active','src/features/living-workspace/AgreementDiscovery.tsx'],
 ['writtenEvidence','src/features/living-workspace/AgreementStatementEvidence.tsx'],
 ['invitation','src/features/living-workspace/AgreementInviteInsideWorkspace.tsx'],
 ['vision','src/features/living-workspace/VisionFinancialPossibilities.tsx'],
 ['activation','src/features/activation/ActivationExperience.tsx'],
].map(([name,p])=>[name,read(p)]));
const checks=[];
function source(id,label,passed,detail,locations){
 checks.push({id,label,status:passed?'SOURCE_READY':'BLOCKED',detail,locations});
}
function staging(id,label,detail,locations){
 checks.push({id,label,status:'NOT_CERTIFIED',detail,locations});
}
source('D01','Candidate preview root opens approved Living Workspace',
  /isCandidateWorkspaceEntry\(window\.location\.hash,window\.location\.hostname\)/.test(files.runtime)&&
  /if \(phase1Preview\) return <Phase1LivingWorkspacePreview/.test(files.runtime),
  'Entry route must actually mount the masterpiece; verify deployed root by browser screenshot.', ['src/RuntimeApp.tsx']);
source('D02','Same three-column shell, one KS001 controller and right Check',
  /data-workspace-shell/.test(files.workspace)&&
  /data-tool-rail/.test(files.workspace)&&
  /aria-label="KS001 conversation"/.test(files.workspace)&&
  /aria-label="Living result"/.test(files.workspace)&&
  /<LiveKs001Session controller=\{liveController!\}/.test(files.workspace),
  'Shell source present. This does not certify user-visible routing or mobile layout.', ['src/features/living-workspace/Phase1LivingWorkspacePreview.tsx']);
source('D03','Get KS Number opens inside the approved Workspace',
  /<WorkspaceIdentityOverlay\b/.test(files.workspace) &&
  /<SignupForm\b/.test(files.identityOverlay) &&
  /data-gate-d-workspace-signup/.test(files.identityOverlay) &&
  !/onGetKsNumber=\{\(\)=>\{setSignInOpen\(false\);window\.location\.hash='#\/sign-up'/.test(files.workspace),
  'Canonical SignupForm opens in a dialog while the Workspace stays mounted. Real signup needs isolated staging.', ['src/features/living-workspace/Phase1LivingWorkspacePreview.tsx','src/features/living-workspace/WorkspaceIdentityOverlay.tsx']);
source('D04','Verified server-issued KS Number is shown inside the same Workspace',
  /<WorkspaceIdentityOverlay\b/.test(files.workspace) &&
  /<SignupIssuedWelcome\b/.test(files.identityOverlay) &&
  /onIssued=\{ksNumber=>/.test(files.identityOverlay) &&
  /data-gate-c-issued-number/.test(files.ksWelcome) &&
  /issuedKsNumber: completed\.ksNumber/.test(files.signupController),
  'Server KS Number is passed to welcome in the still-mounted Workspace. Requires actual OTP/DB staging evidence.', ['src/features/living-workspace/WorkspaceIdentityOverlay.tsx','src/features/signup/controller.ts']);
source('D05','Identity handoff keeps original anonymous work and does not duplicate it',
  /data-gate-d-authorised-anonymous-conversation-claim/.test(files.workspace) &&
  /data-gate-d-no-loss-guest-proposals/.test(files.workspace) &&
  /gateway\.resumableConversationId\?\.\(\)/.test(files.workspace) &&
  /gateway\.saveBuild\(id\)/.test(files.workspace) &&
  /authorisedResumedConversation\(id,liveController\.getSnapshot\(\)\)/.test(files.workspace),
  'Explicit claim uses SecurePay saved-build authority and verifies the same returned conversation. Anonymous identity-transfer still requires a real OTP/API staging replay.', ['src/features/living-workspace/Phase1LivingWorkspacePreview.tsx']);
source('D06','KS001 amount-vs-currency and review boundaries represented in code',
  /case 'currency':/.test(files.answerActions)&&/data-day1-workspace-review/.test(files.workspace)&&
  /createHandoffController\(gateway\)/.test(files.workspace)&&
  /handoffController\.start\(liveConversationId,version\)/.test(files.workspace)&&
  /formationState\?\.data\?\.confirmable/.test(files.workspace),
  'Review now uses the versioned canonical handoff, not an inspection-only dead end. Actual Nakuru/KES400 model/formation proof remains required.', ['src/features/living-workspace/answerActions.ts','src/features/living-workspace/Phase1LivingWorkspacePreview.tsx']);
source('D07','Review → authorised Save / Share / Connect Money in same Workspace',
  /data-gate-d-post-review-actions/.test(files.workspace) &&
  /handoffController\.start\(liveConversationId,version\)/.test(files.workspace) &&
  /<AgreementInviteInsideWorkspace/.test(files.active) &&
  /gateway\.confirmationStatus\(agreementId\)/.test(files.invitation) &&
  /matched\?\.isCreator===true/.test(files.invitation) &&
  /data-gate-d-connect-money/.test(files.active) &&
  /verified\.money\.status==='READY'/.test(files.active) &&
  /onConnectMoney=\{\(\)=>openTool\('Money'\)\}/.test(files.workspace),
  'Version-checked draft, creator-gated invitation and backend-ready Money tool are now connected. Provider execution, party confirmation and full same-shell settlement require real staging tests and remain separate authority.', ['src/features/living-workspace/Phase1LivingWorkspacePreview.tsx','src/features/living-workspace/AgreementDiscovery.tsx','src/features/living-workspace/AgreementInviteInsideWorkspace.tsx']);
source('D08','Vision financial possibilities strictly separate from Agreement Money',
  /<VisionFinancialPossibilities\/>/.test(files.workspace) &&
  /if\(area==='vision'\)return <VisionFinancialPossibilities\/>/.test(files.money) &&
  /railFamily\(rail\.displayName,rail\.railCode\)/.test(files.rails),
  'Categories and planning/execution separation represented; provider prices, eligibility and authorisation still need actual backend testing.', ['src/features/living-workspace/UnifiedMoneyTool.tsx','src/features/living-workspace/MoneyRailCeremony.tsx']);
source('D09','Active Agreement task-first and genuine version-bound written evidence',
  /data-gate-b-active-attention/.test(files.active) &&
  /<AgreementStatementEvidence/.test(files.active) &&
  /data-gate-d-authorised-statement-evidence/.test(files.writtenEvidence) &&
  /expectedAgreementVersionId:versionId/.test(files.writtenEvidence) &&
  /expectedObligationVersion:current.stateVersion/.test(files.writtenEvidence) &&
  /idempotencyKey:crypto.randomUUID\(\)/.test(files.writtenEvidence),
  'Real TEXT_STATEMENT submission with obligation/version/idempotency; not an uploaded photo or proof of review/completion.', ['src/features/living-workspace/AgreementDiscovery.tsx','src/features/living-workspace/AgreementStatementEvidence.tsx']);
source('D16','Private captioned photo/document upload stored and bound to an obligation',
  /data-gate-d-real-obligation-media-upload/.test(files.active) &&
  /verifiedUploadReceipt/.test(files.active),
  'BLOCKED: SecurePay Agreement API accepts a participant-declared file reference + hash but does not store or verify obligation media bytes. Requires API #345 with authenticated, durable bytes, immutable digest and role-limited retrieval; no handoff-place photo shortcut.',
  ['SecurePayAPI issue #345','src/features/living-workspace/AgreementDiscovery.tsx']);
source('D10','Financial activation shows actual authority stages',
  /data-gate-c-activation-progress/.test(files.activation) &&
  /funding\?\.financiallyEnabled/.test(files.activation) &&
  /agreement\?\.confirmed/.test(files.activation),
  'The API-owned stage display exists, but connected payment and settlement-destination completion are not proven.', ['src/features/activation/ActivationExperience.tsx']);
staging('D11','Real model: new Nakuru trip intention, KES400 letter to Tom, review and return',
  'Run anonymous & authenticated journeys against pinned backend and model commits. Capture exact requests/replies and check state/version.', ['SecurePayAPI PR #341','SecurepayLLM PR #169']);
staging('D12','Real identity: SMS/email issuance, invalid/expired OTP, reattempts, one KS per identity',
  'Use isolated, configured OTP providers and database. Capture server-issued KS, identity status and API audit trail. Never test customer data in production.', ['SecurepayLLM PR #172']);
staging('D13','Membership and represented Business authority',
  'With new synthetic KS identity prove explicit current 12 Principles acceptance, membership states, business representative checks and denied paths.', ['SecurePayAPI membership/identity services']);
staging('D14','Financial lifecycle: real eligible quote, pay, funding, milestones, evidence, release and settlement',
  'No moving real money on preview. Use provider sandbox/authoritative mock with signed callbacks and verified accounting. No simulated UI balance as proof.', ['SecurePayAPI money / evidence / settlement services']);
staging('D15','Mobile and desktop root-to-completion test on exact integrated staging SHA',
  'Capture 320px, 390px and desktop screenshots, inspect tool shelf/chat/right-panel continuity and test return from signup, Money and Agreement.', ['Vercel exact commit deployment']);
const blocked=checks.filter(c=>c.status==='BLOCKED');
const unverified=checks.filter(c=>c.status==='NOT_CERTIFIED');
const sourceReady=checks.filter(c=>c.status==='SOURCE_READY');
const summary={gate:'Gate D — end-to-end certification preflight',verdict:blocked.length||unverified.length?'HOLD':'SOURCE_PREFLIGHT_READY',sourceReady:sourceReady.length,blocked:blocked.length,unverified:unverified.length,total:checks.length,checks};
const line=c=>`| ${c.id} | ${c.label.replaceAll('|','/')} | ${c.status} | ${c.detail.replaceAll('|','/')} |`;
const md=[
 '# SecurePay Day 1 — Gate D Certification Preflight','',
 '> Source review is **not** live backend certification or evidence of any money moving.','',
 `**Verdict: ${summary.verdict}.** Source ready: ${sourceReady.length}; blocked: ${blocked.length}; not yet staging-certified: ${unverified.length}.`,'',
 '| ID | Acceptance item | Status | Gap / reason |','| --- | --- | --- | --- |',
 ...checks.map(line),'',
 'No production merge or deployment may follow from a source-only green check.',
 'No criterion may be waived simply because the earlier standalone prototypes or CI succeeded.',
 'Record linked staging evidence for every NOT_CERTIFIED item before approving a real-money or real-identity release.'
].join('\n');
writeFileSync('gate-d-preflight.json',JSON.stringify(summary,null,2)+'\n');
writeFileSync('gate-d-preflight.md',md+'\n');
console.log(md);
if(process.argv.includes('--strict')&&(blocked.length||unverified.length)){ console.error('Gate D is intentionally NOT CERTIFIED; see gate-d-preflight.md.'); process.exitCode=1; }
