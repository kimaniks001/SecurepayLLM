import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/shared-fulfilment/index.ts', import.meta.url), 'utf8');

test('shared fulfilment UI contract is proposal-only', () => {
  assert.match(gateway, /proposeFromNeed/);
  assert.match(gateway, /openWindow/);
  assert.doesNotMatch(gateway, /approveParticipant|createAgreement|moveMoney|settle/);
});
