import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const dto = fs.readFileSync(new URL('../src/api/securepay/marketnetwork/dto.ts', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/marketnetwork/index.ts', import.meta.url), 'utf8');

test('Plug supplier proposals preserve conflict disclosure', () => {
  assert.match(dto, /SELF_OWNED_STORE/);
  assert.match(dto, /REPRESENTED_BUSINESS_STORE/);
  assert.match(dto, /disclosureText/);
  assert.match(gateway, /proposeMissionSupplier/);
  assert.match(gateway, /supplierProposalsForNeed/);
});

test('proposal contract does not contain selection authority', () => {
  assert.doesNotMatch(dto, /selected: boolean|agreementId|paymentReady/);
});
