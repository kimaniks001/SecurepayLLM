import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/store/index.ts', import.meta.url), 'utf8');
const dto = fs.readFileSync(new URL('../src/api/securepay/store/dto.ts', import.meta.url), 'utf8');
const management = fs.readFileSync(new URL('../src/components/StoreManagementHome.tsx', import.meta.url), 'utf8');

test('Business Store Opportunities consume privacy-safe backend projection', () => {
  assert.match(gateway, /businessOpportunities/);
  assert.match(dto, /BusinessStoreOpportunityResponse/);
  assert.doesNotMatch(dto, /sourceSnapshot|budgetContext|requesterIdentityId/);
  assert.match(management, /Store opportunities/);
  assert.match(management, /MATCHABLE demand/);
});
