/** Sample Mini basket work saved in this browser tab only. */
export const MINI_SAMPLE_BASKET_KEY='securepay.mini.sample-basket-draft.v1';
const cap=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
export function readSampleBasketDraft(storage){
 try{
  const raw=storage?.getItem(MINI_SAMPLE_BASKET_KEY);
  if(!raw)return null;
  const x=JSON.parse(raw);
  if(!x||x.v!==1||!Array.isArray(x.lines)||x.lines.length>20||!x.lines.length)return null;
  const lines=x.lines;
  if(!lines.every(l=>/^KS\d{3,12}$/.test(l.sellerKsNumber)&&
    /^[0-9a-f-]{36}$/i.test(l.offerId)&&Number.isSafeInteger(l.quantity)&&l.quantity>0&&l.quantity<=20&&
    ['PRODUCT','SERVICE'].includes(l.kind)&&
    (l.priceMinor===null||(Number.isSafeInteger(l.priceMinor)&&l.priceMinor>=0))&&
    ['KES'].includes(l.currency)&&typeof l.title==='string'&&l.title.length<180&&
    typeof l.sellerName==='string'&&l.sellerName.length<180&&typeof l.offerUpdatedAt==='string'&&
    typeof l.availabilityState==='string'))return null;
  const answers=x.answers&&typeof x.answers==='object'?
    Object.fromEntries(Object.entries(x.answers).filter(([k,v])=>typeof k==='string'&&k.length<130&&
      typeof v==='string'&&v.length<=240)):{};
  return {lines:lines.map(l=>({...l,description:cap(l.description,700),
    mediaRefs:[],title:cap(l.title,180),sellerName:cap(l.sellerName,180)})),
    fulfilmentChoice:['collect','ask_sellers','explore_combined'].includes(x.fulfilmentChoice)?x.fulfilmentChoice:null,
    answers,deliveryArea:cap(x.deliveryArea,180),
    deliveryQuoteSelected:!!x.deliveryQuoteSelected,
    quoteAccepted:x.quoteAccepted&&typeof x.quoteAccepted==='object'?Object.fromEntries(
      Object.entries(x.quoteAccepted).filter(([k,v])=>typeof k==='string'&&k.length<140&&
       Number.isSafeInteger(v)&&v>0&&v<=100000000)):{},
    savedAt:cap(x.savedAt,40)};
 }catch {return null;}
}
export function saveSampleBasketDraft(storage,packet){
 const lines=packet?.lines;
 if(!Array.isArray(lines)||!lines.length||lines.length>20)return false;
 try{
  storage?.setItem(MINI_SAMPLE_BASKET_KEY,JSON.stringify({v:1,...packet,
    savedAt:new Date().toISOString()}));
  return true;
 }catch{return false;}
}
export function clearSampleBasketDraft(storage){
 try{storage?.removeItem(MINI_SAMPLE_BASKET_KEY);}catch{/* denied */}
}
