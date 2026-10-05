import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const gateway = fs.readFileSync(new URL('../src/api/securepay/agentOpportunity/index.ts', import.meta.url), 'utf8');
const adapters = fs.readFileSync(new URL('../src/api/securepay/agent/adapters.ts', import.meta.url), 'utf8');
const card = fs.readFileSync(new URL('../src/features/agent/OpportunityChoicesCard.tsx', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/RuntimeApp.tsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/api/securepay/index.ts', import.meta.url), 'utf8');

test('unified opportunity gateway keeps support, work, consent and outreach on one API surface', () => {
  for (const path of [
    '/api/v1/agent-opportunities/support',
    '/api/v1/agent-opportunities/quick-contracts',
    '/api/v1/agent-opportunities/community-saver',
    '/api/v1/agent-opportunities/outreach/candidates',
  ]) assert.match(gateway, new RegExp(path.replaceAll('/', '\\/')));
  assert.match(api, /agentOpportunity: createAgentOpportunityGateway\(http\)/);
});

test('KS001 renders only server-composed opportunity choices', () => {
  assert.match(adapters, /OPPORTUNITY_CHOICES/);
  assert.match(adapters, /typeof data\.subjectReference === 'string'/);
  assert.match(card, /OpportunityChoicesComponentView/);
});

test('support shows human rate and choice while Quick Contract waits for worker acceptance', () => {
  assert.match(card, /Human support/);
  assert.match(card, /selectSupportOffer/);
  assert.match(card, /choice\.status === 'ACCEPTED'/);
  assert.match(card, /Waiting for this participant to accept or pass/);
  assert.match(card, /Rate on request/);
});

test('choice UI states the hard Agreement and Money boundary', () => {
  assert.match(card, /does not move money/);
  assert.match(card, /real SecurePay Agreement/);
  assert.match(card, /decimalMoney/);
  assert.doesNotMatch(card, /Number\(minor\)/);
});

test('real runtime wires the opportunity gateway into KS001', () => {
  assert.match(runtime, /withSessionRefresh\(api\.agentOpportunity/);
  assert.match(runtime, /agentOpportunityGateway=\{agentOpportunityGateway\}/);
});
