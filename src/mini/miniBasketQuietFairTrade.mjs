/**
 * Mini Basket evidence bridge — NOT a second Fair Trade examiner.
 *
 * Twelve-principle examination, material classification, and Money authority
 * are owned by SecurePayAPI's TradeContext/Formation/FairTradeExamination.
 * Until a basket has a canonical, version-bound server assessment the only
 * truthful status is NOT_ASSESSED. The browser may prepare source-backed
 * questions and offer-linked provider requests, but never issue a Fair Trade
 * pass, accept an Agreement or authorise Money.
 */
const cap=(x,n=200)=>typeof x==='string'?x.trim().slice(0,n):'';
const storeId=/^KS\d{3,12}$/;
const offerId=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export const CANONICAL_FAIR_TRADE_OWNER='SecurePayAPI / FairTradeExaminationProjector';
export const CANONICAL_EXAMINATION_STATE='NOT_ASSESSED';
export const FAIR_TRADE_LENS_COUNT=12;

function sourceOf(line){
  if(!line||!storeId.test(line.sellerKsNumber)||!offerId.test(line.offerId)||
     !cap(line.offerUpdatedAt,70))return null;
  return Object.freeze({
    sellerKsNumber:line.sellerKsNumber,
    offerId:line.offerId,
    // Store API's exact published updatedAt. Do not call it a signed version.
    offerUpdatedAt:cap(line.offerUpdatedAt,70),
    offerTitle:cap(line.title,160),
    quantity:line.quantity,
  });
}

export function miniBasketProviderRequests(lines){
  const requests=[];
  for(const line of Array.isArray(lines)?lines:[]){
    if(line?.kind!=='SERVICE')continue;
    const source=sourceOf(line);
    if(!source)continue;
    const description=cap(line.description,950);
    const name=cap(line.title,160);
    const all=(name+' '+description).toLowerCase();
    const topics=[];
    // These are provider-owned terms, not questions a buyer can answer.
    // Only make a request when the published description EXPRESSLY says the
    // material detail has not been agreed.
    const maintenance=/\b(maintenance|servicing|service plan)\b/i.test(all);
    if(maintenance && /(?:visits?|coverage|exclusions?|inclusions?|what is included).{0,75}(?:require agreement|to be agreed|to confirm|not specified)|(?:require agreement|to be agreed|to confirm).{0,75}(?:visits?|coverage|exclusions?|inclusions?)/i.test(description)){
      topics.push({code:'COVERAGE',question:'What maintenance visits, work and exclusions will you provide?'});
    }
    if(maintenance && /(?:start date|coverage begins|when (?:cover|service) starts?).{0,75}(?:require agreement|to be agreed|to confirm|not specified)|(?:require agreement|to be agreed|to confirm).{0,75}(?:start date|coverage begins)/i.test(description)){
      topics.push({code:'SERVICE_START',question:'When will the maintenance coverage begin?'});
    }
    if(!topics.length)continue;
    const scopeKey=source.sellerKsNumber+':'+source.offerId+':'+source.offerUpdatedAt;
    requests.push({
      id:'provider:'+scopeKey,
      source,
      supplierLabel:cap(line.sellerName,120),
      title:name,
      topics,
      owner:'PROVIDER',
      state:'AWAITING_PROVIDER_CLARIFICATION',
      blockingAcceptance:true,
    });
  }
  return requests;
}

/**
 * Source-bound mini preview responses can ONLY represent fictional provider
 * examples. The API must eventually return a signed, versioned, authorised
 * participant response. This function is not allowed in live commerce.
 */
export function miniSampleProviderReply(request){
  if(!request?.source||!Array.isArray(request.topics))return null;
  if(!request.topics.length)return null;
  const terms=request.topics.map(topic=>({
    code:topic.code,
    value:topic.code==='COVERAGE'
      ? 'Example proposal: one inspection each quarter; replacement parts and emergency call-outs are excluded.'
      :topic.code==='SERVICE_START'
      ? 'Example proposal: service starts on the first agreed appointment after funding.'
      : '',
  })).filter(term=>term.value);
  if(terms.length!==request.topics.length)return null;
  return {
    requestId:request.id,
    source:request.source,
    supplierLabel:request.supplierLabel,
    terms,
    kind:'FICTIONAL_PROVIDER_REPLY',
    buyerApproved:false,
  };
}

/** Unchanged source reference is essential to accept changed material terms. */
export function miniProviderReplyMatchesSource(request,reply){
  return !!(request&&reply&&reply.kind==='FICTIONAL_PROVIDER_REPLY'&&
    request.id===reply.requestId&&request.source?.sellerKsNumber===reply.source?.sellerKsNumber&&
    request.source?.offerId===reply.source?.offerId&&
    request.source?.offerUpdatedAt===reply.source?.offerUpdatedAt&&
    request.topics?.length===reply.terms?.length&&
    request.topics.every(topic=>reply.terms.some(t=>t.code===topic.code&&cap(t.value,360))));
}

export function miniBasketQuietPreflight(lines,{answers={},fulfilmentChoice=null,deliveryArea='',
  sourceFresh=false,providerReplies={}}={}){
  const offers=Array.isArray(lines)?lines:[];
  const providerRequests=miniBasketProviderRequests(offers);
  const pending=providerRequests.filter(req=>
    !miniProviderReplyMatchesSource(req,providerReplies?.[req.id])||
    providerReplies[req.id].buyerApproved!==true);
  const services=offers.filter(l=>l?.kind==='SERVICE');
  const goods=offers.filter(l=>l?.kind==='PRODUCT');
  const sourceReferences=offers.map(sourceOf);
  const provenanceComplete=offers.length>0&&sourceReferences.every(Boolean);
  const proposed=Object.values(answers||{}).filter(x=>cap(x)).length;
  const where=fulfilmentChoice==='collect'?'Buyer proposes collection':
    cap(deliveryArea)?'Buyer proposes delivery to '+cap(deliveryArea,160):null;
  // WW WWWH are lenses for evidence, not six mandatory questionnaire fields.
  // If a value is unknown, say so; do not manufacture a requirement.
  const wwwwWh={
    who:{source:provenanceComplete?'STORE_REFERENCES':'UNCONFIRMED',detail:
      offers.length?'Seller/Store identities as published; buyer and payee authority not yet verified':'No participating Store yet'},
    what:{source:provenanceComplete?'SOURCE_OFFER':'UNCONFIRMED',detail:
      offers.length?'Published goods/services and selected quantities':'Choose goods or services'},
    where:{source:where?'BUYER_PROPOSED':'NOT_ESTABLISHED',detail:
      where||'Delivery or service location as applicable; may be agreed later'},
    when:{source:services.length?'PROVIDER_TO_CONFIRM':'NOT_REQUIRED_FOR_BROWSE',
      detail:services.length?'Service timing and applicable start date require provider acceptance':
        'No service timing asserted during browsing'},
    why:{source:'CONTEXTUAL',detail:'Trade purpose may be useful, not compulsory for ordinary shopping'},
    how:{source:'NOT_YET_ACCEPTED',
      detail:'Prices, fulfilment, evidence and payment conditions require party acceptance'},
  };
  return {
    sourceReferences,
    provenanceComplete,
    buyerAnswersProposed:proposed,
    providerRequests,
    pendingProviderRequests:pending,
    // Explicitly NOT a fairness clearance; no local twelve-pass algorithm.
    canonicalExamination:{authority:CANONICAL_FAIR_TRADE_OWNER,
      status:CANONICAL_EXAMINATION_STATE,
      lensCount:FAIR_TRADE_LENS_COUNT,
      evaluated:false,fullyExamined:false,moneyReady:false},
    wwwwWh,
    buyerCanReviewDraft:offers.length>0,
    supplierClarificationBeforeAcceptance:pending.length>0,
    sourceFresh:sourceFresh===true,
    moneyReady:false,
  };
}
