/**
 * Phase 4: strictly authenticated Store draft write. Unlike the local preview,
 * this returns only a server-issued Store offer ID. It never publishes or sends
 * a SecureLink, and never silently changes an existing offer.
 *
 * Caller must supply the authenticated Store gateway and explicitly select a
 * seller/Business context; no fallback to a fictional KSNumber.
 */
export async function miniSellerCreateCanonicalStoreDraft({
  prepared, gateway, context, confirmed
}) {
  if (!confirmed) return {ok:false,reason:'SELLER_CONFIRMATION_REQUIRED'};
  if (!prepared?.ok || !prepared.storeCandidate)
    return {ok:false,reason:'OFFER_NOT_PREPARED'};
  if (!gateway || !context || typeof context!=='object')
    return {ok:false,reason:'AUTHENTICATED_STORE_REQUIRED'};
  if (prepared.boundary?.canonical || prepared.boundary?.storePublished)
    return {ok:false,reason:'CANDIDATE_ALREADY_AUTHORITATIVE'};

  const candidate=prepared.storeCandidate;
  const {kind,title,description,priceMinor}=candidate;
  if (!['PRODUCT','SERVICE','CAPACITY'].includes(kind) ||
      typeof title!=='string' || !title.trim() ||
      (priceMinor!==null && (!Number.isSafeInteger(priceMinor) || priceMinor<=0))) {
    return {ok:false,reason:'INVALID_STORE_CANDIDATE'};
  }
  // Deliberately ignore any client-supplied media refs, stock claims or
  // published flag, even if an earlier integration accidentally set them.
  const body=Object.freeze({
    kind, title:title.trim().slice(0,140),
    description:typeof description==='string'?description:null,
    priceMinor:priceMinor??null,
    quantityAvailable:null,
    availabilityState:'NEEDS_CONFIRMATION',
    published:false,
    mediaRefs:[]
  });
  let write;
  if(context.type==='personal' && typeof gateway.createOffer==='function') {
    write=()=>gateway.createOffer(body);
  } else if(context.type==='business' &&
            /^[A-Za-z0-9-]{2,40}$/.test(context.businessKsNumber||'') &&
            typeof gateway.createBusinessOffer==='function') {
    write=()=>gateway.createBusinessOffer(context.businessKsNumber,body);
  } else return {ok:false,reason:'STORE_AUTHORITY_NOT_RESOLVED'};
  try {
    const offer=await write();
    if (!offer || typeof offer.id!=='string' ||
        !/^[0-9a-fA-F-]{36}$/.test(offer.id) ||
        offer.published!==false || offer.mediaRefs?.length) {
      return {ok:false,reason:'UNEXPECTED_SERVER_RECEIPT'};
    }
    return {ok:true,offerId:offer.id,offerUpdatedAt:offer.updatedAt||null,
      published:false,shared:false,secureLinkIssued:false,
      agreementCreated:false,moneyAuthorized:false};
  } catch {
    // Unknown network outcome may have saved the draft. Never auto-retry a
    // non-idempotent create; ask seller to check My Store.
    return {ok:false,reason:'CHECK_MY_STORE_BEFORE_RETRY'};
  }
}

/** SecureLink cannot be fabricated from Store ID, route or a public URL. */
export function miniSellerShareReadiness({prepared,realOffer,issuer}) {
  if (!prepared?.ok) return {ready:false,reason:'OFFER_NOT_PREPARED'};
  if (!realOffer?.ok || !realOffer.offerId)
    return {ready:false,reason:'CANONICAL_OFFER_REQUIRED'};
  if (typeof issuer!=='function')
    return {ready:false,reason:'AUTHORIZED_SECURELINK_ISSUER_REQUIRED'};
  return {ready:true,reason:null};
}
