import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const read=p=>readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
const built=await build({stdin:{contents:[
  "export * from './src/mini/miniInteractiveDemo';",
  "export * from './src/api/securepay/business';",
  "export * from './src/api/securepay/store';",
  "export * from './src/api/securepay/agreements';",
  "export * from './src/features/store/controller';"
].join('\n'),resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const api=await import('data:text/javascript;base64,'+
  Buffer.from(built.outputFiles[0].text).toString('base64'));
const chair='00000000-0000-4000-8000-000000000081';
function clients(actor){
  const http=api.createMiniDemoHttpClient(()=>api.miniDemoTokens(actor).accessToken);
  return {
    stores:api.createStoreGateway(http),
    business:api.createBusinessGateway(http),
    agreements:api.createAgreementGateway(http),
  };
}
test('M5B: only seller has backend-scoped business Store representation',async()=>{
  api.miniDemoReset();
  const buyer=clients('amina'),seller=clients('njeri');
  assert.deepEqual(await buyer.business.mine(),[]);
  const choices=await seller.business.mine();
  assert.equal(choices.length,1);
  assert.equal(choices[0].businessKsNumber,'KS002');
  assert.equal(choices[0].canActFor,true);
  assert.equal((await seller.business.representation('KS002')).relationship,'ADMINISTRATOR');
  await assert.rejects(()=>buyer.business.representation('KS002'),/owner/);
  await assert.rejects(()=>buyer.stores.businessOffers('KS002'),/owner/);
  await assert.rejects(()=>seller.stores.businessOffers('KS003'),/owner/);
});
test('M5B: existing StoreController loads only represented business offers',async()=>{
  api.miniDemoReset();
  const seller=clients('njeri');
  const controller=api.createStoreController(seller.stores);
  const represented=await seller.business.representation('KS002');
  assert.equal(represented.canActFor,true);
  await controller.enterBusinessManagement(represented.businessKsNumber,represented.displayName);
  const snapshot=controller.getSnapshot();
  assert.equal(snapshot.mine.status,'ready');
  assert.equal(snapshot.mine.data.raw.length,1);
  assert.equal(snapshot.mine.data.raw[0].id,chair);
  assert.equal(snapshot.managedBusiness.ksNumber,'KS002');
});
test('M5B: seller edits published price/quantity; the buyer sees the changed source',async()=>{
  api.miniDemoReset();
  const buyer=clients('amina'),seller=clients('njeri');
  const old=(await buyer.stores.offer('KS002',chair)).offer;
  const controller=api.createStoreController(seller.stores);
  await controller.enterBusinessManagement('KS002','Njeri Events');
  controller.openBuilder(chair);
  controller.setDraft({
    priceMinor:17500,quantityAvailable:18,availabilityState:'LOW_AVAILABILITY'
  });
  await controller.submitDraft();
  const snapshot=controller.getSnapshot();
  assert.equal(snapshot.mine.status,'ready');
  assert.equal(snapshot.draftError,null);
  const latest=(await buyer.stores.offer('KS002',chair)).offer;
  assert.equal(latest.priceMinor,17500);
  assert.equal(latest.quantityAvailable,18);
  assert.equal(latest.availabilityState,'LOW_AVAILABILITY');
  assert.notEqual(latest.updatedAt,old.updatedAt);
  assert.equal(latest.availabilityConfirmedAt,null);
});
test('M5B: availability confirmation is separate and seller-owned, never stock reservation',async()=>{
  api.miniDemoReset();
  const seller=clients('njeri'),buyer=clients('amina');
  const controller=api.createStoreController(seller.stores);
  await controller.enterBusinessManagement('KS002','Njeri Events');
  await controller.confirmAvailability(chair);
  assert.equal(controller.getSnapshot().mine.status,'ready');
  assert.ok(controller.getSnapshot().mine.data.raw[0].availabilityConfirmedAt);
  await assert.rejects(()=>buyer.stores.confirmBusinessOfferAvailability('KS002',chair),/owner/);
  const published=(await buyer.stores.offer('KS002',chair)).offer;
  assert.ok(published.availabilityConfirmedAt);
  const agreement=(await buyer.agreements.currentUserAgreements(0,20)).items[0];
  assert.equal(agreement.status,'INVITATION_PENDING');
  assert.equal(agreement.currentActor.participantStatus,'CREATOR');
});
test('M5B: seller business fulfilment is independently published, not delivery booked',async()=>{
  api.miniDemoReset();
  const buyer=clients('amina'),seller=clients('njeri');
  const before=await seller.stores.businessOfferFulfilment('KS002',chair);
  assert.equal(before.deliveryAvailable,null);
  const updated=await seller.stores.updateBusinessOfferFulfilment('KS002',chair,{
    deliveryAvailable:true,leadTimeHours:24,
    fulfilmentConditions:'Delivery on confirmation, subject to agreement.'
  });
  assert.equal(updated.offerId,chair);
  assert.equal(updated.deliveryAvailable,true);
  assert.equal(updated.leadTimeHours,24);
  assert.equal(updated.version,before.version+1);
  const check=await seller.stores.businessOfferFulfilment('KS002',chair);
  assert.equal(check.fulfilmentConditions,'Delivery on confirmation, subject to agreement.');
  await assert.rejects(()=>buyer.stores.updateBusinessOfferFulfilment('KS002',chair,{
    deliveryAvailable:false
  }),/owner/);
  assert.equal((await seller.agreements.currentUserAgreements(0,20)).items.length,0);
  assert.equal((await buyer.agreements.currentUserAgreements(0,20)).items[0].status,'INVITATION_PENDING');
});
test('M5B: seller cannot edit another Store or invent accepted order from published listing',async()=>{
  api.miniDemoReset();
  const seller=clients('njeri');
  await assert.rejects(()=>seller.stores.updateBusinessOffer('KS003',
    '00000000-0000-4000-8000-000000000082',{
      title:'Folding meeting chair',kind:'PRODUCT',availabilityState:'AVAILABLE',
      published:true,priceMinor:1,quantityAvailable:1
    }),/owner/);
  const current=await seller.stores.businessOffers('KS002');
  assert.equal(current[0].published,true);
  const http=api.createMiniDemoHttpClient(()=>api.miniDemoTokens('njeri').accessToken);
  await assert.rejects(()=>http.request('/api/v1/orders/accept',{
    method:'POST',auth:'required'
  }),/not simulated/);
});
test('M5B: seller panel reuses StoreController and business guard; acceptance remains the invitation version control',()=>{
  const seller=read('src/mini/MiniSellerStore.tsx');
  const root=read('src/mini/MiniFirstPartyKs001.tsx');
  const recipient=read('src/mini/MiniParticipantInvitations.tsx');
  assert.match(seller,/createStoreController\(storeGateway\)/);
  assert.match(seller,/businessGateway\.mine\(\)/);
  assert.match(seller,/businessGateway\.representation\(b\.businessKsNumber\)/);
  assert.match(seller,/controller\.submitDraft\(\)/);
  assert.match(seller,/controller\.confirmAvailability\(id\)/);
  assert.match(seller,/updateBusinessOfferFulfilment/);
  assert.match(seller,/does not reserve stock or accept any buyer order/);
  assert.match(seller,/Updating a listing is not acceptance/);
  assert.match(root,/MiniSellerStore storeGateway=\{stores\}/);
  assert.match(root,/My Store/);
  assert.match(recipient,/recipient\.confirm\(\)/);
  assert.doesNotMatch(seller,/acceptAgreement\(|releaseFunds\(|createPaymentIntent\(/);
});
