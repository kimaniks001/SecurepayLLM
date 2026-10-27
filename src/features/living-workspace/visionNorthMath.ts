/** True North Vision: illustrative calculations only, never quotations, loan offers or returns.
 * The calculator is pure, bounded, client-side exploration, separate from Money authority.
 */
export interface VisionNumbers {
  goal:number; saved:number; monthly:number; annualReturn:number; loan:number; annualLoanRate:number; loanYears:number;
}
export const initialVisionNumbers:VisionNumbers={
  goal:3000000,saved:500000,monthly:30000,annualReturn:0,loan:0,annualLoanRate:12,loanYears:5,
};
export const clampVision=(value:number,min:number,max:number)=>
  Number.isFinite(value)?Math.min(max,Math.max(min,value)):min;
export function visionScenario(input:VisionNumbers){
  const goal=clampVision(input.goal,0,1_000_000_000);
  const saved=clampVision(input.saved,0,1_000_000_000);
  const monthly=clampVision(input.monthly,0,100_000_000);
  // An illustrative annual growth assumption may be negative; never guarantee it.
  const annualReturn=clampVision(input.annualReturn,-50,50);
  const loan=clampVision(input.loan,0,1_000_000_000);
  const annualLoanRate=clampVision(input.annualLoanRate,0,50);
  const loanYears=clampVision(input.loanYears,1,40);
  const gap=Math.max(0,goal-saved);
  const remaining=Math.max(0,goal-saved-loan);
  const r=Math.pow(1+annualReturn/100,1/12)-1;
  let balance=saved;
  let months: number|null=balance+loan>=goal?0:null;
  for(let i=1;i<=600&&months===null;i++){
    balance=balance*(1+r)+monthly;
    if(balance+loan>=goal)months=i;
  }
  const loanMonths=Math.round(loanYears*12);
  const rate=annualLoanRate/1200;
  const payment=loan===0?0:rate===0?loan/loanMonths:
    loan*rate/(1-Math.pow(1+rate,-loanMonths));
  const totalLoanCost=payment*loanMonths;
  return {goal,saved,monthly,annualReturn,loan,annualLoanRate,loanYears,gap,remaining,
    months,monthlyRepayment:Number.isFinite(payment)?payment:0,
    totalLoanCost:Number.isFinite(totalLoanCost)?totalLoanCost:0};
}
export const visionKes=(n:number)=>'KES '+Math.round(Math.max(0,n)).toLocaleString('en-KE');
