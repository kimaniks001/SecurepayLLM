import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/fulfilment-needs/index.ts', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/api/securepay/index.ts', import.meta.url), 'utf8');

test('Fulfilment Need gateway exposes only source-bound derivation paths', () => {
  assert.match(gateway, /from-vision/);
  assert.match(gateway, /from-agreement/);
  assert.doesNotMatch(gateway, /createArbitrary|publicVision|moveMoney|paymentReady/);
});

test('SecurePay API registers fulfilment needs as a Store-adjacent domain seam', () => {
  assert.match(api, /createFulfilmentNeedsGateway/);
  assert.match(api, /fulfilmentNeeds: createFulfilmentNeedsGateway\(http\)/);
});
