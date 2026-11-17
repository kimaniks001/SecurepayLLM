import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {miniChangedOffers} from '../src/mini/miniChangedOffers.mjs';
import {miniSampleAgreementTerms,miniSellerScopedProposal} from '../src/mini/miniTradeTerms.mjs';
import {miniBasketProviderRequests,miniSampleProviderReply} from '../src/mini/miniBasketQuietFairTrade.mjs';
import {makeSampleLivingPurchase,validSamplePurchase} from '../src/mini/miniSampleLivingPurchases.mjs';
import {miniDeliveryContracts} from '../src/mini/miniDeliveryContract.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const DATE='2026-11-17T06:00:00.000Z';
const OFFER_A='00000000-0000-4000-8000-000000090021';
const OFFER_B='00000000-0000-4000-8000-000000090032';
const line={sellerKsNumber:'KS90002',sellerName:'Ruiru Pump House · Sample',
  offerId:OFFER_A,title:'Pump',kind:'PRODUCT',quantity:2,priceMinor:3500000,currency:'KES',
  description:'Published pump',offerUpdatedAt:DATE,availabilityState:'AVAILABLE'};
const detail={canonicalKsNumber:line.sellerKsNumber,status:'ACTIVE',
  offer:{id:line.offerId,title:line.title,priceMinor:line.priceMinor,currency:line.currency,
    updatedAt:line.offerUpdatedAt,availabilityState:'AVAILABLE',quantityAvailable:4}};
const fulfilled=value=>({status:'fulfilled',value});
test('An unchanged available Store offer never interrupts the basket',()=>{
 assert.deepEqual(miniChangedOffers([line],[fulfilled(detail)]),[]);
});
test('A Store price or version change asks for buyer review, never silently rewrites a basket',()=>{
 const fresh={...detail,offer:{...detail.offer,updatedAt:'2026-11-18T06:00:00.000Z',priceMinor:3650000}};
 const changed=miniChangedOffers([line],[fulfilled(fresh)]);
 assert.equal(changed.length,1);
 assert.equal(changed[0].priceChanged,true);
 assert.equal(changed[0].wasPriceMinor,3500000);
 assert.equal(changed[0].fresh.priceMinor,3650000);
 assert.equal(changed[0].canUse,true);
 assert.equal(line.priceMinor,3500000);
});
test('Limited availability needs conscious quantity adjustment and inactive seller cannot be accepted',()=>{
 const stock={...detail,offer:{...detail.offer,quantityAvailable:1}};
 const changed=miniChangedOffers([line],[fulfilled(stock)]);
 assert.equal(changed[0].canUse,false);
 assert.equal(changed[0].maxQuantity,1);
 const suspended={...detail,status:'PAUSED'};
 assert.equal(miniChangedOffers([line],[fulfilled(suspended)])[0].available,false);
});
test('Provider maintenance answers are linked to the exact seller and published version',()=>{
 const care={...line,sellerKsNumber:'KS90003',offerId:OFFER_B,title:'Water pump maintenance · 12 months',
  kind:'SERVICE',quantity:1,priceMinor:600000,
  description:'Sample one-year service. Visits, start date and exclusions require agreement.'};
 const [request]=miniBasketProviderRequests([care]);
 assert.ok(request);
 const reply={...miniSampleProviderReply(request),buyerApproved:true};
 const buyer=[{sellerKsNumber:care.sellerKsNumber,offerId:care.offerId,offerUpdatedAt:DATE,
   question:'When should service begin?',proposedAnswer:'Next week'}];
 const terms=miniSampleAgreementTerms([care],buyer,[request],{[request.id]:reply});
 assert.equal(terms.length,3);
 assert.deepEqual(terms.map(x=>x.origin),['BUYER_PROPOSED','PROVIDER_SAMPLE_REVIEWED','PROVIDER_SAMPLE_REVIEWED']);
 assert.ok(terms.every(x=>x.offerUpdatedAt===DATE&&x.sellerKsNumber==='KS90003'));
 const packet=miniSellerScopedProposal([line,care],terms);
 assert.equal(packet.moneyReady,false);
 assert.equal(packet.sellers.length,2);
 assert.equal(packet.sellers.find(s=>s.sellerKsNumber==='KS90003').terms.length,3);
 assert.equal(packet.sellers.find(s=>s.sellerKsNumber==='KS90002').terms.length,0);
 const funded=makeSampleLivingPurchase({lines:[care],rail:'CHOICE_KS_ACCOUNT',
   delivery:'No delivery',terms,now:new Date('2026-11-17T12:00:00.000Z')});
 assert.ok(funded);
 assert.equal(funded.terms.length,3);
 assert.equal(validSamplePurchase(funded),true);
 assert.equal(makeSampleLivingPurchase({lines:[{...care,offerUpdatedAt:'2026-11-19T00:00:00.000Z'}],
   rail:'CHOICE_KS_ACCOUNT',delivery:'No delivery',terms}),null);
});
test('Delivery allocation does not accidentally include a Store that sells only a service',()=>{
 const care={...line,sellerKsNumber:'KS90003',offerId:OFFER_B,kind:'SERVICE',
    quantity:1,priceMinor:600000,title:'Pump maintenance'};
 const delivery=miniDeliveryContracts({choice:'ask_sellers',lines:[line,care],
    destination:'Varsityville, Ruiru',window:'next',deliveryQuoteSelected:true});
 assert.equal(delivery.length,1);
 assert.equal(delivery[0].providerKsNumber,'KS90002');
 const accepted=delivery.map(x=>({...x,customerApproved:true,providerAccepted:true}));
 const purchase=makeSampleLivingPurchase({lines:[line,care],rail:'MPESA_STK',
    delivery:'Varsityville, Ruiru',deliveryProvider:'SELLERS',
    deliveryFeeMinor:25000,deliveryContracts:accepted});
 assert.ok(purchase);
 assert.equal(purchase.amountMinor,2*3500000+600000+25000);
 assert.deepEqual(purchase.items.filter(x=>/Separate example delivery/.test(x.title))
   .map(x=>x.sellerKsNumber),['KS90002']);
 assert.equal(purchase.linkedDeliveryAgreements.length,1);
});
test('Phone UX: key actions show progress, never strand a shopper on hidden errors',()=>{
 const shop=read('src/mini/MiniStoreGallery.tsx');
 const buy=read('src/mini/MiniBuyStore.tsx');
 assert.match(buy,/Opening Store/); // supplied through the parent
 assert.match(shop,/role="status">\{busyText\}/);
 assert.match(shop,/role="alert"/);
 assert.match(shop,/onClick=\{onRetry\}/);
 assert.match(shop,/onAdd:\(offer:PublicOfferView,quantity:number\)=>boolean/);
 assert.match(shop,/Your basket is full or this quantity is already at its limit/);
 assert.match(buy,/window.scrollTo\(0,0\)/);
 assert.match(buy,/reviewAnchor.current\?\.scrollIntoView/);
 assert.match(buy,/changedOffers.map\(change=>/);
 assert.match(buy,/acceptUpdatedOffer\(change\)/);
 assert.match(buy,/Save for later/);
 assert.match(buy,/Keep browsing this Store/);
 assert.match(buy,/Other Stores/);
});
test('Agreed sample terms and a linked delivery remain visible but optional in My Agreements',()=>{
 const view=read('src/mini/MiniSampleAgreements.tsx');
 assert.match(view,/spm-shop-linked-deliveries/);
 assert.match(view,/View delivery Agreement/);
 assert.match(view,/spm-shop-agreed-terms/);
 assert.match(view,/Store offer version/);
 assert.match(view,/providers.map\(group=>/);
 const buy=read('src/mini/MiniBuyStore.tsx');
 assert.match(buy,/miniSampleAgreementTerms\(cart/);
 assert.match(buy,/miniSellerScopedProposal\(cart,preparedTerms,deliveryContracts\)/);
});

test('A personal buyer remains personal; Sell opens a native owner-only offer preview',()=>{
 const experience=read('src/mini/MiniExperience.tsx');
 assert.match(experience,/useState<MiniPreviewCapacity>\('personal'\)/);
 assert.match(experience,/if \(playground\) \{\s+setError\(''\);setScreen\('sell-preview'\)/);
 assert.match(experience,/getMiniFirstPartyOrigin\(\)/);
 assert.match(experience,/MiniSellSomething/);
});
