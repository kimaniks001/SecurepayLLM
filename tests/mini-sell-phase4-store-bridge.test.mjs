import test from 'node:test';
import assert from 'node:assert/strict';
import {miniSellerCreateCanonicalStoreDraft,miniSellerShareReadiness}
  from '../src/mini/miniSellerCanonicalStoreBridge.mjs';

const UUID='11111111-1111-4111-8111-111111111111';
const prepared={
  ok:true,
  storeCandidate:{kind:'PRODUCT',title:'Dairy meal',description:'50 kg bags',
    priceMinor:250000,quantityAvailable:500,availabilityState:'AVAILABLE',
    published:true,mediaRefs:['https://unreviewed.example/image.png']},
  boundary:{canonical:false,storePublished:false}
};
test('only explicit seller confirmation can cause a Store write',async()=>{
  let called=false;
  const gateway={createOffer:async()=>{called=true;return {id:UUID,published:false,mediaRefs:[]}}};
  assert.deepEqual(await miniSellerCreateCanonicalStoreDraft({
    prepared,gateway,context:{type:'personal'},confirmed:false
  }),{ok:false,reason:'SELLER_CONFIRMATION_REQUIRED'});
  assert.equal(called,false);
});
test('authenticated personal create always writes an unpublished text-only Store draft',async()=>{
  let payload;
  const result=await miniSellerCreateCanonicalStoreDraft({
    prepared,context:{type:'personal'},confirmed:true,
    gateway:{createOffer:async body=>{payload=body;return {id:UUID,published:false,mediaRefs:[],updatedAt:'2026-11-17T12:00:00Z'}}}
  });
  assert.equal(result.ok,true);
  assert.equal(result.offerId,UUID);
  assert.equal(result.shared,false);
  assert.equal(result.secureLinkIssued,false);
  assert.equal(result.moneyAuthorized,false);
  assert.equal(payload.published,false);
  assert.equal(payload.quantityAvailable,null);
  assert.equal(payload.availabilityState,'NEEDS_CONFIRMATION');
  assert.deepEqual(payload.mediaRefs,[]);
  assert.equal(payload.priceMinor,250000);
});
test('business Store write uses verified context but no local KSNumber fallback',async()=>{
  const calls=[];
  const gateway={createBusinessOffer:async(ks,body)=>{calls.push({ks,body});return {id:UUID,published:false,mediaRefs:[]}}};
  const result=await miniSellerCreateCanonicalStoreDraft({
    prepared,gateway,context:{type:'business',businessKsNumber:'KS001-TEST'},confirmed:true
  });
  assert.equal(result.ok,true);
  assert.equal(calls[0].ks,'KS001-TEST');
  assert.equal((await miniSellerCreateCanonicalStoreDraft({
    prepared,gateway,context:{type:'business',businessKsNumber:''},confirmed:true
  })).ok,false);
  assert.equal(calls.length,1);
});
test('a failed or unknown write is not automatically retried',async()=>{
  let calls=0;
  const response=await miniSellerCreateCanonicalStoreDraft({
    prepared,context:{type:'personal'},confirmed:true,
    gateway:{createOffer:async()=>{calls++;throw new Error('timeout')}}
  });
  assert.deepEqual(response,{ok:false,reason:'CHECK_MY_STORE_BEFORE_RETRY'});
  assert.equal(calls,1);
});
test('a published or image-bearing server response is not accepted as draft receipt',async()=>{
  const r=await miniSellerCreateCanonicalStoreDraft({
    prepared,context:{type:'personal'},confirmed:true,
    gateway:{createOffer:async()=>({id:UUID,published:true,mediaRefs:['unsafe']})}
  });
  assert.deepEqual(r,{ok:false,reason:'UNEXPECTED_SERVER_RECEIPT'});
});
test('SecureLink requires separately authorized issuer, never an invented URL',()=>{
  const realOffer={ok:true,offerId:UUID};
  assert.equal(miniSellerShareReadiness({prepared,realOffer}).ready,false);
  assert.equal(miniSellerShareReadiness({prepared,realOffer,issuer:()=>{}}).ready,true);
  assert.equal(miniSellerShareReadiness({prepared,realOffer:{ok:false},issuer:()=>{}}).ready,false);
});
