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
