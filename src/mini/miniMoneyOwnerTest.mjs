/**
 * SecurePay Mini owner's read-only, SYNTHETIC Money scenario.
 * The amount comes from the same Amina/Njeri demo Agreement fixture.
 * No provider, real Agreement or Money authority is created here.
 */
export const MONEY_OWNER_SAMPLE = Object.freeze({
  agreementId: '00000000-0000-4000-8000-000000000071',
  publicReference: 'DEMO-AGR-041',
  title: '40 chairs for Varsityville',
  amountMinor: 400000,
  currency: 'KES',
  source: 'SYNTHETIC_AGREEMENT',
  moneyStatus: 'NOT_FUNDED',
});
export const MONEY_OWNER_SCHEDULES = Object.freeze([
  {id:'FULL',label:'Full amount after completion'},
  {id:'DEPOSIT_BALANCE',label:'30% deposit, 70% balance'},
  {id:'THREE_MILESTONES',label:'30% deposit, 40% progress, 30% completion'},
]);

/**
 * Integer minor-unit allocation, strictly from the frozen synthetic principal.
 * ALWAYS labels every step NON-PAYABLE. No input for actual recipient/amount.
 */
export function moneyOwnerSteps(principalMinor, scheduleId) {
  if (!Number.isSafeInteger(principalMinor)||principalMinor<=0) return null;
  if (!MONEY_OWNER_SCHEDULES.some(s=>s.id===scheduleId)) return null;
  const p=BigInt(principalMinor);
  const round=(percent)=>Number((p*BigInt(percent))/100n);
  let steps;
  if(scheduleId==='FULL'){
    steps=[{label:'After completion',amountMinor:principalMinor}];
  }else if(scheduleId==='DEPOSIT_BALANCE'){
    const deposit=round(30);
    steps=[{label:'Deposit · proposed',amountMinor:deposit},
      {label:'Balance · proposed',amountMinor:principalMinor-deposit}];
  }else{
    const deposit=round(30),progress=round(40);
    steps=[{label:'Deposit · proposed',amountMinor:deposit},
      {label:'Progress · proposed',amountMinor:progress},
      {label:'Completion · proposed',amountMinor:principalMinor-deposit-progress}];
  }
  if(steps.some(s=>!Number.isSafeInteger(s.amountMinor)||s.amountMinor<=0))return null;
  if(steps.reduce((sum,s)=>sum+s.amountMinor,0)!==principalMinor)return null;
  return steps.map((s,i)=>Object.freeze({
    sequence:i+1,label:s.label,amountMinor:s.amountMinor,
    payable:false,recorded:false,sellerApproved:false,simulationOnly:true,
  }));
}
