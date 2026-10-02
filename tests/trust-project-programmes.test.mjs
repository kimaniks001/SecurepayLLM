import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/community/programmes.ts', import.meta.url), 'utf8');
const panel = fs.readFileSync(new URL('../src/features/community/TrustProjectCapabilityPanel.tsx', import.meta.url), 'utf8');
const home = fs.readFileSync(new URL('../src/features/community/TrustProjectImpactHome.tsx', import.meta.url), 'utf8');
const community = fs.readFileSync(new URL('../src/api/securepay/community/index.ts', import.meta.url), 'utf8');

test('Trust Project home exposes the bounded capability panel', () => {
  assert.match(home, /<TrustProjectCapabilityPanel gateway=\{gateway\}/);
  assert.match(panel, /Build capability without turning it into status/);
  assert.match(panel, /popularity does not/);
});

test('Plug Foundation and granular capability routes match the API', () => {
  assert.match(gateway, /\/api\/v1\/trust-project\/plug\/foundation\/start/);
  assert.match(gateway, /\/api\/v1\/trust-project\/plug\/foundation\/complete/);
  assert.match(gateway, /\/api\/v1\/trust-project\/plug\/assessment/);
  assert.match(gateway, /\/api\/v1\/trust-project\/plug\/capability/);
  assert.match(panel, /Work is still matched separately/);
  assert.match(panel, /does not assign work or create payment entitlement/);
});

test('Master review remains scoped and cannot be bought', () => {
  assert.match(gateway, /\/api\/v1\/trust-project\/master\/claims/);
  assert.match(gateway, /reviewerKsNumber/);
  assert.match(gateway, /recordReviewOutcome/);
  assert.match(panel, /Being verified in one field says nothing about another/);
  assert.match(panel, /cannot buy a positive verification result/);
});

test('Apprenticeship progression requires demonstrated competence', () => {
  assert.match(gateway, /apprenticeship-projects.*progression/);
  assert.match(gateway, /progression\/competence/);
  assert.match(panel, /OBSERVE/);
  assert.match(panel, /DEMONSTRATE_COMPETENCE/);
  assert.match(panel, /Attendance alone is not competence/);
  assert.match(panel, /Evidence reference required for PASS/);
});

test('Community gateway exposes programmes beside contributions and pathways', () => {
  assert.match(community, /programmes: createTrustProjectProgrammesGateway\(http\)/);
  assert.match(community, /contributions:/);
  assert.match(community, /pathways:/);
});
