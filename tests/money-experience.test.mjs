import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const runtime = fs.readFileSync(new URL('../src/RuntimeApp.tsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/api/securepay/index.ts', import.meta.url), 'utf8');
const moneyAuthorityGateway = fs.readFileSync(new URL('../src/api/securepay/money-authority/index.ts', import.meta.url), 'utf8');
const financialPartnersGateway = fs.readFileSync(new URL('../src/api/securepay/financial-partners/index.ts', import.meta.url), 'utf8');
const settlementDestinationsGateway = fs.readFileSync(new URL('../src/api/securepay/settlement-destinations/index.ts', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/money/MoneyExperience.tsx', import.meta.url), 'utf8');

test('Final Completion Phase 2 correction pass: Funded Authority is Agreement-scoped, never a bare authority id', () => {
  assert.match(moneyAuthorityGateway, /\/api\/v1\/agreements\/\$\{segment\(agreementId\)\}\/funded-authority/);
  assert.match(moneyAuthorityGateway, /\/fund/);
  assert.match(moneyAuthorityGateway, /\/exercise/);
  assert.match(moneyAuthorityGateway, /\/release/);
  assert.match(moneyAuthorityGateway, /auth: 'required'/);
  // No open()/status()/fund()/exercise()/release() call may accept a free-form authority id --
  // every gateway method takes agreementId as its identifying parameter.
  for (const method of ['status', 'open', 'fund', 'exercise', 'release']) {
    assert.match(moneyAuthorityGateway, new RegExp(`${method}: \\(agreementId: string`));
  }
});

test('exercise never accepts a client-supplied beneficiary -- the request carries only an amount', () => {
  const start = moneyAuthorityGateway.indexOf('exercise: (agreementId: string, amountMinor: number)');
  assert.ok(start >= 0, 'exercise must take only agreementId and amountMinor, never a beneficiary parameter');
  assert.doesNotMatch(moneyAuthorityGateway, /beneficiaryKsNumber|beneficiaryIdentityId/);
});

test('Funded Authority mutating calls always carry a fresh Idempotency-Key, never a fixed/reused one', () => {
  for (const name of ['fund:', 'exercise:', 'release:']) {
    const start = moneyAuthorityGateway.indexOf(name);
    assert.ok(start >= 0, `${name} must exist in the gateway`);
    const block = moneyAuthorityGateway.slice(start, start + 400);
    assert.match(block, /Idempotency-Key['"]?:\s*freshIdempotencyKey\(\)/);
  }
});

test('the idempotency key is documented as a request-safety key only, never a financial reference', () => {
  assert.match(moneyAuthorityGateway, /never a financial/);
  assert.match(moneyAuthorityGateway, /reference or receipt number/);
});

test('financial partner discovery is real backend authority, factual only', () => {
  assert.match(financialPartnersGateway, /\/api\/v1\/regulated-accounts\/partners/);
  assert.match(financialPartnersGateway, /never Agreement or Money authority/);
});

test('settlement destination gateway reads real backend endpoints and never fabricates registration', () => {
  assert.match(settlementDestinationsGateway, /\/api\/v1\/choice-ks-accounts\/settlement-destinations/);
  assert.match(settlementDestinationsGateway, /current:/);
  assert.match(settlementDestinationsGateway, /history:/);
  assert.match(settlementDestinationsGateway, /verificationStatus:/);
  assert.doesNotMatch(settlementDestinationsGateway, /\bregister:|\breplace:/);
});

test('Money is wired as a first-class, non-secret runtime route and its gateways are session-refreshed', () => {
  assert.match(runtime, /useMoneyRoute/);
  assert.match(runtime, /MoneyExperience/);
  assert.match(runtime, /moneyAuthorityGateway/);
  assert.match(runtime, /financialPartnerGateway/);
  assert.match(runtime, /settlementDestinationGateway/);
  assert.match(runtime, /money\\\/\?\$/);
  // Money now depends on the same agreementGateway other Agreement-aware experiences use --
  // never a second, parallel Agreement client.
  assert.match(runtime, /agreements: agreementGateway/);
});

test('the API surface registers the three new Money gateways alongside existing ones', () => {
  assert.match(api, /createMoneyAuthorityGateway/);
  assert.match(api, /createFinancialPartnerGateway/);
  assert.match(api, /createSettlementDestinationGateway/);
});

test('the settlement-destination registration gap is disclosed honestly, never a fabricated form', () => {
  assert.match(experience, /not yet available in-product/i);
  assert.doesNotMatch(experience, /useState.*[Ff]ingerprint|useState.*destinationToken/);
});

test('Funded Authority has no free-form authority-id, max-amount, or beneficiary-KS-number input field', () => {
  // Programme-controller correction: the UI must not look like an engineering console. The person
  // picks one of their own Agreements; there is no "authority reference" text field, no "max
  // amount" field on open(), and no "beneficiary KS Number" field on exercise().
  assert.doesNotMatch(experience, /Authority reference/i);
  assert.doesNotMatch(experience, /Max amount/i);
  assert.doesNotMatch(experience, /Beneficiary KS Number/i);
  assert.match(experience, /Show my Agreements/);
  assert.match(experience, /currentUserAgreements/);
});

test('Money never imports fixture financial truth', () => {
  for (const forbidden of ['demoData', 'moneyData', 'ecosystemData', 'mockAgent']) {
    assert.doesNotMatch(experience, new RegExp(forbidden));
  }
});

test('no financial figure is a hardcoded literal total in the Money experience component', () => {
  assert.doesNotMatch(experience, /KES\s+\d/);
});
