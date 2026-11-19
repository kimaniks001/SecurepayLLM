import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COLLECTION_TYPE_PROFILES, newCollectionTypeSelection,
  chooseCollectionType, chooseCollectionCadence,
} from '../src/features/mini-collect/collectionTypes.mjs';
import { newGovernanceDraft } from '../src/features/mini-collect/governanceDraft.mjs';
import {
  questionsForCollection, assessCollectionExamination,
  toCanonicalClarification, canExaminationAuthorizeMoney,
} from '../src/features/mini-collect/c6Examination.mjs';

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const period=Object.freeze({
  startsOn:'2026-11-20',endsOn:'2026-12-10',
  timeZoneId:'Africa/Nairobi',sourceCategory:'existing-bill',
});
function draft(type) {
  const s=chooseCollectionCadence(
    chooseCollectionType(newCollectionTypeSelection(type.kind),type.id),
    type.cadences[0]);
  return newGovernanceDraft(type.kind,s);
}
test('C6: every C5A collection type has concise relevant human questions',()=>{
  for(const type of COLLECTION_TYPE_PROFILES){
    const questions=questionsForCollection(draft(type),period);
    assert.ok(questions.length>=2 && questions.length<=3,type.id);
    assert.equal(questions[0].id,'source',type.id);
    assert.ok(questions[1].title.length>10,type.id);
    assert.equal(new Set(questions.map(q=>q.id)).size,questions.length,type.id);
    for(const q of questions){
      assert.ok(q.options.length>=2,type.id);
      assert.ok(q.options.every(o=>o.label && o.id),type.id);
      assert.equal(new Set(q.options.map(x=>x.id)).size,q.options.length);
    }
  }
});

test('C6: user answers never become verified invoices, legal debt or Money',()=>{
  for(const type of COLLECTION_TYPE_PROFILES){
    const d=draft(type);
    const questions=questionsForCollection(d,period);
    const answers=Object.fromEntries(questions.map(q=>[q.id,q.options[0].id]));
    const result=assessCollectionExamination(d,period,answers);
    for(const key of ['sourceVerified','collectorAuthorityVerified',
      'recipientAuthorityVerified','providerCertified','legalDebtEstablished',
      'agreementAccepted','paymentAuthorized','recurringDebitAuthorized',
      'refundAuthorized','financialExecutionAllowed']){
      assert.equal(result[key],false,type.id+' '+key);
    }
    assert.equal(result.questions.length,questions.length);
    assert.equal(result.pendingIndependentEvidence.length,4);
  }
  assert.equal(canExaminationAuthorizeMoney(),false);
});
test('C6: contradictory source/period answers halt progress but do not alter an Agreement',()=>{
  const shop=COLLECTION_TYPE_PROFILES.find(p=>p.id==='thrift-item');
  const d=draft(shop);
  const questions=questionsForCollection(d,period);
  const answers={source:'have-original',condition:'item-changed'};
  const result=assessCollectionExamination(d,period,answers);
  assert.equal(result.localClarificationsCaptured,true);
  assert.equal(result.disputed,true);
  assert.equal(result.paymentAuthorized,false);
});
test('C6: a different school term or recurring period blocks onward collection review',()=>{
  for(const [typeId,questionId,changeAnswer] of [
    ['school-fees','term','term-different'],
    ['estate-dues','period','new-period'],
    ['school-transport','route','route-changed'],
    ['membership','membership','membership-different'],
    ['chama-cycle','rotation','rotation-disputed'],
    ['welfare','cause','cause-unclear'],
    ['church-giving','giving','purpose-different'],
    ['education-fund','education','need-changed'],
    ['course-enrolment','start','ask-trainer'],
  ]){
    const type=COLLECTION_TYPE_PROFILES.find(x=>x.id===typeId);
    const d=draft(type);
    const questions=questionsForCollection(d,period);
    const answers=Object.fromEntries(questions.map(q=>[q.id,q.options[0].id]));
    answers[questionId]=changeAnswer;
    const result=assessCollectionExamination(d,period,answers);
    assert.equal(result.disputed,changeAnswer!=='ask-trainer',
      typeId+' '+changeAnswer);
    assert.equal(result.financialExecutionAllowed,false);
  }
});

test('C6: calendar offered only for a real start-date clarification',()=>{
  const course=COLLECTION_TYPE_PROFILES.find(p=>p.id==='course-enrolment');
  const d=draft(course);
  const questions=questionsForCollection(d,period);
  const second=questions.find(q=>q.id==='start');
  assert.equal(second.calendar,true);
  assert.equal(assessCollectionExamination(d,period,
    {source:'have-original',start:'propose-date'},'').localClarificationsCaptured,false);
  assert.equal(assessCollectionExamination(d,period,
    {source:'have-original',start:'propose-date'},'2026-12-04').localClarificationsCaptured,true);
  assert.equal(assessCollectionExamination(d,period,
    {source:'have-original',start:'propose-date'},'2026-12-32').localClarificationsCaptured,false);
});

test('C6: every human answer maps to a finite server code without accepting Money',()=>{
  for(const type of COLLECTION_TYPE_PROFILES){
    const questions=questionsForCollection(draft(type),period);
    for(const q of questions){
      for(const pill of q.options){
        const result=toCanonicalClarification(q,pill.id,
          pill.id==='propose-date'?'2026-12-14':null);
        assert.ok(result,'No mapping '+type.id+' '+q.id+' '+pill.id);
        assert.match(result.questionCode,/^[A-Z_]+$/);
        assert.match(result.answerCode,/^[A-Z_]+$/);
        assert.equal(result.moneyAuthorized,false);
        assert.equal(result.evidenceVerified,false);
      }
    }
  }
  const question=questionsForCollection(draft(COLLECTION_TYPE_PROFILES[0]),period)[0];
  assert.equal(toCanonicalClarification(question,'PAY_NOW'),null);
});

test('C6: Mini source and period are preserved through C2→C5B→C6→C3',()=>{
  const c2=source('src/features/mini-collect/C2GovernanceExperience.tsx');
  const c5b=source('src/features/mini-collect/C5BCollectionPeriods.tsx');
  const c6=source('src/features/mini-collect/C6CollectionExamination.tsx');
  assert.match(c2,/C6CollectionExamination/);
  assert.match(c2,/period=\{periodSelection\}/);
  assert.match(c2,/setPeriodSelection\(selection\)/);
  assert.match(c2,/setExaminationOpen\(true\)/);
  assert.match(c5b,/onChosen\(selection\)/);
  assert.match(c5b,/initialSelection/);
  assert.match(c6,/question\.options\.map\(pill/);
  assert.match(c6,/type="date"/);
  assert.match(c6,/disabled=\{review\.disputed\}/);
  assert.match(c6,/No genuine invoice, source, legal debt/);
  assert.doesNotMatch(c6,/fetch\s*\(|markAsPaid|executePayment|connectToMoney/);
});
