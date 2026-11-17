import test from 'node:test';
import assert from 'node:assert/strict';
import {miniSellerIssueAgreementDoorway} from '../src/mini/miniSellerSecureLinkDoorway.mjs';

const AGREEMENT_ID='22222222-2222-4222-8222-222222222222';
const KEY='11111111-1111-4111-8111-111111111111';
const agreement={id:AGREEMENT_ID,status:'PROPOSED'};

test('only explicit share after a real proposed agreement issues a SecureLink',async()=>{
  let calls=0;
  const gateway={activeDoorway:async()=>({hasActiveLocator:false}),
    issuePublicDoorway:async()=>{calls++;return {slug:'secure-opaque',pathClass:'AGREEMENT_DOORWAY',status:'ACTIVE',publicUrl:'https://securepay.ke/l/secure-opaque'}}};
  assert.deepEqual(await miniSellerIssueAgreementDoorway({
    gateway,agreement,idempotencyKey:KEY,confirmed:false
  }),{ok:false,reason:'EXPLICIT_SHARE_CHOICE_REQUIRED'});
  assert.equal(calls,0);
  const result=await miniSellerIssueAgreementDoorway({
    gateway,agreement,idempotencyKey:KEY,confirmed:true
  });
  assert.equal(result.ok,true);
  assert.equal(result.publicUrl,'https://securepay.ke/l/secure-opaque');
  assert.equal(result.sent,false);
  assert.equal(result.buyerAccepted,false);
  assert.equal(result.moneyAuthorized,false);
  assert.equal(calls,1);
});
test('Store offer IDs and agreement drafts are not valid sources for SecureLinks',async()=>{
  const gateway={activeDoorway:async()=>{throw Error('should not call')},issuePublicDoorway:async()=>{throw Error('should not call')}};
  const result=await miniSellerIssueAgreementDoorway({gateway,agreement:{id:AGREEMENT_ID,status:'DRAFT'},idempotencyKey:KEY,confirmed:true});
  assert.deepEqual(result,{ok:false,reason:'AGREEMENT_NOT_PROPOSED'});
  assert.deepEqual(await miniSellerIssueAgreementDoorway({
    gateway,agreement:{id:'local-offer-id',status:'PROPOSED'},idempotencyKey:KEY,confirmed:true
  }),{ok:false,reason:'CANONICAL_AGREEMENT_REQUIRED'});
});
test('existing SecureLink cannot be recreated or reconstructed',async()=>{
  let issued=0;
  const result=await miniSellerIssueAgreementDoorway({
    agreement,confirmed:true,idempotencyKey:KEY,
    gateway:{activeDoorway:async()=>({hasActiveLocator:true,locatorId:AGREEMENT_ID}),
      issuePublicDoorway:async()=>{issued++;}}
  });
  assert.deepEqual(result,{ok:false,reason:'EXISTING_SECURELINK_MANAGE_IN_AGREEMENT'});
  assert.equal(issued,0);
});
test('backend must return canonical public URL, never synthesize hostname',async()=>{
  const result=await miniSellerIssueAgreementDoorway({
    agreement,confirmed:true,idempotencyKey:KEY,
    gateway:{activeDoorway:async()=>({hasActiveLocator:false}),
      issuePublicDoorway:async()=>({slug:'opaque',pathClass:'AGREEMENT_DOORWAY',status:'ACTIVE',publicUrl:null})}
  });
  assert.equal(result.ok,true);
  assert.equal(result.publicUrl,null);
});
test('unexpected server path or URL is never displayed as a SecureLink',async()=>{
  for(const result of [
    {slug:'abc',pathClass:'NOT_DOORWAY',status:'ACTIVE',publicUrl:'https://securepay.ke/l/abc'},
    {slug:'abc',pathClass:'AGREEMENT_DOORWAY',status:'ACTIVE',publicUrl:'javascript:alert(1)'}
  ]){
    const actual=await miniSellerIssueAgreementDoorway({
      agreement,idempotencyKey:KEY,confirmed:true,
      gateway:{activeDoorway:async()=>({hasActiveLocator:false}),issuePublicDoorway:async()=>result}
    });
    assert.equal(actual.ok,false);
  }
});
test('uncertain issuance retains idempotency key for verification or retry',async()=>{
  const result=await miniSellerIssueAgreementDoorway({
    agreement,confirmed:true,idempotencyKey:KEY,
    gateway:{activeDoorway:async()=>({hasActiveLocator:false}),issuePublicDoorway:async()=>{throw Error('network timeout')}}
  });
  assert.deepEqual(result,{ok:false,reason:'CHECK_AGREEMENT_BEFORE_RETRY',retryKey:KEY});
});
