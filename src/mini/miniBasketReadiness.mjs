/**
 * The Mini basket is a buyer's proposed composition of independently owned
 * published Store offers; it does not create seller acceptance or Money rights.
 *
 * Only ask questions justified by facts the Store actually publishes.
 * Current market-store-v1 offers do NOT publish shipping requirements, so
 * collection/delivery is a buyer choice needed for physical goods in this
 * first composition slice, not a claim that any provider can deliver.
 */
export function miniBasketReadiness(lines, {sourcesFresh=false, fulfilmentChoice=null}={}){
  const offers=Array.isArray(lines)?lines:[];
  const goods=offers.some(o=>o?.kind==='PRODUCT');
  const missing=[];
  if(!offers.length)missing.push('Add at least one offer.');
  if(goods && !['collect','ask_sellers','explore_combined'].includes(fulfilmentChoice))
    missing.push('Choose how you would like to receive the goods.');
  if(offers.length && !sourcesFresh)
    missing.push('Check the current published offers.');
  const sellers=[...new Set(offers.map(o=>o.sellerKsNumber).filter(Boolean))];
  const currencyCodes=[...new Set(offers.map(o=>o.currency).filter(Boolean))];
  const allPricesKnown=offers.length>0&&offers.every(o=>Number.isSafeInteger(o.priceMinor)&&o.priceMinor>=0);
  const amountMinor=allPricesKnown&&currencyCodes.length===1
    ?offers.reduce((sum,o)=>sum+(o.priceMinor*o.quantity),0):null;
  const totalMinor=Number.isSafeInteger(amountMinor)?amountMinor:null;
  return {
    itemCount:offers.length,
    sellerCount:sellers.length,
    goods,
    missing,
    readyToReview:missing.length===0,
    // Separate rights: no amount of buyer clicking makes a seller accept or
    // creates a regulated multiple-beneficiary payment instruction.
    sellerConfirmationRequired:true,
    readyToPay:false,
    totalMinor,
    currency:currencyCodes.length===1?currencyCodes[0]:null,
    amountNeedsQuote:!allPricesKnown,
    fulfilmentChoice:goods?fulfilmentChoice:null,
  };
}
