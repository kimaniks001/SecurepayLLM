/**
 * Existing Store management -> explicit Phase 4 publication.
 * This does not confer public image rights, inventory truth, Agreement
 * authority, SecureLink or Money. The backend MUST still CAS the revision.
 */
export function storeTextPublicationReview(current, draft) {
  if (!current || !draft || current.published !== false || draft.published !== false)
    return {ok:false,reason:'REVIEW_PRIVATE_DRAFT_REQUIRED'};
  if (!current.id || typeof current.updatedAt !== 'string' || !current.updatedAt)
    return {ok:false,reason:'CANONICAL_STORE_REVISION_REQUIRED'};
  if (current.kind !== draft.kind ||
      current.title !== String(draft.title||'').trim() ||
      (current.description??'') !== String(draft.description||'').trim() ||
      current.priceMinor !== draft.priceMinor ||
      current.quantityAvailable !== draft.quantityAvailable ||
      current.availabilityState !== draft.availabilityState ||
      JSON.stringify(current.mediaRefs) !== JSON.stringify(draft.mediaRefs))
    return {ok:false,reason:'SAVE_AND_REVIEW_CURRENT_DRAFT'};
  if (current.availabilityState !== 'NEEDS_CONFIRMATION' ||
      current.quantityAvailable !== null ||
      !Array.isArray(current.mediaRefs) || current.mediaRefs.length !== 0 ||
      (current.priceMinor!==null && (!Number.isSafeInteger(current.priceMinor) || current.priceMinor<=0)))
    return {ok:false,reason:'TEXT_ONLY_UNVERIFIED_AVAILABILITY_REQUIRED'};
  return {ok:true,offerId:current.id,expectedUpdatedAt:current.updatedAt};
}

export function storeTextPublicationFresh(original, current) {
  if (!original || !current || current.id !== original.id ||
      current.updatedAt !== original.updatedAt ||
      current.published !== false ||
      current.kind !== original.kind ||
      current.title !== original.title ||
      (current.description??'') !== (original.description??'') ||
      current.priceMinor !== original.priceMinor ||
      current.quantityAvailable !== original.quantityAvailable ||
      current.availabilityState !== original.availabilityState ||
      JSON.stringify(current.mediaRefs) !== JSON.stringify(original.mediaRefs))
    return {ok:false,reason:'STORE_REVISION_CHANGED'};
  return {ok:true,expectedUpdatedAt:current.updatedAt};
}

/**
 * An already-public text-only listing can change title, description and
 * price without being unpublished, but must preserve kind, stock and source
 * policy. This is a front-end eligibility check, not server authorization.
 */
export function storePublishedTextEditReview(current,draft) {
  if(!current||!draft||current.published!==true||draft.published!==true)
    return {ok:false,reason:'PUBLISHED_LISTING_REQUIRED'};
  if(!current.id || !current.updatedAt ||
     current.kind!==draft.kind ||
     current.quantityAvailable!==null || draft.quantityAvailable!==null ||
     current.availabilityState!=='NEEDS_CONFIRMATION' ||
     draft.availabilityState!=='NEEDS_CONFIRMATION' ||
     !Array.isArray(current.mediaRefs) || current.mediaRefs.length!==0 ||
     !Array.isArray(draft.mediaRefs) || draft.mediaRefs.length!==0 ||
     (draft.priceMinor!==null && (!Number.isSafeInteger(draft.priceMinor)||draft.priceMinor<=0)) ||
     !String(draft.title||'').trim() ||
     String(draft.title||'').trim().length>140 ||
     String(draft.description||'').length>2000)
    return {ok:false,reason:'LEGACY_LISTING_REQUIRES_SEPARATE_EDIT'};
  return {ok:true,offerId:current.id,expectedUpdatedAt:current.updatedAt};
}
