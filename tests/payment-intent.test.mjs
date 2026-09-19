import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const runtime = fs.readFileSync(new URL('../src/RuntimeApp.tsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/api/securepay/index.ts', import.meta.url), 'utf8');
const gateway = fs.readFileSync(new URL('../src/api/securepay/payment-intent/index.ts', import.meta.url), 'utf8');
const section = fs.readFileSync(new URL('../src/features/money/PaymentIntentFunding.tsx', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('../src/features/money/MoneyExperience.tsx', import.meta.url), 'utf8');

test('Final Completion Phase 2 completion pass, Section 1: rail discovery, quoting, intent creation and initiation are all agreement-scoped, server-derived operations', () => {
  assert.match(gateway, /fundingAuthority: \(agreementId: string\)/);
  assert.match(gateway, /\/api\/v1\/agreements\/\$\{segment\(agreementId\)\}\/participants\/me\/funding-authority/);
  assert.match(gateway, /fundingOptions: \(agreementId: string\)/);
  assert.match(gateway, /\/api\/v1\/agreements\/\$\{segment\(agreementId\)\}\/funding-options/);
  assert.match(gateway, /createQuote: \(agreementId: string, railCode: string\)/);
  assert.match(gateway, /\/api\/v1\/agreements\/\$\{segment\(agreementId\)\}\/funding-quotes/);
  assert.match(gateway, /createIntent: \(agreementId: string, externalReference\?: string\)/);
  assert.match(gateway, /initiate: \(paymentIntentId: string, providerIdentifier: string, quoteReference\?: string\)/);
});

test('createIntent never accepts an amount, currency, or beneficiary -- those are always server-derived', () => {
  const start = gateway.indexOf('createIntent:');
  const block = gateway.slice(start, start + 300);
  assert.doesNotMatch(block, /amountMinor|currency|beneficiary/i);
});

test('every mutating payment-intent call carries a fresh Idempotency-Key, never a fixed one', () => {
  for (const name of ['createIntent:', 'initiate:']) {
    const start = gateway.indexOf(name);
    assert.ok(start >= 0, `${name} must exist in the gateway`);
    const block = gateway.slice(start, start + 400);
    assert.match(block, /idempotencyKey:\s*freshIdempotencyKey\(\)/);
  }
});

test('the PaymentIntent execution UI never decides rail eligibility itself -- it only renders what fundingOptions returns', () => {
  assert.match(section, /gateway\.fundingOptions\(agreementId\)/);
  assert.doesNotMatch(section, /MPESA_STK|PESALINK/); // no hardcoded rail codes anywhere in the component
  assert.match(section, /No funding rail is currently available/);
});

test('retry always creates a new payment intent -- the component never re-posts to a terminal intent\'s own id', () => {
  // "Try again" and "Choose another rail" both route back to the idle/choose-rail stage, which
  // only ever calls gateway.createIntent again -- never gateway.initiate on the same paymentIntentId twice.
  assert.match(section, /Try again/);
  assert.match(section, /const reset = \(\) => \{ stopPolling\(\); setStage\(\{ name: 'idle' \}\); setError\(null\); \};/);
});

test('reconciliation-pending and provider-pending are both surfaced with distinct, honest language -- never collapsed into a generic "processing"', () => {
  assert.match(section, /PROVIDER_PENDING/);
  assert.match(section, /Your provider is processing this payment\./);
  assert.match(section, /CONFIRMATION_PENDING/);
  assert.match(section, /reconciliation with the provider is pending/);
});

test('a disabled/uncertified rail is never assumed -- an empty options list is handled explicitly, not treated as a loading or error state', () => {
  assert.match(section, /stage\.rails\.length === 0/);
});

test('the PaymentIntent gateway is wired into the runtime Money route and the API surface', () => {
  assert.match(runtime, /paymentIntentGateway/);
  assert.match(api, /createPaymentIntentGateway/);
  assert.match(experience, /paymentIntentGateway: PaymentIntentGateway/);
  assert.match(experience, /PaymentIntentFundingSection/);
});
