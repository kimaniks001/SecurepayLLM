import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

const agent=source('src/api/securepay/agent/index.ts');
const community=source('src/api/securepay/community/index.ts');
const sources=source('src/features/sources/controller.ts');
const tray=source('src/features/living-workspace/UniversalSourceTray.tsx');
const communityExperience=source('src/features/community/CommunityExperience.tsx');
const living=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const active=source('src/features/living-workspace/ActiveAgreementWorkspace.tsx');
const check=source('src/features/living-workspace/LiveWorkResultPanel.tsx');
const agreementMedia=source('src/features/living-workspace/AgreementMediaEvidenceTool.tsx');
const outcome=source('src/features/living-workspace/ProjectOutcomeComposer.tsx');

test('Convergence Gate 1: bill/photo intake remains a real KS001 conversation-scoped source',()=>{
  assert.match(agent,/uploadSource: \(conversationId:/);
  assert.match(agent,/\$\{conversation\(conversationId\)\}\/sources\/upload/);
  assert.match(tray,/gateway\.uploadSource\(targetConversationId/);
  assert.match(tray,/Add to KS001/);
  assert.match(tray,/source\.sourceArtifactId/);
  assert.match(tray,/source\.extractionStatus==='READY'\|\|source\.extractionStatus==='PARTIAL'/);
  assert.match(sources,/sourceOutcome\(current\)/);
});
test('Convergence Gate 1: an uploaded receipt is not assumed to be successfully read',()=>{
  assert.match(tray,/setUploadState\('reading'\)/);
  assert.match(tray,/could not read it/);
  assert.match(tray,/has not been confirmed yet/);
  assert.match(sources,/RECEIVED|PROCESSING/);
});
test('Convergence Gate 1: Community choices go to existing KS001 commercial-source authority',()=>{
  assert.match(communityExperience,/communitySourceFactFor\(state\.selectedRealObject!/);
  assert.match(communityExperience,/onUseThis\(fact\)/);
  assert.match(communityExperience,/candidateKsNumber/);
  assert.match(agent,/selectCommercialSource: \(id:/);
  assert.match(agent,/continueAfterSourceSelection: \(id:/);
  assert.match(living,/onPlanWithKs001=\{continueCircleToWork\}/);
});
test('Convergence Gate 1: three media authorities remain separately scoped, not pooled',()=>{
  assert.match(community,/\/api\/v1\/community\/media/);
  assert.match(community,/\/api\/v1\/community\/media\/\$\{segment\(id\)\}\/content/);
  assert.match(community,/auth: 'required'/);
  assert.match(agent,/\/sources\/upload/);
  assert.match(agreementMedia,/media\.uploadVerifiedMedia\(/);
  assert.match(agreementMedia,/media\.submitVerifiedMediaEvidence\(/);
  assert.match(agreementMedia,/result\.status!=='VERIFIED_UPLOAD_ONLY'/);
});
test('Convergence Gate 1: Fair Trade examination stays canonical and version-bound',()=>{
  assert.match(agent,/readFairTradeExamination:/);
  assert.match(check,/data-gate4-12-lens-coverage/);
  assert.match(check,/fairTrade\.principleCoverage\?\.length===12/);
  assert.match(check,/No unshown principle is treated as assessed/);
});
test('Convergence Gate 1: obligations and Money rely on existing Agreement/Money authority',()=>{
  assert.match(active,/gateways\.agreements\.submitEvidence\(/);
  assert.match(active,/<AgreementWorkProgress/);
  assert.match(active,/describeMoneyTruth\(moneySnapshot\)/);
  assert.match(active,/The rail choice is a preference/);
  assert.doesNotMatch(active,/\btransferMoney\(|\bexecutePayment\(/);
});
test('Convergence Gate 1: project outcome is public consented narrative, never backend-certified spending',()=>{
  assert.match(outcome,/gateways\.community\.contributions\.create\(payload\)/);
  assert.match(outcome,/explicitSafeShare:true/);
  assert.match(outcome,/privateCheck/);
  assert.match(outcome,/member-reported/);
  assert.doesNotMatch(outcome,/\bpayAgreement\(|\bacceptWorker\(|\breleaseMoney\(/);
});
