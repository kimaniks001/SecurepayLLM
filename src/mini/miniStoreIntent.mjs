/**
 * Buyer-intended shopping plan from freshly rechecked public Store offers.
 * NOT a seller quotation, accepted order, stock reservation or payment.
 * One listing can be bound to the canonical AgentController.useOffer source.
 * Multiple listings are separately attributed buyer statements, never a
 * fake single commercial source or combined seller acceptance.
 */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ks=/^KS\d{3,12}$/;
const text=(v,max)=>typeof v==='string' ? v.trim().slice(0,max) : '';
export function miniStoreIntent(lines){
  if(!Array.isArray(lines)||lines.length<1||lines.length>20) return null;
  const seen=new Set();
  const safe=[];
  for(const line of lines){
    if(!line || !ks.test(line.sellerKsNumber) || !uuid.test(line.offerId) ||
      !Number.isInteger(line.quantity) || line.quantity<1 || line.quantity>20 ||
      !text(line.title,140) || !text(line.sellerName,90) ||
      !['KES','USD','EUR'].includes(line.currency) ||
      (line.priceMinor!==null&&(!Number.isSafeInteger(line.priceMinor)||line.priceMinor<0)))
      return null;
    const key=line.sellerKsNumber+':'+line.offerId;
    if(seen.has(key))return null;
    seen.add(key);
    safe.push({key,offerId:line.offerId,sellerKsNumber:line.sellerKsNumber,
      sellerName:text(line.sellerName,90),title:text(line.title,140),
      quantity:line.quantity,priceMinor:line.priceMinor,currency:line.currency});
  }
  const header='I want to DISCUSS a buying plan, not place an order. Keep each Store and seller separate; do not assume availability, delivery, price, or acceptance. ';
  const rows=safe.map((s,i)=>String(i+1)+') '+s.quantity+' x '+s.title+
    ' | '+s.sellerName+' ('+s.sellerKsNumber+') | Offer '+s.offerId+
    ' | displayed '+(s.priceMinor===null?'price to confirm':
      s.currency+' '+(s.priceMinor/100).toFixed(2)+' per unit')+'.');
  const tail=' Please ask where, when, and how delivery and each seller approval should work. No payments or stock reservation.';
  const statement=header+rows.join(' ')+tail;
  if(statement.length>5000)return null; // refuse truncation hiding a seller.
  return {
    kind:safe.length===1?'single':'multi',
    lines:safe,statement,
    source:safe.length===1?{
      sourceId:safe[0].offerId,sourceOwnerKsNumber:safe[0].sellerKsNumber,
      sourceDescription:'Buyer-selected public Store offer. Unit price and stock require seller confirmation.'
    }:null,
    distinctSellers:new Set(safe.map(s=>s.sellerKsNumber)).size,
  };
}
