import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectOffer,collectionTotals,selectionToKs001} from '../src/features/store/shopSelection.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const layout=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const tool=read('src/features/living-workspace/CompactStoreBrowser.tsx');
const vision=read('src/features/living-workspace/StoreVisionSavePanel.tsx');
const real=read('src/features/store/StoreExperience.tsx');
const demo=read('src/features/store/StoreMasterpieceLayoutReview.tsx');
const cockpit=read('src/features/living-workspace/StoreCartCockpit.tsx');
const good={id:'a',storeId:'KS001A',storeName:'Store A',title:'Ordinary item',offerType:'product',priceType:'fixed',price:'KES 2,000',currency:'KES',lifecycle:'published',description:'ordinary product'};
const service={id:'b',storeId:'KS001B',storeName:'Store B',title:'Work service',offerType:'service',priceType:'fixed',price:'KES 5,000',currency:'KES',lifecycle:'published',description:'service'};
test('opening the Stores TOOL only selects a left tool; explicit View opens the middle',()=>{
 const open=layout.slice(layout.indexOf('function openTool('),layout.indexOf('function startPhase4Journey('));
 assert.match(open,/setActiveTool\(name\); setToolSelected\(true\); setToolsOpen\(true\)/);
 assert.doesNotMatch(open,/setStoreOpen\(true\)/);
 assert.match(layout,/<CompactStoreBrowser/);
 assert.match(tool,/data-compact-store-browser/);
 assert.match(layout,/onExpand=\{expandCompactStore\}/);
 assert.match(layout,/const expandCompactStore=/);
 assert.match(layout,/setStoreNavigation\(\{\.\.\.target,requestId:storeNavigationSequence.current\}\)/);
 assert.match(layout,/setStoreOpen\(true\)/);
});
test('KS001 middle is preserved, expanded Store is NOT fixed modal overlay',()=>{
 assert.match(layout,/data-store-ks001-original-conversation/);
 assert.match(layout,/data-store-expanded-middle/);
 assert.match(layout,/className=\{\`\$\{storeOpen\?'hidden'/);
 const store=layout.slice(layout.indexOf('data-masterpiece-digital-store'),layout.indexOf('data-store-expanded-middle'));
 assert.match(store,/sp-brand-conversation/);
 assert.doesNotMatch(store,/fixed inset-0|z-\[75\]|shadow-2xl/);
 assert.match(layout,/Back to KS001/);
 assert.match(layout,/<StoreCartCockpit/);
 assert.match(cockpit,/data-store-selection-parent-summary/);
});
test('mini Store exposes independent browsing, search, Store switching, cart, item view and KS001',()=>{
 for(const pattern of [/role="search"/,/onPhotoSearch/,/aria-label="Stores with published offers"/,/data-compact-store-selected/,/onExpand\(\{kind:'store'/,/view\('item',offer\)/,/onAddCart\(offer\)/,/onSaveVision\(offer\)/,/onDiscuss\(offer\)/,/onDiscussCart\(\)/,/data-compact-store-cart/])
   assert.match(tool,pattern);
 assert.match(tool,/category:browser.submitted.trim\(\)\|\|undefined/);
 assert.match(tool,/title OR description/);
 assert.match(tool,/sortAreaFirst/);
 assert.doesNotMatch(tool,/controller\.send\(/);
});
test('compact Store item and cart handoff PREPARES existing KS001 input, never auto sends',()=>{
 assert.match(layout,/const discussCompactStoreOffer=async/);
 assert.match(layout,/storeOfferAssistTurn\(offer\)/);
 assert.match(layout,/const discussCompactStoreCart=async/);
 assert.match(layout,/selectionToKs001\(storeSelected,'agreement'\)/);
 assert.match(layout,/await prepareEmbeddedStoreQuestion\(message\)/);
 assert.match(layout,/writeDraft\(id,text\)/);
 assert.doesNotMatch(tool,/beginNewWork|window\.location\.hash|onUseOffer/);
});
test('one shared parent cart sums cross-trader items without changing listed prices',()=>{
 let chosen=collectOffer([],good,'agreement',true);
 chosen=collectOffer(chosen,service,'agreement',true);
 assert.equal(chosen.length,2);
 assert.equal(new Set(chosen.map(x=>x.sellerKsNumber)).size,2);
 assert.equal(collectionTotals(chosen).byDestination.agreement.subtotal.KES,700000);
 assert.match(selectionToKs001(chosen,'agreement'),/Store B/);
 assert.match(layout,/collectOffer\(storeSelected,offer,'agreement',uiOnlyPreview\|\|!signedIn\)/);
});
test('real expanded Store and example catalogue accept deliberate external navigation',()=>{
 assert.match(real,/externalNavigation\?: StoreBrowserTarget\|null/);
 assert.match(real,/controller.openStore\(externalNavigation.storeKs\)/);
 assert.match(real,/controller.openOffer\(externalNavigation.storeKs,externalNavigation.offerId\)/);
 assert.match(demo,/externalNavigation\?:StoreBrowserTarget\|null/);
 assert.match(demo,/setStoreId\(externalNavigation.storeKs\)/);
 assert.match(demo,/setOfferId\(externalNavigation.offerId\)/);
});
test('Vision picker uses existing authoritative Dream board with expected revision and no checkout',()=>{
 assert.match(vision,/api\.dreams\.mine\(\)/);
 assert.match(vision,/createVisionDreamController/);
 assert.match(vision,/api\.dreams\.get\(dreamId\)/);
 assert.match(vision,/api\.dreams\.board\(dreamId\)/);
 assert.match(vision,/api\.dreams\.saveBoard\(dreamId/);
 assert.match(vision,/expectedRevision:board.revision/);
 assert.match(vision,/Source Store reference:/);
 assert.match(vision,/Source offer reference:/);
 assert.match(vision,/Already saved in this Vision/);
 assert.doesNotMatch(vision,/executePayment|confirmAgreement|acceptAgreement/);
});
test('owner review is explicitly mock-only; real supplier identity and payment claims stay guarded',()=>{
 assert.match(tool,/Example catalogue only/);
 assert.match(vision,/Preview only/);
 assert.match(tool,/No unverified distance claims/);
 assert.match(layout,/onPhotoSearch=\{\(\)=>openTool\('Photos'\)\}/);
 assert.match(layout,/onPreviewSaved=/);
 assert.match(layout,/onSelectionChange=\{setStoreSelected\}/);
});

test('expanded Store cards expose direct Add to Cart and Ask KS001, using the same parent selection',()=>{
 const cards=read('src/components/ShopOfferCard.tsx');
 const quick=read('src/components/OfferQuickPreview.tsx');
 const detail=read('src/components/OfferDetail.tsx');
 assert.match(cards,/data-store-item-primary-actions/);
 assert.match(cards,/Add to Cart/);
 assert.match(cards,/Ask KS001/);
 assert.match(cards,/onCollect\?\.\(offer,destination\)/);
 assert.match(cards,/onQuickKs001\?\.\(offer\)/);
 assert.match(quick,/Add to Cart/);
 assert.match(quick,/aria-label=\{'Add '\+offer.title\+' to KS Cart'\}/);
 assert.match(detail,/Add to Cart/);
 assert.match(detail,/aria-label=\{'Add '\+offer.title\+' to KS Cart'\}/);
 assert.match(real,/onSelectionChange\?\.\(next\)/);
 assert.match(real,/onStageSelections\)await onStageSelections\(question,'agreement'\)/);
 assert.match(demo,/onOpenKs001Preview\?\.\(question,\{kind:'offer'/);
 assert.match(layout,/workspaceSelection=\{storeSelected\}/);
 assert.match(layout,/onSelectionChange=\{setStoreSelected\}/);
});

test('glance summary owns the work context, while sensitive explanation is optional',()=>{
 assert.match(layout,/const shoppingContext = mode==='work'/);
 assert.match(layout,/uiOnlyPreview && !shoppingContext \? <PreviewWorkBoard/);
 assert.match(layout,/<StoreCartCockpit selections=\{storeSelected\}/);
 assert.match(layout,/onDiscussCart=\{discussCompactStoreCart\}/);
 assert.match(layout,/onSelectionChange=\{setStoreSelected\}/);
 assert.match(layout,/onViewItem=\{\(storeKs,offerId\)=>expandCompactStore/);
 assert.match(cockpit,/data-store-cart-cockpit/);
 assert.match(cockpit,/data-store-cart-rows/);
 assert.match(cockpit,/data-store-cart-totals/);
 assert.match(cockpit,/data-store-cart-explanation/);
 assert.match(cockpit,/<details className="mt-2 border-t/);
 assert.match(cockpit,/Discuss Cart with KS001/);
 assert.match(cockpit,/No agreement yet/);
 assert.doesNotMatch(cockpit,/executePayment|confirmAgreement|acceptAgreement/);
});

test('multi-currency and unpriced Store selections never pretend to be one grand total',()=>{
 const foreign={...good,id:'usd',storeId:'KS-USD',storeName:'Foreign seller',price:'USD 12.50',currency:'USD'};
 const unknown={...good,id:'unknown',storeId:'KS-UNKNOWN',storeName:'Unknown price seller',priceType:'unlisted',price:'Ask seller'};
 let chosen=collectOffer([],good,'agreement',true);
 chosen=collectOffer(chosen,foreign,'agreement',true);
 chosen=collectOffer(chosen,unknown,'agreement',true);
 const totals=collectionTotals(chosen).byDestination.agreement;
 assert.equal(totals.subtotal.KES,200000);
 assert.equal(totals.subtotal.USD,1250);
 assert.equal(totals.unpriced,1);
 assert.match(cockpit,/Object.entries\(totals.byDestination.agreement.subtotal\)/);
 assert.match(cockpit,/listed.length === 1 && unpriced === 0/);
 assert.match(cockpit,/listed.map\(\(\[currency,minor\]\)=>/);
 assert.match(cockpit,/Price to confirm/);
 assert.match(cockpit,/onSelectionChange\(fn\)/);
});

test('buttons are lightweight and shopping operations are reachable without hover',()=>{
 const card=read('src/components/ShopOfferCard.tsx');
 const tool=read('src/features/living-workspace/CompactStoreBrowser.tsx');
 assert.match(card,/data-store-item-primary-actions/);
 assert.match(card,/cartQuantity\?'Add another':'Add to Cart'/);
 assert.match(card,/In Cart ·/);
 assert.match(card,/Ask KS001/);
 assert.match(card,/quickEnabled && quickOpen/);
 assert.doesNotMatch(card,/group-hover\/visual:block/);
 assert.match(tool,/data-compact-store-actions/);
 assert.match(tool,/In Cart · \{inCart.quantity\}/);
 assert.match(tool,/onAddCart\(offer\)/);
 assert.match(tool,/onDiscuss\(offer\)/);
});

test('live KS001 progress is concise in Store context but full review and errors remain accessible',()=>{
 const progress=read('src/features/living-workspace/LiveWorkResultPanel.tsx');
 assert.match(layout,/compactInStore=\{shoppingContext\}/);
 assert.match(progress,/data-store-live-work-compact/);
 assert.match(progress,/!formation\?\.reviewable/);
 assert.match(progress,/state\?\.status!=='error'/);
 assert.match(progress,/View work details/);
 assert.match(progress,/onClick=\{\(\)=>setExpanded\(true\)\}/);
 assert.match(progress,/data-live-formation/);
 assert.match(layout,/data-store-agreements-progress/);
});

test('a Store-origin request shows a glance summary, not the same chat sentence again',()=>{
 const board=read('src/features/living-workspace/PreviewWorkNotes.tsx');
 const demo=read('src/features/store/StoreMasterpieceLayoutReview.tsx');
 const parent=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
 assert.match(board,/data-preview-store-glance-summary/);
 assert.match(board,/notes.every\(note=>note.origin==='store'\)/);
 assert.match(board,/currentStore\.title/);
 assert.match(board,/currentStore\.storeName/);
 assert.match(board,/Prepared for KS001 · Not examined/);
 assert.match(board,/No agreement or order yet/);
 assert.match(board,/Continue in conversation/);
 assert.match(board,/data-preview-store-requests/);
 assert.match(board,/note.origin==='store'/);
 assert.match(board,/note.storeContext\?\.kind==='offer'/);
 assert.match(parent,/addPreviewNote\(message,'store',storeContext\)/);
 assert.match(demo,/kind:'offer',title:offer.title,storeName:offer.storeName,listedPrice:offer.price/);
 assert.match(demo,/kind:'cart',itemCount:items.reduce/);
 assert.doesNotMatch(board.slice(board.indexOf('if(storeOnly)return'),board.indexOf('return <section aria-label="SecurePay Check"',board.indexOf('if(storeOnly)return'))),/\{note.text\}|\{shown.value\}/);
});
