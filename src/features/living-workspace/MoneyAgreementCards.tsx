import { ArrowRight, CheckCircle2, ChevronRight, Clock3, FileCheck2, FileText } from 'lucide-react';
import type { CurrentUserAgreementSummaryResponse } from '../../api/securepay/agreements/dto';
import { moneyText, minorFromString } from '../money/amount';

export function humanAgreementStatus(a:CurrentUserAgreementSummaryResponse):{label:string;className:string;detail:string}{
 if(a.completion?.completed)return {label:'Completed',className:'bg-forest-100 text-forest-800',detail:'Agreement completion has been recorded.'};
 if(/CANCEL|EXPIRE|DECLIN|REJECT/.test(a.status.toUpperCase()))return {label:'Not active',className:'bg-cream-200 text-sand-700',detail:'Review the Agreement status before taking further action.'};
 if(a.attentionRequired||a.nextActions.length>0)return {label:'Needs you',className:'bg-amber-100 text-amber-900',detail:a.nextActions[0]?.reason||'Your attention is required.'};
 if(/DRAFT|PROPOS|INVIT/.test(a.status.toUpperCase()))return {label:'Taking shape',className:'bg-cream-200 text-sand-700',detail:'This Agreement is still being established.'};
 return {label:'In progress',className:'bg-forest-50 text-forest-800',detail:'No current action for you was returned.'};
}
export function MoneyAgreementCard({agreement,active,onReview,onOpenAgreement,onOpenMoney}:{
 agreement:CurrentUserAgreementSummaryResponse;active:boolean;
 onReview:()=>void;onOpenAgreement:()=>void;onOpenMoney:()=>void;
}){
 const status=humanAgreementStatus(agreement);
 const amount=minorFromString(agreement.proposedAmountMinor);
 const canFund=agreement.nextActions.some(a=>a.actionCode==='FUND_AGREEMENT');
 return <article className={'rounded-2xl border bg-white p-3 '+(active?'border-forest-400 shadow-soft':'border-cream-200')}>
  <button type="button" onClick={onReview} aria-pressed={active} className="w-full text-left">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0">
       <p className="text-base font-semibold text-forest-900">{agreement.title}</p>
       <p className="mt-1 line-clamp-2 text-xs text-sand-600">{agreement.purpose||agreement.publicReference}</p>
      </div><ChevronRight size={17} className="mt-1 shrink-0 text-sand-500"/></div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <span className={'rounded-full px-2.5 py-1 text-xs font-semibold '+status.className}>{status.label}</span>
      <div className="text-right"><strong className="text-sm text-forest-900">{amount==null?'Amount not shown':moneyText(amount,agreement.currency)}</strong><p className="text-[11px] text-sand-600">Proposed · Not a payment confirmation</p></div>
    </div>
    <p className="mt-3 line-clamp-2 text-xs leading-5 text-sand-700">{status.detail}</p>
    {agreement.nextDeadline&&<p className="mt-1 inline-flex items-center gap-1 text-xs text-sand-600"><Clock3 size={13}/> Deadline: {new Date(agreement.nextDeadline).toLocaleDateString()}</p>}
  </button>
  <div className="mt-3 flex flex-wrap gap-2 border-t border-cream-200 pt-3">
   <button type="button" onClick={onOpenAgreement} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-cream-200 px-3 text-xs font-semibold"><FileText size={14}/> Read Agreement</button>
   <button type="button" onClick={onOpenMoney} className="inline-flex min-h-10 items-center gap-1 rounded-full bg-forest-800 px-3 text-xs font-semibold text-white">{canFund?'Pay this Agreement':'View Money & next step'}<ArrowRight size={14}/></button>
  </div>
 </article>;
}
export function SampleMoneyAgreementCard({title,purpose,amount,status,next,active,onReview}:{
 title:string;purpose:string;amount:string;status:string;next:string;active:boolean;onReview:()=>void;
}){
 return <button type="button" onClick={onReview} aria-pressed={active}
 className={'w-full rounded-xl border p-3 text-left '+(active?'border-forest-400 bg-forest-50':'border-cream-200 bg-white')}>
  <div className="flex items-start justify-between gap-2"><div><strong className="text-sm">{title}</strong><p className="mt-1 text-xs text-sand-600">{purpose}</p></div><ChevronRight size={16} className="shrink-0"/></div>
  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
   <span className="rounded-full bg-cream-200 px-2 py-1 text-xs">{status}</span>
   <span className="font-semibold">{amount}</span>
  </div>
  <p className="mt-2 line-clamp-2 text-xs text-sand-600">Next: {next}</p>
 </button>;
}
export function AgreementNextSummary({agreement,onOpenAgreement,onOpenMoney}:{
 agreement:CurrentUserAgreementSummaryResponse;onOpenAgreement:()=>void;onOpenMoney:()=>void;
}){
 const status=humanAgreementStatus(agreement);
 return <section aria-label="Selected Agreement next actions" className="space-y-3 rounded-xl border border-forest-200 bg-white p-4">
  <p className="text-xs font-semibold text-sand-600">AGREEMENT · WHAT HAPPENS NEXT</p>
  <h3 className="font-display text-lg">{agreement.title}</h3>
  <span className={'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold '+status.className}>{status.label}</span>
  <p className="text-sm leading-6 text-sand-700">{status.detail}</p>
  {agreement.nextActions.length>0?<div className="space-y-2">{agreement.nextActions.slice(0,3).map((a,i)=><div key={a.actionCode+'-'+i} className="flex items-start gap-2 rounded-xl bg-cream-50 p-3">
    <FileCheck2 size={16} className="mt-0.5 shrink-0 text-forest-700"/><div><strong className="text-sm">{a.reason||a.actionCode.replace(/_/g,' ')}</strong><p className="mt-1 text-xs text-sand-600">Open the authoritative Agreement or Money action to continue.</p></div>
   </div>)}</div>:<p className="rounded-lg bg-cream-50 p-3 text-xs text-sand-600">No action was returned for you. You can still read the Agreement or inspect its current Money state.</p>}
  <div className="flex flex-wrap gap-2">
   <button type="button" onClick={onOpenAgreement} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cream-200 px-3 text-sm font-semibold"><FileText size={16}/> Review Agreement</button>
   <button type="button" onClick={onOpenMoney} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-800 px-3 text-sm font-semibold text-white"><CheckCircle2 size={16}/> See next Money step <ArrowRight size={14}/></button>
  </div>
 </section>;
}