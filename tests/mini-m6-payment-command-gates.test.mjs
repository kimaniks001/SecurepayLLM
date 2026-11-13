import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const money=readFileSync('src/mini/MiniMoneySnapshot.tsx','utf8');
const payment=readFileSync('src/mini/MiniMoneyPaymentFlow.tsx','utf8');
const first=readFileSync('src/mini/MiniFirstPartyKs001.tsx','utf8');
const home=readFileSync('src/mini/MiniMyAgreements.tsx','utf8');
const env=readFileSync('.env.example','utf8');
const config=readFileSync('src/vite-env.d.ts','utf8');
const demo=readFileSync('src/mini/MiniOwnerMoneyTest.tsx','utf8');

test('financial commands have a THIRD independent release switch and preview-host gate',()=>{
  assert.match(first,/livePaymentCommands=liveFeeQuotes &&/);
  assert.match(first,/VITE_SECUREPAY_M6_PAYMENT_SUBMISSION==='enabled'/);
  assert.match(first,/isMiniExperiencePreviewHost\(window\.location\.hostname\)/);
  assert.match(first,/const liveMoneyStatus=!demo &&/);
  for(const key of [
    'VITE_SECUREPAY_M6_MONEY_STATUS',
    'VITE_SECUREPAY_M6_FEE_QUOTES',
    'VITE_SECUREPAY_M6_PAYMENT_SUBMISSION',
  ]){
    assert.match(env,new RegExp(key+'=disabled'));
    assert.ok(config.includes(key));
  }
  assert.match(home,/livePaymentCommands=\{livePaymentCommands\}/);
  assert.match(money,/paymentCommandsEnabled&&quote&&quote\.economicState==='READY'/);
  assert.match(money,/historyState==='ready'/);
});

test('only server-quoted Amount, Agreement, reference and rail can reach create/initiator',()=>{
  assert.match(payment,/payments\.fundingAuthority\(agreementId\)/);
  assert.match(payment,/authority\.authorized!==true/);
  assert.match(payment,/payments\.createIntent\(/);
  assert.match(payment,/agreementId,versionId,quote\.quoteReference,key/);
  assert.match(payment,/result\.amountMinor!==quote\.securePayReceivableMinor/);
  assert.match(payment,/result\.currency!==quote\.currency/);
  assert.match(payment,/payments\.get\(intent\.paymentIntentId\)/);
  assert.match(payment,/fresh\.status!=='CREATED'/);
  assert.match(payment,/payments\.initiate\(/);
  assert.match(payment,/intent\.paymentIntentId,quote\.railCode,key,quote\.quoteReference/);
  assert.match(payment,/result\.providerIdentifier!==quote\.railCode/);
  assert.doesNotMatch(payment,/\.release\(/);
});

test('explicit, separate review before provider and no blind retry after unknown',()=>{
  assert.match(payment,/const \[approveStart,setApproveStart\]=useState\(false\)/);
  assert.match(payment,/const \[startAsked,setStartAsked\]=useState\(false\)/);
  assert.match(payment,/approveStart&&startAsked&&unexpired/);
  assert.match(payment,/prepareKey\.current\|\|/);
  assert.match(payment,/initiationKey\.current\|\|/);
  assert.match(payment,/setUnknown\(true\)/);
  assert.match(payment,/Do NOT retry or change routes/);
  assert.match(payment,/Recheck original Money record/);
  assert.match(payment,/Funding and settlement are separate/);
  assert.match(money,/An earlier Agreement payment attempt is unresolved/);
});

test('the demonstration never opens the real payment command gateway',()=>{
  assert.match(demo,/MiniFundingPreview/);
  assert.doesNotMatch(demo,/createPaymentIntentGateway/);
  assert.doesNotMatch(demo,/\.initiate\(/);
  assert.match(first,/!demo &&\s*import\.meta\.env\.VITE_SECUREPAY_M6_MONEY_STATUS/);
});
