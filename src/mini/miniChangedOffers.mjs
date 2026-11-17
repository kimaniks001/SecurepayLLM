/**
 * Buyer-owned reconciliation of Store updates. A changed price, title,
 * availability or quantity is NEVER silently inserted into an Agreement.
 * UI offers explicit Use updated offer / Reduce quantity / Remove item.
 */
import {miniStoreOfferSnapshotFresh} from './miniStoreOfferFresh.mjs';
const sellable=new Set(['AVAILABLE','LOW_AVAILABILITY','NEEDS_CONFIRMATION','TAKING_WORK','LIMITED']);
export function miniChangedOffers(lines,responses){
  if(!Array.isArray(lines)||!Array.isArray(responses)||lines.length!==responses.length)return [];
  return lines.flatMap((line,i)=>{
    const raw=responses[i],detail=raw?.status==='fulfilled'?raw.value:null;
    if(detail?.status==='ACTIVE'&&miniStoreOfferSnapshotFresh([line],[detail]))return [];
    const offer=detail?.canonicalKsNumber===line.sellerKsNumber&&
      detail?.offer?.id===line.offerId?detail.offer:null;
    const valid=!!(detail?.status==='ACTIVE'&&offer&&sellable.has(offer.availabilityState)&&
      Number.isSafeInteger(offer.priceMinor??0)&&
      offer.currency===line.currency);
    const enough=valid&&(offer.quantityAvailable===null||
      Number.isSafeInteger(offer.quantityAvailable)&&offer.quantityAvailable>=line.quantity);
    return [{
      sellerKsNumber:line.sellerKsNumber,offerId:line.offerId,
      title:line.title,wasPriceMinor:line.priceMinor,
      fresh:offer,canUse:valid&&enough,
      maxQuantity:valid&&Number.isSafeInteger(offer.quantityAvailable)?offer.quantityAvailable:null,
      available:valid,
      priceChanged:!!offer&&offer.priceMinor!==line.priceMinor,
      changed:!!offer&&(
        offer.priceMinor!==line.priceMinor||offer.updatedAt!==line.offerUpdatedAt||
        offer.title!==line.title),
    }];
  });
}
