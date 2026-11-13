/**
 * Gate 8: read-only proof of API returned NON-PAYABLE metered estimates.
 * The server remains authority for the Agreement, consent and actual usage.
 * Never use these calculations to create a payment or settlement instruction.
 */
export function miniMeasuredArithmeticProof(response,request){
  if(!response||!request)return false;
  const rate=request.proposedRateMinorPerUnit;
  const fixed=request.proposedFixedMinor;
  const used=request.reportedHundredths;
  const cap=request.proposedMaxHundredths;
  if(!Number.isSafeInteger(rate)||rate<=0||
     !Number.isSafeInteger(fixed)||fixed<0||
     !Number.isSafeInteger(used)||used<0||
     (cap!==null&&(!Number.isSafeInteger(cap)||cap<=0||used>cap)))return false;
  if(!['PER_HOUR','PER_KM','PER_KM_PLUS_FIXED'].includes(request.rateBasis))return false;
  if(request.rateBasis!=='PER_KM_PLUS_FIXED'&&fixed!==0)return false;
  if(request.rateBasis==='PER_HOUR' &&
     !['WORK_LOG','MUTUAL_MANUAL'].includes(request.measurementMethod))return false;
  if(request.rateBasis!=='PER_HOUR' &&
     !['ODOMETER','GPS_ROUTE','MUTUAL_MANUAL'].includes(request.measurementMethod))return false;
  const rounded=hundredths=>{
    const product=BigInt(rate)*BigInt(hundredths);
    // Match backend's positive-number HALF_UP_TO_MINOR_UNIT exactly.
    return (product+50n)/100n;
  };
  const total=rounded(used)+BigInt(fixed);
  const maximum=cap===null?null:rounded(cap)+BigInt(fixed);
  if(total>BigInt(Number.MAX_SAFE_INTEGER)||
     (maximum!==null&&maximum>BigInt(Number.MAX_SAFE_INTEGER)))return false;
  return Number.isSafeInteger(response.variableChargeMinor)&&
    Number.isSafeInteger(response.proposedTotalMinor)&&
    response.variableChargeMinor===Number(rounded(used))&&
    response.proposedTotalMinor===Number(total)&&
    (maximum===null?response.proposedMaximumMinor===null:
      response.proposedMaximumMinor===Number(maximum));
}
