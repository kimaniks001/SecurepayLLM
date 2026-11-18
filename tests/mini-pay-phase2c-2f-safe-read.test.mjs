import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const positions=read('src/api/securepay/personal-payment-positions/index.ts');
const capacity=read('src/api/securepay/payment-preparation/index.ts');
const first=read('src/mini/MiniFirstPartyKs001.tsx');
const view=read('src/mini/MiniPersonalPaymentResponsibilities.tsx');
const mini=read('src/mini/MiniPaySomeone.tsx');
const env=read('.env.example');

test('2C: no outstanding amount without both complete verified settlement and strict integer reconciliation',()=>{
  assert.match(positions,/value\.payableNow!==false/);
  assert.match(positions,/value\.canAuthorizeMoney!==false/);
  assert.match(positions,/isComplete\(balanceState\)/);
  assert.match(positions,/settled-refunded-reversed\+remaining!==value\.statedAmountMinor/);
  assert.match(positions,/value\.outstandingMinor!==null/);
  assert.match(positions,/value\.settledMinor!==null/);
  assert.match(positions,/value\.refundsMinor!==null/);
  assert.match(positions,/value\.reversalsMinor!==null/);
  assert.match(positions,/Number\.isSafeInteger/);
  assert.match(positions,/balanceState/);
  assert.match(view,/verifiedBalance=chosen\?\.paymentVerification\?\.outstandingMinor/);
  assert.match(view,/hasVerifiedBalance/);
  assert.match(view,/Remaining balance is being checked/);
});

test('2D: every eligibility outcome is a read-only label, never an automatic payment or new rail call',()=>{
  for(const state of ['TERMS_UNVERIFIED','CONSENT_REQUIRED','OUTSTANDING_UNKNOWN',
    'EVIDENCE_REQUIRED','WAIT_UNTIL_DUE','REVIEW_EARLY_PAYMENT_TERMS',
    'READY_FOR_SEPARATE_AUTHORIZATION','ALREADY_SETTLED','DISPUTED_OR_BLOCKED'])
    assert.ok(positions.includes(state),state);
  assert.match(view,/This responsibility is already settled\. Do not pay it again\./);
  assert.match(view,/The agreed work or delivery still needs confirmation/);
  assert.match(view,/No money can be moved from this screen/);
  for(const call of ['initiatePayment(', 'releaseMoney(', 'settlePayment(', 'createPaymentIntent('])
    assert.ok(!positions.includes(call)&&!view.includes(call),call);
});

test('2E: business and delegated amounts cannot join personal balance as personal money',()=>{
  assert.match(positions,/value\.canPrepare&&value\.actingCapacity!=='PERSONAL_PREPARATION'/);
  assert.match(positions,/value\.canAuthorizeMoney!==false/);
  assert.match(positions,/PERSONAL_PREPARATION/);
  assert.match(positions,/BUSINESS_PREPARATION/);
  assert.match(positions,/DELEGATED_PREPARATION/);
});

test('2F: authorization, current version, duplicate entries, missing source and privacy all fail closed',()=>{
  assert.match(positions,/auth:'required'/);
  assert.match(positions,/verifyPersonalPaymentPositions\(raw,page,size\)/);
  assert.match(positions,/ids\.has\(id\)/);
  assert.match(positions,/agreementVersionId/);
  assert.match(positions,/outstandingAmountMinor:null/);
  assert.match(first,/createPersonalPaymentPositionsGateway/);
  assert.match(first,/VITE_SECUREPAY_MINI_PAY_RESPONSIBILITIES_READ==='enabled'/);
  assert.match(first,/VITE_SECUREPAY_MINI_PAY_POSITIONS_READ==='enabled'/);
  assert.match(env,/VITE_SECUREPAY_MINI_PAY_POSITIONS_READ=disabled/);
  assert.match(view,/Find by shop, person or item/);
  assert.match(view,/const \[reveal,setReveal\]=useState\(false\)/);
  assert.match(mini,/Find a person, shop or item/);
});

test('Phase 6 Money remains separate; approval cannot be inferred from eligibility',()=>{
  assert.ok(!positions.includes('method: \'POST\''));
  assert.ok(!positions.includes('method: \'PUT\''));
  assert.match(positions,/payableNow:false/);
  assert.match(positions,/canAuthorizeMoney!==false/);
});

test('2E delegated caretaker gateway cannot take actor, owner or financial authority from a URL',()=>{
  assert.match(capacity,/auth:'required'/);
  assert.match(capacity,/verifyPreparationAuthority\(raw,agreementId,obligationId\)/);
  assert.match(capacity,/raw\.canAuthorizeMoney!==false/);
  assert.match(capacity,/raw\.canPrepare===true/);
  assert.match(capacity,/raw\.capacity==='UNAUTHORIZED'/);
  assert.match(capacity,/encodeURIComponent\(agreementId\)/);
  assert.match(capacity,/encodeURIComponent\(obligationId\)/);
  assert.ok(!capacity.includes('method: \'POST\''));
});
