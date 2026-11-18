import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const c2 = readFileSync(new URL('../src/features/mini-collect/C2GovernanceExperience.tsx', import.meta.url), 'utf8');
const c3 = readFileSync(new URL('../src/features/mini-collect/C3ProviderPossibilities.tsx', import.meta.url), 'utf8');

test('C3 human preview opens only after completed C2 governance questions', () => {
  assert.match(c2, /disabled=\{!assessment\.draftComplete\}/);
  assert.match(c2, /C3ProviderPossibilities draft=\{draft\}/);
  assert.match(c2, /setProviderExplorationOpen\(true\)/);
  assert.match(c3, /onBack\(\)/);
});
test('C3 explains the approved period, contributor attribution, failed target and payout mandate', () => {
  for (const phrase of ['draft.deadline', 'draft.targetAmountKes', 'failureOptions', 'PAYOUT_RULES',
    'Match each confirmed contribution', 'correct amount to each entitled contributor',
    'payout', 'bank', 'evidence']) {
    assert.ok(c3.toLowerCase().includes(phrase.toLowerCase()), phrase);
  }
});
test('C3 preview never invents a provider or starts Money', () => {
  assert.match(c3, /No bank selected yet/);
  assert.match(c3, /no authenticated Agreement or certified provider/);
  assert.doesNotMatch(c3, /fetch\(|axios|localStorage|sessionStorage|\.activate\(|\.fund\(|\.disburse\(/);
});
