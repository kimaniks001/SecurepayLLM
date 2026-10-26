import { useState } from 'react';
import { Landmark, ShieldCheck, TrendingUp, PiggyBank } from 'lucide-react';

/** Planning arithmetic only: never a quote, yield, live institution offer or executable rail. */
export type VisionOption='bank'|'mmf'|'sacco'|'borrow'|'protect';
const options=[
 {id:'bank',label:'Bank saving',caption:'Plan deposits and a target; no product or rate assumed.',icon:Landmark},
 {id:'mmf',label:'Money Market Fund',caption:'Explore a regulated fund and liquidity, fees and variable returns.',icon:TrendingUp},
 {id:'sacco',label:'SACCO saving',caption:'Consider contributions, eligibility, liquidity and separate borrowing rules.',icon:PiggyBank},
 {id:'borrow',label:'Borrow',caption:'Estimate what a commitment could require; no loan approval implied.',icon:Landmark},
 {id:'protect',label:'Protect',caption:'Budget for possible insurance costs, terms and exclusions.',icon:ShieldCheck},
] as const;
function finiteAmount(text:string,max:number):number|null{
 if(!/^\d+(?:\.\d{1,2})?$/.test(text.trim()))return null;
 const value=Number(text);
 return Number.isFinite(value)&&value>=0&&value<=max?value:null;
}
export function visionScenario(monthly:number,years:number,annualRate:number){
 // Contributions at each month end; the rate is user-defined and purely illustrative.
 const months=Math.round(years*12);
 const rate=annualRate/1200;
 const contributed=monthly*months;
 const projected=rate===0?contributed:monthly*(Math.pow(1+rate,months)-1)/rate;
 return {contributed,projected,months,growth:projected-contributed};
}
export function VisionFinancialPossibilities({onAddToVision}:{onAddToVision?:(note:string)=>void}){
 const [option,setOption]=useState<VisionOption>('mmf');
 const [monthly,setMonthly]=useState('2000');
 const [years,setYears]=useState('5');
 const [rate,setRate]=useState('0');
 const [error,setError]=useState('');
 const amount=finiteAmount(monthly,100000000);
 const horizon=finiteAmount(years,50);
 const assumption=finiteAmount(rate,30);
 const valid=amount!==null&&horizon!==null&&horizon>0&&assumption!==null;
 const savingsMode=option==='bank'||option==='mmf'||option==='sacco';
 const forecast=valid?visionScenario(amount!,horizon!,savingsMode?assumption!:0):null;
 const selected=options.find(x=>x.id===option)!;
 const money=(n:number)=>'KES '+n.toLocaleString('en-KE',{maximumFractionDigits:0});
 const add=()=>{
  if(!onAddToVision||!forecast||amount===null||horizon===null||assumption===null){setError('Enter valid planning assumptions before adding the possibility.');return;}
  const note=['FINANCIAL POSSIBILITY — NOT AN OFFER OR AGREEMENT',
    selected.label,'Monthly planning amount: '+money(amount),
    'Time horizon: '+horizon+' years','User-chosen illustration: '+(savingsMode?assumption:0)+'% annually (not a quoted yield)',
    'Total deposits/budget: '+money(forecast.contributed),
    (savingsMode?'Illustrative end value (monthly compounding; end-month contributions): ':'Long-term budget only (not a loan offer or policy premium): ')+money(forecast.projected),
    'Assumptions only. Verify institution, eligibility, costs, taxes, liquidity, rate changes and risk before deciding.',
    'No financing, insurance cover, investment, deposit or payment has been initiated.'].join('\n');
  onAddToVision(note);
  setError('');
 };
 return <section aria-label="Vision financial possibilities" data-gate-b-financial-possibilities className="space-y-3 rounded-2xl border border-forest-200 bg-white p-4">
  <div><p className="text-[11px] font-semibold uppercase tracking-wider text-forest-700">Vision · A possibility, not a rail</p>
    <h3 className="mt-1 font-display text-xl text-forest-900">What might help fund this dream?</h3>
    <p className="mt-1 text-xs leading-5 text-sand-700">Explore the bigger picture without applying for, buying or activating a financial product.</p></div>
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Financial possibility families">
   {options.map(item=><button type="button" key={item.id} aria-pressed={item.id===option}
     onClick={()=>setOption(item.id)} className={'min-h-20 rounded-xl border p-3 text-left '+(item.id===option?'border-forest-600 bg-forest-50':'border-cream-200 bg-white')}>
     <item.icon size={17} className="text-forest-700"/><span className="mt-2 block text-xs font-semibold">{item.label}</span></button>)}
  </div>
  <p className="text-xs text-sand-700" role="status">{selected.caption}</p>
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
   <label className="text-xs font-medium">Monthly budget (KES)<input aria-label="Monthly planning amount" inputMode="decimal" value={monthly}
    onChange={e=>setMonthly(e.target.value)} className="mt-1 w-full rounded-xl border border-cream-200 p-3"/></label>
   <label className="text-xs font-medium">Years<input aria-label="Planning years" inputMode="decimal" value={years}
    onChange={e=>setYears(e.target.value)} className="mt-1 w-full rounded-xl border border-cream-200 p-3"/></label>
   <label className="text-xs font-medium">{savingsMode?'Illustrative rate % yearly':'Growth rate not applicable'}<input aria-label="Illustrative annual rate" inputMode="decimal" value={savingsMode?rate:'0'} disabled={!savingsMode}
    onChange={e=>setRate(e.target.value)} className="mt-1 w-full rounded-xl border border-cream-200 p-3"/></label>
  </div>
  {forecast?<div className="rounded-xl bg-cream-50 p-3 text-sm" data-gate-b-vision-projection>
    <div className="flex justify-between gap-3"><span>Your total contributions/budget</span><strong>{money(forecast.contributed)}</strong></div>
    <div className="mt-2 flex justify-between gap-3"><span>{savingsMode?'Illustrative end amount':'Long-term budget'}</span><strong>{money(forecast.projected)}</strong></div>
    <p className="mt-2 text-xs text-sand-600">{!savingsMode?'This is spending capacity over time only, not a loan repayment calculation, policy premium or cover quote.':assumption===0?'Zero growth assumed.':'Your chosen rate is hypothetical, not a quoted MMF or bank return.'} This illustration ignores fees, taxes, inflation and rate changes.</p>
  </div>:<p role="alert" className="text-xs text-amber-800">Enter a non-negative amount, 0–30% illustration and a horizon above zero up to 50 years.</p>}
  {onAddToVision?<button type="button" disabled={!valid} onClick={add} className="min-h-11 w-full rounded-xl bg-forest-800 px-4 text-xs font-semibold text-white disabled:opacity-40">Add this possibility to my Dream board (unsaved)</button>
   :<p className="rounded-xl bg-cream-50 p-3 text-xs text-sand-700">Open your own Dream board to add this plan and save it with your existing SecurePay Vision revision.</p>}
  {error&&<p role="alert" className="text-xs text-amber-800">{error}</p>}
  <p className="text-[11px] leading-5 text-sand-600">No live rates, banks, MMFs, SACCO offerings, eligibility or coverage are asserted here. Financial execution belongs to the provider and to an authorised Agreement journey.</p>
 </section>;
}
