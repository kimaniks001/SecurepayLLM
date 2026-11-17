/**
 * Short, independent delivery Agreement proposals linked to purchased goods.
 * These are preview-only; neither a basket selection nor a simulated quote
 * authorises a carrier or creates a canonical SecurePay Agreement.
 */
const unique=(items)=>[...new Set(items)];
export const SAMPLE_DELIVERY_WINDOWS={
  next:'Next available slot, confirmed with you before dispatch',
  arrange:'Agree a suitable time with you before dispatch'
};
export function miniDeliveryContracts({choice,lines,destination,window,deliveryQuoteSelected}){
  if(!['ask_sellers','explore_combined'].includes(choice))return [];
  const goods=(Array.isArray(lines)?lines:[]).filter(x=>x.kind==='PRODUCT');
  if(!deliveryQuoteSelected||!goods.length||!destination||
    !Object.prototype.hasOwnProperty.call(SAMPLE_DELIVERY_WINDOWS,window))return [];
  const sellers=unique(goods.map(g=>g.sellerKsNumber));
  const groups=choice==='explore_combined'
    ?[{providerKsNumber:'KS90004',providerName:'Kamakis Transport · Sample',
      goods,feeMinor:45000}]
    :sellers.map(seller=>({
       providerKsNumber:seller,
       providerName:goods.find(g=>g.sellerKsNumber===seller)?.sellerName||'Seller',
       goods:goods.filter(g=>g.sellerKsNumber===seller),
       feeMinor:25000,
     }));
  return groups.map(({providerKsNumber,providerName,goods,feeMinor},index)=>({
    id:'DELIVERY-DRAFT-'+String(index+1),
    kind:'DELIVERY',
    providerKsNumber,providerName,
    pickupStores:unique(goods.map(g=>g.sellerName)),
    goods:goods.map(g=>({sellerKsNumber:g.sellerKsNumber,offerId:g.offerId,
      title:g.title,quantity:g.quantity})),
    destination:String(destination).slice(0,160),
    window:SAMPLE_DELIVERY_WINDOWS[window],
    windowKey:window,feeMinor,currency:'KES',
    customerApprovalRequired:true,customerApproved:false,providerAcceptanceRequired:true,
    providerAccepted:false,
    parentPurchaseId:null,
  }));
}
export function miniDeliveryContractSummary(contracts){
 const fees=contracts.reduce((total,item)=>total+item.feeMinor,0);
 return {count:contracts.length,feeMinor:fees,ready:contracts.length>0&&
   contracts.every(x=>x.goods.length&&x.destination&&x.window&&x.providerKsNumber&&
     Number.isSafeInteger(x.feeMinor)&&x.feeMinor>=0)};
}
