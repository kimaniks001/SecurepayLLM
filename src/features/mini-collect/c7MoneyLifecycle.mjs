/**
 * C7 human status projection, not a payment client.
 * C5B proposals, C6 examination, C4 ledger truth and C4 calculated returns
 * are intentionally separate: never infer "paid" from a review, screenshot,
 * status text or proposed refund.
 */
export const C7_MONEY_STAGES = Object.freeze([
  Object.freeze({id:'item',title:'Your original item',hint:'The bill, product, period or contribution purpose stays linked to you'}),
  Object.freeze({id:'review',title:'Your own Agreement',hint:'You decide on the exact terms; that does not automatically debit you'}),
  Object.freeze({id:'money',title:'Money confirmed by the provider',hint:'A real accepted provider event must match the original payer and ledger'}),
  Object.freeze({id:'outcome',title:'What happens after closing',hint:'Your individual return rights depend on the original Agreement and verified unused funds'}),
]);
export const C7_FUNDING_STATES = Object.freeze({
  PLEDGE_ONLY:'Intention only — nothing verified as received',
  PAYMENT_PENDING:'Payment is being checked',
  INCOMPLETE_PAYMENT_SOURCE:'Original provider and ledger record are incomplete',
  PAYMENT_SOURCE_CONFLICT:'Payment or source does not agree — needs investigation',
  POSTED_AWAITING_PROVIDER_CERTIFICATION:'Ledger entry exists; regulated provider certification is pending',
  VERIFIED_FUNDING:'Independently certified original funding',
});
export function summarizeC7Money(page) {
  if (!page) return Object.freeze({
    hasAuthoritativeRecords:false,
    originalItems:[],
    funding:[],
    proposedReturnMinor:null,
    verifiedFundedMinor:null,
    refundSettled:false,
    recurringDebitAuthorized:false,
    noticesDelivered:false,
    noSourceProof:true,
  });
  // An API response must be from the authenticated user’s personal endpoint;
  // Mini cannot create or certify it from answer pills or sample data.
  const originalItems=Array.isArray(page.originalItems)?page.originalItems:[];
  const contributions=Array.isArray(page.contributionRecords)?page.contributionRecords:[];
  const funded=contributions.filter(c=>c?.state==='VERIFIED_PROVIDER_FUNDING'
    &&c?.providerCertified===true
    &&Number.isSafeInteger(c.verifiedFundedAmountMinor)
    &&c.verifiedFundedAmountMinor>=0);
  const verifiedFundedMinor=page.totalIsComplete === true
    && funded.length===contributions.length
    && funded.length>0
    ? funded.reduce((sum,c)=>sum+c.verifiedFundedAmountMinor,0) : null;
  const r=page.returnStatus;
  const proposedReturnMinor=r?.status==='CALCULATED_NOT_AUTHORIZED'
    &&Number.isSafeInteger(r?.proposedReturnMinor)
    &&r.proposedReturnMinor>=0?r.proposedReturnMinor:null;
  return Object.freeze({
    hasAuthoritativeRecords:true,
    originalItems:Object.freeze(originalItems),
    funding:Object.freeze(contributions),
    proposedReturnMinor,
    verifiedFundedMinor:Number.isSafeInteger(verifiedFundedMinor)?verifiedFundedMinor:null,
    refundSettled:false, // C7 backend cannot certify refunds yet
    recurringDebitAuthorized:false,
    noticesDelivered:false,
    noSourceProof:funded.length===0,
  });
}
export function canCollectMoneyFromC7Preview(){return false;}
