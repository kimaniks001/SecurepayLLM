import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/marketnetwork/index.ts', import.meta.url), 'utf8');
const dto = fs.readFileSync(new URL('../src/api/securepay/marketnetwork/dto.ts', import.meta.url), 'utf8');

test('Plug mission contract exposes the three bounded mission types', () => {
  assert.match(dto, /'FULFILMENT' \| 'POOLING' \| 'ASSEMBLY'/);
  assert.match(gateway, /plugMissions/);
  assert.match(gateway, /\/plug-missions\/mine/);
});

test('mission DTO carries bounded actions and no payment authority', () => {
  assert.match(dto, /permittedActions/);
  assert.match(dto, /rewardBasis/);
  assert.doesNotMatch(dto, /paymentReady|releaseAuthority|settlementAuthority/);
});
