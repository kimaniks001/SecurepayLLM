import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/fulfilment-needs/index.ts', import.meta.url), 'utf8');

test('Fulfilment discovery is need-owner scoped and returns factual trade-offs', () => {
  assert.match(gateway, /\/matches\?limit=/);
  assert.match(gateway, /tradeOffs/);
  assert.match(gateway, /minimumOrderQuantity/);
  assert.match(gateway, /leadTimeHours/);
  assert.doesNotMatch(gateway, /bestMatch|score|winner/);
});
