import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  CANONICAL_EXAMINATION_STATE,FAIR_TRADE_LENS_COUNT,
  miniBasketProviderRequests,miniSampleProviderReply,
  miniProviderReplyMatchesSource,miniBasketQuietPreflight
} from '../src/mini/miniBasketQuietFairTrade.mjs';
import {miniStoreIntent} from '../src/mini/miniStoreIntent.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const maintenance={
 sellerKsNumber:'KS90003',sellerName:'Pump Care Services · Sample',
 offerId:'00000000-0000-4000-8000-000000090032',
 offerUpdatedAt:'2026-11-17T06:00:00.000Z',
 kind:'SERVICE',title:'Water pump maintenance · 12 months',
 description:'Sample one-year service. Visits, start date and exclusions require agreement.',
 priceMinor:600000,currency:'KES',quantity:1,availabilityState:'TAKING_WORK',
};
const goods={
 sellerKsNumber:'KS90002',sellerName:'Ruiru Pump House · Sample',
 offerId:'00000000-0000-4000-8000-000000090021',
 offerUpdatedAt:'2026-11-17T06:00:00.000Z',
 kind:'PRODUCT',title:'Solar irrigation water pump',description:'Example pump',
 priceMinor:3500000,currency:'KES',quantity:1,availabilityState:'AVAILABLE',
};
test('A 12-month service with unspecified coverage and start needs the PROVIDER, not buyer',()=>{
 const tasks=miniBasketProviderRequests([goods,maintenance]);
 assert.equal(tasks.length,1);
 assert.equal(tasks[0].owner,'PROVIDER');
 assert.deepEqual(tasks[0].topics.map(t=>t.code),['COVERAGE','SERVICE_START']);
 assert.equal(tasks[0].source.sellerKsNumber,'KS90003');
 assert.equal(tasks[0].source.offerId,maintenance.offerId);
 assert.equal(tasks[0].source.offerUpdatedAt,maintenance.offerUpdatedAt);
 assert.equal(tasks[0].blockingAcceptance,true);
});
test('No generic Fair Trade form or maintenance assumptions for a simple known-terms trade',()=>{
 const state=miniBasketQuietPreflight([goods],{fulfilmentChoice:'collect',sourceFresh:true});
 assert.deepEqual(state.providerRequests,[]);
 assert.equal(state.buyerCanReviewDraft,true);
 assert.equal(state.supplierClarificationBeforeAcceptance,false);
 assert.equal(state.wwwwWh.why.source,'CONTEXTUAL');
 assert.equal(state.wwwwWh.when.source,'NOT_REQUIRED_FOR_BROWSE');
});
test('Twelve canonical lenses are NOT declared examined or passed without a server assessment',()=>{
 const state=miniBasketQuietPreflight([goods,maintenance],{
   fulfilmentChoice:'collect',sourceFresh:true});
 assert.equal(state.canonicalExamination.status,CANONICAL_EXAMINATION_STATE);
 assert.equal(state.canonicalExamination.lensCount,FAIR_TRADE_LENS_COUNT);
 assert.equal(state.canonicalExamination.lensCount,12);
 assert.equal(state.canonicalExamination.evaluated,false);
 assert.equal(state.canonicalExamination.fullyExamined,false);
 assert.equal(state.canonicalExamination.moneyReady,false);
 assert.equal(state.moneyReady,false);
 assert.equal(state.supplierClarificationBeforeAcceptance,true);
 const source=read('src/mini/miniBasketQuietFairTrade.mjs');
 assert.doesNotMatch(source,/To Protect Trust|To Honour Good/);
});
test('Only a source-bound fictional provider reply can be shown and accepted in the sandbox',()=>{
 const [request]=miniBasketProviderRequests([maintenance]);
 const reply=miniSampleProviderReply(request);
 assert.ok(miniProviderReplyMatchesSource(request,reply));
 assert.equal(reply.kind,'FICTIONAL_PROVIDER_REPLY');
 assert.equal(reply.buyerApproved,false);
 assert.equal(reply.source.offerUpdatedAt,maintenance.offerUpdatedAt);
 assert.match(reply.terms.find(x=>x.code==='COVERAGE').value,/excluded/i);
 assert.match(reply.terms.find(x=>x.code==='SERVICE_START').value,/start/i);
 const pending=miniBasketQuietPreflight([maintenance],{providerReplies:{[request.id]:reply}});
 assert.equal(pending.pendingProviderRequests.length,1);
 const reviewed=miniBasketQuietPreflight([maintenance],{providerReplies:{
   [request.id]:{...reply,buyerApproved:true},
 }});
 assert.equal(reviewed.pendingProviderRequests.length,0);
 assert.equal(reviewed.moneyReady,false); // buyer review still cannot authorise Money
});
test('Material offer changes invalidate previously proposed or approved provider terms',()=>{
 const [request]=miniBasketProviderRequests([maintenance]);
 const reply={...miniSampleProviderReply(request),buyerApproved:true};
 const changed={...maintenance,offerUpdatedAt:'2026-11-18T06:00:00.000Z'};
 const [newRequest]=miniBasketProviderRequests([changed]);
 assert.notEqual(newRequest.id,request.id);
 assert.equal(miniProviderReplyMatchesSource(newRequest,reply),false);
 const state=miniBasketQuietPreflight([changed],{
   providerReplies:{[request.id]:reply},
 });
 assert.equal(state.pendingProviderRequests.length,1);
});
test('A product or service without actual Store source/version is NOT treated as examined',()=>{
 const incomplete={...maintenance,offerUpdatedAt:''};
 const view=miniBasketQuietPreflight([incomplete]);
 assert.equal(view.provenanceComplete,false);
 assert.deepEqual(view.providerRequests,[]);
 assert.equal(view.canonicalExamination.status,'NOT_ASSESSED');
});
test('KS001 is optional and receives exact sourced buyer answers ONLY when explicitly asked',()=>{
 const answer={sellerKsNumber:maintenance.sellerKsNumber,offerId:maintenance.offerId,
   question:'Which day would you like the visit?',proposedAnswer:'Next week'};
 const other={sellerKsNumber:'KS99999',offerId:maintenance.offerId,
   question:'Unrelated account information',proposedAnswer:'private data'};
 const plan=miniStoreIntent([maintenance],{
   fulfilmentPreference:'collect',buyerAnswers:[answer,other]});
 assert.ok(plan);
 assert.match(plan.statement,/Next week/);
 assert.match(plan.statement,/seller must still review/i);
 assert.doesNotMatch(plan.statement,/private data/);
 const buy=read('src/mini/MiniBuyStore.tsx');
 assert.match(buy,/onDiscuss\(cart\.map/);
 assert.match(buy,/miniBasketAnswersForOffer\(cart,basketAnswers\)/);
 const application=read('src/mini/MiniExperience.tsx');
 assert.match(application,/setBuyingPlanForHelp\(\{lines,fulfilment,buyerAnswers\}\)/);
});
test('Sample Money is withheld for provider clarifications until seller terms are reviewed',()=>{
 const buy=read('src/mini/MiniBuyStore.tsx');
 assert.match(buy,/preflight\.pendingProviderRequests\.length===0/);
 assert.match(buy,/sampleSellers\.filter\(id=>!needClarifying\.has\(id\)\)/);
 assert.match(buy,/Include these terms in my sample Agreement/);
 assert.match(buy,/miniProviderReplyMatchesSource/);
 assert.match(buy,/setProviderReplies/);
});
