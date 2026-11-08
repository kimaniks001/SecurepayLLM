import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  collectOffer,updateSelectedQuantity,updateSelectedBuyerNote,removeSelected,
  collectionTotals,groupSelectionBySeller,selectionToKs001,itemFromOffer,
} from '../src/features/store/shopSelection.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const home=read('src/components/StoreHome.tsx');
const profile=read('src/components/StoreProfileView.tsx');
const preview=read('src/components/OfferQuickPreview.tsx');
const detail=read('src/components/OfferDetail.tsx');
const real=read('src/features/store/StoreExperience.tsx');
const example=read('src/features/store/StoreMasterpieceLayoutReview.tsx');
const data=read('src/storeData.ts');
const view=read('src/features/store/view.ts');
const check=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const product={
 id:'item-123',storeId:'KS-PRODUCT',storeName:'Example Goods Trader',title:'Everyday item',
 offerType:'product',priceType:'fixed',price:'KES 5,000',currency:'KES',lifecycle:'published',
 description:'An ordinary item',scope:{included:[],excluded:[]},timing:'',
};
const service={
 id:'service-456',storeId:'KS-SERVICE',storeName:'Example Service Trader',title:'House painting',
 offerType:'service',priceType:'fixed',price:'KES 75,000',currency:'KES',lifecycle:'published',
 description:'Paint walls and ceilings',scope:{included:['Surface preparation','Two coats'],excluded:['Paint materials','Repair cracks']},
 timing:'4 days after site inspection',
};

test('one collection groups unrelated goods and a complex service from TWO real seller references',()=>{
 let basket=collectOffer([],product,'agreement');
 basket=collectOffer(basket,service,'agreement');
 basket=updateSelectedBuyerNote(basket,basket[0].key,'Size EU42; black; collect from trader');
 basket=updateSelectedBuyerNote(basket,basket[1].key,'Site in Ruiru; prefer Thursday');
 assert.equal(basket.length,2);
 assert.equal(groupSelectionBySeller(basket).length,2);
 assert.equal(collectionTotals(basket).byDestination.agreement.subtotal.KES,8000000);
 assert.equal(basket[0].buyerNote,'Size EU42; black; collect from trader');
 assert.equal(basket[1].buyerNote,'Site in Ruiru; prefer Thursday');
 assert.deepEqual(basket[1].included,['Surface preparation','Two coats']);
 assert.deepEqual(basket[1].excluded,['Paint materials','Repair cracks']);
 basket=updateSelectedQuantity(basket,basket[0].key,2);
 assert.equal(collectionTotals(basket).byDestination.agreement.subtotal.KES,8500000);
 assert.equal(basket[0].unitMinor,500000,'seller-listed item price remains immutable');
 basket=removeSelected(basket,basket[0].key);
 assert.equal(collectionTotals(basket).byDestination.agreement.subtotal.KES,7500000);
});

test('KS001 sees ALL sellers, goods details, service scope, requirements and one next question',()=>{
 const goods=updateSelectedBuyerNote(collectOffer([],product,'agreement'),'KS-PRODUCT::item-123::agreement','Size EU42');
 const basket=updateSelectedBuyerNote(collectOffer(goods,service,'agreement'),'KS-SERVICE::service-456::agreement','Ruiru home; Thursday');
 const prompt=selectionToKs001(basket,'agreement');
 assert.match(prompt,/Trader 1:.*Example Goods Trader/);
 assert.match(prompt,/Trader 2:.*Example Service Trader/);
 assert.match(prompt,/KS-PRODUCT/);
 assert.match(prompt,/KS-SERVICE/);
 assert.match(prompt,/quantity 1/);
 assert.match(prompt,/Size EU42/);
 assert.match(prompt,/Ruiru home; Thursday/);
 assert.match(prompt,/Listed inclusions: Surface preparation; Two coats/);
 assert.match(prompt,/Listed exclusions: Paint materials; Repair cracks/);
 assert.match(prompt,/4 days after site inspection/);
 assert.match(prompt,/ONE next question/);
 assert.match(prompt,/separate sellers may require separate consent and agreements/);
 assert.doesNotMatch(prompt,/one payment|all suppliers accepted|combined contract signed/i);
});

test('external supplier listing can inspire Vision but cannot impersonate actual seller in an Agreement',()=>{
 const external={...service,id:'external',isExternalReference:true,storeName:'Distributor only',externalSellerName:'Unverified supplier'};
 assert.throws(()=>itemFromOffer(external,'agreement'),/external seller/);
 assert.equal(itemFromOffer(external,'vision').destination,'vision');
});

test('seller-listed unit price and scope remain locked even when quantity and request are edited',()=>{
 const original=collectOffer([],service,'agreement');
 const key=original[0].key;
 const changed=updateSelectedBuyerNote(updateSelectedQuantity(original,key,3),key,'Please also inspect the ceiling');
 assert.equal(changed[0].unitMinor,7500000);
 assert.equal(changed[0].priceLabel,'KES 75,000');
 assert.deepEqual(changed[0].included,original[0].included);
 assert.equal(collectionTotals(changed).byDestination.agreement.subtotal.KES,22500000);
 assert.equal(original[0].quantity,1);
});

test('same quick-add component now appears on catalogue AND merchant Store, without a second cart',()=>{
 assert.match(home,/ShopOfferCard/);
 assert.match(profile,/data-shop-profile-collect/);
 assert.match(profile,/ShopOfferCard/);
 assert.match(profile,/onCollect=\{onCollect\}/);
 assert.match(profile,/onQuickKs001=\{onQuickKs001\}/);
 assert.match(profile,/selection\.find/);
 assert.doesNotMatch(profile,/ResultCard/);
 assert.match(real,/onCollect=\{collect\} onQuickKs001=\{offer=>\{void quickAsk\(offer\);\}\} selection=\{selection\}/);
 assert.match(real,/data-store-cross-shop-continuity/);
 assert.match(real,/const basketPane=<StoreCollectionPanel/);
 assert.match(real,/selectionPanel=\{shoppingWide \|\| !embedded \? basketPane : undefined\}/);
});

test('explicit full item detail and quick preview allow add-to-collection without leaving it',()=>{
 assert.match(preview,/onCollect\?: \(offer:StoreOffer,destination:StoreDestination\)=>void/);
 assert.match(preview,/Add to shopping collection/);
 assert.match(detail,/onCollect\?: \(offer:StoreOffer,destination:StoreDestination\)=>void/);
 assert.match(detail,/Add to shopping collection/);
 assert.match(real,/onCollect=\{collect\}/);
});

test('a full offer returns to its origin shop, not always to the home shelf',()=>{
 assert.match(real,/const offerOriginRef=useRef<'shelf'\|'seller'>\('shelf'\)/);
 assert.match(real,/offerOriginRef\.current='seller';setShowFullOffer\(false\)/);
 assert.match(real,/offerOriginRef\.current='shelf';setShowFullOffer\(false\)/);
 assert.match(real,/offerOriginRef\.current==='seller' \? controller\.backToStore\(\) : controller\.backToHome\(\)/);
});

test('example shop, full item and live individual shops keep SAME basket and assistant access',()=>{
 assert.match(example,/data-store-store-basket-continuity/);
 assert.match(example,/data-store-offer-basket-continuity/);
 assert.match(example,/onCollect=\{collect\}/);
 assert.match(example,/onQuickKs001=\{quickAsk\}/);
 assert.match(example,/const basketPane=<StoreCollectionPanel/);
 assert.match(example,/const question=storeOfferAssistTurn\(offer\)/);
 assert.match(example,/onOpenKs001Preview\?\.\(question\)/);
 assert.match(real,/const question=storeOfferAssistTurn\(offer\)/);
 assert.doesNotMatch(real.slice(real.indexOf('const quickAsk='),real.indexOf('const stageCollection=')),/collectOffer\(/);
});

test('example content stays generic: a shoe is not a new Store, real provider or required domain category',()=>{
 assert.doesNotMatch(data,/store-ruiru-shoes|offer-shoes|Ruiru Steps Footwear/);
 assert.match(data,/iPhone 15 Pro 256GB/);
 assert.match(data,/3-Bedroom Interior Painting/);
 assert.match(data,/Nairobi Painters Co/);
 assert.match(data,/Tech Store/);
});

test('public Store text search is backed by server title/description OR match, with honest browse limits',()=>{
 assert.match(view,/category filter ACTUALLY/);
 assert.match(view,/title OR description using ILIKE/);
 assert.match(view,/10 published offers per kind/);
 assert.match(check,/workspaceSelection=\{storeSelected\}/);
});

test('no silent agreement, multi-seller settlement or payment is triggered by selecting items',()=>{
 assert.doesNotMatch(real,/onCollect\s*=\s*\{.*?(executePayment|confirmMoney|commitAgreement)/s);
 const basket=collectOffer([],service,'agreement');
 assert.match(selectionToKs001(basket,'agreement'),/no booking, agreement, payment or funding is authorised/);
});
