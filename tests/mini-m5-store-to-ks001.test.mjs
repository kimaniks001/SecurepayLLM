import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import {miniStoreIntent} from '../src/mini/miniStoreIntent.mjs';
const read=p=>readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
const bundle=await build({stdin:{contents:[
  "export * from './src/mini/miniInteractiveDemo';",
  "export * from './src/api/securepay/agent';",
  "export * from './src/api/securepay/store';",
  "export * from './src/api/securepay/agent/continuity';",
  "export * from './src/features/agent/controller';"
].join('\n'),resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const chatId='00000000-0000-4000-8000-000000000041';
const offerId='00000000-0000-4000-8000-000000000081';
const otherOffer='00000000-0000-4000-8000-000000000082';
function setup(actor='amina'){
  api.miniDemoReset();
  const http=api.createMiniDemoHttpClient(()=>api.miniDemoTokens(actor).accessToken);
  const access=api.createConversationAccessStore(null);
  api.miniDemoSeedAccess(access);
  return {http,agent:api.createAgentController(api.createAgentGateway(http,access)),
    stores:api.createStoreGateway(http)};
}
function cartLine(store,offer,quantity=2){
  return {
    sellerKsNumber:store.canonicalKsNumber,sellerName:store.displayName,
    offerId:offer.id,title:offer.title,quantity,
    priceMinor:offer.priceMinor,currency:offer.currency,
    offerUpdatedAt:offer.updatedAt,availabilityState:offer.availabilityState
  };
}
test('M5: current StoreGateway search returns real-shape synthetic source, not demo money',async()=>{
  const {stores}=setup();
  const result=await stores.search({kind:'PRODUCT',category:'chair',limit:10});
  assert.equal(result.length,2);
  assert.equal(result[0].canonicalKsNumber,'KS002');
  assert.equal(result[0].offer.id,offerId);
  assert.equal(result[0].offer.quantityAvailable,25);
  const store=await stores.store('KS002');
  assert.equal(store.offers.length,1);
  const refreshed=await stores.offer('KS002',offerId);
  assert.equal(refreshed.offer.id,offerId);
});
test('M5: single Store plan keeps seller and offer references, but is buyer intention',async()=>{
  const {stores}=setup();
  const found=await stores.store('KS002');
  const plan=miniStoreIntent([cartLine(found,found.offers[0],20)]);
  assert.ok(plan,JSON.stringify({store:found.canonicalKsNumber,offer:found.offers[0]}));assert.equal(plan.kind,'single');
  assert.equal(plan.source.sourceId,offerId);
  assert.equal(plan.source.sourceOwnerKsNumber,'KS002');
  assert.match(plan.statement,/not place an order/);
  assert.match(plan.statement,/20 x Stacking event chair/);
  assert.match(plan.statement,/No payments or stock reservation/);
});
test('M5: single Store selection binds the real canonical source into the SAME KS001 conversation',async()=>{
  const {agent,stores}=setup();
  await agent.resumeConversation(chatId);
  const idBefore=agent.getSnapshot().conversationId;
  const found=await stores.store('KS002');
  const plan=miniStoreIntent([cartLine(found,found.offers[0],20)]);
  const selected=await agent.useOffer(plan.source);
  assert.equal(selected.status,'selected');
  assert.equal(agent.getSnapshot().source.sourceId,offerId);
  assert.equal(agent.getSnapshot().conversationId,idBefore);
  await agent.send(plan.statement);
  assert.equal(agent.getSnapshot().conversationId,idBefore);
  assert.equal(agent.getSnapshot().turns.length,6);
  assert.match(agent.getSnapshot().turns.at(-1).response.message.text,/Sample reply/);
  assert.equal(agent.getSnapshot().pending,null);
});
test('M5: multi-Store plan preserves independent sellers and cannot be called one selected source',async()=>{
  const {stores}=setup();
  const a=await stores.store('KS002');
  const b=await stores.store('KS003');
  const proposal=miniStoreIntent([
    cartLine(a,a.offers[0],10),cartLine(b,b.offers[0],6)]);
  assert.ok(proposal,JSON.stringify({a:a.offers[0],b:b.offers[0]}));
  assert.equal(proposal.kind,'multi');
  assert.equal(proposal.source,null);
  assert.equal(proposal.distinctSellers,2);
  assert.match(proposal.statement,/KS002/);
  assert.match(proposal.statement,/KS003/);
  assert.match(proposal.statement,/separate/);
});
test('M5: an unverified source must not be passed to controller or silently dropped',async()=>{
  const {agent}=setup();
  await agent.resumeConversation(chatId);
  const result=await agent.useOffer({
    sourceId:otherOffer,sourceOwnerKsNumber:'KS002',
    sourceDescription:'Buyer selected a falsified seller for this item'
  });
  assert.equal(result.status,'failed');
  assert.equal(agent.getSnapshot().offerSelectionFailure.fact.sourceId,otherOffer);
  assert.equal(agent.getSnapshot().source,null);
  assert.equal(agent.getSnapshot().turns.length,4);
  const again=await agent.retryOfferSelection();
  assert.equal(again.status,'failed');
  assert.equal(agent.getSnapshot().turns.length,4);
});
test('M5: invalid or changed offer IDs, quantity, amounts or repeated lines are refused',()=>{
  const good={
    sellerKsNumber:'KS002',sellerName:'Njeri (sample)',
    offerId,quantity:1,title:'Stacking chair',priceMinor:16000,currency:'KES'
  };
  assert.equal(miniStoreIntent([{...good,offerId:'wrong'}]),null);
  assert.equal(miniStoreIntent([{...good,sellerKsNumber:'someone else'}]),null);
  assert.equal(miniStoreIntent([{...good,quantity:100}]),null);
  assert.equal(miniStoreIntent([{...good,priceMinor:-1}]),null);
  assert.equal(miniStoreIntent([good,good]),null);
  assert.equal(miniStoreIntent([]),null);
});
test('M5: local preview Store API does not proxy or initiate any payment or stock write',async()=>{
  const {http}=setup();
  await assert.rejects(()=>http.request('/api/v1/stores/KS002/stock-reserve',
    {method:'POST'}),/not simulated/);
  await assert.rejects(()=>http.request('/api/v1/payments/start',
    {method:'POST'}),/not simulated/);
  assert.doesNotMatch(read('src/mini/miniInteractiveDemo.ts'),/\bfetch\(/);
});
test('M5: existing Mini Store remains single UI; explicit verified plan selection invokes existing AgentController',()=>{
  const store=read('src/mini/MiniBuyStore.tsx');
  const main=read('src/mini/MiniFirstPartyKs001.tsx');
  const controller=read('src/features/agent/controller.ts');
  assert.match(store,/storeGateway\?:Pick<StoreGateway/);
  assert.match(store,/onDiscuss\?:/);
  assert.match(store,/reviewed &&/);
  assert.match(store,/onDiscuss\(cart.map/);
  assert.match(main,/MiniBuyStore language=\{language\}/);
  assert.match(main,/pair\.controller\.useOffer\(plan.source\)/);
  assert.match(main,/pair\.controller\.retryOfferSelection\(\)/);
  assert.match(main,/pair\.controller\.send\(plan.statement\)/);
  assert.match(controller,/sourceType: 'STORE_LISTING'/);
  assert.match(main,/This conversation already has a selected Store source/);
  assert.doesNotMatch(main,/checkoutIntent|acceptAgreement\(|releaseFunds\(/);
});
