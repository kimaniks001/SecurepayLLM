import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleHelp, Landmark, ShieldCheck, Smartphone } from 'lucide-react';
import type { AgreementFundingOptionResponse } from '../../api/securepay/payment-intent';
import { groupedSettlementOptions, settlementFamily, settlementFamilyTitle } from './settlementRailFamily';

const examples:AgreementFundingOptionResponse[]=[
  {railCode:'SAMPLE_MPESA',displayName:'M-PESA',currency:'KES',minimumAmountMinor:null,maximumAmountMinor:null,quoteAvailable:false},
  {railCode:'SAMPLE_BANK',displayName:'Bank',currency:'KES',minimumAmountMinor:null,maximumAmountMinor:null,quoteAvailable:false},
  {railCode:'SAMPLE_PESALINK',displayName:'PesaLink',currency:'KES',minimumAmountMinor:null,maximumAmountMinor:null,quoteAvailable:false},
];
const isMobile=(name:string)=>name.toLowerCase().includes('mpesa')||name.toLowerCase().includes('m-pesa');
export function MoneyRailCeremony({
  agreementTitle, options, sample, onProceed,
}:{
  agreementTitle:string;options:AgreementFundingOptionResponse[];sample:boolean;
  /** A selection is a preference only, not a payment authority, quote or provider appointment. */
  onProceed:(railCode:string)=>void;
}){
 const [chosen,setChosen]=useState<string|null>(null);
 const [alternatives,setAlternatives]=useState(false);
 useEffect(()=>{setChosen(null);setAlternatives(false);},[agreementTitle,sample]);
 const rails=sample?examples:groupedSettlementOptions(options);
 const selected=rails.find(r=>r.railCode===chosen)||null;
 const visible=alternatives||!selected?rails:[selected];
 return <section aria-label="Choose the financial institution and payment rail" className="space-y-3 rounded-2xl border border-forest-200 bg-white p-4" data-testid="money-rail-ceremony">
  <div className="flex items-center gap-2"><Landmark size={20} className="text-forest-700"/><div><p className="text-xs font-semibold uppercase tracking-wide text-sand-600">The financial choice</p><h3 className="font-display text-xl">Who will handle this payment?</h3></div></div>
  <p className="text-sm leading-6 text-sand-700">For <strong>{agreementTitle}</strong>, examine the route, institution, terms and alternatives before you decide. Choosing here never authorises payment.</p>
  {sample?<p className="rounded-lg bg-cream-50 p-2 text-xs text-sand-600">Practice only. These three rails are illustrations, not verified eligible options for this Agreement.</p>:
  rails.length===0?<p className="rounded-lg bg-cream-50 p-3 text-xs">SecurePay has not returned an eligible funding route for this Agreement. Payment cannot be initiated from this selection.</p>:null}
  <div className="space-y-2">
   {visible.map((rail,index)=>{
    const isSelected=rail.railCode===chosen;
    const Icon=isMobile(rail.displayName)?Smartphone:Landmark;
    return <div key={rail.railCode}>
      {(index===0||settlementFamily(rail)!==settlementFamily(visible[index-1]))&&
        <p className="mb-2 mt-3 text-xs font-bold uppercase tracking-wide text-forest-800">{settlementFamilyTitle[settlementFamily(rail)]}</p>}
      <button type="button" aria-pressed={isSelected}
      onClick={()=>{setChosen(rail.railCode);setAlternatives(false);}}
      className={'flex min-h-16 w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors '+(isSelected?'border-forest-500 bg-forest-50':'border-cream-200 hover:border-forest-300')}>
      <Icon size={20} className="mt-1 shrink-0 text-forest-700"/>
      <span className="min-w-0 flex-1">
       <span className="block text-sm font-semibold">{rail.displayName}</span>
       <span className="block text-xs text-sand-600">{rail.currency} · {sample?'Example, not available to pay':rail.quoteAvailable?'Backend lists a quotation step':'No quotation available for this rail'}</span>
      </span>
      {isSelected&&<CheckCircle2 size={18} className="mt-1 shrink-0 text-forest-700"/>}
      </button>
    </div>;
   })}
  </div>
  {chosen&&rails.length>1&&<button type="button" onClick={()=>setAlternatives(v=>!v)} className="min-h-10 text-sm font-semibold text-forest-700 underline underline-offset-4">{alternatives?'Return to your selection':'Compare '+(rails.length-1)+' other '+(rails.length===2?'option':'options')}</button>}
  {selected&&<div className="space-y-3 rounded-xl border border-cream-200 bg-cream-50 p-3" aria-label="Selected arrangement terms">
    <div className="flex items-center justify-between gap-2"><strong>Proposed arrangement</strong><span className="text-xs text-sand-600">{selected.displayName}</span></div>
    <dl className="space-y-2 text-xs">
     <div className="flex justify-between gap-3"><dt className="text-sand-600">Financial institution</dt><dd className="max-w-[60%] text-right font-semibold">Not yet confirmed</dd></div>
     <div className="flex justify-between gap-3"><dt className="text-sand-600">Payment rail</dt><dd className="text-right font-semibold">{selected.displayName}</dd></div>
     <div className="flex justify-between gap-3"><dt className="text-sand-600">Provider & SecurePay charges</dt><dd className="text-right font-semibold">Quote required</dd></div>
     <div className="flex justify-between gap-3"><dt className="text-sand-600">Total payable</dt><dd className="text-right font-semibold">Not quoted</dd></div>
     <div className="flex justify-between gap-3"><dt className="text-sand-600">Protection / release</dt><dd className="max-w-[60%] text-right font-semibold">Only as established by the Agreement and provider</dd></div>
    </dl>
    <div className="flex items-start gap-2 text-xs leading-5 text-sand-700"><CircleHelp size={16} className="mt-0.5 shrink-0"/><p>The rail is not itself a named bank, guarantor or insurer. SecurePay must establish which institution performs which regulated service before final authorisation. No provider responsibility is being assumed here.</p></div>
    {sample?<p className="rounded-lg bg-white p-2 text-xs">Example only: the next real step would be an Agreement-bound provider quotation, showing named institutional responsibility when available, prices and terms before consent.</p>:
      <button type="button" disabled={!selected.quoteAvailable} onClick={()=>onProceed(selected.railCode)}
       className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
       Review verified terms in Money <ArrowRight size={16}/>
      </button>}
    {!sample&&!selected.quoteAvailable&&<p className="text-xs text-sand-600">This rail has no authoritative quote step at present. You can compare other eligible options instead.</p>}
  </div>}
  <div className="flex items-start gap-2 border-t border-cream-200 pt-3 text-xs text-sand-600"><ShieldCheck size={17} className="mt-0.5 shrink-0"/><p>Selection → verify provider and quote → examine other options → explicitly authorise. No payment occurs in this preview.</p></div>
 </section>;
}
