import test from 'node:test';
import assert from 'node:assert/strict';
import {miniSellerPublishTextOnly} from '../src/mini/miniSellerPublishTextOnly.mjs';
const ID='11111111-1111-4111-8111-111111111111';
const TS='2026-11-17T13:05:00.000Z';
const prepared={ok:true,storeCandidate:{
  kind:'PRODUCT',title:'Dairy meal',description:'50 kg sealed bags',priceMinor:250000
}};
const draft={ok:true,offerId:ID,offerUpdatedAt:TS,published:false};
const current={id:ID,updatedAt:TS,published:false,kind:'PRODUCT',
  title:'Dairy meal',description:'50 kg sealed bags',priceMinor:250000,
  quantityAvailable:null,availabilityState:'NEEDS_CONFIRMATION',mediaRefs:[]};
const published={id:ID,published:true,availabilityState:'NEEDS_CONFIRMATION',
  mediaRefs:[],updatedAt:'2026-11-17T13:07:00Z'};

test('seller must explicitly confirm public visibility, independently from draft saving',async()=>{
  let reads=0,writes=0;
  const gateway={myOffers:async()=>{reads++;return [current]},
    publishMyTextOffer:async()=>{writes++;return published}};
  const result=await miniSellerPublishTextOnly({
    prepared,draft,gateway,context:{type:'personal'},
    confirmed:false,localOfferUnchanged:true
  });
  assert.deepEqual(result,{ok:false,reason:'EXPLICIT_PUBLICATION_CHOICE_REQUIRED'});
  assert.equal(reads,0);assert.equal(writes,0);
});
test('client refetches precise current private Store revision before server CAS',async()=>{
  let submitted;
  const result=await miniSellerPublishTextOnly({
    prepared,draft,context:{type:'personal'},confirmed:true,localOfferUnchanged:true,
    gateway:{myOffers:async()=>[current],
      publishMyTextOffer:async(id,body)=>{submitted={id,body};return published}}
  });
  assert.equal(result.ok,true);
  assert.equal(result.published,true);
  assert.deepEqual(result.mediaRefs,[]);
  assert.equal(result.moneyAuthorized,false);
  assert.deepEqual(submitted,{id:ID,body:{
    expectedUpdatedAt:TS,sellerConfirmsCurrentListing:true
  }});
});
test('changed price/title/revision or introduced image cannot be published',async()=>{
  for(const patch of [
    {priceMinor:1},{title:'Different item'},
    {updatedAt:'2026-11-17T13:06:00Z'},
    {mediaRefs:['photo']},{quantityAvailable:50},
    {availabilityState:'AVAILABLE'},{published:true}
  ]){
    let writes=0;
    const result=await miniSellerPublishTextOnly({
      prepared,draft,context:{type:'personal'},confirmed:true,localOfferUnchanged:true,
      gateway:{myOffers:async()=>[{...current,...patch}],
        publishMyTextOffer:async()=>{writes++;return published}}
    });
    assert.deepEqual(result,{ok:false,reason:'CURRENT_STORE_REVISION_CHANGED'});
    assert.equal(writes,0);
  }
});
test('local offer edits after saving also block publication',async()=>{
  let reads=0;
  const result=await miniSellerPublishTextOnly({
    prepared,draft,context:{type:'personal'},confirmed:true,
    localOfferUnchanged:false,gateway:{myOffers:async()=>{reads++}}
  });
  assert.equal(result.ok,false);
  assert.equal(reads,0);
});
test('Business Store publication is represented and never falls back to personal identity',async()=>{
  let identity;
  const result=await miniSellerPublishTextOnly({
    prepared,draft,context:{type:'business',businessKsNumber:'KS123456'},
    confirmed:true,localOfferUnchanged:true,
    gateway:{businessOffers:async k=>{identity=k;return[current]},
      publishBusinessTextOffer:async(k,id,body)=>{identity=k;assert.equal(id,ID);assert.equal(body.expectedUpdatedAt,TS);return published}}
  });
  assert.equal(result.ok,true);
  assert.equal(identity,'KS123456');
});
test('ambiguous network outcome is not silently retried or declared published',async()=>{
  let calls=0;
  const result=await miniSellerPublishTextOnly({
    prepared,draft,context:{type:'personal'},confirmed:true,localOfferUnchanged:true,
    gateway:{myOffers:async()=>[current],
      publishMyTextOffer:async()=>{calls++;throw Error('timeout')}}
  });
  assert.deepEqual(result,{ok:false,reason:'CHECK_MY_STORE_BEFORE_RETRY'});
  assert.equal(calls,1);
});
