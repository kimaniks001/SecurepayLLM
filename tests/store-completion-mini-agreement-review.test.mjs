import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/fulfilment-needs/index.ts', import.meta.url), 'utf8');

test('mini agreement review is explicitly non-binding', () => {
  assert.match(gateway, /ONE_TAP/);
  assert.match(gateway, /ONE_QUESTION/);
  assert.match(gateway, /MICRO_REVIEW/);
  assert.match(gateway, /agreementCreated: false/);
  assert.match(gateway, /moneyMoved: false/);
});
