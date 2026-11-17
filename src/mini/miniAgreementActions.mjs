/**
 * Mini's three-way Agreement exit is a HUMAN CHOICE, not a workflow ladder.
 * For an ordinary fixed-price, published ready-to-supply sale, the buyer may
 * choose Money directly; sending a SecureLink is optional.
 *
 * This local function is ONLY for the owner-only simulated shopping preview.
 * It must never grant real seller acceptance, an accepted Agreement, payment
 * eligibility, ledger custody, regulated rail authorisation or Fair Trade pass.
 * SecurePayAPI performs those independently on the exact source/Agreement
 * version in production.
 */
const readyStock=new Set(['AVAILABLE','LOW_AVAILABILITY']);
export function miniStraightSaleMoneyPreview(lines,{
  sourceFresh=false,basketReady=false,questionsComplete=false,
  fulfilmentChoice=null,deliveryContracts=[],providerRequests=[],
  priceQuoted=false,
}={}){
 const offers=Array.isArray(lines)?lines:[];
 const open=[];
 if(!offers.length)open.push('Choose an item first.');
 if(!sourceFresh)open.push('Confirm the latest Store offers.');
 if(!basketReady||!questionsComplete)
   open.push('Complete the outstanding basket details.');
 if(!priceQuoted||offers.some(x=>!Number.isSafeInteger(x.priceMinor)||x.priceMinor<0))
   open.push('A fixed published price is required.');
 if(offers.some(x=>!readyStock.has(x.availabilityState)))
   open.push('The Store must confirm availability or a service appointment.');
 if(offers.some(x=>x.kind==='PRODUCT')&&fulfilmentChoice!=='collect')
   open.push('A separate delivery provider must confirm the delivery Agreement.');
 if(Array.isArray(deliveryContracts)&&deliveryContracts.length)
   open.push('A separate delivery Agreement needs its provider.');
 if(Array.isArray(providerRequests)&&providerRequests.length)
   open.push('The service provider must clarify the published terms.');
 return {
   canOpenMoney:open.length===0,
   reason:open[0]||null,
   requiresSecureLink:false,
   // This is a proposed direct checkout, never inferred counterparty acceptance.
   backendAuthorised:false,
 };
}
