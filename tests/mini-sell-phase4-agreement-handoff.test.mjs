import test from 'node:test';
import assert from 'node:assert/strict';
import {
  miniSellerBeginAgreementHandoff,
  miniSellerReviewAgreementHandoff,
  miniSellerCreateReviewedAgreement,
  miniSellerProposeAgreement
} from '../src/mini/miniSellerAgreementHandoff.mjs';

const CONVERSATION='11111111-1111-4111-8111-111111111111';
const ACTION='22222222-2222-4222-8222-222222222222';
const HANDOFF='33333333-3333-4333-8333-333333333333';
const AGREEMENT='44444444-4444-4444-8444-444444444444';
const VERSION={versionId:'55555555-5555-4555-8555-555555555555',versionNumber:1,contentHash:'hash-v1',createdAt:'2026-11-17T13:00:00Z',amendmentReason:null,materialChange:false};
const candidate={title:'20 bags dairy meal',purpose:'Sale',description:'50 kg bags',
  agreementType:'TRADE',currency:'KES',amountMinor:5000000,what:['Feed bags'],who:[],when:[]};
const serverHandoff=(patch={})=>({
  handoffId:HANDOFF,conversationId:CONVERSATION,status:'READY_TO_PROGRESS',
  tradeContextVersion:7,candidateDigest:'server-digest-of-version-7',
  agreementCandidateSummary:candidate,mustResolve:[],stillToDecide:[],
  reviewedSource:{sourceStatus:'CURRENT'},progressedAgreementId:null,...patch
});
const review={agreementCandidateSummary:candidate,who:[],responsibilities:[],money:[],
  when:[],conditions:[],authority:[],reviewedSource:null};

test('a saved KS001 conversation and exact reviewed version is required',async()=>{
  let calls=0;
  const gateway={createHandoff:async(...a)=>{calls++;assert.deepEqual(a,[CONVERSATION,ACTION,7]);return serverHandoff()}};
  assert.deepEqual(await miniSellerBeginAgreementHandoff({gateway,conversationId:CONVERSATION,
    reviewedTradeContextVersion:7,clientActionId:ACTION,confirmed:false}),
    {ok:false,reason:'SELLER_ACTION_REQUIRED'});
  assert.equal(calls,0);
  const result=await miniSellerBeginAgreementHandoff({gateway,conversationId:CONVERSATION,
    reviewedTradeContextVersion:7,clientActionId:ACTION,confirmed:true});
  assert.equal(result.ok,true);
  assert.equal(result.agreementCreated,false);
  assert.equal(calls,1);
  assert.equal((await miniSellerBeginAgreementHandoff({gateway,conversationId:'not-a-conversation',
    reviewedTradeContextVersion:7,clientActionId:ACTION,confirmed:true})).ok,false);
});
test('handoff uncertain outcome retains action id; never manufactures Agreement',async()=>{
  const result=await miniSellerBeginAgreementHandoff({
    gateway:{createHandoff:async()=>{throw Error('network')}},
    conversationId:CONVERSATION,reviewedTradeContextVersion:7,clientActionId:ACTION,confirmed:true
  });
  assert.deepEqual(result,{ok:false,reason:'CHECK_EXISTING_HANDOFF_BEFORE_RETRY',retryKey:ACTION});
});
test('review displays server-owned facts and version, not local Mini text',async()=>{
  const gateway={reviewHandoff:async()=>review,readHandoff:async()=>serverHandoff()};
  const result=await miniSellerReviewAgreementHandoff({gateway,handoffId:HANDOFF});
  assert.equal(result.ok,true);
  assert.equal(result.canProgress,true);
  assert.deepEqual(result.candidate,candidate);
  assert.deepEqual(result.snapshot,
    {expectedTradeContextVersion:7,expectedCandidateDigest:'server-digest-of-version-7'});
});
test('review cannot progress with matters, changed source, or unresolved state',async()=>{
  for (const patch of [
    {mustResolve:[{description:'Agree delivery time'}]},
    {reviewedSource:{sourceStatus:'CHANGED'}},
    {status:'NEEDS_RESOLUTION'}
  ]) {
    const result=await miniSellerReviewAgreementHandoff({
      gateway:{reviewHandoff:async()=>review,readHandoff:async()=>serverHandoff(patch)},
      handoffId:HANDOFF
    });
    assert.equal(result.ok,true);
    assert.equal(result.canProgress,false);
  }
});
test('only explicitly confirmed unchanged authoritative review creates a draft',async()=>{
  let progression=0;
  const gateway={readHandoff:async()=>serverHandoff(),
    continueHandoff:async(id,snapshot)=>{
      progression++;
      assert.equal(id,HANDOFF);
      assert.deepEqual(snapshot,{expectedTradeContextVersion:7,
        expectedCandidateDigest:'server-digest-of-version-7'});
      return serverHandoff({status:'PROGRESSED',progressedAgreementId:AGREEMENT});
    }};
  const agreements={detail:async()=>({
    overview:{agreementId:AGREEMENT,status:'DRAFT'},currentVersion:VERSION
  })};
  const reviewed=await miniSellerReviewAgreementHandoff({
    gateway:{...gateway,reviewHandoff:async()=>review},handoffId:HANDOFF});
  assert.equal((await miniSellerCreateReviewedAgreement({
    gateway,agreements,reviewed,sellerConfirmed:false})).ok,false);
  assert.equal(progression,0);
  const actual=await miniSellerCreateReviewedAgreement({
    gateway,agreements,reviewed,sellerConfirmed:true});
  assert.equal(actual.ok,true);
  assert.equal(actual.status,'DRAFT');
  assert.equal(actual.secureLinkIssued,false);
  assert.equal(actual.moneyAuthorized,false);
  assert.equal(progression,1);
});
test('stale review forbids continuation before its first write',async()=>{
  let writes=0;
  const reviewed=await miniSellerReviewAgreementHandoff({
    gateway:{reviewHandoff:async()=>review,readHandoff:async()=>serverHandoff()},handoffId:HANDOFF});
  const actual=await miniSellerCreateReviewedAgreement({
    gateway:{readHandoff:async()=>serverHandoff({candidateDigest:'changed'}),
      continueHandoff:async()=>{writes++;}},
    agreements:{detail:async()=>{}},reviewed,sellerConfirmed:true});
  assert.deepEqual(actual,{ok:false,reason:'REVIEW_CHANGED_REFRESH_REQUIRED'});
  assert.equal(writes,0);
});
test('seller must separately propose confirmed draft; proposal never shares or pays',async()=>{
  let proposals=0;
  const agreements={
    detail:async()=>({overview:{agreementId:AGREEMENT,status:proposals?'PROPOSED':'DRAFT'},currentVersion:VERSION}),
    proposeReviewed:async(id,expected)=>{proposals++;assert.equal(id,AGREEMENT);
      assert.deepEqual(expected,VERSION);return{id:AGREEMENT,status:'PROPOSED'}}
  };
  const no=await miniSellerProposeAgreement({agreements,agreementId:AGREEMENT,expectedAgreementVersion:VERSION,confirmed:false});
  assert.equal(no.ok,false);
  assert.equal(proposals,0);
  const yes=await miniSellerProposeAgreement({agreements,agreementId:AGREEMENT,expectedAgreementVersion:VERSION,confirmed:true});
  assert.equal(yes.ok,true);
  assert.equal(yes.secureLinkIssued,false);
  assert.equal(yes.buyerAccepted,false);
  assert.equal(yes.moneyAuthorized,false);
  assert.equal(proposals,1);
});
test('uncertain progression never invents draft or sends invitation',async()=>{
  const reviewed=await miniSellerReviewAgreementHandoff({
    gateway:{reviewHandoff:async()=>review,readHandoff:async()=>serverHandoff()},handoffId:HANDOFF});
  const result=await miniSellerCreateReviewedAgreement({
    gateway:{readHandoff:async()=>serverHandoff(),
      continueHandoff:async()=>{throw Error('timeout')}},
    agreements:{detail:async()=>{}},reviewed,sellerConfirmed:true});
  assert.deepEqual(result,{ok:false,reason:'CHECK_HANDOFF_BEFORE_RETRY',handoffId:HANDOFF});
});

test('review fails closed when server handoff version changes during review',async()=>{
  let reads=0;
  const actual=await miniSellerReviewAgreementHandoff({
    gateway:{
      readHandoff:async()=>serverHandoff({candidateDigest:++reads===1?'old-digest':'new-digest'}),
      reviewHandoff:async()=>review
    },
    handoffId:HANDOFF
  });
  assert.deepEqual(actual,{ok:false,reason:'HANDOFF_CHANGED_DURING_REVIEW'});
});
test('changed Agreement version cannot be proposed or sent to SecureLink',async()=>{
  let proposals=0;
  const result=await miniSellerProposeAgreement({
    agreements:{detail:async()=>({overview:{agreementId:AGREEMENT,status:'DRAFT'},
      currentVersion:{...VERSION,contentHash:'different'}}),
      proposeReviewed:async()=>{proposals++;return{id:AGREEMENT,status:'PROPOSED'}}},
    agreementId:AGREEMENT,expectedAgreementVersion:VERSION,confirmed:true
  });
  assert.deepEqual(result,{ok:false,reason:'REVIEW_AGREEMENT_BEFORE_PROPOSING'});
  assert.equal(proposals,0);
});
