import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const possibilities = readFileSync(
  new URL('../src/features/mini-collect/C3ProviderPossibilities.tsx', import.meta.url), 'utf8');
const comparison = readFileSync(
  new URL('../src/features/mini-collect/C3ProviderComparison.tsx', import.meta.url), 'utf8');

test('C3C discovery follows bank capability explanation and can navigate back', () => {
  assert.match(possibilities, /Compare verified financial providers/);
  assert.match(possibilities, /setShowComparison\(true\)/);
  assert.match(possibilities, /C3ProviderComparison onBack=/);
  assert.match(comparison, /onClick=\{onBack\}/);
});

test('C3C never displays unverified sample banks, speculative charges or a fictitious total', () => {
  assert.match(comparison, /No verified provider to recommend yet/);
  assert.match(comparison, /We won.t fill this space with bank names/);
  assert.match(comparison, /totalCostKnown: false/);
  assert.match(comparison, /Total cost cannot be known until/);
  assert.match(comparison, /options = \[\]/);
  assert.doesNotMatch(comparison, /fetch\(|axios|localStorage|\.transfer\(|\.pay\(|\.refund\(/);
});

test('the comparison preserves KES minor units, real provider quotation and proposal-only choice', () => {
  for (const term of ['contributionFixedMinor', 'contributionBasisPoints',
    'refundFixedMinor', 'refundBasisPoints', 'payoutFixedMinor', 'payoutBasisPoints',
    'chargeBearer', 'maximumHoldDays', 'maximumCollectionAmountMinor',
    'feeScheduleVersion', 'quoteFingerprint', 'Propose this provider for our Agreement']) {
    assert.ok(comparison.includes(term), term);
  }
  assert.match(comparison, /!p\.financialExecutionAllowed/);
  assert.match(comparison, /p\.proposalAllowed/);
  assert.match(comparison, /onPropose \?/);
});

test('comparison does not call provider selection without explicit future integration callback', () => {
  assert.match(comparison, /onPropose\?:/);
  assert.match(comparison, /\{onPropose \? <button/); // no selection action without a callback
});
