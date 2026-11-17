/**
 * Phase 4: seller-confirmed publication of a canonical *text-only* Store draft.
 * Uses a dedicated compare-and-set endpoint; never uses unversioned updateOffer.
 * This is a public listing, NOT stock verification, Agreement or Money.
 */
const idOk=value=>typeof value==='string'&&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function miniSellerPublishTextOnly({
  prepared, draft, gateway, context, confirmed, localOfferUnchanged
}) {
  if(!confirmed) return {ok:false,reason:'EXPLICIT_PUBLICATION_CHOICE_REQUIRED'};
  if(!localOfferUnchanged) return {ok:false,reason:'LOCAL_OFFER_CHANGED_REVIEW_REQUIRED'};
  if(!prepared?.ok || !draft?.ok || !idOk(draft.offerId) ||
     typeof draft.offerUpdatedAt!=='string' ||
     !/^\d{4}-\d{2}-\d{2}T/.test(draft.offerUpdatedAt))
    return {ok:false,reason:'CANONICAL_DRAFT_REQUIRED'};
  const candidate=prepared.storeCandidate;
  if(!candidate || !['PRODUCT','SERVICE','CAPACITY'].includes(candidate.kind) ||
     !candidate.title?.trim()) return {ok:false,reason:'UNSAFE_STORE_CANDIDATE'};
  if(!gateway || !context) return {ok:false,reason:'AUTHENTICATED_STORE_REQUIRED'};

  let read,publish;
  if(context.type==='personal' &&
      typeof gateway.myOffers==='function' &&
      typeof gateway.publishMyTextOffer==='function') {
    read=()=>gateway.myOffers();
    publish=body=>gateway.publishMyTextOffer(draft.offerId,body);
  } else if(context.type==='business' &&
      /^[A-Za-z0-9-]{2,40}$/.test(context.businessKsNumber||'') &&
      typeof gateway.businessOffers==='function' &&
      typeof gateway.publishBusinessTextOffer==='function') {
    read=()=>gateway.businessOffers(context.businessKsNumber);
    publish=body=>gateway.publishBusinessTextOffer(context.businessKsNumber,draft.offerId,body);
  } else return {ok:false,reason:'STORE_AUTHORITY_NOT_RESOLVED'};

  // Verify server truth first: one exact owned draft and the unchanged
  // text presented to the seller. Current server state may be newer than
  // the candidate, so do not 'update' it from the browser.
  let current;
  try{
    const list=await read();
    const matching=Array.isArray(list)?list.filter(o=>o?.id===draft.offerId):[];
    if(matching.length!==1) return {ok:false,reason:'CHECK_MY_STORE'};
    current=matching[0];
  }catch{return {ok:false,reason:'STORE_READ_UNAVAILABLE'};}
  if(current.updatedAt!==draft.offerUpdatedAt ||
     current.published!==false ||
     current.kind!==candidate.kind ||
     current.title!==candidate.title.trim().slice(0,140) ||
     (current.description??null)!==(candidate.description??null) ||
     current.priceMinor!==(candidate.priceMinor??null) ||
     current.quantityAvailable!==null ||
     current.availabilityState!=='NEEDS_CONFIRMATION' ||
     !Array.isArray(current.mediaRefs) || current.mediaRefs.length!==0)
    return {ok:false,reason:'CURRENT_STORE_REVISION_CHANGED'};

  try{
    const out=await publish({
      expectedUpdatedAt:current.updatedAt,
      sellerConfirmsCurrentListing:true
    });
    if(out?.id!==draft.offerId || out.published!==true ||
       out.availabilityState!=='NEEDS_CONFIRMATION' ||
       !Array.isArray(out.mediaRefs) || out.mediaRefs.length!==0)
      return {ok:false,reason:'SERVER_PUBLICATION_NOT_CONFIRMED'};
    return {
      ok:true,offerId:draft.offerId,published:true,
      availabilityState:'NEEDS_CONFIRMATION',
      mediaRefs:[],agreementCreated:false,secureLinkIssued:false,
      moneyAuthorized:false,updatedAt:out.updatedAt
    };
  }catch{
    // A request may have succeeded before a timeout. Do NOT retry as a
    // fresh publish; read My Store to learn the server state.
    return {ok:false,reason:'CHECK_MY_STORE_BEFORE_RETRY'};
  }
}
