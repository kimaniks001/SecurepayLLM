import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {storeOfferAssistTurn} from '../src/features/store/offerAssistTurn.mjs';
const source = path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const shelf=source('src/components/StoreHome.tsx');
const card=source('src/components/ShopOfferCard.tsx');
const review=source('src/features/store/StoreMasterpieceLayoutReview.tsx');
const parent=source('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const live=source('src/features/store/StoreExperience.tsx');
const offer=source('src/components/OfferQuickPreview.tsx');

test('shopping leads with good discovery, not tool machinery or signup friction',()=>{
 assert.match(shelf,/Good things\. Good people\. Clear agreements\./);
 assert.match(shelf,/What would you like to find today\?/);
 assert.match(shelf,/Explore the shelves/);
 assert.ok(shelf.indexOf('Explore the shelves')<shelf.indexOf('Stores with published offers'));
 assert.match(shelf,/ShopOfferCard/);
 assert.match(shelf,/onOpenStore=\{\(\) => \{setQuickOfferId\(null\);onOpenStore\(offer.storeId\);\}\}/);
 assert.match(shelf,/onCreateOffer/);
 assert.match(shelf,/onManageStore/);
});

test('a familiar left Store expands only on View and preserves KS001 in the original middle',()=>{
 assert.match(parent,/const \[storeFocus, setStoreFocus\] = useState\(false\)/);
 assert.match(parent,/<CompactStoreBrowser/);
 assert.match(parent,/data-store-ks001-original-conversation/);
 assert.match(parent,/data-store-expanded-middle/);
 assert.match(parent,/const expandCompactStore=/);
 assert.match(parent,/Back to KS001/);
 assert.match(parent,/<StoreExperience/);
 assert.match(parent,/<LiveKs001Session/);
 assert.match(parent,/closeEmbeddedStore\('chat'\)/);
 assert.match(parent,/writeDraft\(id,text\)/);
 assert.doesNotMatch(parent,/md:fixed md:inset-x-5/);
});

test('trader images are shown only when source media exists and is NOT a stock/example image',()=>{
 assert.match(card,/!item\.isExample/);
 assert.match(card,/No seller photograph supplied/);
 assert.match(card,/ShopOfferCover/);
 assert.doesNotMatch(review,/images\.unsplash\.com|const PHOTO/);
 assert.match(review,/ShopOfferCover offer=\{selectedOffer\}/);
 assert.match(review,/not a verified seller photo/i);
});

test('the product type changes the next human question in preview, without faking live AI',()=>{
 assert.match(review,/Where is the land, and which survey do you need/);
 assert.match(review,/Where will the work take place/);
 assert.match(review,/Where should the item be delivered or collected/);
 assert.match(review,/nextHelpfulQuestion\(offer\)/);
 assert.match(review,/no message is sent/);
 assert.match(review,/No offer was accepted and no Agreement was created/);
});

test('one real KS001 composer gets a type-aware user-selected offer, without booking automatically',()=>{
 assert.match(live,/const question=storeOfferAssistTurn\(offer\)/);
 assert.match(live,/void quickAsk\(state\.selectedOffer\.data\.offer\)/);
 assert.match(parent,/prepareEmbeddedStoreQuestion/);
 assert.match(parent,/writeDraft\(id,text\)/);
 const painter=storeOfferAssistTurn({title:'House painting',storeName:'Painter',offerType:'service'});
 assert.match(painter,/where the work is needed/i);
 const phone=storeOfferAssistTurn({title:'A phone',storeName:'Tech',offerType:'product'});
 assert.match(phone,/delivery or collection/i);
 const survey=storeOfferAssistTurn({title:'Land survey',storeName:'Surveyor',offerType:'service'});
 assert.match(survey,/what kind of survey/i);
 for(const result of [painter,phone,survey]){
   assert.match(result,/just ONE useful next question/);
   assert.match(result,/unverified Store listing/);
   assert.match(result,/Do not invent seller verification/);
 }
 assert.throws(()=>storeOfferAssistTurn({title:'',storeName:'nobody'}));
});

test('a shopper can ask, visit the shop, or proceed to terms, with no false confirmed purchase',()=>{
 assert.match(offer,/Ask KS001 about this/);
 assert.match(offer,/Visit this shop/);
 assert.match(offer,/Work out an agreement/);
 assert.match(offer,/Seller-listed availability/);
 assert.doesNotMatch(offer,/Pay now|Checkout now|Buy now/);
});
