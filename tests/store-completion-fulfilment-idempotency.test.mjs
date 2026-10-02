import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/fulfilment-needs/index.ts', import.meta.url), 'utf8');

test('one source may derive multiple idempotent fulfilment needs', () => {
  assert.match(gateway, /derivationKey: string/);
  assert.match(gateway, /fromVision/);
  assert.match(gateway, /fromAgreementObligation/);
});
