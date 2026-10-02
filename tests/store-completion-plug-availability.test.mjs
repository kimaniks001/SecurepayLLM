import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/marketnetwork/index.ts', import.meta.url), 'utf8');
const store = fs.readFileSync(new URL('../src/features/store/StoreExperience.tsx', import.meta.url), 'utf8');
const management = fs.readFileSync(new URL('../src/components/StoreManagementHome.tsx', import.meta.url), 'utf8');

test('Store consumes existing Plug qualification authority rather than creating its own', () => {
  assert.match(gateway, /\/market-network\/plug\/availability/);
  assert.match(store, /current\.qualified \? current : null/);
  assert.doesNotMatch(store, /qualifyPlug|grantPlug|MARKET_READY/);
});

test('Plug availability is optional and Store remains independent', () => {
  assert.match(management, /Your Store stays active either way/);
  assert.match(management, /plugAvailability &&/);
  assert.match(management, /Extra Plug work/);
});

test('Store headline stats use only authoritative offer states', () => {
  assert.match(management, /Published/);
  assert.match(management, /Drafts/);
  assert.match(management, /Unavailable/);
  assert.doesNotMatch(management, /\['SecureLinks',/);
  assert.doesNotMatch(management, /\['Enquiries',/);
});
