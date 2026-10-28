import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const guidanceSource=source('src/features/living-workspace/projectFairTradeGuidance.ts');
const panel=source('src/features/living-workspace/LiveWorkResultPanel.tsx');
const shell=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const gateway=source('src/api/securepay/agent/index.ts');
const js=ts.transpileModule(guidanceSource,{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
}).outputText;
const {projectFairTradeGuidance,projectFairTradeDraft}=await import(
  'data:text/javascript;base64,'+Buffer.from(js).toString('base64')
);
const sourceReference={sourceType:'OPPORTUNITY',sourceId:'p1',sourceTitle:'Tank restoration',
  sourceOwnerKsNumber:'KS0012',contextReference:'community-post:p1',
  capturedPriceMinor:null,capturedCurrency:null,originatingKsNumber:'KS0012',selectedAt:'2026-10-28T10:00:00Z'};
const formation={conversationId:'conv-1',version:7,question:null,what:[],who:[],
  money:[],when:[],conditions:[],notIncluded:[],readingSources:[],reviewable:true};
const reading={conversationId:'conv-1',tradeContextVersion:7,principleSetVersion:'principles-v1:hash',
  status:'PARTIAL_ADVISORY',fullyExamined:false,hasMaterialConcern:false,
  advisoryQuestion:'Is the work paid or voluntary?',findings:[]};

test('Gate 4: only a real selected OPPORTUNITY with canonical Formation gets a project Check',()=>{
  assert.equal(projectFairTradeGuidance(null,formation,reading),null);
  assert.equal(projectFairTradeGuidance({...sourceReference,sourceType:'STORE_OFFER'},formation,reading),null);
  assert.equal(projectFairTradeGuidance(sourceReference,null,reading),null);
  assert.equal(projectFairTradeGuidance(sourceReference,formation,reading)?.title,'Tank restoration');
});
test('Gate 4: current server material question takes precedence over partial Fair Trade advice',()=>{
  const f={...formation,question:{text:'Who will supervise the site?',ask:true}};
  const view=projectFairTradeGuidance(sourceReference,f,reading);
  assert.equal(view.nextQuestion,'Who will supervise the site?');
  assert.equal(view.basis,'formation');
});
test('Gate 4: exact conversation and version guard defeats stale examination',()=>{
  const wrongVersion=projectFairTradeGuidance(sourceReference,formation,{...reading,tradeContextVersion:6});
  const wrongConversation=projectFairTradeGuidance(sourceReference,formation,{...reading,conversationId:'other'});
  for(const projected of [wrongVersion,wrongConversation]){
    assert.equal(projected.basis,'starting-point');
    assert.match(projected.observations,/No current Fair Trade examination is confirmed/);
    assert.doesNotMatch(projected.nextQuestion,/Is the work paid or voluntary\?/);
  }
});
test('Gate 4: partial findings never imply all twelve were cleared',()=>{
  const projected=projectFairTradeGuidance(sourceReference,formation,reading);
  assert.equal(projected.basis,'examination');
  assert.match(projected.observations,/does not mean all 12 principles were assessed/);
  const concern=projectFairTradeGuidance(sourceReference,formation,{
    ...reading,hasMaterialConcern:true,findings:[{principleNumber:7,principleTitle:'To Prevent Exploitation',
      state:'MATERIAL_CONCERN',explanation:'Wages disputed',evidenceReferences:['version-7']}],
  });
  assert.match(concern.observations,/material concern/);
  assert.doesNotMatch(concern.observations,/qualified|approved|passed/);
});
test('Gate 4: funding and consent remain explicit unknowns even with organiser-reported budget',()=>{
  const projected=projectFairTradeGuidance(sourceReference,formation,reading);
  assert.match(projected.funding,/not been verified/);
  const draft=projectFairTradeDraft(projected.nextQuestion);
  assert.match(draft,/12 Principles of Fair Trade/);
  assert.match(draft,/paid work from voluntary/);
  assert.match(draft,/Do not assume any interested person has been selected/);
  assert.match(draft,/Money system provides that evidence/);
  assert.match(draft,/ONE meaningful unanswered question/);
  assert.doesNotMatch(draft,/transferMoney|executePayment|grantConsent/);
});
test('Gate 4: the existing Check reads version-bound server authority and prompts rather than auto-submit',()=>{
  assert.match(panel,/data-true-north-gate4-project-check/);
  assert.match(panel,/projectFairTradeGuidance\(selectedSource \?\? null, formation, fairTrade\)/);
  assert.match(panel,/Discuss this with KS001/);
  assert.match(panel,/Expressing interest is not selection/);
  assert.match(shell,/selectedSource=\{liveState\?\.source\?\?null\}/);
  assert.match(shell,/onPrepareFairTradeDraft=\{message=>/);
  assert.match(shell,/if\(readDraft\(liveConversationId\)\.trim\(\)\)/);
  assert.match(shell,/writeDraft\(liveConversationId,message\)/);
  assert.match(shell,/setDraftRevision\(value=>value\+1\)/);
  assert.match(gateway,/readFairTradeExamination:/);
  assert.doesNotMatch(panel,/\bapproveFairTrade\(|\bcertifyAgreement\(|\bchargeCustomer\(/);
});
