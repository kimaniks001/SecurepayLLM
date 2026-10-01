import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway = fs.readFileSync(new URL('../src/api/securepay/financial-institutions/index.ts', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/api/securepay/index.ts', import.meta.url), 'utf8');

test('FS1 UI gateway exposes represented institution self-enrolment without capability invention', () => {
  assert.match(gateway, /\/api\/v1\/financial-services\/institutions/);
  assert.match(gateway, /auth: 'required'/);
  assert.match(gateway, /institutionKsNumber/);
  assert.match(gateway, /representativeEmail/);
  assert.match(gateway, /authorityEvidenceReference/);
  assert.match(gateway, /VERIFIED_INSTITUTION/);
  assert.doesNotMatch(gateway, /approvedCapabilities|railQuote|paymentReady|initiatePayment/);
});

test('SecurePay API registers Financial Institutions independently from Money gateways', () => {
  assert.match(api, /createFinancialInstitutionsGateway/);
  assert.match(api, /financialInstitutions: createFinancialInstitutionsGateway\(http\)/);
});
