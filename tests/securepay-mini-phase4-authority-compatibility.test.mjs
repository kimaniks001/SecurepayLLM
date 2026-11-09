import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const decision=read('docs/SECUREPAY_MINI_PHASE4_PAYMENT_AUTHORITY_COMPATIBILITY_20261109.md');
const moneySessions=read('src/api/securepay/money-session/index.ts');
const providerIntents=read('src/api/securepay/payment-intent/index.ts');
const moneySnapshot=read('src/api/securepay/money-snapshot/index.ts');
const mainMini=read('src/mini/MiniExperience.tsx');
const fundingMini=read('src/mini/MiniGate3Funding.tsx');
const host=read('public/checkout-gate4-host.js');

test('Phase 4 compatibility gate explicitly prohibits Hosted FUND as provider Pay',()=>{
  assert.match(decision,/DO NOT use HostedMoneySession `FUND` redemption/);
  assert.match(decision,/Payment Intent/);
  assert.match(decision,/separate[\s\S]*obligation-funded authority/);
  assert.match(decision,/not[\s\S]*production or financial certification/i);
  assert.match(decision,/PR #257/);
});

test('provider-driven funding stays on the EXISTING authenticated Payment Intent gateway',()=>{
  for(const operation of ['fundingAuthority','fundingOptions','createVersionBoundQuote',
      'createIntent','initiate','get','listAttempts']){
    assert.match(providerIntents,new RegExp(operation+':'));
  }
  assert.match(providerIntents,/createVersionBoundQuote:[\s\S]*expectedAgreementVersionId/);
  assert.match(providerIntents,/createIntent:[\s\S]*idempotencyKey/);
  assert.match(providerIntents,/auth: 'required'/);
  assert.match(providerIntents,/payment-intents\/\$\{segment\(paymentIntentId\)\}\/initiate/);
  assert.match(providerIntents,/providerIdentifier/);
});

test('Hosted Money Sessions remain a distinct, authority-bound interface—not a provider adapter',()=>{
  assert.match(moneySessions,/create: \(request/);
  assert.match(moneySessions,/resolve: \(token/);
  assert.ok(moneySessions.includes('redeem: (token: string, idempotencyKey: string)'));
  assert.match(moneySessions,/money-sessions\/\$\{segment\(token\)\}\/redeem/);
  assert.doesNotMatch(moneySessions,/createPaymentIntentGateway|createVersionBoundQuote|providerIdentifier/);
  assert.doesNotMatch(providerIntents,/money-sessions|HostedMoneySession|fundFromSelf/);
});

test('a confirmed intent must not be inferred to be protected Agreement funding',()=>{
  assert.match(moneySnapshot,/money-snapshot/);
  assert.match(moneySnapshot,/method: 'POST'|auth: 'required'/);
  assert.match(decision,/PROVIDER PAYMENT CONFIRMED/);
  assert.match(decision,/AGREEMENT OBLIGATION FUNDED/);
  assert.match(decision,/payer-ledger posting/);
});

test('existing Mini host and rail simulation do not invoke privileged funds or provider actions',()=>{
  assert.match(host,/NOT PAID/);
  assert.match(host,/realPaymentVerified!==false/);
  assert.match(fundingMini,/SIMULATION ONLY/);
  assert.match(mainMini,/sandboxReconcile/);
  for(const src of [host,fundingMini,mainMini]){
    assert.doesNotMatch(src,/moneySession\.redeem\(|fundFromSelf\(|\.initiate\(paymentIntentId|POST\s*\/api\/v1\/money-sessions\/.+redeem/);
  }
});

test('the real-world owner gate remains one Store and one ShortStays using a single contract',()=>{
  assert.match(decision,/one[\s\S]{0,100}Store order/);
  assert.match(decision,/ShortStays booking/);
  assert.match(decision,/recipient permissions/);
  assert.match(decision,/no browser-authoritative prices/);
  assert.match(read('docs/SECUREPAY_MINI_CHECKOUT_FIRST_MASTER_PLAN_20261109.md'),
    /Start by resolving Phase 0's existing Hosted Money Session/);
});
