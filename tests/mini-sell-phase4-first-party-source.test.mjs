import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=rel=>fs.readFileSync(new URL('../'+rel,import.meta.url),'utf8');
const firstParty=read('src/mini/MiniFirstPartyKs001.tsx');
const sellerStore=read('src/mini/MiniSellerStore.tsx');
const seller=read('src/mini/MiniSellSomething.tsx');

test('native seller composer is mounted only within authenticated first-party Store context',()=>{
  assert.ok(firstParty.includes('sellerOfferContext && signedIn && !demo'));
  assert.ok(firstParty.includes('<MiniSellSomething'));
  assert.ok(firstParty.includes('storeGateway={stores} sellerContext={sellerOfferContext}'));
  assert.ok(firstParty.includes('agreementGateway={agreements} handoffGateway={pair.gateway}'));
  assert.ok(firstParty.includes("if(!signedIn){setSellerOfferContext(null);}"));
  assert.ok(sellerStore.includes('onPrepareOffer?'));
  assert.ok(sellerStore.includes('onPrepareOffer(storeBusiness'));
});
test('seller explicitly sends a real KS001 user turn and verifies current server version',()=>{
  assert.ok(firstParty.includes('prepareSellerOfferInKs001'));
  assert.ok(firstParty.includes('await ensureFreshSession(session,auth)'));
  assert.ok(firstParty.includes('await pair.controller.send(statement)'));
  assert.ok(firstParty.includes('await pair.gateway.readContext(snapshot.conversationId)'));
  assert.ok(firstParty.includes('context.conversationId!==snapshot.conversationId'));
  assert.ok(firstParty.includes('reviewedTradeContextVersion:context.version'));
  assert.ok(seller.includes('Prepare these terms in KS001'));
  assert.ok(seller.includes('onPrepareInKs001(composed.statement)'));
  assert.ok(seller.includes('miniSellerKs001Statement({prepared})'));
  assert.ok(seller.includes('sourceSignature===offerSignature'));
});
test('seller Store publication requires a separate explicit answer pill and real revision',()=>{
  assert.ok(seller.includes('Publish text only'));
  assert.ok(seller.includes('Keep private'));
  assert.ok(seller.includes('miniSellerPublishTextOnly'));
  assert.ok(seller.includes('storeSnapshotSignature!==offerSignature'));
  assert.ok(seller.includes('savedStoreRevision'));
  assert.equal(seller.includes('Connect to Money'),false);
});
test('Business Agreement authority is not inferred from a Store selector',()=>{
  assert.ok(firstParty.includes("sellerOfferContext.type==='personal'"));
  assert.ok(firstParty.includes('?prepareSellerOfferInKs001:undefined'));
  assert.ok(seller.includes('confirm who may represent it in the Agreement'));
});
