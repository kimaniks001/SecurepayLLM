/**
 * M5B: compare buyer-selected published offer snapshots with a fresh canonical
 * public Store GET. This is a source-consistency check, NOT an order, seller
 * acceptance, reservation, Agreement amendment or live-money authority.
 */
const possible=new Set(['AVAILABLE','LOW_AVAILABILITY','NEEDS_CONFIRMATION','TAKING_WORK','LIMITED']);
export function miniStoreOfferSnapshotFresh(lines, fresh){
  if(!Array.isArray(lines)||!Array.isArray(fresh)||
    lines.length<1||lines.length>20||fresh.length!==lines.length)return false;
  return lines.every((line,i)=>{
    const row=fresh[i],offer=row?.offer;
    return typeof line.sellerKsNumber==='string'&&typeof line.offerId==='string'&&
      Number.isInteger(line.quantity)&&line.quantity>0&&line.quantity<=20&&
      row?.canonicalKsNumber===line.sellerKsNumber&&
      offer?.id===line.offerId&&offer.title===line.title&&
      offer.updatedAt===line.offerUpdatedAt&&
      offer.priceMinor===line.priceMinor&&offer.currency===line.currency&&
      possible.has(offer.availabilityState)&&
      (offer.quantityAvailable===null||
        Number.isInteger(offer.quantityAvailable)&&offer.quantityAvailable>=line.quantity);
  });
}
