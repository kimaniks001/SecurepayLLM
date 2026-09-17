import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const runtime = fs.readFileSync(new URL('../src/RuntimeApp.tsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/api/securepay/subscription/index.ts', import.meta.url), 'utf8');
const dto = fs.readFileSync(new URL('../src/api/securepay/subscription/dto.ts', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/activation/ActivationExperience.tsx', import.meta.url), 'utf8');
const home = fs.readFileSync(new URL('../src/components/SignedOutHome.tsx', import.meta.url), 'utf8');

const requiredEndpoints = [
  '/api/v1/subscriptions/me',
  '/api/v1/subscriptions/me/activation-agreement',
  '/api/v1/subscriptions/me/activation-agreement/confirm',
  '/api/v1/subscriptions/me/billing-cycles',
];

test('activation uses the real Phase 14 subscription/Agreement endpoints', () => {
  for (const endpoint of requiredEndpoints) assert.match(api, new RegExp(endpoint.replaceAll('/', '\\/')));
  assert.match(api, /auth: 'required'/);
});

test('activation Agreement renders backend-authored canonical content and exact version evidence', () => {
  for (const field of ['agreementVersionId', 'contentHash', 'title', 'purpose', 'description', 'confirmed', 'confirmedAt']) {
    assert.match(dto, new RegExp(`\\b${field}\\b`));
    assert.match(experience, new RegExp(`agreement\\.${field}`));
  }
});

test('plan choice never hardcodes the activation-funding total in the frontend', () => {
  assert.doesNotMatch(experience, /KES\s+(400|500)\b/);
  assert.match(experience, /does not calculate those figures itself/);
});

test('confirmation is explicit and precedes billing preparation', () => {
  const confirm = experience.indexOf('confirmActivationAgreement');
  const billing = experience.indexOf('prepareCurrentBillingCycle');
  assert.ok(confirm >= 0 && billing > confirm);
  assert.match(experience, /Yes, this is what I agree to/);
  assert.match(experience, /!agreement\?\.confirmed/);
});

test('prepared billing is not mislabeled as full activation completion', () => {
  assert.match(experience, /This is the subscription component only/);
  assert.match(experience, /does not mark activation complete here/);
  assert.doesNotMatch(experience, /Activation complete/i);
});

test('activation has a real signed-out entry point and a first-class runtime route', () => {
  assert.match(home, /href="#\/activate"/);
  assert.match(runtime, /ActivationExperience/);
  assert.match(runtime, /useActivationRoute/);
  assert.match(runtime, /subscriptionGateway/);
});

test('activation never imports fixture financial truth', () => {
  for (const forbidden of ['demoData', 'moneyData', 'ecosystemData', 'mockAgent']) assert.doesNotMatch(experience, new RegExp(forbidden));
});
