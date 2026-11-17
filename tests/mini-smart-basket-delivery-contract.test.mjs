import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {miniBasketQuestions,miniBasketAnswersForOffer} from '../src/mini/miniBasketQuestions.mjs';
import {miniDeliveryContracts,miniDeliveryContractSummary,SAMPLE_DELIVERY_WINDOWS} from '../src/mini/miniDeliveryContract.mjs';
import {readSampleBasketDraft,saveSampleBasketDraft,clearSampleBasketDraft} from '../src/mini/miniSampleBasketDraft.mjs';
import {makeSampleLivingPurchase,readMiniSamplePurchases,recordMiniSamplePurchase,SAMPLE_RAILS} from '../src/mini/miniSampleLivingPurchases.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const lines=[
 {sellerKsNumber:'KS90001',sellerName:'Kamakis Traders · Sample',offerId:'00000000-0000-4000-8000-000000091001',
  title:'Outdoor paint 4L',description:'Sample exterior paint; colour to confirm.',
  kind:'PRODUCT',quantity:2,priceMinor:245000,currency:'KES',
  offerUpdatedAt:'2026-11-17T06:00:00.000Z',availabilityState:'AVAILABLE'},
 {sellerKsNumber:'KS90002',sellerName:'Ruiru Pump House · Sample',offerId:'00000000-0000-4000-8000-000000090021',
  title:'Pump controller',description:'Compatibility must be agreed for existing equipment.',
  kind:'PRODUCT',quantity:1,priceMinor:320000,currency:'KES',
  offerUpdatedAt:'2026-11-17T06:00:00.000Z',availabilityState:'AVAILABLE'},
];
const demo={getItem(k){return this.data.get(k)||null;},setItem(k,v){this.data.set(k,v);},removeItem(k){this.data.delete(k);},data:new Map()};
test('Basket asks only essential buyer-side questions supported by the Store text',()=>{
 const plan=miniBasketQuestions(lines);
 assert.deepEqual(plan.questions.map(q=>q.id.split(':').at(-1)),['colour','compatibility']);
 assert.equal(plan.complete,false);
 assert.match(plan.nextQuestion.title,/colour/i);
 const answers=Object.fromEntries(plan.questions.map(q=>[q.id,'Please advise']));
 assert.equal(miniBasketQuestions(lines,answers).complete,true);
 assert.equal(miniBasketAnswersForOffer(lines,answers).length,2);
});
test('No generic questioning for an uncomplicated already-priced service',()=>{
 const simple={...lines[0],kind:'SERVICE',description:'One clean work visit, price fixed.'};
 const state=miniBasketQuestions([simple]);
 assert.equal(state.complete,true);
 assert.deepEqual(state.questions,[]);
});
test('Scope and appointment are sourced separately from service description',()=>{
 const s={...lines[0],kind:'SERVICE',description:'Scope to agree. Appointment on-site; site visit.'};
 const p=miniBasketQuestions([s]);
 assert.ok(p.questions.some(q=>q.id.endsWith(':scope')));
 assert.ok(p.questions.some(q=>q.id.endsWith(':schedule')));
 assert.ok(p.questions.some(q=>q.id.endsWith(':site')));
});
test('Combined delivery becomes one distinct mini Agreement, with source goods, time, place and charge',()=>{
 const contracts=miniDeliveryContracts({choice:'explore_combined',lines,destination:'Varsityville, Ruiru',
   window:'next',deliveryQuoteSelected:true});
 assert.equal(contracts.length,1);
 assert.equal(contracts[0].providerKsNumber,'KS90004');
 assert.equal(contracts[0].goods.length,2);
 assert.equal(contracts[0].pickupStores.length,2);
 assert.equal(contracts[0].feeMinor,45000);
 assert.equal(contracts[0].providerAccepted,false);
 assert.equal(contracts[0].customerApproved,false);
 assert.equal(contracts[0].window,SAMPLE_DELIVERY_WINDOWS.next);
 assert.equal(miniDeliveryContractSummary(contracts).ready,true);
});
test('Each Store delivery is its own independently accepted obligation',()=>{
 const c=miniDeliveryContracts({choice:'ask_sellers',lines,destination:'Kamakis, Ruiru',
   window:'arrange',deliveryQuoteSelected:true});
 assert.equal(c.length,2);
 assert.deepEqual(c.map(x=>x.providerKsNumber),['KS90001','KS90002']);
 assert.equal(miniDeliveryContractSummary(c).feeMinor,50000);
 assert.ok(c.every(x=>x.goods.length===1&&x.customerApprovalRequired&&x.providerAcceptanceRequired));
});
test('Cannot create delivery agreement with no place, time or accepted source price',()=>{
 assert.deepEqual(miniDeliveryContracts({choice:'explore_combined',lines,destination:'',
   window:'next',deliveryQuoteSelected:true}),[]);
 assert.deepEqual(miniDeliveryContracts({choice:'explore_combined',lines,destination:'Varsityville',
   window:null,deliveryQuoteSelected:true}),[]);
 assert.deepEqual(miniDeliveryContracts({choice:'explore_combined',lines,destination:'Varsityville',
   window:'arrange',deliveryQuoteSelected:false}),[]);
 assert.deepEqual(miniDeliveryContracts({choice:'collect',lines,destination:'Varsityville',
   window:'next',deliveryQuoteSelected:true}),[]);
});
test('Unaccepted delivery provider cannot be represented as a funded mini Agreement',()=>{
 const c=miniDeliveryContracts({choice:'explore_combined',lines,destination:'Varsityville',
   window:'next',deliveryQuoteSelected:true});
 assert.equal(makeSampleLivingPurchase({lines,rail:'MPESA_STK',delivery:'Varsityville',
   deliveryFeeMinor:45000,deliveryProvider:'KS90004',deliveryContracts:c}),null);
 assert.equal(makeSampleLivingPurchase({lines,rail:'MPESA_STK',delivery:'Varsityville',
   deliveryFeeMinor:45000,deliveryProvider:'KS90004',deliveryContracts:c.map(x=>({...x,providerAccepted:true}))}),null);
});
test('Separate accepted delivery mini Agreement is linked and saved alongside parent without double debit',()=>{
 const c=miniDeliveryContracts({choice:'explore_combined',lines,destination:'Varsityville',
   window:'next',deliveryQuoteSelected:true}).map(x=>({...x,providerAccepted:true,customerApproved:true}));
 const purchased=makeSampleLivingPurchase({lines,rail:'MPESA_STK',delivery:'Varsityville',
   deliveryFeeMinor:45000,deliveryProvider:'KS90004',deliveryContracts:c,
   now:new Date('2026-11-17T10:30:00.000Z')});
 assert.ok(purchased);
 assert.equal(purchased.amountMinor,855000);
 assert.equal(purchased.linkedDeliveryAgreements.length,1);
 const delivery=purchased.linkedDeliveryAgreements[0];
 assert.equal(delivery.agreementKind,'DELIVERY');
 assert.equal(delivery.parentId,purchased.id);
 assert.equal(delivery.deliveryTerms.destination,'Varsityville');
 assert.equal(delivery.deliveryTerms.window,SAMPLE_DELIVERY_WINDOWS.next);
 assert.equal(delivery.amountMinor,45000);
 assert.equal(purchased.items.reduce((sum,l)=>sum+l.amountMinor,0),purchased.amountMinor);
 const storage={data:new Map(),getItem(k){return this.data.get(k)||null;},
   setItem(k,v){this.data.set(k,v);}};
 const updated=recordMiniSamplePurchase(storage,purchased);
 assert.equal(updated[0].agreementKind,'PURCHASE');
 assert.equal(updated[1].agreementKind,'DELIVERY');
 assert.equal(updated[1].id,delivery.id);
 assert.equal(readMiniSamplePurchases(storage).filter(x=>x.parentId===purchased.id).length,1);
});
test('A sample draft survives refresh without becoming a live Agreement or preserving approvals',()=>{
 demo.data.clear();
 const draft={lines,fulfilmentChoice:'explore_combined',answers:{'foo:colour':'blue'},
   deliveryArea:'Varsityville',deliveryQuoteSelected:true,quoteAccepted:{}};
 assert.equal(saveSampleBasketDraft(demo,draft),true);
 const loaded=readSampleBasketDraft(demo);
 assert.equal(loaded.lines.length,2);
 assert.equal(loaded.deliveryArea,'Varsityville');
 assert.equal(loaded.lines[0].mediaRefs.length,0);
 assert.equal(loaded.sampleRequests,undefined);
 clearSampleBasketDraft(demo);
 assert.equal(readSampleBasketDraft(demo),null);
});
test('Three standard Agreement actions, and only the repository-recognised rail names',()=>{
 const basket=read('src/mini/MiniBuyStore.tsx');
 const money=read('src/mini/MiniSampleMoneyJourney.tsx');
 assert.match(basket,/Send SecureLink · sample review/);
 assert.match(basket,/Connect to Money/);
 assert.match(basket,/Save for later/);
 assert.match(basket,/miniBasketQuestions\(cart,basketAnswers\)/);
 assert.match(basket,/Quick delivery Agreement/);
 assert.match(basket,/deliveryContracts\.map/);
 assert.deepEqual(SAMPLE_RAILS,['CHOICE_KS_ACCOUNT','MPESA_STK','PESALINK']);
 const ordered=[money.indexOf('Choice Bank'),money.indexOf('M-PESA'),money.indexOf('PesaLink')];
 assert.ok(ordered[0]>=0&&ordered[0]<ordered[1]&&ordered[1]<ordered[2]);
 assert.doesNotMatch(money,/Bank card/);
});
