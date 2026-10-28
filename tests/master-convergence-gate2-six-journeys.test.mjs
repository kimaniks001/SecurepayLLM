import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateGate2,gate2Journeys} from '../testing/master-convergence-gate2-evidence.mjs';
const uiSha='a'.repeat(40),apiSha='b'.repeat(40);
const baseline=JSON.parse(readFileSync(new URL('../testing/master-convergence-gate2-evidence.json',import.meta.url),'utf8'));
const all=()=>{
 const journeys={};
 for(const j of gate2Journeys)journeys[j.id]={
  status:'PASS',execution:'REAL_AUTHENTICATED_OR_ANONYMOUS_API',apiSha,uiSha,
  apiRunUrl:'https://github.com/kimaniks001/SecurePayAPI/actions/runs/12345',
  uiRunUrl:'https://github.com/kimaniks001/SecurepayLLM/actions/runs/12345',
  reviewer:'Named independent reviewer',reviewNotes:'Independently verify the actual authorisation and returned API records.',
  reviewedAt:'2026-10-28T09:00:00Z',usesRealMoney:false,
  assertions:Object.fromEntries(j.checks.map(k=>[k,true])),
 };
 return {...baseline,apiSha,uiSha,journeys};
};
test('Gate 2: evidence register begins NO_GO with zero of six confirmed journeys',()=>{
 const r=evaluateGate2(baseline,{uiSha,apiSha});
 assert.equal(r.decision,'NO_GO');
 assert.equal(r.total,6);
 assert.equal(r.reviewed,0);
 assert.equal(r.journeys.every(x=>x.state==='BLOCKED'),true);
});
test('Gate 2: no staged or synthetic claim can pass as authenticated backend evidence',()=>{
 for(const variant of [{execution:'SYNTHETIC_ADAPTER'},{execution:'FRONTEND_ONLY'},{status:'PASS',apiRunUrl:'https://example.com/fake'}]){
  const data=all();Object.assign(data.journeys.visitor_intention,variant);
  assert.equal(evaluateGate2(data,{uiSha,apiSha}).decision,'NO_GO');
 }
});
test('Gate 2: one absent material property blocks the complete six-person release decision',()=>{
 for(const journey of gate2Journeys){
  const data=all();
  data.journeys[journey.id].assertions[journey.checks[0]]=false;
  const decision=evaluateGate2(data,{uiSha,apiSha});
  assert.equal(decision.decision,'NO_GO',journey.id);
  assert.match(decision.blockers.join(' '),new RegExp(journey.id));
 }
});
test('Gate 2: exact matched UI and API SHAs, production isolation and no actual money execution are mandatory',()=>{
 for(const override of [{apiSha:'wrong'},{productionChanged:true},{financialExecutionDisabled:false},{environment:'PRODUCTION'}]){
  assert.equal(evaluateGate2({...all(),...override},{uiSha,apiSha}).decision,'NO_GO');
 }
 const changed=all();changed.journeys.project_12_to_4.apiSha='f'.repeat(40);
 assert.equal(evaluateGate2(changed,{uiSha,apiSha}).decision,'NO_GO');
 const paid=all();paid.journeys.identity_activation_money.usesRealMoney=true;
 assert.equal(evaluateGate2(paid,{uiSha,apiSha}).decision,'NO_GO');
});
test('Gate 2: only independently reviewable evidence can move into Gate 3, never production',()=>{
 const result=evaluateGate2(all(),{uiSha,apiSha});
 assert.equal(result.decision,'READY_FOR_HUMAN_GATE3_REVIEW');
 assert.equal(result.reviewed,6);
 assert.doesNotMatch(result.decision,/DEPLOY|PRODUCTION_APPROVED/);
 assert.match(result.warning,/independently inspect/);
});
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Gate 2: Gate 3 existing real 12→4 harness remains identity-scoped and refuses Money',()=>{
 const s=src('testing/gate3-12-to-4-live.mjs');
 assert.match(s,/Exactly 12 independent applicants/);
 assert.match(s,/Every selected worker must be one distinct applicant/);
 assert.match(s,/no invitation\/Join authority/i);
 assert.match(s,/Four separate Join actions completed/);
 assert.match(s,/funding:'NOT_CHECKED_OR_EXECUTED'/);
 assert.match(s,/loopback HTTP only/);
});
test('Gate 2: Circle updates remain coordination, not Agreement or Payment action',()=>{
 const circle=src('src/features/living-workspace/InlineCircleBoard.tsx');
 const agreement=src('src/features/living-workspace/ActiveAgreementWorkspace.tsx');
 assert.match(circle,/Circle notes and quick responses never accept Agreements or move Money/);
 assert.match(circle,/The Circle does not disclose anyone else’s private Agreement/);
 assert.match(agreement,/gateways\.agreements\.submitEvidence\(/);
 assert.match(agreement,/describeMoneyTruth\(moneySnapshot\)/);
 assert.doesNotMatch(circle,/payAgreement\(|releaseMoney\(|completeObligation\(/);
});
test('Gate 2: source status and Community publishing maintain privacy and payment truth',()=>{
 const source=src('src/features/living-workspace/UniversalSourceTray.tsx');
 const published=src('src/features/living-workspace/ProjectOutcomeComposer.tsx');
 const activation=src('src/features/activation/ActivationExperience.tsx');
 assert.match(source,/Add to KS001/);
 assert.match(source,/could not read it/);
 assert.match(published,/explicitSafeShare:true/);
 assert.match(published,/privateCheck/);
 assert.match(published,/member-reported/);
 assert.match(activation,/activationAgreement/);
 assert.match(activation,/activationFundingStatus/);
 assert.doesNotMatch(published,/transferMoney\(|releaseMoney\(/);
});
