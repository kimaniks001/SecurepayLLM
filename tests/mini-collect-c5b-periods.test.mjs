import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  newCollectionTypeSelection, chooseCollectionType, chooseCollectionCadence,
} from '../src/features/mini-collect/collectionTypes.mjs';
import {
  newGovernanceDraft, withGovernanceAnswer,
} from '../src/features/mini-collect/governanceDraft.mjs';
import {
  canonicalCollectionTypeTerms, assessCyclePeriod,
  canSubmitFinancialCycle, SOURCE_OPTIONS,
} from '../src/features/mini-collect/c5bPreparation.mjs';

const src = p => readFileSync(new URL('../' + p,import.meta.url),'utf8');
const today = '2026-11-19';
function typed(kind,type,cadence,deadline='2026-12-31') {
  const sel=chooseCollectionCadence(
    chooseCollectionType(newCollectionTypeSelection(kind),type),cadence);
  return withGovernanceAnswer(newGovernanceDraft(kind,sel),'deadline',deadline);
}
const monthly = {startsOn:'2026-11-01',endsOn:'2026-11-30',
  timeZoneId:'Africa/Nairobi',sourceCategory:'existing-bill'};

test('C5B: Mini types map to exact backend canonical type and cadence values', () => {
  assert.deepEqual(canonicalCollectionTypeTerms(typed('regular','estate-dues','monthly')),{
    typeId:'estate-dues',kind:'regular',cadence:'MONTHLY',
  });
  assert.deepEqual(canonicalCollectionTypeTerms(typed('paid','school-fees','school-term')),{
    typeId:'school-fees',kind:'paid',cadence:'SCHOOL_TERM',
  });
  assert.deepEqual(canonicalCollectionTypeTerms(typed('give','welfare','one-time')),{
    typeId:'welfare',kind:'give',cadence:'ONE_TIME',
  });
  assert.equal(canonicalCollectionTypeTerms(newGovernanceDraft('paid')),null);
});

test('C5B: a full, finite monthly collection period is reviewable but never payable', () => {
  const draft=typed('regular','estate-dues','monthly');
  const result=assessCyclePeriod(draft,monthly,today);
  assert.equal(result.reviewComplete,true);
  for(const flag of ['backendAgreementCreated','periodPersisted','payerObligationsVerified',
    'debtEstablished','paymentAuthorized','recurringDebitAuthorized','refundsAuthorized']){
    assert.equal(result[flag],false,flag);
  }
  assert.equal(canSubmitFinancialCycle(),false);
});

test('C5B: months, end dates, invalid calendars and expired periods fail closed', () => {
  const draft=typed('regular','estate-dues','monthly');
  for(const change of [
    {startsOn:'2026-11-03'}, {endsOn:'2026-12-01'},
    {startsOn:'2026-12-01',endsOn:'2026-11-30'},
    {startsOn:'2026-11-31'}, {endsOn:'2026-11-31'},
    {startsOn:'2026-10-01',endsOn:'2026-10-31'},
    {startsOn:'2027-01-01',endsOn:'2027-01-31'},
    {timeZoneId:'Etc/UTC'},
  ]){
    assert.equal(assessCyclePeriod(draft,{...monthly,...change},today).reviewComplete,false,
      JSON.stringify(change));
  }
  assert.equal(assessCyclePeriod(typed('regular','estate-dues','monthly','2026-11-29'),
    monthly,today).reviewComplete,false);
});

test('C5B: scheduled C2 opening date controls period selection', () => {
  let draft=typed('paid','school-fees','one-time','2026-12-31');
  draft=withGovernanceAnswer(draft,'startRule','scheduled');
  draft=withGovernanceAnswer(draft,'startDate','2026-12-10');
  assert.equal(assessCyclePeriod(draft,{
    startsOn:'2026-12-01',endsOn:'2026-12-15',
    timeZoneId:'Africa/Nairobi',sourceCategory:'existing-bill',
  },today).reviewComplete,false);
  assert.equal(assessCyclePeriod(draft,{
    startsOn:'2026-12-10',endsOn:'2026-12-15',
    timeZoneId:'Africa/Nairobi',sourceCategory:'existing-bill',
  },today).reviewComplete,true);
});

test("C5B: charity’s purpose is not a legal debt and non-giving cannot use purpose-only source", () => {
  const charity=typed('give','welfare','one-time');
  const period={startsOn:'2026-11-20',endsOn:'2026-12-01',
    timeZoneId:'Africa/Nairobi',sourceCategory:'purpose-only'};
  assert.equal(assessCyclePeriod(charity,period,today).reviewComplete,true);
  const bill=typed('paid','school-fees','one-time');
  assert.equal(assessCyclePeriod(bill,period,today).reviewComplete,false);
  assert.equal(SOURCE_OPTIONS.find(x => x.id === 'purpose-only').label,
    'A named voluntary cause');
});

test('C5B: phone-first screen is linked through C2 and never fakes an API write', () => {
  const c2=src('src/features/mini-collect/C2GovernanceExperience.tsx');
  const page=src('src/features/mini-collect/C5BCollectionPeriods.tsx');
  assert.match(c2,/C5BCollectionPeriods draft=\{draft\}/);
  assert.match(c2,/setPeriodReviewOpen\(true\)/);
  assert.match(page,/onClick=\{onContinue\}/);
  assert.match(page,/An accepted review is never an automatic debit/);
  assert.match(page,/No collection period, payer obligation, SecureLink/);
  assert.match(page,/type="month"/);
  assert.match(page,/type="date"/);
  assert.doesNotMatch(page,/fetch\s*\(|executePayment|markAsPaid|connectToMoney/);
});
