/**
 * M8: independent, read-only verification of the API's NON-PAYABLE
 * payment-schedule preview. Never calculates a charge for execution.
 * The API remains sole authority for Agreement terms, prices and consent.
 */
export function miniExactScheduleSplitProof(result) {
  if (!result || !Array.isArray(result.proposedSteps) ||
      !Number.isSafeInteger(result.principalMinor) ||
      result.principalMinor<=0) return false;
  const principal=result.principalMinor;
  // Backend uses integer minor units, truncating each percentage division.
  const portion=p=>Number(BigInt(principal)*BigInt(p)/100n);
  let expected;
  if(result.scheduleType==='FULL_ON_COMPLETION'){
    if(result.depositPercent!==null||result.progressPercent!==null)return false;
    expected=[principal];
  }else if(result.scheduleType==='DEPOSIT_AND_BALANCE'){
    const d=result.depositPercent;
    if(!Number.isInteger(d)||d<1||d>99||result.progressPercent!==null)return false;
    const deposit=portion(d);
    expected=[deposit,principal-deposit];
  }else if(result.scheduleType==='DEPOSIT_PROGRESS_COMPLETION'){
    const d=result.depositPercent,p=result.progressPercent;
    if(!Number.isInteger(d)||!Number.isInteger(p)||
       d<1||p<1||d+p>=100)return false;
    const deposit=portion(d),progress=portion(p);
    expected=[deposit,progress,principal-deposit-progress];
  }else return false;
  if(result.proposedSteps.length!==expected.length||
     !expected.every(n=>Number.isSafeInteger(n)&&n>0))return false;
  let sum=0;
  for(let i=0;i<expected.length;i++){
    const step=result.proposedSteps[i];
    if(!step||step.sequence!==i+1||step.amountMinor!==expected[i]||
       step.payable!==false||typeof step.label!=='string'||!step.label.trim()||
       typeof step.checkpoint!=='string'||!step.checkpoint.trim())return false;
    sum+=step.amountMinor;
    if(!Number.isSafeInteger(sum))return false;
  }
  return sum===principal;
}
