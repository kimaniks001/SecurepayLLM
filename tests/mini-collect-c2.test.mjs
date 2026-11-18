import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  newGovernanceDraft, withGovernanceAnswer, assessGovernanceDraft,
  isCalendarDate, failureOptions, beneficiaryOptions, canExecuteCollection, SERVER_GATES,
} from '../src/features/mini-collect/governanceDraft.mjs';
const src = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const today = '2026-11-18';
const complete = kind => {
  let d = newGovernanceDraft(kind);
  for (const [key, value] of [
    ['capacity', 'organization'],
    ['contributorScope', 'invited'],
    ['beneficiaryRule', beneficiaryOptions(kind)[0].id],
    ['targetMode', 'fixed'],
    ['targetAmountKes', 30000],
    ['stopRule', 'target-or-date'],
    ['deadline', '2026-12-05'],
    ['failureRule', failureOptions(kind)[0].id],
    ['changeRule', 'affected-consent'],
    ['payoutRule', ['buy', 'group'].includes(kind) ? 'two-approvers' : 'verified-beneficiary'],
  ]) d = withGovernanceAnswer(d, key, value);
  return d;
};

test('C2: no governance rule is silently selected at entry', () => {
  for (const kind of ['buy','paid','regular','group','give','goal']) {
    const d = newGovernanceDraft(kind);
    assert.equal(d.kind, kind);
    assert.equal(d.capacity, null);
    assert.equal(d.targetMode, null);
    assert.equal(d.contributorScope, null);
    assert.equal(d.beneficiaryRule, null);
    assert.equal(d.failureRule, null);
    assert.equal(assessGovernanceDraft(d, today).draftComplete, false);
    assert.equal(assessGovernanceDraft(d, today).activationAllowed, false);
  }
});
test('C2: positive fixed target, future date, governance and fallback are mandatory', () => {
  const d = complete('buy');
  const result = assessGovernanceDraft(d, today);
  assert.equal(result.draftComplete, true);
  assert.equal(result.authorityVerified, false);
  assert.equal(result.activationAllowed, false);
  for (const amount of [-5, 0, 1.4, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null]) {
    assert.equal(assessGovernanceDraft(withGovernanceAnswer(d, 'targetAmountKes', amount), today).draftComplete, false);
  }
  assert.equal(assessGovernanceDraft(withGovernanceAnswer(d, 'deadline', '2026-11-18'), today).draftComplete, false);
  assert.equal(assessGovernanceDraft(withGovernanceAnswer(d, 'deadline', '2026-11-17'), today).draftComplete, false);
  assert.equal(assessGovernanceDraft(withGovernanceAnswer(d, 'failureRule', null), today).draftComplete, false);
});
test('C2: contributor eligibility and purpose-specific rightful beneficiary are mandatory', () => {
  for (const kind of ['buy','paid','regular','group','give','goal']) {
    const d = complete(kind);
    assert.equal(assessGovernanceDraft(d, today).draftComplete, true);
    assert.equal(assessGovernanceDraft(withGovernanceAnswer(d, 'contributorScope', null), today).draftComplete, false);
    assert.equal(assessGovernanceDraft(withGovernanceAnswer(d, 'beneficiaryRule', null), today).draftComplete, false);
  }
  assert.equal(beneficiaryOptions('buy').length, 1);
  assert.equal(beneficiaryOptions('buy')[0].id, 'merchant');
  assert.equal(assessGovernanceDraft(withGovernanceAnswer(complete('buy'), 'beneficiaryRule', 'collector'), today).draftComplete, false);
  assert.equal(beneficiaryOptions('group')[0].id, 'rotation');
});
test('C2: exact date syntax and real calendar days are required', () => {
  assert.equal(isCalendarDate('2026-12-05'), true);
  assert.equal(isCalendarDate('2026-02-29'), false);
  assert.equal(isCalendarDate('2028-02-29'), true);
  assert.equal(isCalendarDate('2026-13-05'), false);
  assert.equal(isCalendarDate('2026-11-31'), false);
  assert.equal(isCalendarDate('2026-1-01'), false);
  assert.equal(isCalendarDate('garbage'), false);
});
test('C2: changing target type resets amounts, stop rule and surplus decisions', () => {
  let d = complete('goal');
  d = withGovernanceAnswer(d, 'stopRule', 'date-only');
  d = withGovernanceAnswer(d, 'surplusRule', 'refund');
  assert.equal(assessGovernanceDraft(d, today).draftComplete, true);
  const open = withGovernanceAnswer(d, 'targetMode', 'open');
  assert.equal(open.targetAmountKes, null);
  assert.equal(open.surplusRule, null);
  assert.equal(open.stopRule, 'date-only');
  assert.equal(assessGovernanceDraft(open, today).draftComplete, true);
  const fixed = withGovernanceAnswer(open, 'targetMode', 'fixed');
  assert.equal(fixed.stopRule, null);
  assert.equal(assessGovernanceDraft(fixed, today).draftComplete, false);
});
test('C2: fixed-target collection continuing to deadline requires explicit surplus rule', () => {
  let d = withGovernanceAnswer(complete('goal'), 'stopRule', 'date-only');
  assert.equal(assessGovernanceDraft(d, today).draftComplete, false);
  d = withGovernanceAnswer(d, 'surplusRule', 'new-consent');
  assert.equal(assessGovernanceDraft(d, today).draftComplete, true);
});
test('C2: group and item purchase cannot bypass group payout approval', () => {
  for (const kind of ['buy','group']) {
    const draft = withGovernanceAnswer(complete(kind), 'payoutRule', 'verified-beneficiary');
    assert.equal(assessGovernanceDraft(draft, today).draftComplete, false);
    assert.match(assessGovernanceDraft(draft, today).missing.join(' '), /group mandate|approvers/);
  }
  const buyOpen = withGovernanceAnswer(complete('buy'), 'targetMode', 'open');
  assert.equal(assessGovernanceDraft(buyOpen, today).draftComplete, false);
});
test('C2: failure policies are purpose-specific, including non-refundable giving', () => {
  for (const kind of ['buy','paid','regular','group','give','goal']) {
    assert.ok(failureOptions(kind).length >= 3);
  }
  const donation = complete('give');
  assert.equal(assessGovernanceDraft(donation, today).draftComplete, true);
  assert.equal(failureOptions('give')[0].id, 'close-report');
  assert.equal(failureOptions('buy')[0].id, 'return');
  assert.equal(assessGovernanceDraft(withGovernanceAnswer(donation, 'failureRule', 'return'), today).draftComplete, false);
});
test('C2: local draft never grants execution authority', () => {
  assert.ok(SERVER_GATES.length >= 5);
  assert.equal(canExecuteCollection(), false);
  assert.equal(assessGovernanceDraft(complete('paid'), today).activationAllowed, false);
  assert.throws(() => newGovernanceDraft('unknown'), /Unknown collection purpose/);
  assert.throws(() => withGovernanceAnswer(complete('buy'), 'kind', 'give'), /Invalid governance answer/);
});
test('C2: one mini journey with answer pills, date picker and fail-closed review', () => {
  const c1 = src('src/features/mini-collect/C1CollectExperience.tsx');
  const ui = src('src/features/mini-collect/C2GovernanceExperience.tsx');
  assert.match(c1, /C2GovernanceExperience kind=\{selected.id\}/);
  assert.match(c1, /Agree on the collection rules/);
  assert.match(ui, /role="group" aria-label=\{ariaLabel\}/);
  assert.match(ui, /type="date"/);
  assert.match(ui, /type="number"/);
  assert.match(ui, /Contributor eligibility/);
  assert.match(ui, /Payout beneficiary/);
  assert.match(ui, /No bank selected, no binding Agreement or SecureLink created/);
  assert.match(ui, /SERVER_GATES\.map/);
  assert.doesNotMatch(ui, /fetch\(|localStorage|sessionStorage|\.disburse\(|\.fund\(/);
});
