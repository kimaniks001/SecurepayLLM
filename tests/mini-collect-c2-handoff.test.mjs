import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGovernanceDraft, withGovernanceAnswer, failureOptions } from '../src/features/mini-collect/governanceDraft.mjs';
import { prepareCollectionGovernanceSubmission } from '../src/features/mini-collect/governanceSubmission.mjs';

const agreementId = '1b53156f-53ce-4c52-8750-aed96d88f3e5';
const groupSecureLinkId = 'abc920df-86a1-4573-a124-0a72ed10f2f0';
const context = Object.freeze({
  agreementId, groupSecureLinkId,
  timeZone: 'Africa/Nairobi',
  todayIso: '2026-11-18',
  closingLocalDate: '2026-11-25',
  contributionDeadline: '2026-11-25T17:00:00+03:00',
  targetType: 'FIXED_AMOUNT',
  targetAmountMinor: 3_000_000,
  scheduledStartAt: null,
  sourceReference: 'store-offer:solar-light',
  sourceVersion: 'v2',
});

function draft(kind='buy') {
  let d = newGovernanceDraft(kind);
  for (const [key,value] of [
    ['capacity','organization'], ['contributorScope','invited'],
    ['beneficiaryRule', kind === 'buy' ? 'merchant' : 'organization'],
    ['targetMode','fixed'], ['targetAmountKes',30000],
    ['startRule','on-activation'], ['deadline','2026-11-25'],
    ['stopRule','target-or-date'], ['failureRule',failureOptions(kind)[0].id],
    ['changeRule','affected-consent'],
    ['payoutRule', kind === 'buy' ? 'two-approvers' : 'existing-mandate'],
  ]) d = withGovernanceAnswer(d,key,value);
  return d;
}
const submit = (d=draft(), c=context) => prepareCollectionGovernanceSubmission(d,c,'c2-draft-key-0001');

test('C2 handoff maps friendly choices to exact backend draft taxonomy and KES minor units', () => {
  const x = submit();
  assert.equal(x.agreementId, agreementId);
  assert.equal(x.body.terms.purposeKind, 'buy');
  assert.equal(x.body.terms.beneficiaryRule, 'MERCHANT');
  assert.equal(x.body.terms.targetType, 'FIXED_AMOUNT');
  assert.equal(x.body.terms.targetAmountMinor, 3_000_000);
  assert.equal(x.body.terms.stopRule, 'TARGET_OR_DATE');
  assert.equal(x.body.terms.startRule, 'AFTER_APPROVAL');
  assert.equal(x.body.terms.payoutRule, 'TWO_APPROVERS');
  assert.equal(x.body.terms.failureRule, 'RETURN');
  assert.equal(x.body.terms.sourceReference, 'store-offer:solar-light');
  assert.equal(x.body.terms.sourceVersion, 'v2');
  assert.equal(x.body.terms.endAt, context.contributionDeadline);
  assert.ok(!('activationAllowed' in x.body));
});
test('C2 handoff rejects invented or absent canonical Agreement context', () => {
  assert.throws(() => submit(draft(), { ...context, agreementId: '' }), /Canonical identifiers required/);
  assert.throws(() => submit(draft(), { ...context, groupSecureLinkId: '' }), /Canonical identifiers required/);
  assert.throws(() => submit(draft(), { ...context, timeZone: null }), /time zone required/);
  assert.throws(() => submit(draft(), { ...context, contributionDeadline: '2026-11-25' }), /Absolute contribution deadline/);
});
test('C2 handoff rejects target mismatch, false precision and wrong display deadline', () => {
  assert.throws(() => submit(draft(), { ...context, targetAmountMinor: 2900000 }), /Target amount does not match/);
  assert.throws(() => submit(draft(), { ...context, closingLocalDate: '2026-11-26' }), /Closing date mismatch/);
  assert.throws(() => submit(draft(), { ...context, targetType: 'OPEN_ENDED' }), /Group target type mismatch/);
});
test('C2 handoff cannot make an unanswered draft appear approved', () => {
  assert.throws(() => submit(newGovernanceDraft('buy')), /Unanswered collection rules/);
  assert.throws(() => prepareCollectionGovernanceSubmission(draft(),context,''), /Stable request key/);
});
test('C2 adapter never sends, stores or activates a collection', () => {
  const src = readFileSync(new URL('../src/features/mini-collect/governanceSubmission.mjs', import.meta.url),'utf8');
  assert.doesNotMatch(src, /fetch\(|axios|localStorage|sessionStorage|\.activate\(|\.disburse\(/);
  assert.match(src, /backend controls the actual Agreement version/);
});
