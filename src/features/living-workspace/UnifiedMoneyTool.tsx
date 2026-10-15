import { useEffect, useState } from 'react';
import { ArrowRight, Banknote, CheckCircle2, ChevronRight, CircleAlert, Clock3, FileText, Handshake, Landmark, PiggyBank, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { CurrentUserAgreementSummaryResponse } from '../../api/securepay/agreements/dto';
import type { AgreementMoneySnapshotResponse } from '../../api/securepay/money-snapshot';
import type { RegulatedPartnerResponse } from '../../api/securepay/financial-partners';
import { moneyText, minorFromString } from '../money/amount';

type Read<T>={state:'idle'|'loading'|'ready'|'error';value:T;message:string};
const ready=<T,>(value:T):Read<T>=>({state:'idle',value,message:''});
const demoAgreements=[
 {key:'bathroom',title:'My bathroom renovation',purpose:'Tiles, labour and delivery',proposed:'KES 85,000',funded:'Not funded',next:'Confirm supplier quotations and delivery arrangements',kind:'Building'},
 {key:'table',title:'Handmade furniture order',purpose:'A finished table, inspected before delivery',proposed:'KES 18,000',funded:'Sample funding confirmed',next:'Inspect the finished work and check the agreed release conditions',kind:'Furniture'},
 {key:'chama',title:'Our monthly chama',purpose:'Eight friends · agreed contributions',proposed:'KES 2,000 per person',funded:'Not shown',next:'Confirm governance and invitations before collecting contributions',kind:'Group'},
] as const;
const financePaths=[
 {title:'Pay & receive',icon:Banknote,description:'M-PESA, bank rails and PesaLink when the transaction and provider actually support them.',question:'Explain which regulated payment rails are supported for my Agreement and the total cost before I authorise anything.'},
 {title:'Save & grow',icon:PiggyBank,description:'Explore savings, SACCO and managed-fund options through authorised institutions. No account or return is promised.',question:'Help me consider savings and investment options and their costs, access restrictions and risks. Do not imply availability or returns.'},
 {title:'Finance a plan',icon:Landmark,description:'Explore bank or SACCO financing against a real purpose, requirements, terms and risks.',question:'Help me understand possible financing needs, repayment obligations and eligibility checks. Do not claim I am approved.'},
 {title:'Protect the work',icon:ShieldCheck,description:'Consider suitable insurance for goods, delivery and projects where a verified provider offers it.',question:'Help me identify insurance questions for this trade. Do not imply coverage exists or claim a quote.'},
];
const demoTruth='ILLUSTRATIVE EXPERIENCE · No live accounts, payments, rates or financial offers';
function PlainAmount({minor,currency}:{minor:number|null|undefined;currency:string|null|undefined}){
 return <span>{minor==null?'Amount unavailable':currency?moneyText(minor,currency):'Currency not confirmed'}</span>;
}
function PartnerList({partners}:{partners:Read<RegulatedPartnerResponse[]>}){
 return <section aria-label="Regulated financial partners" className="space-y-3">
  <div><h3 className="font-display text-lg">Institutions supporting money</h3>
   <p className="mt-1 text-xs text-sand-600">Only SecurePay's current partner record can establish a listed status. Listing is not a customer offer, product approval or guarantee of a live payment route.</p></div>
  {partners.state==='loading'&&<p role="status" className="text-xs text-sand-600">Checking partner records…</p>}
  {partners.state==='error'&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs">Could not verify financial partners. No institutions are being guessed.</p>}
  {partners.state==='ready'&&partners.value.length===0&&<p className="rounded-xl bg-cream-50 p-3 text-xs">No partners were returned by the current SecurePay directory. This does not establish that any particular financial service is available.</p>}
  {partners.state==='ready'&&partners.value.slice(0,20).map(partner=><article key={partner.id} className="rounded-xl border border-cream-200 bg-white p-3">
    <div className="flex items-start justify-between gap-2">
     <div><p className="text-sm font-semibold">{partner.displayName}</p><p className="text-xs text-sand-600">{partner.partnerType} · {partner.supportedCurrencies.join(', ')||'Currency not shown'}</p></div>
     <span className="rounded-full bg-cream-100 px-2 py-1 text-[11px] text-sand-700">{partner.status.replace(/_/g,' ')}</span>
    </div>
    {partner.capabilities.length>0&&<div className="mt-2 flex flex-wrap gap-1">{partner.capabilities.slice(0,6).map((cap,i)=><span key={i} className="rounded-full border border-cream-200 px-2 py-1 text-[10px]">{cap.capability.replace(/_/g,' ')} · {cap.enabled?'listed enabled':'not enabled'}</span>)}</div>}
    <p className="mt-2 text-[11px] text-sand-600">A partner's status or capability flag is not proof of customer eligibility, account availability, fee quotation, transaction readiness or financial-product approval.</p>
   </article>)}
  {partners.state==='ready'&&partners.value.length>20&&<p className="text-xs text-sand-600">Showing the first 20 partner records. Open Money for the canonical financial experience.</p>}
 </section>;
}
export function UnifiedMoneyTool({gateways,signedIn=false,onOpenMoney,onAskKs001}:{gateways?:PreviewWorkspaceGateways;signedIn?:boolean;onOpenMoney:()=>void;onAskKs001:(text:string)=>Promise<void>}){
 const [sample,setSample]=useState(true);
 const [selectedSample,setSelectedSample]=useState<string>('bathroom');
 const [agreements,setAgreements]=useState<Read<CurrentUserAgreementSummaryResponse[]>>(ready([]));
 const [partners,setPartners]=useState<Read<RegulatedPartnerResponse[]>>(ready([]));
 const [selected,setSelected]=useState<string|null>(null);
 const [snapshot,setSnapshot]=useState<Read<AgreementMoneySnapshotResponse|null>>(ready(null));
 const [revision,setRevision]=useState(0);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [sampleQuestion,setSampleQuestion]=useState('');
 const selectedDemo=demoAgreements.find(agreement=>agreement.key===selectedSample)||demoAgreements[0];
 const realAgreement=agreements.value.find(agreement=>agreement.agreementId===selected)||null;
 useEffect(()=>{
  if(sample||!signedIn||!gateways)return;
  let cancelled=false;
  setAgreements({state:'loading',value:[],message:''});
  setPartners({state:'loading',value:[],message:''});
  void gateways.agreements.currentUserAgreements(0,12).then(result=>{
   if(!cancelled)setAgreements({state:'ready',value:result.items,message:''});
  }).catch(()=>{if(!cancelled)setAgreements({state:'error',value:[],message:'Could not read your Agreements'});});
  void gateways.financialPartners.list().then(result=>{
   if(!cancelled)setPartners({state:'ready',value:result,message:''});
  }).catch(()=>{if(!cancelled)setPartners({state:'error',value:[],message:'Could not read financial partner records'});});
  return()=>{cancelled=true;};
 },[sample,signedIn,gateways,revision]);
 useEffect(()=>{
  if(sample||!signedIn||!gateways||!selected){setSnapshot(ready(null));return;}
  let cancelled=false;setSnapshot({state:'loading',value:null,message:''});
  void gateways.moneySnapshot.read(selected).then(value=>{
    if(!cancelled)setSnapshot({state:'ready',value,message:''});
  }).catch(()=>{if(!cancelled)setSnapshot({state:'error',value:null,message:'Could not read current Money snapshot'});});
  return()=>{cancelled=true;};
 },[sample,signedIn,gateways,selected,revision]);
 async function ask(question:string){
  if(busy)return;
  setBusy(true);setError('');
  try{await onAskKs001(question);}catch{setError('KS001 could not confirm the turn. Check the conversation before retrying.');}
  finally{setBusy(false);}
 }
 const selectedSnapshot=snapshot.state==='ready'?snapshot.value:null;
 return <section aria-label="Money and financial institutions in one tool" className="space-y-4 text-sm">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><p className="text-xs text-sand-600">SecurePay Money</p><h2 className="font-display text-2xl text-forest-900">Money follows the agreement.</h2></div>
    {!sample&&signedIn&&<button type="button" onClick={()=>setRevision(v=>v+1)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cream-200 px-3 text-xs"><RefreshCw size={14}/> Refresh</button>}
   </div>
   <p className="max-w-2xl leading-6 text-sand-700">See the work, the money behind it, the next decision, and the institutions that might help you move forward. One experience, without mistaking a promise for a payment.</p>
   <div className="flex items-center justify-between gap-2 rounded-xl border border-cream-200 bg-white p-2">
    <span className="px-1 text-xs font-medium text-sand-600">Explore Money</span>
    <div className="flex gap-1">
     <button type="button" aria-pressed={sample} onClick={()=>{setSample(true);setError('');}} className={sample?'rounded-full bg-forest-800 px-3 py-2 text-xs text-white':'rounded-full border border-cream-200 px-3 py-2 text-xs'}>Sample</button>
     <button type="button" aria-pressed={!sample} onClick={()=>{setSample(false);setError('');}} className={!sample?'rounded-full bg-forest-800 px-3 py-2 text-xs text-white':'rounded-full border border-cream-200 px-3 py-2 text-xs'}>My Money</button>
    </div>
   </div>
   {sample?<div className="space-y-4">
     <p className="rounded-lg bg-cream-50 p-3 text-xs text-sand-600">{demoTruth}</p>
     <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl border border-cream-200 bg-white p-3"><p className="text-xs text-sand-600">Your commitments</p><p className="mt-1 font-display text-xl">3 examples</p><p className="mt-1 text-xs text-sand-600">Not an account balance</p></div>
      <div className="rounded-xl border border-cream-200 bg-white p-3"><p className="text-xs text-sand-600">What needs attention</p><p className="mt-1 font-display text-xl">2 examples</p><p className="mt-1 text-xs text-sand-600">Review before acting</p></div>
     </div>
     <div className="space-y-2"><h3 className="font-display text-lg">Money attached to real life</h3>
      {demoAgreements.map(agreement=><button type="button" key={agreement.key} onClick={()=>{setSelectedSample(agreement.key);setSampleQuestion('');}} aria-pressed={agreement.key===selectedSample}
       className={agreement.key===selectedSample?'w-full rounded-xl border border-forest-300 bg-cream-50 p-3 text-left':'w-full rounded-xl border border-cream-200 bg-white p-3 text-left'}>
       <div className="flex items-center justify-between gap-2"><strong className="text-sm">{agreement.title}</strong><ChevronRight size={16}/></div>
       <p className="mt-1 text-xs text-sand-600">{agreement.purpose}</p>
       <p className="mt-2 font-semibold">{agreement.proposed} <span className="text-xs font-normal text-sand-600">· {agreement.funded}</span></p>
      </button>)}
     </div>
     <article className="space-y-3 rounded-2xl border border-forest-200 bg-white p-4" aria-label="Sample Agreement Money detail">
      <p className="text-xs font-semibold text-sand-600">YOUR NEXT FINANCIAL STEP · SAMPLE</p>
      <h3 className="font-display text-lg">{selectedDemo.title}</h3>
      <div className="rounded-xl bg-cream-50 p-3"><p className="font-semibold">{selectedDemo.next}</p><p className="mt-2 text-xs text-sand-600">Nothing has been approved, funded, released or booked by this example.</p></div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
       <div className="rounded-lg border border-cream-200 p-2"><FileText size={17} className="mx-auto mb-1"/>Agreement<br/><span className="text-sand-600">Review</span></div>
       <div className="rounded-lg border border-cream-200 p-2"><Wallet size={17} className="mx-auto mb-1"/>Funding<br/><span className="text-sand-600">Confirm</span></div>
       <div className="rounded-lg border border-cream-200 p-2"><Handshake size={17} className="mx-auto mb-1"/>Fulfilment<br/><span className="text-sand-600">Evidence</span></div>
      </div>
      <div className="flex flex-wrap gap-2">{['What can move now?','How are charges calculated?','What must the other party confirm?'].map(question=><button key={question} onClick={()=>setSampleQuestion(question)} type="button"
       className={sampleQuestion===question?'rounded-full bg-forest-800 px-3 py-2 text-xs text-white':'rounded-full border border-cream-200 px-3 py-2 text-xs'}>{question}</button>)}</div>
      {sampleQuestion&&<p role="status" className="rounded-lg bg-cream-50 p-3 text-xs">{sampleQuestion==='What can move now?'?'No authority has been established in this sample. Real Money must verify Agreement readiness, funding, release rights and the payment provider.':sampleQuestion==='How are charges calculated?'?'Actual SecurePay fees, provider rail charges, taxes and the total payable must be quoted transparently before payment. Example amounts are not quotes.':'A supplier must accept their own terms, quantities, delivery and conditions. One buyer project never silently commits other people.'}</p>}
     </article>
   </div>:!signedIn?<div className="rounded-xl bg-cream-50 p-4"><p className="font-semibold">Your private Money requires sign-in</p><p className="mt-1 text-xs text-sand-600">The sample is available without access. The canonical Money page handles authentication and authorised financial actions.</p>
    <button type="button" onClick={onOpenMoney} className="mt-3 min-h-11 rounded-xl bg-forest-800 px-4 text-xs font-semibold text-white">Open Money securely <ArrowRight size={14} className="ml-1 inline"/></button></div>:<div className="space-y-4">
     <div className="rounded-xl border border-cream-200 bg-cream-50 p-3"><div className="flex items-center gap-2"><ShieldCheck size={17}/><strong>Only confirmed financial records count.</strong></div>
      <p className="mt-1 text-xs text-sand-600">Amounts proposed in an Agreement are not necessarily funded, paid, held, settled or withdrawable. Select an Agreement to inspect its current backend Money snapshot.</p></div>
     <section aria-label="Your Agreements" className="space-y-2"><h3 className="font-display text-lg">Your Agreements</h3>
      {agreements.state==='loading'&&<p role="status" className="text-xs text-sand-600">Reading your Agreements…</p>}
      {agreements.state==='error'&&<p role="alert" className="text-xs">Could not read your Agreements. No amounts are being guessed.</p>}
      {agreements.state==='ready'&&agreements.value.length===0&&<p className="rounded-lg bg-cream-50 p-3 text-xs">No Agreements were returned for this page. Money will appear when a financial commitment exists.</p>}
      {agreements.state==='ready'&&agreements.value.map(item=><button type="button" key={item.agreementId} onClick={()=>setSelected(item.agreementId)} aria-pressed={selected===item.agreementId}
       className={selected===item.agreementId?'w-full rounded-xl border border-forest-300 bg-cream-50 p-3 text-left':'w-full rounded-xl border border-cream-200 bg-white p-3 text-left'}>
       <div className="flex items-center justify-between gap-2"><strong>{item.title}</strong><ChevronRight size={16}/></div>
       <p className="mt-1 line-clamp-2 text-xs text-sand-600">{item.purpose||item.publicReference}</p>
       <p className="mt-2 text-xs font-medium">{item.proposedAmountMinor==null?'Proposed amount not shown':moneyText(minorFromString(item.proposedAmountMinor),item.currency)} <span className="font-normal text-sand-600">· Proposed, not funded · {item.status.replace(/_/g,' ')}</span></p>
       {item.attentionRequired&&<p className="mt-1 flex items-center gap-1 text-xs"><CircleAlert size={14}/> Needs your attention</p>}
      </button>)}
      {agreements.state==='ready'&&agreements.value.length===12&&<p className="text-xs text-sand-600">Showing 12 Agreements. Open Money for the complete paginated list.</p>}
     </section>
     {realAgreement&&<section aria-label="Verified Agreement Money" className="space-y-3 rounded-2xl border border-forest-200 bg-white p-3">
      <div><p className="text-xs font-semibold text-sand-600">AGREEMENT MONEY · BACKEND RECORD</p><h3 className="mt-1 font-display text-lg">{realAgreement.title}</h3></div>
      {snapshot.state==='loading'&&<p role="status" className="text-xs">Checking funding and release authority…</p>}
      {snapshot.state==='error'&&<p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs">Could not verify the current Money state. No funding or payment authority is inferred.</p>}
      {selectedSnapshot&&<div className="space-y-3">
       <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-cream-50 p-3"><p className="text-xs text-sand-600">Payment ready</p><p className="mt-1 font-semibold">{selectedSnapshot.paymentReady.state!=='EVALUATED'?'Not evaluated':selectedSnapshot.paymentReady.ready?'Evaluated ready':'Not ready'}</p></div>
        <div className="rounded-xl bg-cream-50 p-3"><p className="text-xs text-sand-600">Money movement</p><p className="mt-1 font-semibold">{selectedSnapshot.movement.state==='READY'?'Preflight ready':selectedSnapshot.movement.state==='BLOCKED'?'Blocked':'Unavailable'}</p></div>
       </div>
       {selectedSnapshot.positions.length===0&&<p className="text-xs text-sand-600">No established money positions were returned for this Agreement.</p>}
       {selectedSnapshot.positions.map((position,index)=><div key={position.obligationId||index} className="rounded-xl border border-cream-200 p-3">
        <p className="font-semibold">{position.obligationTitle||'Agreement Money position'}</p><p className="mt-1 text-xs text-sand-600">{position.established?'Established':'Proposed position · not established'}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
         <div><p className="text-sand-600">Authorised maximum</p><p className="font-semibold"><PlainAmount minor={position.authorisedMaxAmountMinor} currency={position.currency}/></p></div>
         <div><p className="text-sand-600">Funded</p><p className="font-semibold"><PlainAmount minor={position.fundedTotalMinor} currency={position.currency}/></p></div>
         <div><p className="text-sand-600">Progressed</p><p className="font-semibold"><PlainAmount minor={position.exercisedOrSettledMinor} currency={position.currency}/></p></div>
         <div><p className="text-sand-600">Remaining funded</p><p className="font-semibold"><PlainAmount minor={position.remainingFundedMinor} currency={position.currency}/></p></div>
        </div>
        <p className="mt-2 text-xs text-sand-600">{position.providerSettlementCertified?'Provider settlement certified for this position.':'Provider settlement is not certified for this position.'}</p>
       </div>)}
       <p className="rounded-lg bg-cream-50 p-3 text-xs">{selectedSnapshot.movement.state==='READY'
        ? 'The backend preflight is ready for its evaluated scope. This does not itself give you authority to initiate a payment.'
        : 'Money cannot be assumed movable. Review Agreement conditions and the canonical Money controls.'}</p>
       <button type="button" disabled={busy} onClick={()=>void ask('Help me understand the financial status of Agreement '+realAgreement.publicReference+'. Verify it from the authorised Money records before advising. Do not claim payment authority, provider availability or settlement from the preview.')}
        className="min-h-10 rounded-full border border-cream-200 px-3 text-xs">Ask KS001 about this Agreement</button>
      </div>}
     </section>}
     <PartnerList partners={partners}/>
     {error&&<p role="alert" className="text-xs text-amber-800">{error}</p>}
    </div>}
   <section aria-label="Financial institutions and services" className="space-y-3 border-t border-cream-200 pt-4">
    <h3 className="font-display text-lg">Financial help, in the same place</h3>
    <p className="text-xs text-sand-600">A person starts with what they need, not an institution's product catalogue. Availability, requirements, rates, risks and eligibility must be verified before any application.</p>
    <div className="grid grid-cols-2 gap-2">
     {financePaths.map(path=><div key={path.title} className="space-y-2 rounded-xl border border-cream-200 bg-white p-3">
       <path.icon size={20} className="text-forest-700"/>
       <p className="text-sm font-semibold">{path.title}</p>
       <p className="text-xs leading-5 text-sand-600">{path.description}</p>
       {sample?<p className="text-[11px] text-sand-600">Explore in real Money when available.</p>:
       <button type="button" disabled={busy} onClick={()=>void ask(path.question)}
        className="min-h-9 rounded-full border border-cream-200 px-2 text-xs">Ask KS001 <ChevronRight size={13} className="inline"/></button>}
      </div>)}
    </div>
    {!sample&&error&&<p role="alert" className="text-xs text-amber-800">{error}</p>}
   </section>
   <div className="rounded-xl bg-cream-50 p-3">
    <div className="flex items-center gap-2"><CheckCircle2 size={17} className="text-forest-700"/><strong>Money should follow the agreement.</strong></div>
    <p className="mt-1 text-xs text-sand-600">The complete authorised Money experience remains in one canonical place. No payment, account connection, financing application, insurance purchase or settlement is made from this workspace preview.</p>
    <button type="button" onClick={onOpenMoney} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-3 font-semibold text-white">Open SecurePay Money <ArrowRight size={16}/></button>
   </div>
 </section>;
}