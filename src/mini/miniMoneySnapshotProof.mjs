/**
 * SecurePay Mini M6 — trustworthy READ-ONLY Money view.
 * No fee, payment, movement, "paid" or release state can be constructed
 * from an Agreement title, a Mini simulation or a browser-set amount.
 */
const validText=(s)=>typeof s==='string'&&s.trim().length>0;
export function miniMoneySnapshotProof(snapshot,agreementId,versionId){
  if(!validText(agreementId)||!validText(versionId)||
    !snapshot||typeof snapshot!=='object'||
    snapshot.agreementId!==agreementId||
    snapshot.currentVersionId!==versionId||
    !Array.isArray(snapshot.positions)||
    !Array.isArray(snapshot.fundingOptions)||
    snapshot.fundingOptions.length>50||
    !snapshot.paymentReady||!snapshot.movement||!snapshot.releaseRequest||
    typeof snapshot.feeQuoteRequestsPermitted!=='boolean'||
    !['NOT_EVALUATED','AMBIGUOUS','EVALUATED'].includes(snapshot.paymentReady.state)||
    !['READY','BLOCKED','UNAVAILABLE'].includes(snapshot.movement.state)||
    typeof snapshot.releaseRequest.participantCommandsPermitted!=='boolean'||
    typeof snapshot.releaseRequest.authorityGranted!=='boolean')return false;
  if(snapshot.paymentReady.ready!==null&&typeof snapshot.paymentReady.ready!=='boolean')return false;
  // A blocked or unknown movement must NEVER return a movable amount.
  if(snapshot.movement.state!=='READY'&&snapshot.movement.amountMinor!==null)return false;
  if(snapshot.movement.state==='READY'&&
    (!Number.isSafeInteger(snapshot.movement.amountMinor)||
     snapshot.movement.amountMinor<=0||!validText(snapshot.movement.currency)))return false;
  const used=new Set();
  for(const option of snapshot.fundingOptions){
    if(!option||!validText(option.railCode)||
      !validText(option.displayName)||!validText(option.currency)||
      used.has(option.railCode))return false;
    used.add(option.railCode);
  }
  // A snapshot cannot claim an evaluation if no evaluation was recorded.
  if(snapshot.paymentReady.state!=='EVALUATED'&&snapshot.paymentReady.ready!==null)return false;
  return true;
}
export function miniMoneyStatusLabel(snapshot){
  if(!snapshot)return 'Cannot verify Money';
  if(snapshot.paymentReady.state==='NOT_EVALUATED')return 'Payment readiness not yet evaluated';
  if(snapshot.paymentReady.state==='AMBIGUOUS')return 'Payment readiness needs rechecking';
  if(snapshot.paymentReady.ready===true)return 'Payment readiness evaluated';
  if(snapshot.paymentReady.ready===false)return 'Payment readiness blocked';
  return 'Payment readiness needs rechecking';
}
