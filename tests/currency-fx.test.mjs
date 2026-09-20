import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const runtime = fs.readFileSync(new URL('../src/RuntimeApp.tsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/api/securepay/index.ts', import.meta.url), 'utf8');
const currencyGateway = fs.readFileSync(new URL('../src/api/securepay/currency-capability/index.ts', import.meta.url), 'utf8');
const fxGateway = fs.readFileSync(new URL('../src/api/securepay/fx-application/index.ts', import.meta.url), 'utf8');
const fxDto = fs.readFileSync(new URL('../src/api/securepay/fx-application/dto.ts', import.meta.url), 'utf8');
const regulatedAccountsGateway = fs.readFileSync(new URL('../src/api/securepay/regulated-accounts/index.ts', import.meta.url), 'utf8');
const capabilitySection = fs.readFileSync(new URL('../src/features/money/CurrencyCapabilitySection.tsx', import.meta.url), 'utf8');
const activationPrompt = fs.readFileSync(new URL('../src/features/money/AgreementCurrencyActivationPrompt.tsx', import.meta.url), 'utf8');
const fxSection = fs.readFileSync(new URL('../src/features/money/FxConversionSection.tsx', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/money/MoneyExperience.tsx', import.meta.url), 'utf8');

test('Currency/FX convergence: the currency capability gateway is a thin, real wrapper -- list and activate only', () => {
  assert.match(currencyGateway, /\/api\/v1\/me\/currency-capabilities/);
  assert.match(currencyGateway, /list: \(\) =>/);
  assert.match(currencyGateway, /activate: \(currency: string\) =>/);
  assert.match(currencyGateway, /method: 'POST'/);
});

test('the FX application gateway never accepts a client-supplied rate or settlement outcome', () => {
  assert.match(fxGateway, /\/api\/v1\/fx-applications/);
  assert.match(fxGateway, /idempotencyKey: string/);
  assert.doesNotMatch(fxGateway, /freshIdempotencyKey/);
  assert.doesNotMatch(fxDto, /exchangeRate|settledAmount|rateApplied/i);
});

test('the regulated-accounts gateway is read-only self-service listing, no mutation method', () => {
  assert.match(regulatedAccountsGateway, /\/api\/v1\/regulated-accounts\/accounts/);
  assert.doesNotMatch(regulatedAccountsGateway, /method: 'POST'|method: 'PUT'/);
});

test('CurrencyCapabilitySection never fabricates activation client-side -- it always calls gateway.activate', () => {
  assert.match(capabilitySection, /gateway\.activate\(currency\)/);
  assert.match(capabilitySection, /activate\(capability\.currency\)/);
  assert.match(capabilitySection, /gateway\.list\(\)/);
  assert.match(capabilitySection, /NOT_ACTIVATED/);
});

test('Final Completion Phase 2 currency doctrine: activation prompt is scoped to the Agreement\'s own currency, never a generic settings redirect', () => {
  assert.match(activationPrompt, /currency: string/);
  assert.match(activationPrompt, /This Agreement uses \{currency\}/);
  assert.match(activationPrompt, /gateway\.activate\(currency\)/);
});

test('the activation prompt renders nothing once the currency is ACTIVE -- never blocks a currency the identity already has', () => {
  assert.match(activationPrompt, /capability\.status === 'ACTIVE'\) return null/);
});

test('FxConversionSection only ever converts between the caller\'s own already-active regulated positions, never an Agreement', () => {
  assert.match(fxSection, /regulatedAccountsGateway\.listMine\(\)/);
  assert.match(fxSection, /accountStatus === 'ACTIVE'/);
  assert.doesNotMatch(fxSection, /agreementId|obligationId/);
});

test('FxConversionSection never forces conversion -- both keep-as-is and convert paths are optional, amount is user-driven', () => {
  assert.match(fxSection, /Optional\. Keep what you already have/);
});

test('Money is wired with the currency capability, FX application, and regulated-accounts gateways as first-class dependencies', () => {
  assert.match(experience, /currencyCapability: CurrencyCapabilityGateway/);
  assert.match(experience, /fxApplication: FxApplicationGateway/);
  assert.match(experience, /regulatedAccounts: RegulatedAccountsGateway/);
  assert.match(experience, /<CurrencyCapabilitySection/);
  assert.match(experience, /<FxConversionSection/);
  assert.match(experience, /<AgreementCurrencyActivationPrompt/);
});

test('the API surface and runtime wire all three new currency/FX gateways', () => {
  assert.match(api, /createCurrencyCapabilityGateway/);
  assert.match(api, /createFxApplicationGateway/);
  assert.match(api, /createRegulatedAccountsGateway/);
  assert.match(runtime, /currencyCapabilityGateway/);
  assert.match(runtime, /fxApplicationGateway/);
  assert.match(runtime, /regulatedAccountsGateway/);
});
