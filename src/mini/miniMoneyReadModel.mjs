/**
 * Money views only consume server-owned Agreement snapshots and existing
 * payment-intent records. None of the helpers can infer payment from a
 * simulation, quote, arbitrary response code or Agreement total.
 */
const positive=n=>Number.isSafeInteger(n)&&n>0;
const text=s=>typeof s==='string'&&s.trim().length>0;
const code=s=>typeof s==='string'&&/^[A-Z]{3}$/.test(s);
const statuses=new Set([
  'CREATED','INITIATION_PENDING','ACTION_REQUIRED','PROVIDER_PENDING',
  'CONFIRMATION_PENDING','CONFIRMED','FAILED','EXPIRED','CANCELLED',
]);
export function miniMoneyIntentListProof(reply){
  if(!reply||!Array.isArray(reply.items)||reply.items.length>10||
    reply.page!==0||!Number.isInteger(reply.size)||reply.size<1||reply.size>10||
    !Number.isSafeInteger(reply.totalElements)||reply.totalElements<0)return false;
  const seen=new Set();
  for(const intent of reply.items){
    if(!intent||!text(intent.id)||seen.has(intent.id)||
      !statuses.has(intent.status)||!positive(intent.amountMinor)||
      !code(intent.currency)||typeof intent.retryEligible!=='boolean'||
      typeof intent.createdAt!=='string'||typeof intent.lastStateChangeAt!=='string'||
      (intent.latestAttemptStatus!==null&&typeof intent.latestAttemptStatus!=='string'))
      return false;
    // A terminal confirmed intent is NEVER eligible for new Money retry.
    if(intent.status==='CONFIRMED'&&intent.retryEligible)return false;
    seen.add(intent.id);
  }
  return true;
}
export function miniMoneyIntentDetailProof(detail,summary,agreementId){
  if(!detail||!summary||detail.id!==summary.id||
    detail.agreementId!==agreementId||detail.status!==summary.status||
    detail.amountMinor!==summary.amountMinor||
    detail.currency!==summary.currency||
    !statuses.has(detail.status)||
    typeof detail.actionRequired!=='boolean'||
    typeof detail.providerConfirmationAccepted!=='boolean'||
    typeof detail.conflictDetected!=='boolean')return false;
  // Provider confirmation is NOT itself credited funds or settlement.
  if(detail.providerConfirmationAccepted&&detail.status!=='CONFIRMED')return false;
  if(detail.conflictDetected&&detail.providerConfirmationAccepted)return false;
  return true;
}
export function miniMoneyFeeQuoteProof(quote,agreementId,versionId,rail){
  if(!quote||!rail||quote.agreementId!==agreementId||
    !text(versionId)||quote.railCode!==rail.railCode||
    quote.currency!==rail.currency||
    !text(quote.quoteReference)||!positive(quote.amountMinor)||
    !code(quote.currency)||!Number.isSafeInteger(quote.securePayReceivableMinor)||
    quote.securePayReceivableMinor<0||
    !Number.isSafeInteger(quote.platformChargeMinor)||
    quote.platformChargeMinor<0||
    !['READY','BLOCKED'].includes(quote.economicState)||
    !text(quote.economicReasonCode)||!text(quote.expiresAt)||
    !(Date.parse(quote.expiresAt)>Date.now()))return false;
  for(const field of ['providerCostMinor','providerChargeMinor','totalChargeMinor']){
    if(quote[field]!==null&&(!Number.isSafeInteger(quote[field])||quote[field]<0))return false;
  }
  // An unusable economic quote may be shown as blocked, NEVER as payable.
  return true;
}
export function miniMoneyIntentStatus(status){
  switch(status){
    case 'CREATED':return 'Prepared, not sent';
    case 'INITIATION_PENDING':case 'PROVIDER_PENDING':case 'CONFIRMATION_PENDING':
      return 'Awaiting provider reconciliation — do not retry';
    case 'ACTION_REQUIRED':return 'Provider action required — verify before continuing';
    case 'CONFIRMED':return 'Provider confirmed — check Agreement funding separately';
    case 'FAILED':return 'Provider reported failure';
    case 'EXPIRED':return 'Attempt expired';
    case 'CANCELLED':return 'Cancelled';
    default:return 'Payment status unavailable';
  }
}
