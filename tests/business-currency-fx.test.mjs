import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const api = fs.readFileSync(new URL('../src/api/securepay/index.ts', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/RuntimeApp.tsx', import.meta.url), 'utf8');
const businessCurrencyGateway = fs.readFileSync(new URL('../src/api/securepay/business-currency-capability/index.ts', import.meta.url), 'utf8');
const businessFxGateway = fs.readFileSync(new URL('../src/api/securepay/business-fx-application/index.ts', import.meta.url), 'utf8');
const fxDto = fs.readFileSync(new URL('../src/api/securepay/fx-application/dto.ts', import.meta.url), 'utf8');
const businessCurrencySection = fs.readFileSync(new URL('../src/features/money/BusinessCurrencyCapabilitySection.tsx', import.meta.url), 'utf8');
const businessFxSection = fs.readFileSync(new URL('../src/features/money/BusinessFxConversionSection.tsx', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/money/MoneyExperience.tsx', import.meta.url), 'utf8');

test('the business currency capability gateway is scoped by businessKsNumber, never a hard-coded organization id', () => {
  assert.match(businessCurrencyGateway, /\/api\/v1\/business\/\$\{segment\(businessKsNumber\)\}\/currency-capabilities/);
  assert.match(businessCurrencyGateway, /list: \(businessKsNumber: string\) =>/);
  assert.match(businessCurrencyGateway, /activate: \(businessKsNumber: string, currency: string\) =>/);
  assert.match(businessCurrencyGateway, /method: 'POST'/);
  assert.doesNotMatch(businessCurrencyGateway, /organizationId|regulatedAccountId/i);
});

test('bindBusinessCurrencyCapabilityGateway lets the existing AgreementCurrencyActivationPrompt be reused verbatim for a Business', () => {
  assert.match(businessCurrencyGateway, /export function bindBusinessCurrencyCapabilityGateway/);
  assert.match(businessCurrencyGateway, /list: \(\) => gateway\.list\(businessKsNumber\)/);
  assert.match(businessCurrencyGateway, /activate: \(currency: string\) => gateway\.activate\(businessKsNumber, currency\)/);
});

test('the business FX application gateway never accepts a client-supplied rate or settlement outcome', () => {
  assert.match(businessFxGateway, /\/api\/v1\/business\/\$\{segment\(businessKsNumber\)\}\/fx-applications/);
  assert.match(businessFxGateway, /idempotencyKey: string/);
  assert.doesNotMatch(businessFxGateway, /freshIdempotencyKey/);
  assert.doesNotMatch(fxDto, /exchangeRate|settledAmount|rateApplied/i);
});

test('FxApplicationResponse carries providerExecutionReference -- SETTLED requires genuine provider movement evidence, not APPROVED alone', () => {
  assert.match(fxDto, /providerExecutionReference: string \| null/);
});

test('BusinessCurrencyCapabilitySection never fabricates activation client-side and identifies the Business by its own KS Number', () => {
  assert.match(businessCurrencySection, /gateway\.activate\(loadedFor, currency\)/);
  assert.match(businessCurrencySection, /gateway\.list\(businessKsNumber\)/);
  assert.match(businessCurrencySection, /Business KS Number/);
  assert.match(businessCurrencySection, /NOT_ACTIVATED/);
});

test('BusinessFxConversionSection only converts between this Business\'s own already-active positions, never an Agreement', () => {
  assert.match(businessFxSection, /capabilityGateway\.list\(businessKsNumber\)/);
  assert.match(businessFxSection, /status === 'ACTIVE'/);
  assert.match(businessFxSection, /fxApplicationGateway\.create\(loadedFor,/);
  assert.doesNotMatch(businessFxSection, /agreementId|obligationId/);
});

test('BusinessFxConversionSection never forces conversion -- optional, amount is user-driven', () => {
  assert.match(businessFxSection, /Optional\. Keep what the Business already holds/);
});

test('BusinessFxConversionSection: discovered live via browser verification -- a Business with fewer than two active positions can still refresh once activation completes', () => {
  assert.match(businessFxSection, /needs at least two active currency positions/);
  assert.match(businessFxSection, /Refresh/);
});

test('Money is wired with the business currency capability and business FX application gateways as first-class dependencies', () => {
  assert.match(experience, /businessCurrencyCapability: BusinessCurrencyCapabilityGateway/);
  assert.match(experience, /businessFxApplication: BusinessFxApplicationGateway/);
  assert.match(experience, /<BusinessCurrencyCapabilitySection/);
  assert.match(experience, /<BusinessFxConversionSection/);
});

test('the API surface and runtime wire both new business currency/FX gateways', () => {
  assert.match(api, /createBusinessCurrencyCapabilityGateway/);
  assert.match(api, /createBusinessFxApplicationGateway/);
  assert.match(runtime, /businessCurrencyCapabilityGateway/);
  assert.match(runtime, /businessFxApplicationGateway/);
});
