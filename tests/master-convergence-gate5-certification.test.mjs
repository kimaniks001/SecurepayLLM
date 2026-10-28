import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateMasterGate5,gate5ReleaseChecks} from '../testing/master-convergence-gate5-certification.mjs';
import {gate2Journeys} from '../testing/master-convergence-gate2-evidence.mjs';
import {requiredGate3Evidence} from '../testing/master-convergence-gate3-certification.mjs';
import {gate4Checks} from '../testing/master-convergence-gate4-certification.mjs';
import {requiredGate7Checks} from '../testing/true-north-gate7-certification.mjs';

const UI='a'.repeat(40),API='b'.repeat(40);
const baseline=JSON.parse(readFileSync(new URL('../testing/master-convergence-gate5-evidence.json',import.meta.url),'utf8'));
const run=repo=>'https://github.com/kimaniks001/'+repo+'/actions/runs/12345';
const reviewedAt='2026-10-28T12:00:00Z';
function allMetadata(){
 const x=structuredClone(baseline);
 x.uiSha=UI;x.apiSha=API;
 x.gates.gate2.uiSha=UI;x.gates.gate2.apiSha=API;
 x.gates.gate3.uiSha=UI;x.gates.gate3.apiSha=API;
 x.gates.gate4.uiSha=UI;x.gates.gate4.apiSha=API;
 for(const j of gate2Journeys)x.gates.gate2.journeys[j.id]={
  status:'PASS',execution:'REAL_AUTHENTICATED_OR_ANONYMOUS_API',
  uiSha:UI,apiSha:API,apiRunUrl:run('SecurePayAPI'),uiRunUrl:run('SecurepayLLM'),
  reviewer:'Independent reviewer',reviewNotes:'Independent real evidence must be checked against each exact SHA.',
  reviewedAt,usesRealMoney:false,
  assertions:Object.fromEntries(j.checks.map(k=>[k,true])),
 };
 for(const e of requiredGate3Evidence)x.gates.gate3.checks[e.id]={
  status:'PASS',execution:'REAL_API_OR_AUTHENTICATED_BROWSER',
  sha:e.repo==='SecurePayAPI'?API:UI,runUrl:run(e.repo),
  reviewer:'Independent reviewer',notes:'Verified actual owner and participant authority in isolated staging.',
  reviewedAt,fundsMoved:false,
 };
 for(const e of gate4Checks)x.gates.gate4.checks[e.id]={
  status:'PASS',execution:'AUTHENTICATED_REAL_BACKEND_OR_BROWSER',
  sha:e.repo==='SecurePayAPI'?API:UI,runUrl:run(e.repo),
  reviewer:'Independent reviewer',reviewNotes:'Verified the API and account scopes on real isolated identities.',
  reviewedAt,anyRealMoneyMoved:false,
 };
 for(const e of requiredGate7Checks)x.gates.trueNorthGate7.checks[e.id]={
  status:'PASS',sha:e.repo==='SecurePayAPI'?API:UI,
  runUrl:run(e.repo),reviewedBy:'Independent reviewer',
  reviewedAt,evidenceNotes:'Actual role identities and relevant CI artifacts require independent checks.',
 };
 for(const e of gate5ReleaseChecks)x.checks[e.id]={
  status:'PASS',execution:'VERIFIED_ISOLATED_CI_OR_AUTHENTICATED_STAGING',
  sha:e.repo==='SecurePayAPI'?API:UI,runUrl:run(e.repo),
  reviewer:'Independent reviewer',reviewedAt,
  evidenceNotes:'Human must inspect real CI artifacts; sample metadata is not evidence.',
  actualMoneyMoved:false,productionChanged:false,
 };
 return x;
}
test('Gate 5 default register is NO_GO with four incomplete prerequisite sections',()=>{
 const r=evaluateMasterGate5(baseline,{uiSha:UI,apiSha:API});
 assert.equal(r.decision,'NO_GO');
 assert.equal(r.completedSections,0);
 assert.equal(r.sections.length,4);
 assert.equal(r.reviewed,0);
 assert.equal(r.total,8);
});
test('Gate 5 reuses six, seven, eight and twelve existing canonical requirements',()=>{
 const x=allMetadata(),r=evaluateMasterGate5(x,{uiSha:UI,apiSha:API});
 assert.equal(r.sections.find(s=>s.id==='gate2').total,6);
 assert.equal(r.sections.find(s=>s.id==='gate3').total,7);
 assert.equal(r.sections.find(s=>s.id==='gate4').total,8);
 assert.equal(r.sections.find(s=>s.id==='trueNorthGate7').total,12);
 assert.equal(r.completedSections,4);
 assert.equal(r.decision,'READY_FOR_OWNER_GATE6_DECISION');
 assert.match(r.warning,/JSON links are not independently verified/);
});
test('Gate 5: missing ONE existing gate must fail entire release',()=>{
 for(const gate of ['gate2','gate3','gate4','trueNorthGate7']){
  const x=allMetadata();delete x.gates[gate];
  const r=evaluateMasterGate5(x,{uiSha:UI,apiSha:API});
  assert.equal(r.decision,'NO_GO',gate);
  assert.ok(r.blockers.some(s=>s.startsWith(gate+':')),gate);
 }
});
test('Gate 5: a synthetic input in any prerequisite gate cannot be relabelled production-ready',()=>{
 for(const which of ['gate2','gate3','gate4','trueNorthGate7']){
  const x=allMetadata();
  if(which==='gate2')x.gates.gate2.journeys.visitor_intention.execution='SYNTHETIC_PROTOCOL_PASS';
  if(which==='gate3')x.gates.gate3.checks.three_conversations.execution='SYNTHETIC_PROTOCOL_PASS';
  if(which==='gate4')x.gates.gate4.checks.two_account_authority.execution='SYNTHETIC_PROTOCOL_PASS';
  if(which==='trueNorthGate7')x.gates.trueNorthGate7.checks.gate4_real_ks001.status='MISSING';
  assert.equal(evaluateMasterGate5(x,{uiSha:UI,apiSha:API}).decision,'NO_GO',which);
 }
});
test('Gate 5: one missing release authority blocks regardless of other green signals',()=>{
 for(const check of gate5ReleaseChecks){
  const x=allMetadata();x.checks[check.id].status='PENDING';
  const r=evaluateMasterGate5(x,{uiSha:UI,apiSha:API});
  assert.equal(r.decision,'NO_GO',check.id);
  assert.ok(r.blockers.some(z=>z.startsWith(check.id+':')));
 }
});
test('Gate 5: wrong SHA, production changes and enabled money are hard blockers',()=>{
 for(const variant of [
  {environment:'PRODUCTION'},{productionChanged:true},
  {financialExecutionDisabled:false},{releaseApproved:true},{apiSha:'badsha'},
 ]){
  const x={...allMetadata(),...variant};
  assert.equal(evaluateMasterGate5(x,{uiSha:UI,apiSha:API}).decision,'NO_GO',JSON.stringify(variant));
 }
 const x=allMetadata();x.gates.gate4.checks.money_safeguards.sha='f'.repeat(40);
 assert.equal(evaluateMasterGate5(x,{uiSha:UI,apiSha:API}).decision,'NO_GO');
});
test('Gate 5: missing independent reviewer or ambiguous payment effect blocks',()=>{
 for(const change of [{reviewer:''},{actualMoneyMoved:null},{productionChanged:true},{runUrl:'https://example.com/runs/1'}]){
  const x=allMetadata();
  Object.assign(x.checks.migration_and_rollback,change);
  assert.equal(evaluateMasterGate5(x,{uiSha:UI,apiSha:API}).decision,'NO_GO',JSON.stringify(change));
 }
});
test('Gate 5 is an evidence evaluator, never a merger, deployer, or executor',()=>{
 const r=evaluateMasterGate5(allMetadata(),{uiSha:UI,apiSha:API});
 assert.equal(r.decision,'READY_FOR_OWNER_GATE6_DECISION');
 assert.doesNotMatch(JSON.stringify(r),/PRODUCTION_DEPLOY_APPROVED|READY_TO_TRANSFER_MONEY/);
});
