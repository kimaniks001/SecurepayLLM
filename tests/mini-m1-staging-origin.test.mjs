import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMiniFirstPartyOrigin,miniFirstPartyOriginsAligned} from '../src/mini/miniFirstPartyOrigin.mjs';

test('same authorised staging API is a necessary condition for Mini KS001',()=>{
  assert.equal(miniFirstPartyOriginsAligned(
    'https://staging.securepay.ke','https://staging.securepay.ke/'),
    'https://staging.securepay.ke');
  assert.equal(miniFirstPartyOriginsAligned(
    'https://qa.securepay.ke','https://qa.securepay.ke'), 'https://qa.securepay.ke');
});

test('current owner-preview production API setting cannot activate staging KS001',()=>{
  assert.equal(miniFirstPartyOriginsAligned(
    'https://staging.securepay.ke','https://securepay.ke'),null);
  assert.equal(miniFirstPartyOriginsAligned(
    'https://staging.securepay.ke','https://api.securepay.ke'),null);
  assert.equal(miniFirstPartyOriginsAligned(
    'https://staging.securepay.ke',''),null);
});

test('mismatched staging providers may not be composed as one transaction',()=>{
  assert.equal(miniFirstPartyOriginsAligned(
    'https://qa.securepay.ke','https://staging.securepay.ke'),null);
});

test('arbitrary Vercel, production, insecure and lookalike API origins are forbidden',()=>{
  for(const input of [
    'https://securepay.ke','https://www.securepay.ke',
    'https://api.securepay.ke','https://staging-securepay.ke',
    'https://staging.securepay.ke.example.com','https://staging.securepay.com',
    'https://securepay-123.vercel.app','http://staging.securepay.ke',
    'https://staging.securepay.ke:8443','https://tester@staging.securepay.ke',
    'https://staging.securepay.ke/api','https://staging.securepay.ke/?key=x',
    'https://staging.securepay.ke/#top','invalid',
  ]) assert.equal(validateMiniFirstPartyOrigin(input),null,input);
});

test('staging origin is accepted without storing token, payment or provider details',()=>{
  assert.equal(validateMiniFirstPartyOrigin('https://sandbox.securepay.ke/'),
    'https://sandbox.securepay.ke');
  assert.equal(validateMiniFirstPartyOrigin('https://test.securepay.ke'),
    'https://test.securepay.ke');
});
