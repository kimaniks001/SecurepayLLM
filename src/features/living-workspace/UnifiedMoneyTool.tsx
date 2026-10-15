import { useEffect, useState } from 'react';
import { ArrowRight, HandCoins, RefreshCw, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { CurrentUserAgreementSummaryResponse } from '../../api/securepay/agreements/dto';
import { moneyText, minorFromString } from '../money/amount';
import { humanAgreementStatus } from './MoneyAgreementCards';

type Door='my'|'borrow'|'invest'|'protect';
type AgreementsState={state:'idle'|'loading'|'ready'|'error';items:CurrentUserAgreementSummaryResponse[]};
const doors=[
 {id:'my',title:'My Money',icon:Wallet,description:'What needs my attention?',question:''},
 {id:'borrow',title:'Borrow',icon:HandCoins,description:'Could financing help my agreement or dream?',question:'Help me explore responsible financing for my Agreement or dream. Explain real eligibility, costs and repayment, and do not imply approval.'},
 {id:'invest',title:'Invest',icon:TrendingUp,description:'How could I build toward my next milestone?',question:'Help me explore regulated savings and investment possibilities for my dream, explaining liquidity, costs and risk. Do not guarantee returns.'},
 {id:'protect',title:'Protect',icon:ShieldCheck,description:'Would insurance help protect this work?',question:'Help me explore insurance relevant to my Agreement, including premiums, coverage, exclusions, and when insurer-confirmed cover would start. Do not imply cover is active.'},
] as const;
const samples=[
 {title:'My bathroom renovation',purpose:'Tiles, labour and delivery',amount:'KES 85,000',status:'Taking shape',next:'Confirm supplier quotations and delivery.'},
 {title:'Handmade furniture order',purpose:'Table for a customer',amount:'KES 18,000',status:'Needs review',next:'Check the work and the agreed delivery.'},
 {title:'Our monthly chama',purpose:'Eight members contributing together',amount:'KES 2,000 each',status:'Taking shape',next:'Agree on the rules before collecting contributions.'},
] as const;
const sortByAttention=(items:CurrentUserAgreementSummaryResponse[])=>[...items].sort((a,b)=>
 Number(b.attentionRequired||b.nextActions.length>0)-Number(a.attentionRequired||a.nextActions.length>0));
function BriefAmount({agreement}:{agreement:CurrentUserAgreementSummaryResponse}){
 const minor=minorFromString(agreement.proposedAmountMinor);
 return <span className="whitespace-nowrap text-sm font-semibold">{minor===null?'Amount not shown':moneyText(minor,agreement.currency)}</span>;
}

/** Small companion tool, not a second Money page. Financial authority stays with canonical Money. */
export function UnifiedMoneyTool({gateways,signedIn=false,onOpenMoney,onOpenAgreementMoney,onReviewAgreement,onAskKs001}:{
 gateways?:PreviewWorkspaceGateways;
 signedIn?:boolean;
 onOpenMoney:()=>void;
 onOpenAgreementMoney:(agreement:CurrentUserAgreementSummaryResponse,railCode?:string)=>void;
 onReviewAgreement:(agreementId:string)=>void;
 onAskKs001:(text:string)=>Promise<void>;
}){
 const [door,setDoor]=useState<Door>('my');
 const [sample,setSample]=useState(!signedIn);
 const [sampleIndex,setSampleIndex]=useState(0);
 const [agreements,setAgreements]=useState<AgreementsState>({state:'idle',items:[]});
 const [selected,setSelected]=useState<string|null>(null);
 const [showMore,setShowMore]=useState(false);
 const [revision,setRevision]=useState(0);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{if(signedIn)setSample(false);},[signedIn]);
 useEffect(()=>{
   if(sample||!signedIn||!gateways)return;
   let cancelled=false;
   setAgreements({state:'loading',items:[]});
   void gateways.agreements.currentUserAgreements(0,12).then(result=>{
     if(cancelled)return;
     const items=sortByAttention(result.items);
     setAgreements({state:'ready',items});
     setSelected(previous=>items.some(item=>item.agreementId===previous)?previous:items[0]?.agreementId??null);
   }).catch(()=>{if(!cancelled)setAgreements({state:'error',items:[]});});
   return()=>{cancelled=true;};
 },[sample,signedIn,gateways,revision]);
 const selectedAgreement=agreements.items.find(a=>a.agreementId===selected)??null;
 const sampleAgreement=samples[sampleIndex];
 const currentDoor=doors.find(item=>item.id===door)??doors[0];
 const shown=showMore?agreements.items:agreements.items.slice(0,3);
 const next=selectedAgreement?.nextActions[0]?.reason
   || (selectedAgreement?.attentionRequired?'Review this Agreement to see what requires your attention.':'No current action was returned for you.');
 const fundingAction=selectedAgreement?.nextActions.some(a=>a.actionCode==='FUND_AGREEMENT')??false;
 async function explore(){
   if(busy||door==='my')return;
   setBusy(true);setError('');
   try{
     await onAskKs001(currentDoor.question+
       (selectedAgreement?' Refer to my Agreement '+selectedAgreement.publicReference+' only after verifying access.':'')+
       ' Do not disclose this Agreement to any institution without my consent.');
   }catch{
     setError('KS001 could not confirm the conversation. Check your work before retrying.');
   }finally{setBusy(false);}
 }
 return <section aria-label="Money tool" className="space-y-3 p-1 text-sm" data-testid="compact-money-tool">
  <nav aria-label="Money choices" className="grid grid-cols-4 gap-1 rounded-2xl bg-cream-50 p-1">
   {doors.map(item=><button key={item.id} type="button" onClick={()=>setDoor(item.id)}
     aria-pressed={door===item.id}
     className={'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-center '+(door===item.id?'bg-forest-800 text-white':'bg-white text-forest-800')}>
     <item.icon size={18}/><span className="text-[11px] font-semibold">{item.title}</span>
   </button>)}
  </nav>
  {door==='my'?<div className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-display text-lg text-forest-900">My Agreements</h2>
      <div className="flex items-center gap-2">
       {signedIn&&<button type="button" onClick={()=>{setSample(value=>!value);setSelected(null);setShowMore(false);}}
         className="rounded-full border border-cream-200 px-2.5 py-1.5 text-xs">{sample?'My Money':'Try sample'}</button>}
       {!sample&&signedIn&&<button type="button" onClick={()=>setRevision(value=>value+1)}
         className="rounded-full p-2" aria-label="Refresh Agreements"><RefreshCw size={16}/></button>}
      </div>
    </div>
    {sample?<div className="space-y-3 rounded-xl border border-cream-200 bg-white p-3">
      <p className="text-[11px] font-semibold text-sand-600">SAMPLE · No actual Agreement or payment</p>
      <div className="flex items-start justify-between gap-2">
       <div className="min-w-0"><strong className="text-base">{sampleAgreement.title}</strong><p className="mt-0.5 text-xs text-sand-600">{sampleAgreement.purpose}</p></div>
       <strong className="shrink-0 text-sm">{sampleAgreement.amount}</strong>
      </div>
      <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-cream-100 px-2 py-1 text-xs">{sampleAgreement.status}</span>
       <button type="button" onClick={()=>setSampleIndex(current=>(current+1)%samples.length)}
         className="text-xs font-semibold text-forest-700 underline underline-offset-2">Next example</button></div>
      <p className="text-xs text-sand-700">Next: {sampleAgreement.next}</p>
      <button type="button" onClick={onOpenMoney}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-forest-200 bg-cream-50 px-3 font-semibold">
        Open real Money <ArrowRight size={15}/>
      </button>
    </div>:!signedIn?<div className="rounded-xl bg-cream-50 p-3">
      <p>Sign in to see your Agreements and what needs you.</p>
      <button type="button" onClick={onOpenMoney} className="mt-2 min-h-11 rounded-xl bg-forest-800 px-4 font-semibold text-white">Open My Money <ArrowRight size={15} className="inline"/></button>
    </div>:<div className="space-y-2">
      {agreements.state==='loading'&&<p role="status" className="rounded-xl bg-cream-50 p-3 text-xs">Loading your Agreements…</p>}
      {agreements.state==='error'&&<p role="alert" className="rounded-xl bg-cream-50 p-3 text-xs">Couldn't load your Agreements. No financial state is being guessed.</p>}
      {agreements.state==='ready'&&agreements.items.length===0&&<p className="rounded-xl bg-cream-50 p-3 text-xs">No Agreements found here yet. Money can help once you've made a commitment.</p>}
      {agreements.state==='ready'&&shown.map(item=>{
        const status=humanAgreementStatus(item);
        return <button key={item.agreementId} type="button" onClick={()=>setSelected(item.agreementId)} aria-pressed={selected===item.agreementId}
         className={'flex min-h-14 w-full items-center gap-2 rounded-xl border p-3 text-left '+(selected===item.agreementId?'border-forest-400 bg-forest-50':'border-cream-200 bg-white')}>
         <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title}</strong><span className="mt-0.5 block truncate text-xs text-sand-600">{status.label} · {item.purpose||item.publicReference}</span></span>
         <span className="shrink-0 text-right"><BriefAmount agreement={item}/><span className="block text-[10px] text-sand-600">Proposed</span></span>
        </button>;
      })}
      {agreements.items.length>3&&<button type="button" className="min-h-9 text-xs font-semibold text-forest-700" onClick={()=>setShowMore(v=>!v)}>
       {showMore?'Show less':'Show more Agreements'}
      </button>}
      {selectedAgreement&&<div className="rounded-xl bg-cream-50 p-3" aria-label="Next step for this Agreement">
       <p className="text-xs font-semibold text-forest-900">Next: {next}</p>
       <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={()=>onReviewAgreement(selectedAgreement.agreementId)}
         className="min-h-11 rounded-xl border border-forest-200 bg-white px-3 text-xs font-semibold">Review Agreement</button>
        <button type="button" onClick={()=>onOpenAgreementMoney(selectedAgreement)}
         className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white">
         {fundingAction?'Pay this Agreement':'Open Money'} <ArrowRight size={14}/>
        </button>
       </div>
      </div>}
      <button type="button" onClick={onOpenMoney} className="flex min-h-10 items-center gap-1 text-xs font-semibold text-forest-800">
       See all Money & financial details <ArrowRight size={14}/>
      </button>
    </div>}
   </div>:<div className="space-y-3 rounded-xl border border-cream-200 bg-white p-3">
    <h2 className="font-display text-lg text-forest-900">{currentDoor.title}</h2>
    <p className="text-sm leading-6 text-sand-700">{currentDoor.description}</p>
    {door==='protect'&&<p className="text-xs text-sand-600">Find cover relevant to your purchase; confirm the insurer, terms and start of cover before adding it.</p>}
    {door==='borrow'&&<p className="text-xs text-sand-600">Understand costs and repayments before choosing a lender.</p>}
    {door==='invest'&&<p className="text-xs text-sand-600">Explore regulated options and their risks; returns are never guaranteed.</p>}
    <button type="button" disabled={busy} onClick={()=>{if(!signedIn||sample){onOpenMoney();return;}void explore();}}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-3 font-semibold text-white disabled:opacity-50">
      {signedIn&&!sample?'Explore with KS001':'Continue securely'} <ArrowRight size={15}/>
    </button>
    {error&&<p role="alert" className="text-xs text-amber-800">{error}</p>}
  </div>}
  <p className="text-[11px] text-sand-500">Payment rails, provider terms, quotes and authorisation appear when you open the actual Agreement in Money. Nothing is paid or approved here.</p>
 </section>;
