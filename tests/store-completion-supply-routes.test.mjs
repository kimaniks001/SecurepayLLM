import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/fulfilment-needs/index.ts', import.meta.url), 'utf8');

test('supply routes expose trade-offs without a winner or route score', () => {
  assert.match(gateway, /routes: \(needId/);
  assert.match(gateway, /landedCostKnown/);
  assert.match(gateway, /routeLabel/);
  assert.doesNotMatch(gateway, /winner|bestRoute|routeScore/);
});
