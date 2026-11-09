import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const code=ts.transpileModule(read('src/mini/checkoutSourceReview.ts'),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}
}).outputText;
const mod=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const {makeStoreSourceReview,makeShortStaysSourceReview,isCheckoutLaunchAuthorized}=mod;
const when='2030-12-04T00:00:00.000Z';
const id='123e4567-e89b-42d3-a456-426614174000';
const store=()=>({
  id,status:'REQUESTED_NOT_ACCEPTED',sellerKsNumber:'KS001',offerId:id,
  itemTitle:'Sample retail order',quantity:2,unitPriceMinor:90000,
  amountMinor:180000,currency:'KES',offerUpdatedAt:'2026-11-09T12:00:00Z',
  expiresAt:when,orderAccepted:false,agreementAccepted:false,
  inventoryReserved:false,paymentEnabled:false,paymentVerified:false,
  mayFulfil:false
});

test('Store intention maps to canonical one Mini source-review shape WITHOUT checkout authority',()=>{
  const result=makeStoreSourceReview(store());
  assert.equal(result.protocol,'SECUREPAY_CHECKOUT_SOURCE_REVIEW_V1');
  assert.equal(result.source,'STORE');
  assert.equal(result.sourceReference,id);
  assert.equal(result.sourceVersion,'2026-11-09T12:00:00Z');
  assert.equal(result.displayAmountMinor,180000);
  assert.equal(result.sourceContext,'SERVER_STORE_INTENT_UNACCEPTED');
  assert.equal(result.nextAction,'ACCEPT_ORDER_AND_AGREEMENT_ON_SERVER');
  assert.ok(result.blockers.includes('SELLER_ORDER_ACCEPTANCE_REQUIRED'));
  assert.equal(isCheckoutLaunchAuthorized(result),false);
  for(const [k,v] of Object.entries(result))
    if(['checkoutSessionIssued','hostOrderAccepted','roomReserved','agreementAccepted',
      'providerPaymentVerified','obligationFunded','paymentEnabled','mayFulfil'].includes(k))
      assert.equal(v,false,k);
});

test('Store source rejects forged state, expired intention and missing amount',()=>{
  for(const changes of [
    {status:'ACCEPTED'}, {orderAccepted:true}, {agreementAccepted:true},
    {paymentEnabled:true},{paymentVerified:true},{mayFulfil:true},{inventoryReserved:true},
    {amountMinor:0},{expiresAt:'2000-01-01T00:00:00Z'}
  ])assert.throws(()=>makeStoreSourceReview({...store(),...changes}));
});

test('ShortStays browser preflight uses exact same protocol but ALWAYS lacks signature and payment',()=>{
  const stay=makeShortStaysSourceReview({
    bookingCode:'SS-KE-TEST-1001',bookingVersion:'2026-11-09T12:00:00Z',
    amountMinor:900000,holdExpiresAt:when,browserPreflightPassed:true
  });
  const storeReview=makeStoreSourceReview(store());
  assert.deepEqual(Object.keys(stay).sort(),Object.keys(storeReview).sort());
  assert.equal(stay.source,'SHORTSTAYS');
  assert.equal(stay.sourceContext,'BROWSER_BOOKING_PRECHECK');
  assert.equal(stay.nextAction,'VERIFY_BOOKING_HOLD_ON_SERVER');
  assert.ok(stay.blockers.includes('SERVER_ROOM_HOLD_AND_SIGNATURE_REQUIRED'));
  assert.equal(stay.displayAmountMinor,900000);
  assert.equal(stay.paymentEnabled,false);
  assert.equal(stay.roomReserved,false);
  assert.equal(isCheckoutLaunchAuthorized(stay),false);
  const unavailable=makeShortStaysSourceReview({
    bookingCode:'SS-KE-TEST-1001',bookingVersion:'2026-11-09T12:00:00Z',
    amountMinor:900000,holdExpiresAt:'2000-01-01T00:00:00Z',browserPreflightPassed:false
  });
  assert.equal(unavailable.displayAmountMinor,null);
  assert.throws(()=>makeShortStaysSourceReview({
    bookingCode:'wrong',bookingVersion:'2026-11-09T12:00:00Z',
    amountMinor:900000,holdExpiresAt:when,browserPreflightPassed:true
  }));
});

test('shared Store gateway reads source through authenticated server intention, not a browser amount',()=>{
  const source=read('src/api/securepay/store-checkout/index.ts');
  assert.match(source,/sourceReview: async \(intentId: string\)/);
  assert.match(source,/verifiedStoreCheckoutIntent\(await http.request<StoreCheckoutIntent>/);
  assert.match(source,/makeStoreSourceReview\(intention\)/);
  assert.match(source,/auth:'required'/);
  assert.doesNotMatch(read('src/mini/checkoutSourceReview.ts'),
    /fetch\(|createPaymentIntentGateway|\.initiate\(|sendWhatsApp|releaseFund/);
});
