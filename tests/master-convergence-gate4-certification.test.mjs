import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateGate4,gate4Checks} from '../testing/master-convergence-gate4-certification.mjs';
const UI='a'.repeat(40),API='b'.repeat(40);
const base=JSON.parse(readFileSync(new URL('../testing/master-convergence-gate4-evidence.json',import.meta.url),'utf8'));
function all(){
 const checks={};
 for(const c of gate4Checks)checks[c.id]={
  status:'PASS',execution:'AUTHENTICATED_REAL_BACKEND_OR_BROWSER',
  sha:c.repo==='SecurePayAPI'?API:UI,
  runUrl:'https://github.com/kimaniks001/'+c.repo+'/actions/runs/12345',
  reviewer:'Independent named reviewer',reviewedAt:'2026-10-28T11:00:00Z',
  reviewNotes:'Exact committed CI and authenticated actor evidence needs independent source inspection.',
  anyRealMoneyMoved:false,
 };
 return {...base,uiSha:UI,apiSha:API,checks};
}
test('Gate 4: unexecuted acceptance remains 0 of 8 NO_GO',()=>{
 const result=evaluateGate4(base,{uiSha:UI,apiSha:API});
 assert.equal(result.decision,'NO_GO');assert.equal(result.reviewed,0);
 assert.equal(result.total,8);
});
test('Gate 4: every missing authority blocks, even if the other seven are reported passed',()=>{
 for(const c of gate4Checks){
  const e=all();e.checks[c.id].status='UNVERIFIED';
  assert.equal(evaluateGate4(e,{uiSha:UI,apiSha:API}).decision,'NO_GO',c.id);
 }
});
test('Gate 4: a synthetic provider or account cannot attest to actual payment protection',()=>{
 const e=all();e.checks.two_account_authority.execution='SYNTHETIC_PROTOCOL_PASS';
 assert.equal(evaluateGate4(e,{uiSha:UI,apiSha:API}).decision,'NO_GO');
});
test('Gate 4: wrong SHA, missing reviewer, enabled money, production and mistaken release are rejected',()=>{
 for(const change of [{apiSha:'latest'},{productionChanged:true},{financialExecutionDisabled:false},
  {environment:'PRODUCTION'}]){
  assert.equal(evaluateGate4({...all(),...change},{uiSha:UI,apiSha:API}).decision,'NO_GO');
 }
 const e=all();e.checks.money_safeguards.anyRealMoneyMoved=true;
 assert.equal(evaluateGate4(e,{uiSha:UI,apiSha:API}).decision,'NO_GO');
 const f=all();f.checks.signed_in_responsive.reviewer='';
 assert.equal(evaluateGate4(f,{uiSha:UI,apiSha:API}).decision,'NO_GO');
});
test('Gate 4: passing evidence can reach only manual Gate 5 review, not deploy or Money',()=>{
 const r=evaluateGate4(all(),{uiSha:UI,apiSha:API});
 assert.equal(r.decision,'READY_FOR_MANUAL_GATE5_REVIEW');
 assert.equal(r.reviewed,8);
 assert.match(r.warning,/independent verification/);
});
