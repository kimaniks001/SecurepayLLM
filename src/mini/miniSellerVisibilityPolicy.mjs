/**
 * Public visibility withdrawal is NOT deletion, entitlement to publish,
 * Agreement revocation or a statement about whether stock exists.
 *
 * Only the server may change visibility. This buyer-facing URL can disappear
 * from search without changing an already-accepted Agreement.
 */
export function miniSellerVisibilityFresh(reviewed,latest){
  if(!reviewed||!latest||reviewed.id!==latest.id||
      reviewed.published!==true || latest.published!==true ||
      !reviewed.updatedAt || latest.updatedAt!==reviewed.updatedAt ||
      reviewed.kind!==latest.kind ||
      reviewed.title!==latest.title ||
      (reviewed.description??null)!==(latest.description??null) ||
      reviewed.priceMinor!==latest.priceMinor ||
      reviewed.quantityAvailable!==latest.quantityAvailable ||
      reviewed.availabilityState!==latest.availabilityState ||
      JSON.stringify(reviewed.mediaRefs)!==JSON.stringify(latest.mediaRefs))
      return {ok:false,reason:'REVIEW_CURRENT_PUBLIC_OFFER'};
  return {ok:true,offerId:reviewed.id,expectedUpdatedAt:latest.updatedAt};
}
export function miniSellerVisibilityReceipt(receipt,expectedId){
  if(!receipt||receipt.id!==expectedId||receipt.published!==false ||
      typeof receipt.updatedAt!=='string'||!receipt.updatedAt)
    return {ok:false,reason:'PRIVACY_RESULT_UNVERIFIED'};
  return {ok:true,updatedAt:receipt.updatedAt};
}
