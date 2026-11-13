import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  miniMoneyIntentListProof,miniMoneyIntentDetailProof,
  miniMoneyFeeQuoteProof,miniMoneyIntentStatus,
} from '../src/mini/miniMoneyReadModel.mjs';
import {
  miniMoneySnapshotProof,miniMoneyStatusLabel,
} from '../src/mini/miniMoneySnapshotProof.mjs';

const id='00000000-0000-4000-8000-000000000071';
const version='00000000-0000-4000-8000-000000000072';
const fixture=()=>({
  agreementId:id,currentVersionId:version,positions:[],
  paymentReady:{state:'NOT_EVALUATED',ready:null},
  fundingOptions:[{railCode:'MPESA',displayName:'M-Pesa',currency:'KES',
    quoteAvailable:true,minimumAmountMinor:100,maximumAmountMinor:null}],
  feeQuoteRequestsPermitted:false,
  releaseRequest:{authorityGranted:false,reasonCode:'BLOCKED',
    participantCommandsPermitted:false,evaluationId:null,evaluationSequence:null},
  movement:{state:'BLOCKED',amountMinor:null,currency:null},
});
const intent=()=>({
  id:'00000000-0000-4000-8000-000000000099',
  status:'PROVIDER_PENDING',amountMinor:20000,currency:'KES',
  latestAttemptStatus:'PROVIDER_PENDING',retryEligible:false,
  createdAt:'2026-11-12T12:00:00Z',
  lastStateChangeAt:'2026-11-12T12:02:00Z',
});
const history=()=>({items:[intent()],page:0,size:10,totalElements:1});

test('Money snapshot needs the exact authenticated Agreement version',()=>{
  assert.ok(miniMoneySnapshotProof(fixture(),id,version));
  assert.equal(miniMoneyStatusLabel(fixture()),'Payment readiness not yet evaluated');
  assert.ok(!miniMoneySnapshotProof(fixture(),id,'wrong'));
  assert.ok(!miniMoneySnapshotProof({...fixture(),agreementId:'other'},id,version));
  const blocked={...fixture(),movement:{state:'BLOCKED',amountMinor:100,currency:'KES'}};
  assert.ok(!miniMoneySnapshotProof(blocked,id,version));
  const fakeReady={...fixture(),paymentReady:{state:'NOT_EVALUATED',ready:true}};
  assert.ok(!miniMoneySnapshotProof(fakeReady,id,version));
});
test('Only server-listed payment attempts can be reviewed',()=>{
  assert.ok(miniMoneyIntentListProof(history()));
  const pending=history().items[0];
  assert.ok(!miniMoneyIntentListProof({...history(),items:[pending,pending]}));
  assert.ok(!miniMoneyIntentListProof({...history(),items:[{...pending,status:'SIMULATED_CONFIRMED'}]}));
  assert.ok(!miniMoneyIntentListProof({...history(),items:[{...pending,status:'CONFIRMED',retryEligible:true}]}));
  assert.match(miniMoneyIntentStatus('PROVIDER_PENDING'),/do not retry/i);
  assert.match(miniMoneyIntentStatus('CONFIRMED'),/check Agreement funding separately/i);
});
test('Inspecting a payment intent re-verifies Agreement, amount and currency',()=>{
  const row=intent();
  const detail={id:row.id,agreementId:id,obligationId:'test',
    status:row.status,currency:row.currency,amountMinor:row.amountMinor,
    actionRequired:false,providerConfirmationAccepted:false,
    conflictDetected:false,createdAt:row.createdAt,
    lastStateChangeAt:row.lastStateChangeAt,confirmedAt:null,expiresAt:null};
  assert.ok(miniMoneyIntentDetailProof(detail,row,id));
  assert.ok(!miniMoneyIntentDetailProof({...detail,agreementId:'other'},row,id));
  assert.ok(!miniMoneyIntentDetailProof({...detail,amountMinor:100},row,id));
  assert.ok(!miniMoneyIntentDetailProof({...detail,providerConfirmationAccepted:true},row,id));
});
test('A quote is separate, exact-route, unexpired provider economics — not paid',()=>{
  const rail=fixture().fundingOptions[0];
  const quote={quoteReference:'QUOTE-TEST-01',agreementId:id,railCode:'MPESA',
    amountMinor:20000,currency:'KES',securePayReceivableMinor:20,
    platformChargeMinor:20,providerCostMinor:null,providerChargeMinor:30,
    totalChargeMinor:20050,economicState:'READY',
    economicReasonCode:'READY',expiresAt:new Date(Date.now()+600_000).toISOString()};
  assert.ok(miniMoneyFeeQuoteProof(quote,id,version,rail));
  assert.ok(!miniMoneyFeeQuoteProof({...quote,railCode:'OTHER'},id,version,rail));
  assert.ok(!miniMoneyFeeQuoteProof({...quote,expiresAt:'2020-01-01T00:00:00Z'},id,version,rail));
  assert.ok(!miniMoneyFeeQuoteProof({...quote,totalChargeMinor:-10},id,version,rail));
});

const mini=readFileSync('src/mini/MiniMoneySnapshot.tsx','utf8');
const first=readFileSync('src/mini/MiniFirstPartyKs001.tsx','utf8');
const home=readFileSync('src/mini/MiniMyAgreements.tsx','utf8');
const experience=readFileSync('src/mini/MiniExperience.tsx','utf8');
const env=readFileSync('.env.example','utf8');
const demo=readFileSync('src/mini/miniInteractiveDemo.ts','utf8');
test('same signed-in Mini: canonical API only; no simulation masquerading as Money',()=>{
  assert.match(first,/createMoneySnapshotGateway\(http\)/);
  assert.match(first,/createPaymentIntentGateway\(http\)/);
  assert.match(first,/!demo &&\s*import\.meta\.env\.VITE_SECUREPAY_M6_MONEY_STATUS==='enabled'/);
  assert.match(first,/VITE_SECUREPAY_M6_FEE_QUOTES==='enabled'/);
  assert.match(home,/<MiniMoneySnapshot key=\{chosen\.id\+details\.currentVersion\.id\}/);
  assert.match(mini,/payments\.listIntents\(agreementId,0,10\)/);
  assert.match(mini,/payments\.get\(row\.id\)/);
  assert.match(mini,/payments\.createVersionBoundQuote\(/);
  assert.doesNotMatch(mini,/\.initiate\(/);
  assert.doesNotMatch(mini,/\.createIntent\(/);
  assert.doesNotMatch(mini,/\.release\(/);
});
test('customer-facing Mini excludes developer notes; demo routes stay host-restricted',()=>{
  assert.match(demo,/securepay-\[a-z0-9\]\+-james-8078/);
  assert.match(experience,/samplePreviewAllowed && urlParams\?\.get\('demo'\)==='1'/);
  assert.match(first,/\{demo && <button type="button" className="spm-quiet-button"/);
  assert.match(experience,/samplePreviewAllowed\?t\.phase4:'Agreement Commerce'/);
  assert.match(experience,/'SecurePay Mini'/);
  assert.match(first,/Each party must confirm their Agreement/);
  assert.match(env,/VITE_SECUREPAY_M6_MONEY_STATUS=disabled/);
  assert.match(env,/VITE_SECUREPAY_M6_FEE_QUOTES=disabled/);
});
