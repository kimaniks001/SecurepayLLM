import test from 'node:test';
import assert from 'node:assert/strict';
import { miniCapabilityCatalogue } from '../src/mini/miniCapabilityCatalogue.mjs';

const entry = (extra={}) => ({
  code: 'AGREEMENT_FORMATION',
  implementationState: 'IMPLEMENTED',
  exposure: 'INITIATE_EXPLICIT_USER_FLOW',
  actorEligibility: 'NOT_REQUIRED',
  humanProblem: 'Need to understand the deal',
  humanBenefit: 'Prepare a draft for your review',
  limitations: ['You must approve before proceeding'],
  ...extra,
});
const catalogue = (capabilities=[entry()], extra={}) => ({
  authority: 'DESCRIPTIVE_ONLY_NO_ACTION_AUTHORITY',
  registryVersion: 'code-owned capability registry v3',
  interactionMode: 'FORMATION',
  capabilities,
  ...extra,
});

test('P0 returns descriptive truth only without changing exposure', () => {
  const value = miniCapabilityCatalogue(catalogue());
  assert.equal(value.capabilities.length, 1);
  assert.equal(value.capabilities[0].exposure, 'INITIATE_EXPLICIT_USER_FLOW');
  assert.equal(value.capabilities[0].humanBenefit, 'Prepare a draft for your review');
  assert.equal(value.capabilities[0].limited, false);
  assert.equal(Object.isFrozen(value), true);
});

test('P0 never renders backend-hidden money, payment-ready or future capability', () => {
  const hidden = miniCapabilityCatalogue(catalogue([
    entry(),
    entry({code:'MONEY',exposure:'NOT_EXPOSED'}),
    entry({code:'PAYMENT_READY',exposure:'NOT_EXPOSED'}),
  ]));
  assert.deepEqual(hidden.capabilities.map(c=>c.code), ['AGREEMENT_FORMATION']);
  assert.equal(miniCapabilityCatalogue(catalogue([entry({code:'MADE_UP',exposure:'EXECUTE'})])),null);
  assert.equal(miniCapabilityCatalogue(catalogue([entry({code:'STORAGE',implementationState:'NOT_IMPLEMENTED'})])).capabilities.length,0);
});

test('P0 rejects absent authority, invalid modes and ambiguous eligibility', () => {
  assert.equal(miniCapabilityCatalogue(catalogue([entry()],{authority:'MAY_MOVE_MONEY'})),null);
  assert.equal(miniCapabilityCatalogue(catalogue([entry()],{interactionMode:'CHECKOUT'})),null);
  assert.equal(miniCapabilityCatalogue(catalogue([entry({actorEligibility:'VERIFIED'} )])),null);
});

test('P0 rejects duplicate records and malformed source copy', () => {
  assert.equal(miniCapabilityCatalogue(catalogue([entry(),entry()])),null);
  assert.equal(miniCapabilityCatalogue(catalogue([entry({limitations:'not-an-array'})])),null);
  assert.equal(miniCapabilityCatalogue({}),null);
});
