import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {miniSellerTrustExamination as examine} from '../src/mini/miniSellerTrustExamination.mjs';

const good={
  title:'20 bags of dairy meal',rightToOffer:true,rightType:'Owner',
  stockStatement:'Seller says available',description:'50kg bags',
  descriptionReviewed:true,photos:[],documents:[],sensitive:false,suspicious:false
};
test('seller declaration gives a reviewable local proposal, never certified publication',()=>{
  const r=examine(good);
  assert.equal(r.localReady,true);assert.equal(r.canPublish,false);
  assert.equal(r.canIssueSecureLink,false);assert.equal(r.stockVerified,false);
  assert.equal(r.sellerIdentityVerified,false);assert.equal(r.independentLegalityVerified,false);
  assert.equal(r.imageExactDigestVerified,false);assert.equal(r.serverImageUseRegistered,false);
  assert.equal(r.checks.find(x=>x.key==='seller').status,'SELLER_DECLARED');
});
test('photos require source and supplier reuse permission as separate answers',()=>{
  const unknown=examine({...good,photos:[{source:'unknown',supplierPermission:false}]});
  assert.equal(unknown.localReady,false);
  assert.equal(unknown.totalImageIssues,1);
  assert.deepEqual(unknown.blockers,['IMAGE_SOURCE_OR_PERMISSION_MISSING']);
  const supplier=examine({...good,photos:[{source:'supplier',supplierPermission:false}]});
  assert.equal(supplier.localReady,false);
  const declared=examine({...good,photos:[{source:'supplier',supplierPermission:true}]});
  assert.equal(declared.localReady,true);
  assert.equal(declared.checks.find(x=>x.key==='photos').status,'PERMISSION_DECLARED_UNVERIFIED');
  assert.equal(declared.serverImageUseRegistered,false);
});
test('no photo requirement is imposed on a service; images never prove goods in stock',()=>{
  const r=examine({...good,photos:[],descriptionReviewed:false});
  assert.equal(r.checks.find(x=>x.key==='photos').status,'NOT_APPLICABLE');
  assert.equal(r.checks.find(x=>x.key==='truth').status,'OPTIONAL_IMPROVEMENT');
  assert.equal(r.localReady,true);
  assert.equal(r.stockVerified,false);
});
test('seller claims alone cannot clear a possibly regulated or suspicious offer',()=>{
  const restricted=examine({...good,sensitive:true,photos:[{source:'own'}]});
  assert.equal(restricted.localReady,false);
  assert.ok(restricted.blockers.includes('REGULATED_CATEGORY_REVIEW_REQUIRED'));
  assert.equal(restricted.canPublish,false);
  const blocked=examine({...good,suspicious:true});
  assert.ok(blocked.blockers.includes('POSSIBLE_PROHIBITED_OFFER'));
});
test('missing authority or stock answer requires clarifying pill',()=>{
  const r=examine({...good,rightToOffer:false,stockStatement:''});
  assert.equal(r.localReady,false);
  assert.ok(r.blockers.includes('RIGHT_TO_OFFER_UNDECLARED'));
  assert.ok(r.blockers.includes('AVAILABILITY_UNDECLARED'));
});
test('document names stay unverified and make no identity or image proof claims',()=>{
  const r=examine({...good,documents:[{name:'invoice.pdf',purpose:'authorization'}]});
  assert.equal(r.checks.find(x=>x.key==='documents').status,'LOCAL_REFERENCE_ONLY');
  assert.equal(r.canPublish,false);
});
test('seller UI uses Phase 3 source-safe examiner without adding Store or Money writes',()=>{
  const seller=readFileSync(new URL('../src/mini/MiniSellSomething.tsx',import.meta.url),'utf8');
  assert.match(seller,/miniSellerTrustExamination/);
  assert.match(seller,/data-mini-sell-trust-examination/);
  assert.match(seller,/Independent checks are still pending/);
  assert.match(seller,/image registration pending/);
  assert.ok(!seller.includes('storeGateway.createOffer('));
  assert.ok(!seller.includes('fundAgreement('));
});
