import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectOffer,collectionTotals,updateSelectedQuantity,removeSelected} from '../src/features/store/shopSelection.mjs';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const workspace=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const review=read('src/features/store/StoreMasterpieceLayoutReview.tsx');
const real=read('src/features/store/StoreExperience.tsx');
const chat=read('src/features/living-workspace/StoreKs001GuidedPreview.tsx');
const cockpit=read('src/features/living-workspace/StoreCartCockpit.tsx');

const offer={id:'cctv-4',storeId:'KS002',storeName:'Community Security',title:'Four CCTV cameras',
  offerType:'package',priceType:'fixed',price:'KES 85,000',currency:'KES',priceUnit:'set',lifecycle:'published'};

test('one select, quantity edits and deletion in SecurePay Check recalculate the correct subtotal',()=>{
  let items=collectOffer([],offer,'agreement');
  assert.equal(collectionTotals(items).byDestination.agreement.subtotal.KES,8500000);
  items=updateSelectedQuantity(items,items[0].key,4);
  assert.equal(items[0].unitMinor,8500000);
  assert.equal(items[0].priceLabel,'KES 85,000');
  assert.equal(collectionTotals(items).byDestination.agreement.subtotal.KES,34000000);
  items=removeSelected(items,items[0].key);
  assert.equal(collectionTotals(items).quantityCount,0);
  assert.equal(Object.keys(collectionTotals(items).byDestination.agreement.subtotal).length,0);
});

test('right-hand panel contains a quantity stepper and remove control, but no editable seller price',()=>{
  assert.match(workspace,/<StoreCartCockpit/);
  assert.match(cockpit,/data-store-selection-parent-summary/);
  assert.match(cockpit,/data-store-summary-edit-row/);
  assert.match(cockpit,/updateSelectedQuantity\(current, entry.key, entry.quantity - 1\)/);
  assert.match(cockpit,/updateSelectedQuantity\(current, entry.key, entry.quantity \+ 1\)/);
  assert.match(cockpit,/removeSelected\(current, entry.key\)/);
  assert.match(cockpit,/Seller-listed · locked/);
  assert.match(cockpit,/formatListedMoney\(minor,currency\)/);
  assert.doesNotMatch(cockpit,/setEntryPrice|onPriceChange|updateSelectedPrice/);
  assert.match(workspace,/workspaceSelection=\{storeSelected\}/);
});

test('right-panel changes are reflected back in the same live and example Store selection',()=>{
  assert.match(real,/workspaceSelection\?: SelectionItem\[\]/);
  assert.match(real,/if\(workspaceSelection && workspaceSelection!==selectionRef.current\)/);
  assert.match(real,/selectionRef.current=workspaceSelection;setSelection\(workspaceSelection\)/);
  assert.match(review,/workspaceSelection\?:SelectionItem\[\]/);
  assert.match(review,/selectionRef.current=workspaceSelection;setSelection\(workspaceSelection\)/);
  assert.match(workspace,/onSelectionChange=\{setStoreSelected\}/);
});

test('an item can be explicitly brought into the ORIGINAL KS001 composer without opening a drawer',()=>{
 assert.match(review,/onOpenKs001Preview\?\.\(question\)/);
 assert.match(workspace,/onOpenKs001Preview=\{message=>/);
 assert.match(workspace,/addPreviewNote\(message\)/);
 assert.match(workspace,/closeEmbeddedStore\('chat'\)/);
 assert.match(workspace,/data-store-ks001-original-conversation/);
});
test('preview supports a typed back-and-forth, but never impersonates a connected model',()=>{
  assert.match(chat,/onSubmit=\{\(event:FormEvent\)=>/);
  assert.match(chat,/send\(draft\)/);
  assert.match(chat,/setTurns\(current=>\[/);
  assert.match(chat,/followUp\(items,next\)/);
  assert.match(chat,/KS001 · Scripted preview/);
  assert.match(chat,/not live AI/);
  assert.match(chat,/no real AI, trader or Agreement is contacted/);
  assert.doesNotMatch(chat,/fetch\(|\.sendMessage\(|\.createAgreement\(|window\.location/);
});

test('the authenticated real conversation stays mounted and safely stages the selected source',()=>{
 assert.match(workspace,/<LiveKs001Session controller=\{liveController!\}/);
 assert.match(workspace,/await prepareEmbeddedStoreQuestion\(message\)/);
 assert.match(workspace,/\.then\(\(\)=>closeEmbeddedStore\('chat'\)\)/);
 assert.match(workspace,/if\(!remainInShop\)closeEmbeddedStore\('chat'\)/);
 assert.match(workspace,/readDraft\(current\.conversationId\?\?undefined\)\.trim\(\)/);
});