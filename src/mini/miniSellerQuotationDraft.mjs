/**
 * M5C / seller-proposed terms -> SAME KS001 conversation only.
 * Buyer identity, source->Agreement link and exact two-party acceptance are
 * still server-owned. This creates neither an executable quotation nor a
 * canonical Agreement version. It NEVER sends an invitation or moves money.
 */
const ks=/^KS\d{3,12}$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asText=(x,n)=>typeof x==='string'?x.trim().slice(0,n):'';
const strictMoney=x=>{
  if(typeof x!=='string'||!/^\d{1,10}(?:\.\d{1,2})?$/.test(x.trim()))return null;
  const [whole,frac='']=x.trim().split('.');
  const value=Number(whole)*100+Number((frac+'00').slice(0,2));
  return Number.isSafeInteger(value)&&value>=0&&value<=1000000000000?value:null;
};
const validDate=x=>{
  if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
  const d=new Date(x+'T00:00:00Z');
  return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===x;
};
export function miniSellerQuotationDraft(x){
  if(!x||!ks.test(x.sellerKsNumber)||!ks.test(asText(x.buyerKsNumber,18))||
    x.buyerKsNumber===x.sellerKsNumber||!uuid.test(x.offerId)||
    !asText(x.title,140)||!asText(x.offerUpdatedAt,60)||
    !['KES','USD','EUR'].includes(x.currency)||
    !Number.isSafeInteger(x.publishedPriceMinor)&&x.publishedPriceMinor!==null||
    !/^\d{1,2}$/.test(String(x.quantity))||Number(x.quantity)<1||Number(x.quantity)>20||
    !validDate(x.deliveryDate)||!asText(x.deliveryPlace,100)||
    !['SELLER','BUYER','TO_AGREE'].includes(x.deliveryBy)||
    typeof x.conditions!=='string'||x.conditions.length>180)return null;
  const unitPriceMinor=strictMoney(x.unitPrice);
  if(unitPriceMinor===null)return null;
  const quantity=Number(x.quantity),totalMinor=unitPriceMinor*quantity;
  if(!Number.isSafeInteger(totalMinor))return null;
  const place=asText(x.deliveryPlace,100);
  const when=x.deliveryDate;
  const who=x.deliveryBy==='SELLER'?'I propose to arrange transport':
    x.deliveryBy==='BUYER'?'I propose the buyer arranges transport':
    'transport responsibility is not yet agreed';
  const exceptions=asText(x.conditions,180);
  const statement='I am the seller of a published Store item and want KS001 to DISCUSS a buyer-specific PROPOSAL, not issue an accepted quote or order. '+
    'Store '+x.sellerKsNumber+', offer '+x.offerId+', '+quantity+' x '+asText(x.title,140)+'. '+
    'Buyer nominated by me: '+x.buyerKsNumber+' (unverified). Proposed unit price '+
    x.currency+' '+(unitPriceMinor/100).toFixed(2)+', proposed total '+
    x.currency+' '+(totalMinor/100).toFixed(2)+'. '+
    'Proposed '+(x.deliveryBy==='BUYER'?'collection':'delivery')+' '+when+
    ' at '+place+'; '+who+'. '+
    (exceptions?'Conditions: '+exceptions+'. ':'')+
    'Verify this Store source, buyer identity, quantities, payment responsibility, delivery and explicit separate consent in the exact canonical Agreement version. No stock hold, invitation, booking or Money.';
  if(statement.length>1200)return null;
  return {
    quantity,unitPriceMinor,totalMinor,buyerKsNumber:asText(x.buyerKsNumber,18),
    statement,
    source:{sourceId:x.offerId,sourceOwnerKsNumber:x.sellerKsNumber,
      sourceDescription:'Seller-proposed terms for discussion only; Store listing is not a verified buyer-specific quotation.'},
  };
}
