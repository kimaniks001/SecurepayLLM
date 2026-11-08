import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  listedMinorPrice, itemFromOffer, collectOffer, collectionTotals,
  updateSelectedQuantity, removeSelected, selectionToKs001, formatListedMoney,
  MAX_DISTINCT_ITEMS, MAX_QUANTITY,
} from '../src/features/store/shopSelection.mjs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const card=source('src/components/ShopOfferCard.tsx');
const home=source('src/components/StoreHome.tsx');
const tray=source('src/components/StoreCollectionPanel.tsx');
const live=source('src/features/store/StoreExperience.tsx');
const demo=source('src/features/store/StoreMasterpieceLayoutReview.tsx');
const parent=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const cockpit=source('src/features/living-workspace/StoreCartCockpit.tsx');

const offer=(overrides={})=>({
 id:'offer-painting',storeId:'KS001',storeName:'Mary’s Paint Shop',
 title:'Paint a two-room house',description:'Paint walls and ceilings',
 offerType:'service',priceType:'fixed',price:'KES 75,000',currency:'KES',priceUnit:'per job',
 lifecycle:'published',...overrides,
});

test('fixed KES amounts are converted to exact minor units, never vague service quotes',()=>{
 assert.equal(listedMinorPrice(offer()),7500000);
 assert.equal(listedMinorPrice(offer({price:'KSh 500.50'})),50050);
 assert.equal(formatListedMoney(7500000,'KES'),'KSh 75,000');
 assert.equal(listedMinorPrice(offer({priceType:'from',price:'From KES 75,000'})),null);
 assert.equal(listedMinorPrice(offer({priceType:'unit_price'})),null);
 assert.equal(listedMinorPrice(offer({price:'a very attractive 75,000'})),null);
 assert.equal(listedMinorPrice(offer({price:'KES 1,2,3'})),null);
});

test('hover or tap collecting increments quantity without navigation or duplication',()=>{
 let items=collectOffer([],offer(),'agreement');
 assert.equal(items.length,1);
 items=collectOffer(items,offer(),'agreement');
 assert.equal(items.length,1);
 assert.equal(items[0].quantity,2);
 assert.equal(items[0].unitMinor,7500000);
 assert.equal(items[0].sellerKsNumber,'KS001');
 items=updateSelectedQuantity(items,items[0].key,4);
 assert.equal(items[0].quantity,4);
 assert.throws(()=>updateSelectedQuantity(items,items[0].key,0));
 assert.throws(()=>updateSelectedQuantity(items,items[0].key,100));
 assert.equal(removeSelected(items,items[0].key).length,0);
 assert.equal(MAX_QUANTITY,99);
});

test('Vision and Agreement have separate lists and cannot double-count one checkout total',()=>{
 let items=collectOffer([],offer(),'vision');
 items=collectOffer(items,offer(),'agreement');
 const t=collectionTotals(items);
 assert.equal(t.destinations.vision.length,1);
 assert.equal(t.destinations.agreement.length,1);
 assert.equal(t.byDestination.vision.subtotal.KES,7500000);
 assert.equal(t.byDestination.agreement.subtotal.KES,7500000);
 assert.equal(t.itemCount,2);
 assert.equal(t.quantityCount,2);
 assert.equal(t.subtotal,undefined);
});

test('unknown or differing currencies cannot silently inflate a KSh total',()=>{
 let items=collectOffer([],offer(),'agreement');
 items=collectOffer(items,offer({id:'usd',price:'USD 100.25',currency:'USD'}),'agreement');
 items=collectOffer(items,offer({id:'quote',priceType:'quote_required',price:'Site inspection required'}),'agreement');
 const t=collectionTotals(items);
 assert.equal(t.byDestination.agreement.subtotal.KES,7500000);
 assert.equal(t.byDestination.agreement.subtotal.USD,10025);
 assert.equal(t.byDestination.agreement.unpriced,1);
 assert.equal(t.byDestination.vision.subtotal.KES,undefined);
});

test('an unpublished offer cannot be staged for Agreement, even when it inspires a Vision',()=>{
 assert.throws(()=>itemFromOffer(offer({lifecycle:'unavailable'}),'agreement'));
 assert.equal(itemFromOffer(offer({lifecycle:'unavailable'}),'vision').destination,'vision');
 assert.throws(()=>itemFromOffer(offer(),'checkout'));
 assert.throws(()=>itemFromOffer({id:'missing'},'vision'));
});

test('selection-to-KS001 is a brief human request; source references stay in the cart',()=>{
 const items=collectOffer([],offer(),'agreement');
 const prompt=selectionToKs001(items,'agreement');
 assert.match(prompt,/Mary’s Paint Shop/);
 assert.match(prompt,/1 ×/);
 assert.match(prompt,/KES 75,000 listed/);
 assert.match(prompt,/Can we work out what I need\?/);
 assert.doesNotMatch(prompt,/offer-painting|Reverify every offer|ONE next question|Store reference|no booking/i);
 assert.ok(prompt.length<350);
 assert.equal(items[0].offerId,'offer-painting');
 assert.equal(items[0].sellerKsNumber,'KS001');
 assert.match(selectionToKs001(collectOffer([],offer(),'vision'),'vision'),/for my Vision/);
 assert.throws(()=>selectionToKs001([],'agreement'));
 assert.equal(MAX_DISTINCT_ITEMS,12);
});

test('the product card reveals a non-obscuring extra-details area on deliberate tap',()=>{
 assert.match(card,/data-shop-hover-preview/);
 assert.match(card,/quickEnabled && quickOpen/);
 assert.doesNotMatch(card,/group-hover\/visual:block/);
 assert.match(card,/data-store-item-primary-actions/);
 assert.match(card,/aria-expanded=\{quickOpen\}/);
 assert.match(card,/onQuickKs001\?\.\(offer\)/);
 assert.match(card,/Open full details for/);
 assert.match(card,/View larger image of/);
 assert.match(card,/onCollect\?\.\(offer,destination\)/);
 assert.doesNotMatch(card,/window\.location/);
});

test('shop remains visible while both real and example modes update the right-hand running summary',()=>{
 assert.match(home,/data-store-selection-right/);
 assert.match(home,/selectionPanel/);
 assert.match(home,/onQuickKs001=\{onQuickKs001\}/);
 assert.match(home,/onCollect=\{onCollect\}/);
 assert.match(tray,/data-store-selection-summary/);
 assert.match(tray,/onQuantity\(item\.key,item\.quantity\+1\)/);
 assert.match(tray,/onRemove\(item\.key\)/);
 assert.match(tray,/Vision ideas/);
 assert.match(tray,/Agreement candidates/);
 assert.match(live,/const \[selection,setSelection\]/);
 assert.match(live,/selectionRef\.current/);
 assert.match(live,/onStageSelections\?/);
 assert.match(demo,/onCollect=\{collect\}/);
 assert.match(demo,/onQuickKs001=\{quickAsk\}/);
 assert.match(demo,/draftPreview=\{selectionDraft\}/);
});

test('the original SecurePay Check right panel retains a selection summary after leaving the full shop',()=>{
 assert.match(parent,/<StoreCartCockpit/);
 assert.match(cockpit,/data-store-selection-parent-summary/);
 assert.match(parent,/onSelectionChange=\{setStoreSelected\}/);
 assert.match(cockpit,/collectionTotals\(selections\)/);
 assert.match(cockpit,/formatListedMoney\(minor,currency\)/);
 assert.match(parent,/if\(previousStoreOwnerSignedIn\.current && !signedIn\)setStoreSelected\(\[\]\)/);
 assert.match(cockpit,/not a provider quote, saved Vision Dream, binding Agreement or payment/);
});

test('compact workspace uses original SecurePay Check on right instead of duplicating a basket under the shelf',()=>{
 assert.match(demo,/selectionPanel=\{shopFocused \?/);
 assert.match(live,/selectionPanel=\{shoppingWide \|\| !embedded \?/);
 assert.match(live,/shoppingWide=\{shoppingWide \|\| !embedded\}/);
 assert.match(parent,/onViewItem=\{\(storeKs,offerId\)=>expandCompactStore/);
 assert.match(cockpit,/onSelectionChange: \(update:/);
});

test('real KS001 and Vision stage only unsent drafts with consent, never auto accept or lose existing text',()=>{
 assert.match(parent,/const stageStoreVision=async/);
 assert.match(parent,/visionNorth\.setDraft\(text\)/);
 assert.match(parent,/visionNorth\.draft\.trim\(\)/);
 assert.match(parent,/const prepareEmbeddedStoreQuestion=async\(text:string,remainInShop=false\)/);
 assert.match(parent,/if\(!remainInShop\)closeEmbeddedStore\('chat'\)/);
 assert.match(parent,/readDraft\(current\.conversationId\?\?undefined\)\.trim\(\)/);
 assert.match(parent,/onStageSelections=\{async \(text,destination\)=>/);
 assert.match(live,/onStageSelections\(question,'agreement'\)/);
});
