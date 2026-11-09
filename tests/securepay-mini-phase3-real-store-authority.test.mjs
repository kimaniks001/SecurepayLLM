import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source=readFileSync(new URL('../src/api/securepay/store-checkout/index.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
}).outputText;
const outputs={};
runInNewContext(js,{
  exports:outputs,require:spec=>{
    assert.equal(spec,'../http');
    return {segment:encodeURIComponent};
  },Number,String,Object,Date,RegExp,Error
});
const buyerId='11111111-1111-4111-8111-111111111111';
const offerId='22222222-2222-4222-8222-222222222222';
const agreementId='33333333-3333-4333-8333-333333333333';
const intent={id:buyerId,status:'REQUESTED_NOT_ACCEPTED',
  sellerKsNumber:'KS123',offerId,itemTitle:'Cypress timber',
  quantity:2,unitPriceMinor:60000,amountMinor:120000,currency:'KES',
  offerUpdatedAt:'2026-11-09T12:00:00Z',
  expiresAt:new Date(Date.now()+600000).toISOString(),
  orderAccepted:false,agreementAccepted:false,inventoryReserved:false,
  paymentEnabled:false,paymentVerified:false,mayFulfil:false};
const readiness={checkoutIntentId:buyerId,agreementId,
  currentAgreementVersionId:offerId,sourceMatched:true,amountMatched:true,
  bothPartiesConfirmedCurrentVersion:true,agreementReviewConsistent:true,
  orderAccepted:false,inventoryReserved:false,paymentReady:false,
  paymentVerified:false,mayFulfil:false,
  status:'CURRENT_AGREEMENT_REVIEW_CONSISTENT_NOT_PAYABLE'};

test('real Store client creates only the five source fields, never browser-priced or funded data',async()=>{
  const calls=[];
  const http={request:async(path,options)=>{calls.push({path,options});return intent}};
  const gateway=outputs.createStoreCheckoutGateway(http);
  const result=await gateway.createIntent({
    idempotencyKey:'checkout-20261109-001',
    sellerKsNumber:'KS123',offerId,quantity:2,
    expectedOfferUpdatedAt:'2026-11-09T12:00:00Z',
    amountMinor:1,buyerIdentityId:'malicious',agreementAccepted:true
  });
  assert.equal(result.amountMinor,120000);
  assert.equal(result.orderAccepted,false);
  assert.equal(calls.length,1);
  assert.equal(calls[0].path,'/api/v1/store-checkout-intents');
  assert.equal(calls[0].options.method,'POST');
  assert.equal(calls[0].options.auth,'required');
  assert.deepEqual(Object.keys(calls[0].options.body).sort(),[
    'expectedOfferUpdatedAt','idempotencyKey','offerId','quantity','sellerKsNumber'
  ].sort());
  assert.equal(calls[0].options.body.amountMinor,undefined);
  assert.equal(calls[0].options.body.buyerIdentityId,undefined);
});

test('only authenticated reads can get real intention or source-linked agreement readiness',async()=>{
  const calls=[];
  const http={request:async(path,options)=>{
    calls.push({path,options});
    return path.includes('agreement-readiness')?readiness:intent;
  }};
  const gateway=outputs.createStoreCheckoutGateway(http);
  const result=await gateway.getIntent(buyerId);
  const confirmation=await gateway.agreementReadiness(buyerId,agreementId);
  assert.equal(result.paymentVerified,false);
  assert.equal(confirmation.agreementReviewConsistent,true);
  assert.equal(confirmation.paymentReady,false);
  assert.equal(calls.length,2);
  assert.ok(calls.every(c=>c.options.auth==='required'));
  assert.ok(calls.every(c=>c.options.method===undefined));
  assert.match(calls[1].path,/\/agreement-readiness\//);
});

test('malformed source, stale amount, fake payment or Agreement claims are rejected',async()=>{
  const bad=[
    {...intent,paymentEnabled:true},{...intent,paymentVerified:true},
    {...intent,orderAccepted:true},{...intent,agreementAccepted:true},
    {...intent,inventoryReserved:true},{...intent,mayFulfil:true},
    {...intent,amountMinor:1},{...intent,currency:'USD'},
    {...intent,expiresAt:'2000-01-01T00:00:00Z'},
    {...intent,id:'not-a-uuid'}
  ];
  for(const candidate of bad)
    assert.throws(()=>outputs.verifiedStoreCheckoutIntent(candidate));
  for(const candidate of [
    {...readiness,paymentReady:true},{...readiness,paymentVerified:true},
    {...readiness,mayFulfil:true},{...readiness,orderAccepted:true},
    {...readiness,agreementReviewConsistent:true,amountMatched:false},
    {...readiness,agreementReviewConsistent:true,bothPartiesConfirmedCurrentVersion:false}
  ])assert.throws(()=>outputs.verifiedStoreAgreementReadiness(candidate));
  const gateway=outputs.createStoreCheckoutGateway({
    request:()=>{throw new Error('must not call backend with bad params')}
  });
  await assert.rejects(gateway.createIntent({
    idempotencyKey:'a',sellerKsNumber:'KS123',offerId,quantity:1,
    expectedOfferUpdatedAt:'2026-11-09T12:00:00Z'
  }));
});

test('new real gateway uses existing authenticated API transport, not preview token or payment rails',()=>{
  const aggregate=readFileSync(new URL('../src/api/securepay/index.ts',import.meta.url),'utf8');
  assert.match(aggregate,/createStoreCheckoutGateway/);
  assert.match(aggregate,/storeCheckout: createStoreCheckoutGateway\(http\)/);
  assert.match(source,/auth:'required'/);
  assert.doesNotMatch(source,/fundFromSelf|\/initiate|releaseFunds|\.paymentIntent\./);
  assert.doesNotMatch(source,/MINI_GATE[234]_SANDBOX_SECRET/);
  assert.doesNotMatch(source,/createPaymentIntent/);
  assert.match(source,/REQUESTED_NOT_ACCEPTED/);
});
