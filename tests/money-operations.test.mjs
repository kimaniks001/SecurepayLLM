import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const runtime = fs.readFileSync(new URL('../src/RuntimeApp.tsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/api/securepay/index.ts', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/money-operations/index.ts', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/money/MoneyOperationsExperience.tsx', import.meta.url), 'utf8');

test('Final Completion Phase 2 completion pass, Section 6: the Money-operations gateway is read-only', () => {
  assert.match(gateway, /\/api\/v1\/money-operations\/summary/);
  assert.match(gateway, /summary: \(\) =>/);
  assert.doesNotMatch(gateway, /method: 'POST'|method: 'PUT'/);
});

test('the ops page has no mutation action anywhere -- only a load/refresh read call', () => {
  assert.doesNotMatch(experience, /gateway\.[a-zA-Z]+\(.*\).*method/i);
  const calls = [...experience.matchAll(/gateway\.(\w+)\(/g)].map(m => m[1]);
  assert.ok(calls.every(name => name === 'summary'), `only gateway.summary() may be called from the ops page, found: ${calls.join(', ')}`);
});

test('open exceptions never render a raw provider-adjacent detail payload -- only summary fields', () => {
  assert.doesNotMatch(experience, /detailJson|detail_safe|rawPayload/);
  assert.match(experience, /exception\.summary/);
});

test('the Money-operations gateway is wired into the runtime and the API surface as its own first-class route', () => {
  assert.match(runtime, /useMoneyOperationsRoute/);
  assert.match(runtime, /MoneyOperationsExperience/);
  assert.match(runtime, /money-operations/);
  assert.match(api, /createMoneyOperationsGateway/);
});
