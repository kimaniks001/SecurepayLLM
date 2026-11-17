/**
 * Shared agreement-term handoff for Buy now and Sell next.
 * A customer answer is a proposal; a seller's clarification belongs to the
 * originating Store version. Neither constitutes real participant acceptance.
 * Keep this term format independent of UI, KS001 and payment rails.
 */
import {miniProviderReplyMatchesSource} from './miniBasketQuietFairTrade.mjs';
const clamp=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export function miniSampleAgreementTerms(lines,buyerAnswers=[],providerRequests=[],replies={}){
 const sources=new Map((Array.isArray(lines)?lines:[]).map(x=>[
   x.sellerKsNumber+':'+x.offerId,x.offerUpdatedAt,
 ]));
 const out=[];
 for(const answer of Array.isArray(buyerAnswers)?buyerAnswers:[]){
   const key=answer?.sellerKsNumber+':'+answer?.offerId;
   if(!sources.has(key)||sources.get(key)!==answer.offerUpdatedAt)continue;
   if(!clamp(answer.question,180)||!clamp(answer.proposedAnswer,240))continue;
   out.push({sellerKsNumber:answer.sellerKsNumber,offerId:answer.offerId,
     offerUpdatedAt:answer.offerUpdatedAt,
     label:clamp(answer.question,180),value:clamp(answer.proposedAnswer,240),
     origin:'BUYER_PROPOSED'});
 }
 for(const request of Array.isArray(providerRequests)?providerRequests:[]){
   const reply=replies?.[request.id];
   const key=request?.source?.sellerKsNumber+':'+request?.source?.offerId;
   if(!sources.has(key)||sources.get(key)!==request.source.offerUpdatedAt||
      !miniProviderReplyMatchesSource(request,reply)||reply.buyerApproved!==true)continue;
   for(const term of reply.terms){
     out.push({sellerKsNumber:request.source.sellerKsNumber,offerId:request.source.offerId,
       offerUpdatedAt:request.source.offerUpdatedAt,
       label:term.code==='COVERAGE'?'Maintenance coverage':
         term.code==='SERVICE_START'?'Maintenance start date':clamp(term.code,150),
       value:clamp(term.value,240),origin:'PROVIDER_SAMPLE_REVIEWED'});
   }
 }
 return out.slice(0,40);
}
export function miniSellerScopedProposal(lines,terms=[],deliveryContracts=[]){
 // A small, versioned packet that Sell Something can later review without
 // guessing who owns each offer or conflating a carrier with the goods seller.
 const stores=[...new Set((Array.isArray(lines)?lines:[]).map(x=>x.sellerKsNumber))];
 return {kind:'BUYER_PROPOSED',moneyReady:false,
   sellers:stores.map(sellerKsNumber=>({
     sellerKsNumber,offers:lines.filter(x=>x.sellerKsNumber===sellerKsNumber).map(x=>({
       offerId:x.offerId,offerUpdatedAt:x.offerUpdatedAt,
       title:x.title,quantity:x.quantity,priceMinor:x.priceMinor,
       currency:x.currency,
     })),
     terms:terms.filter(t=>t.sellerKsNumber===sellerKsNumber),
   })),
   deliveryAgreements:(Array.isArray(deliveryContracts)?deliveryContracts:[]).map(x=>({
     providerKsNumber:x.providerKsNumber,
     sourceOfferIds:x.goods.map(g=>g.offerId),
     destination:x.destination,window:x.window,feeMinor:x.feeMinor,
     // Carrier approval never follows from the goods seller's acceptance.
     requiresCarrierAcceptance:true,
   })),
 };
}
