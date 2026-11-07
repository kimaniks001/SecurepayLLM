import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const shell=read('src/features/living-workspace/Phase1LivingWorkspacePreview.tsx');
const card=read('src/components/ShopOfferCard.tsx');
const home=read('src/components/StoreHome.tsx');
const live=read('src/features/store/StoreExperience.tsx');
const review=read('src/features/store/StoreMasterpieceLayoutReview.tsx');

test('idle KS001 gets out of the way while shopping, but is never unmounted or replaced',()=>{
 assert.match(shell,/const \[storeAssistantOpen, setStoreAssistantOpen\] = useState\(false\)/);
 assert.match(shell,/data-store-ks001-compact-assist/);
 assert.match(shell,/storeAssistantOpen\s*\?\s*'open':'closed'/);
 assert.match(shell,/storeOpen\s*\?\s*\(storeAssistantOpen/);
 assert.match(shell,/:\s*'hidden'\)/);
 assert.match(shell,/data-store-ks001-trigger/);
 assert.match(shell,/Ask KS001/);
 assert.match(shell,/Hide KS001/);
 assert.match(shell,/Back to shop/);
 assert.match(shell,/<LiveKs001Session controller=\{liveController!\}/);
 assert.doesNotMatch(shell,/new AgentController\(/);
});

test('compact store uses freed left width and the EXISTING right SecurePay Check summary',()=>{
 assert.match(shell,/md:flex-1 md:rounded-2xl md:border/);
 assert.match(shell,/md:w-\[32%\] lg:max-w-\[440px\]/);
 assert.match(shell,/data-store-selection-parent-summary/);
 assert.match(shell,/Edit selections in full shop/);
 assert.match(shell,/setStoreAssistantOpen\(false\)/);
 assert.match(shell,/setStoreFocus\(true\)/);
});

test('real KS001 offer handoff opens the existing compact conversation without closing the shop',()=>{
 assert.match(shell,/prepareEmbeddedStoreQuestion\(message,true\)/);
 assert.match(shell,/\.then\(\(\)=>setStoreAssistantOpen\(true\)\)/);
 assert.match(shell,/onStageSelections=\{async \(text,destination\)=>/);
 assert.match(shell,/await prepareEmbeddedStoreQuestion\(text,true\)/);
 assert.match(shell,/setStoreAssistantOpen\(true\)/);
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

test('preview assistant uses an interactive, clearly scripted conversation with chosen Store offers',()=>{
 const guide=read('src/features/living-workspace/StoreKs001GuidedPreview.tsx');
 assert.match(shell,/<StoreKs001GuidedPreview items=\{storeSelected\}/);
 assert.match(shell,/onOpenKs001Preview=\{\(\)=>setStoreAssistantOpen\(true\)\}/);
 assert.match(guide,/data-store-guided-conversation/);
 assert.match(guide,/textarea aria-label="Your reply to KS001"/);
 assert.match(guide,/onSubmit=\{\(event:FormEvent\)=>/);
 assert.match(guide,/turns\.map\(turn=>/);
 assert.match(guide,/the replies are scripted, not live AI/);
 assert.match(review,/onOpenKs001Preview\?\.\(\)/);
 assert.match(review,/onSelectionChange\?\.\(next\)/);
 assert.match(shell,/onSelectionChange=\{setStoreSelected\}/);
 assert.doesNotMatch(shell,/autoSendStoreAssistant/);
});
