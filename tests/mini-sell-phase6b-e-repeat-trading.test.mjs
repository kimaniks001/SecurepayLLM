import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {miniSellerRepeatTemplate,miniSellerRepeatTiming} from '../src/mini/miniSellerRepeatPolicy.mjs';
const read=(p)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const uuid='b6449936-9868-4fa9-9d64-645bf01d479b';
const draft=(opts={})=>({title:'Repair a rainwater tank',referenceKey:uuid,
  termsHint:'Seal and pressure-test the tank',cadence:'WEEKLY',
  stopRule:'EACH_CYCLE_CONFIRM',untilDate:null,...opts});
test('6C private template includes only user-written words and repeat proposal, never buyer, price or Money',()=>{
  const saved=miniSellerRepeatTemplate({...draft(),buyerKsNumber:'KS123',amountMinor:9000,
    autoPay:true,acceptedVersion:'v1'});
  assert.equal(saved.kind,'TEMPLATE');
  assert.equal(saved.label,'Repair a rainwater tank');
  assert.equal(saved.termsHint,'Seal and pressure-test the tank');
  assert.equal(saved.ownerConfirms,true);
  assert.equal(saved.cadence,'WEEKLY');
  for(const secret of ['buyerKsNumber','amountMinor','autoPay','acceptedVersion'])
    assert.ok(!(secret in saved));
});
test('6D repeat schedule requires an explicit supported cadence, stop rule and ISO date',()=>{
  assert.equal(miniSellerRepeatTemplate(draft({cadence:'DAILY'})),null);
  assert.equal(miniSellerRepeatTemplate(draft({stopRule:'NEVER'})),null);
  assert.equal(miniSellerRepeatTemplate(draft({cadence:'ONE_TIME',stopRule:'UNTIL_DATE',untilDate:'2027-09-15'})),null);
  assert.equal(miniSellerRepeatTemplate(draft({stopRule:'UNTIL_DATE',untilDate:null})),null);
  assert.equal(miniSellerRepeatTemplate(draft({stopRule:'UNTIL_DATE',untilDate:'2026-02-30'})),null);
  assert.equal(miniSellerRepeatTemplate(draft({untilDate:'2027-09-15'})),null);
  const chosen=miniSellerRepeatTemplate(draft({stopRule:'UNTIL_DATE',untilDate:'2027-09-15'}));
  assert.equal(chosen.untilDate,'2027-09-15');
  assert.match(miniSellerRepeatTiming(chosen),/No automatic renewal/);
  assert.match(miniSellerRepeatTiming(chosen),/Proposed end date: 2027-09-15/);
});
test('6B private favourites are opt-in, owner-scoped and never directory or contact sync',()=>{
  const gateway=read('src/api/securepay/mini-trade-memory/index.ts');
  const relationships=read('src/mini/MiniSellerRelationships.tsx');
  const api=read('src/mini/MiniFirstPartyKs001.tsx');
  assert.ok(gateway.includes("auth:'required'"));
  assert.ok(gateway.includes('ownerConfirms:true'));
  assert.ok(relationships.includes("source.overview?.status!=='COMPLETED'")===false);
  assert.ok(relationships.includes('miniSellerReadTradeAgainTitle(reference,source)'));
  assert.ok(relationships.includes("source.status!=='ACTIVE'"));
  assert.ok(relationships.includes("memory.mine()"));
  assert.ok(relationships.includes('Yes, keep privately'));
  assert.ok(relationships.includes('Yes, remove'));
  assert.ok(api.includes('VITE_SECUREPAY_MINI_PHASE6_PRIVATE_MEMORY'));
  assert.ok(api.includes("sellerOfferContext.type==='personal'&&liveTradeMemory"));
  for(const prohibited of ['navigator.contacts','localStorage.setItem','createAgreement(', 'initiatePayment('])
    assert.equal(relationships.includes(prohibited),false);
});
test('6E repeat offer is a clean new draft and cannot inherit Agreement, stock, buyer, authority or payment',()=>{
  const seller=read('src/mini/MiniSellSomething.tsx');
  const memory=read('src/mini/MiniSellerRelationships.tsx');
  const save=read('src/mini/MiniSellerSaveTemplate.tsx');
  assert.ok(seller.includes('setRightToOffer(false)'));
  assert.ok(seller.includes("setStockStatement('')"));
  assert.ok(seller.includes("setPrice('')"));
  assert.ok(seller.includes('setPeople([])'));
  assert.ok(seller.includes('setPictures([])'));
  assert.ok(seller.includes('setRealDraftAgreement(null)'));
  assert.ok(seller.includes('setProposedAgreement(null)'));
  assert.ok(seller.includes('setShareUrl(null)'));
  assert.ok(seller.includes('setReviewAcknowledged(false)'));
  assert.ok(seller.includes('<MiniSellerRelationships'));
  assert.ok(seller.includes('<MiniSellerSaveTemplate'));
  assert.ok(memory.includes("fresh.version!==item.version"));
  assert.ok(memory.includes('memory.prepare(fresh.id,fresh.version)'));
  assert.ok(memory.includes('prepared.untilDate!==fresh.untilDate'));
  assert.ok(read('src/api/securepay/mini-trade-memory/index.ts').includes("'/prepare'"));
  assert.ok(save.includes('Yes, save privately'));
  assert.ok(save.includes('Agree each time'));
  assert.ok(save.includes('Choose an end date'));
  assert.ok(save.includes('No automatic renewal'));
  for(const forbidden of ['prepareCurrentBillingCycle(', 'initiateVerificationTransfer(', 'connectToMoney('])
    assert.equal(save.includes(forbidden),false);
});
