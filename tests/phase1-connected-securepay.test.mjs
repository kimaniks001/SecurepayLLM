import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=src('src/features/living-workspace/UniversalSourceTray.tsx');
const shell=src('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const quick=src('src/features/living-workspace/QuickSupportPanel.tsx');
const store=src('src/features/living-workspace/StoresTool.tsx');
const panel=src('src/features/living-workspace/LiveWorkResultPanel.tsx');
const people=src('src/features/living-workspace/PeopleInvitationsTool.tsx');
const work=src('src/features/living-workspace/WorkspaceContinuityPanel.tsx');
const community=src('src/features/living-workspace/InlineCommunityHub.tsx');
const money=src('src/features/living-workspace/UnifiedMoneyTool.tsx');
const router=src('src/RuntimeApp.tsx');

// These are source and interface CONTRACT tests, NOT real end-to-end browser certification.
test('Phase1: selecting a photo or document is local until explicit Send',()=>{
  assert.doesNotMatch(source,/if\(gateway && !isDemo && tool!=='Places'\) void uploadToKs001\(file\)/);
  assert.match(source,/Selection and preview stay local/);
  assert.match(source,/Send \{tool==='Photos'\?'photo':'document'\} to KS001/);
  assert.match(source,/onClick=\{\(\)=>void uploadToKs001\(\)\}/);
  assert.match(source,/if\(!gateway \|\| isDemo \|\| !file \|\| uploadState==='uploading' \|\| uploadState==='unknown' \|\| uploadState==='confirmed'\)return/);
  assert.match(source,/gateway\.uploadSource\(targetConversationId,tool==='Photos'\?'PHOTO':'DOCUMENT',file\)/);
  assert.match(source,/source\.conversationId!==targetConversationId/);
  assert.match(source,/A source is not automatically an Agreement fact or accepted evidence/);
});
test('Phase1: one live conversation owns KS001, formation, edits and supporting sources',()=>{
  assert.match(shell,/createAgentController\(gateway, undefined/);
  assert.match(shell,/createFormationController\(gateway\)/);
  assert.match(shell,/liveState\?\.conversationId \?\? null/);
  assert.match(shell,/formationController\.load\(liveConversationId\)/);
  assert.match(shell,/source\.conversationId!==liveConversationId/);
  assert.match(shell,/supportingFact\?\.conversationId===liveConversationId/);
  assert.match(shell,/onAddToFact=\{openFactSourcePicker\}/);
  assert.match(panel,/onClick=\{\(\)=>onAddToFact\(item\.label\)\}/);
});
test('Phase1: a KS number lookup is not participant association or invitation',()=>{
  assert.match(people,/onCheckKs\(ks\.trim\(\)\)/);
  assert.match(people,/Checking does not add this person or confirm their acceptance/);
  assert.match(people,/Lookup only/);
  assert.match(shell,/gateway\.selectKsIdentity\(id,\{ksNumber\}\)/);
  assert.doesNotMatch(shell,/gateway\.selectKsIdentity\(id,\{ksNumber,expectedTradeContextVersion/);
});
test('Phase1: Quick Assist task survives Store search but is not silently shared to sellers',()=>{
  assert.match(quick,/onFindStoreOffers\?: \(kind: 'stays' \| 'ride', requestedTask: string\)/);
  assert.match(quick,/onFindStoreOffers\(selected === 'stays' \? 'stays' : 'ride', request\.trim\(\)\)/);
  assert.match(shell,/setStoreQuickAssistNeed\(requestedTask\)/);
  assert.match(store,/Only service category\/location filters go to Store search/);
  assert.match(store,/initialQuickAssistNeed\.slice\(0,800\)/);
  assert.match(store,/await gateways\.stores\.offer\(ownerKs,offerId\)/);
  assert.match(store,/record\.canonicalKsNumber!==ownerKs\|\|record\.offer\.id!==offerId/);
  assert.match(store,/Do not order, reserve, contact the seller, commit Agreement terms or move money/);
});
test('Phase1: saved work resumes with the canonical conversation ID and session',()=>{
  assert.match(work,/await gateways\.agent\.resumeSavedBuild\(item\.savedBuildId\)/);
  assert.match(work,/savedRecord\.conversationId!==item\.conversationId/);
  assert.match(work,/await onResume\(savedRecord\.conversationId\)/);
  assert.match(shell,/await liveController\.resumeConversation\(conversationId\)/);
  assert.match(work,/ensureFreshSession\(session,gateways\.auth\)/);
});
test('Phase1: Money is downstream of real Agreement and protected backend state',()=>{
  assert.match(money,/onOpenAgreementMoney/);
  assert.match(money,/onReviewAgreement/);
  assert.match(money,/agreementId/);
  assert.match(shell,/openMoneyFor\(\{agreementId:agreement\.agreementId/);
  assert.match(panel,/The amount shown in this draft is not a payment instruction/);
  assert.match(panel,/Money cannot be initiated from this preview/);
});
test('Phase1: Community data stays behind membership and Circle boundaries',()=>{
  assert.match(community,/membership\.data\?\.status==='ACTIVE'/);
  assert.match(community,/row\.circleId===null/);
  assert.match(community,/SecurePay could not verify your membership/);
});
test('Phase1: preview is explicitly isolated, not secretly promoted as a production runtime',()=>{
  assert.match(router,/hostname\.endsWith\('\.vercel\.app'\)/);
  assert.match(router,/if \(phase1Preview\) return <Phase1LivingWorkspacePreview/);
  assert.match(shell,/No money, invitation, approval or booking authority is granted/);
});
