import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  makeSampleLivingPurchase,readMiniSamplePurchases,recordMiniSamplePurchase,
  validSamplePurchase,SAMPLE_PURCHASE_KEY
} from '../src/mini/miniSampleLivingPurchases.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const lines=[
 {sellerKsNumber:'KS90001',sellerName:'Kamakis Traders · Sample',title:'Solar wall light',
  quantity:2,priceMinor:320000,offerId:'one'},
 {sellerKsNumber:'KS90002',sellerName:'Ruiru Pump House · Sample',title:'Garden hose',
  quantity:1,priceMinor:220000,offerId:'two'},
];
function storage(){
 const data=new Map();
 return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v)};
}
test('A confirmed fictional rail creates one version of the Living Purchase with each seller distinct',()=>{
 const x=makeSampleLivingPurchase({lines,rail:'MPESA_STK',delivery:'Collection',
  now:new Date('2026-11-17T10:30:00.000Z')});
 assert.ok(x);
 assert.equal(x.amountMinor,860000);
 assert.equal(x.items.length,2);
 assert.equal(x.rail,'MPESA_STK');
 assert.equal(x.progress[0].status,'done');
 assert.equal(x.progress.filter(p=>p.status==='current').length,2);
 assert.match(x.id,/^DEMO-/);
 assert.equal(validSamplePurchase(x),true);
});
test('One combined mock delivery is a separate provider and included exactly once in total',()=>{
 const x=makeSampleLivingPurchase({lines,rail:'PESALINK',delivery:'Varsityville, Ruiru',
  deliveryProvider:'KS90004',deliveryFeeMinor:45000});
 assert.equal(x.amountMinor,905000);
 assert.equal(x.items.length,3);
 assert.equal(x.items.at(-1).sellerKsNumber,'KS90004');
 assert.equal(x.items.at(-1).amountMinor,45000);
});
test('Separate Store deliveries are not misattributed to one transport merchant',()=>{
 const x=makeSampleLivingPurchase({lines,rail:'CHOICE_KS_ACCOUNT',delivery:'Kamakis, Ruiru',
  deliveryProvider:'SELLERS',deliveryFeeMinor:50000});
 assert.equal(x.amountMinor,910000);
 assert.deepEqual(x.items.slice(2).map(i=>i.sellerKsNumber),['KS90001','KS90002']);
 assert.deepEqual(x.items.slice(2).map(i=>i.amountMinor),[25000,25000]);
});
test('Cannot make a funded Agreement out of an unquoted offer or imaginary rail',()=>{
 assert.equal(makeSampleLivingPurchase({lines:[{...lines[0],priceMinor:null}],rail:'MPESA_STK',delivery:'Collect'}),null);
 assert.equal(makeSampleLivingPurchase({lines,rail:'FAKE',delivery:'Collect'}),null);
 assert.equal(makeSampleLivingPurchase({lines,rail:'CHOICE_KS_ACCOUNT',delivery:'Collect',deliveryFeeMinor:-1}),null);
});
test('Session storage holds fake purchases alongside other examples without a real Agreement or receipt',()=>{
 const tab=storage();
 const original=readMiniSamplePurchases(tab);
 assert.ok(original.length>=2);
 const x=makeSampleLivingPurchase({lines,rail:'MPESA_STK',delivery:'Collect'});
 const updated=recordMiniSamplePurchase(tab,x);
 assert.equal(updated[0].id,x.id);
 assert.ok(updated.length>=3);
 assert.ok(tab.getItem(SAMPLE_PURCHASE_KEY).includes(x.id));
 assert.equal(readMiniSamplePurchases(tab)[0].id,x.id);
 assert.equal(recordMiniSamplePurchase(tab,x).filter(y=>y.id===x.id).length,1);
});
test('Malformed, forged or foreign Agreement data never becomes authoritative',()=>{
 const tab=storage();
 tab.setItem(SAMPLE_PURCHASE_KEY,JSON.stringify([{id:'LIVE-ACCOUNT-123',amountMinor:999999,rail:'MPESA_STK'}]));
 assert.equal(readMiniSamplePurchases(tab).length,2);
 tab.setItem(SAMPLE_PURCHASE_KEY,'not json');
 assert.equal(readMiniSamplePurchases(tab).length,2);
});
test('The buyer never clicks seller acceptance; the sample checks staged rail and provider confirmation separately',()=>{
 const buy=read('src/mini/MiniBuyStore.tsx');
 const money=read('src/mini/MiniSampleMoneyJourney.tsx');
 const app=read('src/mini/MiniExperience.tsx');
 assert.match(buy,/setSampleResponses\(Object\.fromEntries/);
 assert.doesNotMatch(buy,/Simulate acceptance/);
 assert.match(buy,/Send SecureLink · sample review/);
 assert.match(buy,/deliveryArea/);
 assert.match(buy,/deliveryQuoteSelected/);
 assert.match(buy,/MoneyJourney/);
 assert.match(money,/Choose how to pay/);
 assert.match(money,/M-PESA/);
 assert.match(money,/Choice Bank/);
 assert.match(money,/PesaLink/);
 assert.match(money,/fictional payment confirmation is arriving automatically/i);
 assert.match(money,/onConfirmed\(purchase\)/);
 assert.match(app,/recordMiniSamplePurchase\(window\.sessionStorage,purchase\)/);
 assert.match(app,/MiniSampleAgreements/);
 assert.match(app,/playground&&screen==='sample-agreements'/);
});
test('Photography no longer overlays Store labels on a narrow phone',()=>{
 const css=read('src/mini/mini.css');
 assert.match(css,/Mobile browse card repair/);
 assert.match(css,/\.spm-shop-discovery-card \{display:flex/);
 assert.match(css,/z-index:2;display:flex;flex:1 1 0/);
 assert.match(css,/max-width:calc\(100% - 104px\)/);
 assert.match(css,/\.spm-clean \.spm-frame \{ max-width:390px/);
});
