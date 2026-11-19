import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateMiniCollectC8Acceptance,REQUIRED_COUNT}
  from '../testing/mini-collect-c8/evaluate.mjs';

const source=JSON.parse(readFileSync(
  new URL('../testing/mini-collect-c8/acceptance-20-persons.json',import.meta.url),'utf8'));
test('C8: exactly twenty distinct real-person scenarios prepared but nobody falsely passed',()=>{
  assert.equal(REQUIRED_COUNT,20);
  assert.equal(source.cases.length,20);
  assert.equal(new Set(source.cases.map(x=>x.role)).size,20);
  assert.ok(source.cases.every(x=>x.status==='NOT_TESTED'));
  const result=evaluateMiniCollectC8Acceptance(source);
  assert.equal(result.decision,'NO_GO');
  assert.equal(result.completed,0);
  assert.equal(result.passed,0);
  assert.equal(result.financialExecutionAuthorized,false);
  assert.equal(result.releaseApproved,false);
});
test('C8: each case has a substantive realistic Collect Money expected outcome',()=>{
  for(const c of source.cases){
    assert.ok(c.scenario.length>25,c.caseId);
    assert.ok(c.expectedOutcome.length>25,c.caseId);
    assert.equal(c.distinctTesterConfirmed,false);
    assert.equal(c.participantConsent,false);
  }
});
test('C8: spoofing PASSED without 20 different consented people is NO_GO',()=>{
  const forged=structuredClone(source);
  for(const row of forged.cases)row.status='PASS';
  forged.summary={completed:20,passed:20,failed:0,releaseApproved:false};
  const result=evaluateMiniCollectC8Acceptance(forged);
  assert.equal(result.decision,'NO_GO');
  assert.equal(result.financialExecutionAuthorized,false);
});
test('C8: missing cases, duplicated people and fictitious release approval are NO_GO',()=>{
  const missing=structuredClone(source);
  missing.cases.pop();
  assert.equal(evaluateMiniCollectC8Acceptance(missing).decision,'NO_GO');
  const approved=structuredClone(source);
  approved.summary.releaseApproved=true;
  assert.equal(evaluateMiniCollectC8Acceptance(approved).decision,'NO_GO');
  const malformed=structuredClone(source);
  malformed.cases[1].caseId=malformed.cases[0].caseId;
  assert.equal(evaluateMiniCollectC8Acceptance(malformed).decision,'NO_GO');
});
test('C8: C7 preview never fabricates provider or settled refunds from UAT',()=>{
  const c7=readFileSync(new URL('../src/features/mini-collect/c7ProviderReadiness.mjs',
    import.meta.url),'utf8');
  const c4=readFileSync(new URL('../src/features/mini-collect/c7MoneyLifecycle.mjs',
    import.meta.url),'utf8');
  assert.match(c7,/canC7ReadinessTriggerMoney\(\)\s*\{return false;/);
  assert.match(c4,/canCollectMoneyFromC7Preview\(\)\s*\{return false;/);
  assert.doesNotMatch(c7,/executePayment\(|markAsPaid\(|sendRefund\(/);
});
