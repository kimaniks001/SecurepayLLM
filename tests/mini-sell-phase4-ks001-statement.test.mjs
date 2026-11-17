import test from 'node:test';
import assert from 'node:assert/strict';
import {miniSellerKs001Statement} from '../src/mini/miniSellerKs001Statement.mjs';

const prepared={ok:true,offerTerms:{
  title:'20 bags of dairy meal',description:'Sealed 50 kg bags',
  pricing:{priceMinor:250000,currency:'KES',per:'bag',mode:'LISTED_PRICE'},
  quantityRequested:20,
  fulfilment:{
    purpose:'Pickup',placeLabel:'Ruiru',timingProposal:'Friday',
    availabilityDeclaration:'Call ahead',
    warranty:'Replace bags damaged in transport',
    limitations:'Buyer arranges collection'
  },
  authorityDeclaration:'Owner'
}};
test('KS001 statement preserves price unit, quantity, location, warranty, limits and seller rights declaration',()=>{
  const result=miniSellerKs001Statement({prepared});
  assert.equal(result.ok,true);
  for(const term of ['dairy meal','KES 2500.00 per bag','Proposed quantity: 20',
    'Ruiru','Friday','damaged in transport','Buyer arranges collection','Owner'])
    assert.ok(result.statement.includes(term),term);
  assert.equal(result.moneyAuthorized,false);
  assert.equal(result.agreementCreated,false);
});
test('overlong seller proposal fails closed and cannot silently omit terms',()=>{
  const result=miniSellerKs001Statement({
    prepared:{...prepared,offerTerms:{...prepared.offerTerms,description:'Important obligation '.repeat(90)}}
  });
  assert.deepEqual(result.ok,false);
  assert.equal(result.reason,'TERMS_TOO_LONG_FOR_SINGLE_KS001_TURN');
  assert.ok(result.actualLength>1200);
  assert.equal(Object.hasOwn(result,'statement'),false);
});
test('invalid prepared offer is never sent',()=>{
  assert.deepEqual(miniSellerKs001Statement({prepared:{ok:false}}),
    {ok:false,reason:'OFFER_NOT_PREPARED'});
});

test('seller condition, specifications, included items and intended use reach KS001 separately',()=>{
  const actual=miniSellerKs001Statement({prepared:{...prepared,offerTerms:{
    ...prepared.offerTerms,
    commercialDetails:{condition:'Pre-owned but functional',specifications:'Stainless frame',
      included:'Two spare filters',purpose:'Farm irrigation'}
  }}});
  assert.equal(actual.ok,true);
  for(const term of ['Pre-owned but functional','Stainless frame','Two spare filters','Farm irrigation'])
    assert.ok(actual.statement.includes(term),'Dropped seller term: '+term);
});
test('local people, photos and documents are disclosed without copying private identities or files',()=>{
  const actual=miniSellerKs001Statement({prepared:{...prepared,offerTerms:{
    ...prepared.offerTerms,
    proposedPeople:[{label:'Private Buyer',role:'buyer'}],
    localPhotos:[{name:'photo-of-client-location.jpg'}],
    localDocuments:[{name:'private-tax-reference.pdf'}]
  }}});
  assert.equal(actual.ok,true);
  for(const term of ['1 people locally','1 local photos','1 local supporting documents',
    'NOT been sent','NOT uploaded','NOT transferred'])
    assert.ok(actual.statement.includes(term),term);
  for(const secret of ['Private Buyer','photo-of-client-location.jpg','private-tax-reference.pdf'])
    assert.equal(actual.statement.includes(secret),false);
});

test('unapproved seller description cannot quietly disappear from a real KS001 Agreement',()=>{
  const result=miniSellerKs001Statement({prepared:{ok:true,offerTerms:{
    ...prepared.offerTerms,description:'',descriptionRequiresReview:true
  }}});
  assert.deepEqual(result,{ok:false,reason:'DESCRIPTION_REVIEW_REQUIRED'});
});
