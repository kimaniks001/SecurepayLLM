import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateGate7Evidence,requiredGate7Checks} from '../testing/true-north-gate7-certification.mjs';

const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const uiSha='a'.repeat(40),apiSha='b'.repeat(40);
const noEvidence={environment:'ISOLATED_DISPOSABLE',financialExecutionDisabled:true,
  productionDeploymentApproved:false,checks:{}};
const mockComplete=()=>{
  const checks={};
  for(const x of requiredGate7Checks)checks[x.id]={
    status:'PASS',sha:x.repo==='SecurepayLLM'?uiSha:apiSha,
    runUrl:'https://github.com/kimaniks001/'+x.repo+'/actions/runs/12345',
    evidenceNotes:'Actual underlying evidence would require independent source review.',
    reviewedBy:'Named human reviewer',reviewedAt:'2026-10-28T07:00:00Z',
  };
  return {...noEvidence,checks};
};
test('Gate 7: no evidence is a mandatory NO_GO for every release gate',()=>{
  const result=evaluateGate7Evidence(noEvidence,{uiSha,apiSha});
  assert.equal(result.decision,'NO_GO');
  assert.equal(result.passed,0);
  assert.equal(result.total,12);
  assert.equal(result.checks.filter(c=>c.state==='BLOCKED').length,12);
});
test('Gate 7: safety conditions are independent of green CI evidence',()=>{
  for(const change of [
    {financialExecutionDisabled:false},{environment:'PRODUCTION'},
    {productionDeploymentApproved:true}
  ]){
    const result=evaluateGate7Evidence({...mockComplete(),...change},{uiSha,apiSha});
    assert.equal(result.decision,'NO_GO');
    assert.ok(result.blockers.length>0);
  }
});
test('Gate 7: each evidence claim must match the EXACT tested SHA and repository CI run',()=>{
  for(const x of [
    {sha:'wrong'},
    {runUrl:'https://github.com/other-owner/SecurePayAPI/actions/runs/22'},
    {runUrl:'https://github.com/kimaniks001/SecurepayLLM/actions/runs/22'},
    {runUrl:'https://securepay.ke/deploy/22'},
    {evidenceNotes:'ok'},
    {reviewedBy:''},
    {reviewedAt:'not a date'},
  ]){
    const e=mockComplete();Object.assign(e.checks.api_java_and_migration,x);
    assert.equal(evaluateGate7Evidence(e,{uiSha,apiSha}).decision,'NO_GO',JSON.stringify(x));
  }
});
test('Gate 7: even all attributed evidence is only reviewable, not a production deployment grant',()=>{
  const result=evaluateGate7Evidence(mockComplete(),{uiSha,apiSha});
  assert.equal(result.decision,'READY_FOR_MANUAL_RELEASE_REVIEW');
  assert.equal(result.passed,12);
  assert.match(result.warning,/human verification/);
  assert.doesNotMatch(result.decision,/DEPLOYED|PRODUCTION_AUTHORISED/);
});
test('Gate 7: registered scope covers media, Circle, 12→4, KS001, evidence, Money, stories and rollback',()=>{
  const ids=requiredGate7Checks.map(x=>x.id).join(' ');
  for(const term of ['gate11_media_safety','gate2_discovery_scope','gate3_twelve_to_four',
    'gate4_real_ks001','gate5_agreement_evidence','gate5_money_authority',
    'gate6_public_consent','integrated_live_journey','rollback_and_release']){
    assert.match(ids,new RegExp(term));
  }
  const baseline=JSON.parse(src('testing/true-north-gate7-evidence.json'));
  assert.equal(evaluateGate7Evidence(baseline,{uiSha,apiSha}).decision,'NO_GO');
});
test('Gate 7: combined code owns the same existing source engines, never a new Money/Agreement authority',()=>{
  const hub=src('src/features/living-workspace/InlineCommunityHub.tsx');
  const media=src('src/features/community/InlineCommunityMedia.tsx');
  const workspace=src('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
  const outcome=src('src/features/living-workspace/ProjectOutcomeComposer.tsx');
  const gate4=src('src/features/living-workspace/LiveWorkResultPanel.tsx');
  const gate5=src('src/features/living-workspace/ActiveAgreementWorkspace.tsx');
  assert.match(hub,/CommunityAttachmentView/);
  assert.match(media,/gateway\.media\.upload/);
  assert.match(media,/attachedCommunityMedia/);
  assert.match(workspace,/<CommunityCheckPanel/);
  assert.match(workspace,/<InlineCircleBoard/);
  assert.match(gate4,/data-gate4-12-lens-coverage/);
  assert.match(gate5,/<AgreementMediaEvidenceTool/);
  assert.match(gate5,/<ProjectOutcomeComposer/);
  assert.match(outcome,/contributions\.create\(payload\)/);
  assert.match(outcome,/explicitSafeShare:true/);
  for(const component of [hub,media,outcome])
    assert.doesNotMatch(component,/executePayment\(|fundAgreement\(|releaseMoney\(/);
});
