import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const api=read('src/api/securepay/personal-payments/index.ts');
const list=read('src/mini/MiniPersonalPaymentResponsibilities.tsx');
const pay=read('src/mini/MiniPaySomeone.tsx');
const agreements=read('src/mini/MiniMyAgreements.tsx');
const first=read('src/mini/MiniFirstPartyKs001.tsx');
const env=read('.env.example');
const types=read('src/vite-env.d.ts');

test('personal financial list never computes outstanding debt or payment authority',()=>{
  assert.match(api,/outstandingAmountMinor:null/);
  assert.match(api,/payableNow:false/);
  assert.match(api,/v\.payableNow===false&&v\.outstandingAmountMinor===null/);
  assert.match(api,/createPersonalPaymentResponsibilitiesGateway/);
  assert.match(api,/auth:'required'/);
  assert.match(api,/verifyPersonalResponsibilities\(result,page,size\)/);
  for(const forbidden of ['createIntent(', 'initiate(', 'sendMoney(', 'fundAgreement(', 'release('])
    assert.ok(!api.includes(forbidden),forbidden);
});

test('new API is opt-in only for correctly paired authenticated staging backend',()=>{
  assert.match(first,/!demo&&\s*import\.meta\.env\.VITE_SECUREPAY_MINI_PAY_RESPONSIBILITIES_READ==='enabled'/);
  assert.match(first,/gateway=\{personalResponsibilities\}/);
  assert.match(first,/prepare=\{\(\)=>ensureFreshSession\(session,auth\)\}/);
  assert.match(first,/onViewAgreements=\{\(\)=>setPersonalReadFallback\(true\)\}/);
  assert.match(env,/VITE_SECUREPAY_MINI_PAY_RESPONSIBILITIES_READ=disabled/);
  assert.match(types,/VITE_SECUREPAY_MINI_PAY_RESPONSIBILITIES_READ/);
});

test('shoulder-surfing protection masks main list names, status colours and values until deliberate reveal',()=>{
  assert.match(pay,/useState\(false\); \/\/ in-memory only/);
  assert.match(pay,/privacyRevealed\?i\.title:'Agreement'/);
  assert.match(pay,/privacyRevealed\?money\(i\.amount\):'••••'/);
  assert.match(pay,/privacyRevealed&&<div className="spm-pay-tabs"/);
  assert.match(pay,/!privacyRevealed\?<div className="spm-pay-private-cover"/);
  assert.match(agreements,/const \[paymentDetailsVisible,setPaymentDetailsVisible\]=useState\(false\)/);
  assert.match(agreements,/paymentFocus&&!paymentDetailsVisible/);
  assert.match(agreements,/paymentFocus&&!detailsVisible\?<><strong>Agreement/);
  assert.match(list,/const \[reveal,setReveal\]=useState\(false\)/);
  assert.match(list,/reveal\?item\.obligationTitle:`Agreement/);
  assert.match(list,/reveal\?stateText\(item\.agreementState\):'Private details available'/);
  assert.match(list,/reveal&&<span className="spm-payment-detailed-signal"/);
});

test('colours communicate only a specific workflow after reveal; never expose economic score',()=>{
  assert.match(list,/NEEDS_YOUR_AGREEMENT/);
  assert.match(list,/WAITING_FOR_OTHER_PERSON/);
  assert.match(list,/AGREED_PAYMENT_CHECK_PENDING/);
  assert.match(list,/CLOSED_NO_PAYMENT_INFERENCE/);
  assert.match(list,/No money can be moved from this screen/);
  assert.match(list,/never represents your financial standing/);
  assert.match(list,/amountMeaning==='AGREED'\?'Amount agreed':'Amount proposed'/);
  assert.match(list,/not a verified unpaid balance/);
});

test('no fake provider receipt or money execution in personal responsibility component',()=>{
  assert.ok(!list.includes('markPaid('));
  assert.ok(!list.includes('createIntent('));
  assert.ok(!list.includes('initiate('));
  assert.ok(!list.includes('transfer('));
  assert.match(list,/void load\(0,true\)/);
  assert.match(list,/try again/i);
});
