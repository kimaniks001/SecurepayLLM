import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {miniSellerQuotationDraft} from '../src/mini/miniSellerQuotationDraft.mjs';
const read=p=>readFileSync(fileURLToPath(new URL('../'+p,import.meta.url)),'utf8');
const valid={sellerKsNumber:'KS002',offerId:'00000000-0000-4000-8000-000000000081',
 title:'Stacking event chair',offerUpdatedAt:'2026-11-12T12:00:00Z',
 publishedPriceMinor:16000,currency:'KES',buyerKsNumber:'KS001',
 quantity:'15',unitPrice:'170.50',deliveryPlace:'Varsityville Ruiru',
 deliveryDate:'2026-12-02',deliveryBy:'SELLER',conditions:'Site contact to confirm'};
test('M5C seller proposal carries buyer-specific terms and a single real Store source only',()=>{
 const x=miniSellerQuotationDraft(valid);assert.ok(x);
 assert.equal(x.quantity,15);assert.equal(x.unitPriceMinor,17050);assert.equal(x.totalMinor,255750);
 assert.equal(x.source.sourceId,valid.offerId);assert.equal(x.source.sourceOwnerKsNumber,'KS002');
 assert.match(x.statement,/buyer-specific PROPOSAL/);
 assert.match(x.statement,/Buyer nominated by me: KS001 \(unverified\)/);
 assert.match(x.statement,/Proposed unit price KES 170\.50, proposed total KES 2557\.50/);
 assert.match(x.statement,/No stock hold, invitation, booking or Money/);
 assert.ok(x.statement.length<=1200);
});
test('M5C rejects forged identities, invalid quantity and improper money precision',()=>{
 for(const changed of [{buyerKsNumber:'KS002'},{buyerKsNumber:'555'},{sellerKsNumber:'DEMO-N'},
  {offerId:'not-real'},{quantity:'0'},{quantity:'21'},{quantity:'1.2'},
  {unitPrice:'17.001'},{unitPrice:'-10'},{unitPrice:'NaN'},{unitPrice:'1e7'},
  {deliveryDate:'2026-02-30'},{deliveryPlace:''},{deliveryBy:'COURIER'},
  {conditions:'a'.repeat(181)},{currency:'NOT_REAL'}]){
   assert.equal(miniSellerQuotationDraft({...valid,...changed}),null,JSON.stringify(changed));
 }
});
test('M5C never creates an Agreement, sends a buyer invitation or requests Money',()=>{
 const seller=read('src/mini/MiniSellerStore.tsx');
 const root=read('src/mini/MiniFirstPartyKs001.tsx');
 const gate=read('src/mini/miniSellerQuotationDraft.mjs');
 assert.match(seller,/businessGateway\.representation\(storeBusiness\.ksNumber\)/);
 assert.match(seller,/storeGateway\.offer\(storeBusiness\.ksNumber,offer\.id\)/);
 assert.match(seller,/miniStoreOfferSnapshotFresh/);
 assert.match(root,/pair\.controller\.useOffer\(proposal\.source\)/);
 assert.match(root,/pair\.controller\.send\(proposal\.statement\)/);
 assert.match(root,/onSellerDiscuss=\{discussSellerQuotation\}/);
 assert.doesNotMatch(gate,/fetch\(|confirmVersion\(|proposeAmendment\(|releaseFunds\(|createPaymentIntent\(/);
});
