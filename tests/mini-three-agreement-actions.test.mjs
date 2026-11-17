import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {miniStraightSaleMoneyPreview} from '../src/mini/miniAgreementActions.mjs';
import {miniBasketQuietPreflight} from '../src/mini/miniBasketQuietFairTrade.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sourceDate='2026-11-17T06:00:00.000Z';
const pump={sellerKsNumber:'KS90002',sellerName:'Ruiru Pump House · Sample',
 offerId:'00000000-0000-4000-8000-000000090021',title:'Solar irrigation water pump',
 kind:'PRODUCT',quantity:1,priceMinor:3500000,currency:'KES',
 availabilityState:'AVAILABLE',offerUpdatedAt:sourceDate,
 description:'Example pump. Installation and annual maintenance are separate services.'};
const readyOptions={sourceFresh:true,basketReady:true,questionsComplete:true,
 fulfilmentChoice:'collect',deliveryContracts:[],providerRequests:[],priceQuoted:true};
test('A fixed-price straight sale can choose Money directly without first sending SecureLink',()=>{
 const direct=miniStraightSaleMoneyPreview([pump],readyOptions);
 assert.equal(direct.canOpenMoney,true);
 assert.equal(direct.requiresSecureLink,false);
 assert.equal(direct.reason,null);
 assert.equal(direct.backendAuthorised,false);
 assert.equal(miniBasketQuietPreflight([pump]).canonicalExamination.moneyReady,false,
   'a sample simulation must never imply real Fair Trade or Money authorisation');
});
test('Other parties can be involved without making a SecureLink a mandatory route',()=>{
 const second={...pump,sellerKsNumber:'KS90001',
   offerId:'00000000-0000-4000-8000-000000091001',title:'Garden light'};
 assert.equal(miniStraightSaleMoneyPreview([pump,second],readyOptions).canOpenMoney,true);
});
test('Real unresolved seller terms, unquoted prices, unavailable stock and delivery stay guarded',()=>{
 const cases=[
   {lines:[pump],options:{...readyOptions,sourceFresh:false}},
   {lines:[{...pump,priceMinor:null}],options:{...readyOptions,priceQuoted:false}},
   {lines:[{...pump,availabilityState:'NEEDS_CONFIRMATION'}],options:readyOptions},
   {lines:[{...pump,availabilityState:'TAKING_WORK'}],options:readyOptions},
   {lines:[pump],options:{...readyOptions,fulfilmentChoice:'ask_sellers'}},
   {lines:[pump],options:{...readyOptions,deliveryContracts:[{id:'DEMO-DELIVERY'}]}},
   {lines:[pump],options:{...readyOptions,providerRequests:[{id:'needs-provider'}]}},
   {lines:[pump],options:{...readyOptions,questionsComplete:false}},
 ];
 for(const x of cases){
   const guard=miniStraightSaleMoneyPreview(x.lines,x.options);
   assert.equal(guard.canOpenMoney,false,guard.reason||'should explain required action');
   assert.ok(guard.reason);
   assert.equal(guard.requiresSecureLink,false,'not every unresolved item requires a link specifically');
   assert.equal(guard.backendAuthorised,false);
 }
});
test('Three independent actions appear immediately after an organised Agreement, in standard order',()=>{
 const buy=read('src/mini/MiniBuyStore.tsx');
 const pos=label=>buy.indexOf('>'+label+'</strong>',buy.indexOf('spm-shop-agreement-actions'));
 const send=pos('Send SecureLink');
 const money=buy.indexOf('Connect to Money</strong>',send);
 const save=pos('Save for later');
 assert.ok(send>0&&money>send&&save>money);
 assert.match(buy,/directSale.canOpenMoney\|\|sellerReviewed/);
 assert.match(buy,/\(directSale.canOpenMoney\|\|sellerReviewed\)/);
 assert.match(buy,/onClick=\{\(\)=>void connectSampleMoney\(\)\}/);
 assert.match(buy,/disabled=\{!playground\|\|!sampleMoneyReady\}/);
 assert.match(buy,/data-straight-sale="no-securelink-needed"/);
 assert.match(buy,/saveForLater/);
 assert.match(buy,/miniStoreOfferSnapshotFresh\(cart,fresh\)/);
 assert.doesNotMatch(buy,/sampleMoneyReady=.*?&&sampleRequests&&allSampleAccepted/s);
});
test('The separate owner preview opens ready-Agreement choices without affecting production',()=>{
 const app=read('src/mini/MiniExperience.tsx');
 const buy=read('src/mini/MiniBuyStore.tsx');
 assert.match(app,/agreementActionsPreview/);
 assert.match(app,/agreementActionsShowcase=\{agreementActionsShowcase\}/);
 assert.match(app,/isMiniExperiencePreviewHost\(window.location.hostname\)/);
 assert.match(app,/miniTradeDemo/);
 assert.match(buy,/agreementActionsShowcase/);
 assert.match(buy,/setProposalOpen\(true\);setView\('plan'\)/);
 assert.match(read('src/mini/MiniSampleMoneyJourney.tsx'),/Choice Bank/);
 assert.match(read('src/mini/MiniSampleMoneyJourney.tsx'),/M-PESA/);
 assert.match(read('src/mini/MiniSampleMoneyJourney.tsx'),/PesaLink/);
});
