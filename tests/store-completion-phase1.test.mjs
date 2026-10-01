import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const dto = fs.readFileSync(new URL('../src/api/securepay/store/dto.ts', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/store/index.ts', import.meta.url), 'utf8');

test('Store Phase 1 exposes CAPACITY without replacing PRODUCT or SERVICE', () => {
  assert.match(dto, /'PRODUCT' \| 'SERVICE' \| 'CAPACITY'/);
});

test('represented Business Store uses explicit Business KS routes', () => {
  assert.match(gateway, /\/api\/v1\/business\/\$\{segment\(businessKsNumber\)\}\/store/);
  assert.match(gateway, /businessOffers/);
  assert.match(gateway, /createBusinessOffer/);
  assert.match(gateway, /businessOfferFulfilment/);
});

test('fulfilment DTO keeps supply facts separate from money and agreement authority', () => {
  assert.match(dto, /MANUFACTURER/);
  assert.match(dto, /DISTRIBUTOR/);
  assert.match(dto, /TRANSPORT_PROVIDER/);
  assert.match(dto, /minimumOrderQuantity/);
  assert.match(dto, /capacityQuantity/);
  assert.doesNotMatch(dto, /paymentReady|settlementAuthority|agreementAccepted/);
});
