import test from 'node:test';
import assert from 'node:assert/strict';
import { miniBasketReadiness } from '../src/mini/miniBasketReadiness.mjs';
const goods=(seller='KS111',offer='a')=>({sellerKsNumber:seller,offerId:offer,kind:'PRODUCT',quantity:2,priceMinor:150000,currency:'KES'});
const service={sellerKsNumber:'KS222',offerId:'b',kind:'SERVICE',quantity:1,priceMinor:null,currency:'KES'};
test('Empty basket cannot be confirmed',()=>{
  const view=miniBasketReadiness([], {sourcesFresh:true});
  assert.equal(view.readyToReview,false);
  assert.equal(view.readyToPay,false);
});
test('A checked physical-good basket waits for one customer fulfilment choice',()=>{
  const before=miniBasketReadiness([goods()], {sourcesFresh:true});
  assert.equal(before.readyToReview,false);
  assert.match(before.missing.join(' '),/receive the goods/);
  for(const choice of ['collect','ask_sellers','explore_combined']){
    const after=miniBasketReadiness([goods()],{sourcesFresh:true,fulfilmentChoice:choice});
    assert.equal(after.readyToReview,true);
    assert.equal(after.readyToPay,false);
    assert.equal(after.totalMinor,300000);
    assert.equal(after.currency,'KES');
  }
});
test('An unread or changed source cannot be treated as reviewed',()=>{
  const view=miniBasketReadiness([goods()],{sourcesFresh:false,fulfilmentChoice:'collect'});
  assert.equal(view.readyToReview,false);
  assert.match(view.missing.join(' '),/current published offers/);
});
test('Services are not asked to choose physical goods delivery',()=>{
  const view=miniBasketReadiness([service],{sourcesFresh:true});
  assert.equal(view.readyToReview,true);
  assert.equal(view.amountNeedsQuote,true);
  assert.equal(view.totalMinor,null);
  assert.equal(view.readyToPay,false);
});
test('Cross-store lines remain independently attributable and are never one authorised payment',()=>{
  const view=miniBasketReadiness([goods(),goods('KS333','c'),service],{sourcesFresh:true,fulfilmentChoice:'explore_combined'});
  assert.equal(view.itemCount,3);
  assert.equal(view.sellerCount,3);
  assert.equal(view.readyToReview,true);
  assert.equal(view.totalMinor,null);
  assert.equal(view.sellerConfirmationRequired,true);
  assert.equal(view.readyToPay,false);
});
test('Optional improvements cannot hold a ready service-only review hostage',()=>{
  const view=miniBasketReadiness([{...service,priceMinor:0}],{sourcesFresh:true});
  assert.deepEqual(view.missing,[]);
  assert.equal(view.readyToReview,true);
});
