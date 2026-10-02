import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/fulfilment-needs/index.ts', import.meta.url), 'utf8');

test('fulfilment may explicitly share a sanitised Community or Circle opportunity', () => {
  assert.match(gateway, /shareToCommunity/);
  assert.match(gateway, /circleId\?: string \| null/);
  assert.match(gateway, /objectType: 'OPPORTUNITY'/);
  assert.doesNotMatch(gateway, /sourceSnapshot|budgetContext.*FulfilmentCommunityShareDto/);
});
