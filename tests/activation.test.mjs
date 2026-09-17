import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('subscription gateway uses the exact self-scoped Phase 14 routes', async () => {
  const source = await read('src/api/securepay/subscription/index.ts');
  for (const route of [
    '/api/v1/subscriptions/me',
    '/api/v1/subscriptions/me/activation-agreement',
    '/api/v1/subscriptions/me/activation-agreement/confirm',
    '/api/v1/subscriptions/me/billing-cycles',
  ]) assert.match(source, new RegExp(route.replaceAll('/', '\\/')));
  assert.match(source, /auth: 'required'/);
});

test('activation confirmation re-reads backend truth after mutation', async () => {
  const source = await read('src/features/activation/controller.ts');
  const confirm = source.slice(source.indexOf('async confirmAgreement'), source.indexOf('async prepareBilling'));
  assert.match(confirm, /confirmActivationAgreement\(\)/);
  assert.match(confirm, /activationAgreement\(\)/);
  assert.doesNotMatch(confirm, /confirmed:\s*true/);
});

test('billing can only be requested through the backend after canonical agreement confirmation', async () => {
  const source = await read('src/features/activation/ActivationExperience.tsx');
  assert.match(source, /agreement\?\.confirmed && !billing/);
  assert.match(source, /controller\.prepareBilling\(\)/);
});

test('activation funding is decomposed and never presented as a standalone activation fee', async () => {
  const source = await read('src/features/activation/ActivationExperience.tsx');
  assert.match(source, /FOR_YOU: \{ name: 'For You', total: 400, monthly: 100/);
  assert.match(source, /BUSINESS: \{ name: 'For Business', total: 500, monthly: 200/);
  assert.match(source, /Settlement verification · returned after verification/);
  assert.match(source, /Agreement Review Reserve · remains your money/);
  assert.match(source, /This is not an activation fee/);
  assert.match(source, /Funding ≠ earning/);
});

test('subscription PaymentIntent is not mislabeled as full activation funding or completion', async () => {
  const source = await read('src/features/activation/ActivationExperience.tsx');
  assert.match(source, /This is only the subscription component/);
  assert.match(source, /Actual rail selection\/payment execution belongs to Money and is not being simulated here/);
  assert.match(source, /Activation is not shown as complete merely because this PaymentIntent exists/);
  assert.doesNotMatch(source, /Activation complete/);
});

test('production runtime exposes activation as a first-class route and session-refreshes every protected call', async () => {
  const source = await read('src/RuntimeApp.tsx');
  assert.match(source, /window\.location\.hash === '#\/activate'/);
  for (const method of ['myStatus', 'selectPlan', 'activationAgreement', 'establishActivationAgreement', 'confirmActivationAgreement', 'prepareCurrentBillingCycle']) assert.match(source, new RegExp(`'${method}'`));
  assert.match(source, /<ActivationExperience/);
});

test('activation feature does not import fixture money, demo, community or store data', async () => {
  const source = (await read('src/features/activation/ActivationExperience.tsx')) + (await read('src/features/activation/controller.ts'));
  assert.doesNotMatch(source, /demoData|moneyData|communityData|storeData|mockAgent/);
});
