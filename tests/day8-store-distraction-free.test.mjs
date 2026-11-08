import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const card=read('src/components/ShopOfferCard.tsx');
const home=read('src/components/StoreHome.tsx');
const live=read('src/features/store/StoreExperience.tsx');
const review=read('src/features/store/StoreMasterpieceLayoutReview.tsx');

test('KS001 remains mounted independently while the left Store tool is being used',()=>{
 assert.match(shell,/data-store-ks001-original-conversation/);
 assert.match(shell,/<LiveKs001Session controller=\{liveController!\}/);
 assert.match(shell,/data-store-expanded-middle/);
 assert.match(shell,/const expandCompactStore=/);
 assert.match(shell,/setStoreOpen\(true\)/);
 assert.match(shell,/Back to KS001/);
 assert.doesNotMatch(shell,/new AgentController\(/);
});
test('Store tool, middle display and right SecurePay Check retain their original three-panel owners',()=>{
 assert.match(shell,/<CompactStoreBrowser/);
 assert.match(shell,/data-workspace-shell/);
 assert.match(shell,/data-tool-shelf/);
 assert.match(shell,/data-store-expanded-middle/);
 assert.match(shell,/data-store-selection-parent-summary/);
 assert.match(shell,/Seller-listed · locked/);
 assert.match(shell,/onSelectionChange=\{setStoreSelected\}/);
});
test('KS001 item/cart handoff returns to existing conversation and does not silently send',()=>{
 assert.match(shell,/const discussCompactStoreOffer=async/);
 assert.match(shell,/const discussCompactStoreCart=async/);
 assert.match(shell,/await prepareEmbeddedStoreQuestion\(message\)/);
 assert.match(shell,/writeDraft\(id,text\)/);
 assert.match(shell,/if\(!remainInShop\)closeEmbeddedStore\('chat'\)/);
 assert.match(live,/onStageSelections/);
});
test('hover peek is small and stays inside the IMAGE without covering title, price or description',()=>{
 assert.match(card,/group\/visual relative overflow-hidden rounded-t-2xl/);
 assert.match(card,/data-shop-hover-preview/);
 assert.match(card,/absolute inset-x-2 bottom-2/);
 assert.match(card,/sm:group-hover\/visual:block/);
 assert.match(card,/sm:group-focus-within\/visual:block/);
 const image=card.indexOf('<ShopOfferCover offer={offer}/>');
 const peek=card.indexOf('data-shop-hover-preview');
 const title=card.indexOf("aria-label={'Open full details for '+offer.title}");
 assert.ok(image>=0 && peek>image && title>peek);
 assert.doesNotMatch(card,/absolute inset-x-2 bottom-2 z-20 rounded-xl border border-forest-200 bg-white\/98/);
 assert.match(card,/onClick=\{\(\)=>add\('vision'\)\}/);
 assert.match(card,/onClick=\{\(\)=>add\('agreement'\)\}/);
 assert.match(card,/onQuickKs001\?\.\(offer\)/);
});

test('only one manually opened quick peek is allowed, even after repeated taps or search',()=>{
 assert.match(home,/const \[quickOfferId,setQuickOfferId\]=useState<string\|null>\(null\)/);
 assert.match(home,/quickOpen=\{quickOfferId===offer.id\}/);
 assert.match(home,/setQuickOfferId\(current=>current===offer.id\?null:offer.id\)/);
 assert.match(home,/onCloseQuick=\{\(\)=>setQuickOfferId\(null\)\}/);
 assert.match(home,/onChange=\{event => \{setQuickOfferId\(null\);onQueryChange/);
 assert.match(card,/aria-expanded=\{quickOpen\}/);
});

test('owner preview uses the original composer with clearly labelled example Store sources',()=>{
 const tool=read('src/features/living-workspace/CompactStoreBrowser.tsx');
 assert.match(tool,/Example catalogue only/);
 assert.match(shell,/<PreviewWorkComposer/);
 assert.match(shell,/onOpenKs001Preview=\{message=>/);
 assert.match(review,/onOpenKs001Preview\?\.\(question\)/);
 assert.match(review,/onSelectionChange\?\.\(next\)/);
 assert.match(shell,/onSelectionChange=\{setStoreSelected\}/);
 assert.doesNotMatch(shell,/autoSendStoreAssistant/);
});