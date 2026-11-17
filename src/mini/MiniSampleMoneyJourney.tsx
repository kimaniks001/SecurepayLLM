import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle2,Smartphone,Landmark,ShieldCheck,Clock3,ArrowLeftRight} from 'lucide-react';
import {makeSampleLivingPurchase,type MiniSamplePurchase,type MiniSampleRail} from './miniSampleLivingPurchases.mjs';
import type {MiniStorePlanLine} from './MiniBuyStore';
import type {MiniDeliveryContract} from './miniDeliveryContract.mjs';

const fmt=(n:number)=>'KSh '+(n/100).toLocaleString('en-KE');
const rails=[
 {id:'CHOICE_KS_ACCOUNT' as const,title:'Choice Bank',details:'Bank-account payment through the authorised Choice integration.',icon:Landmark},
 {id:'MPESA_STK' as const,title:'M-PESA',details:'A phone approval request on your handset, when enabled.',icon:Smartphone},
 {id:'PESALINK' as const,title:'PesaLink',details:'Bank-to-bank payment via the Choice-mediated rail.',icon:ArrowLeftRight},
];
export function MiniSampleMoneyJourney({lines,amountMinor,delivery,deliveryFeeMinor,deliveryProvider,deliveryContracts,onBack,
 onConfirmed,onViewAgreements}:{
 lines:MiniStorePlanLine[];amountMinor:number;delivery:string;deliveryFeeMinor:number;
 deliveryProvider:string|null;deliveryContracts:MiniDeliveryContract[];onBack:()=>void;onConfirmed:(purchase:MiniSamplePurchase)=>void;
 onViewAgreements:()=>void;
}) {
 const [rail,setRail]=useState<MiniSampleRail|null>(null);
 const [stage,setStage]=useState<'choose'|'pending'|'confirmed'>('choose');
 const [receipt,setReceipt]=useState<MiniSamplePurchase|null>(null);
 const completed=useRef(false);
 const selected=rails.find(x=>x.id===rail);
 const start=()=>{
   if(!rail||stage!=='choose'||completed.current)return;
   setStage('pending');
 };
 useEffect(()=>{
   if(!rail||stage!=='pending'||completed.current)return;
   // Sandbox test double: a fictional provider confirms after the customer's
   // explicit Pay action. A real provider NEVER auto-confirms here.
   const id=window.setTimeout(()=>{
     if(completed.current)return;
     const purchase=makeSampleLivingPurchase({lines,rail,delivery,
       deliveryFeeMinor,deliveryProvider,deliveryContracts});
     if(!purchase)return;
     completed.current=true;
     setReceipt(purchase);
     setStage('confirmed');
     onConfirmed(purchase);
   },1200);
   return()=>window.clearTimeout(id);
   // The pending payment packet is fixed when the customer selected a rail.
   // Callback and merchant revisions are deliberately not live here.
   // eslint-disable-next-line react-hooks/exhaustive-deps
 },[stage,rail]);
 return <div className="spm-sample-money" aria-label="Sample payment and Living Agreement">
   {stage!=='confirmed'&&<button type="button" className="spm-shop-continue" onClick={onBack}>
     <ArrowLeft size={16}/> Back to Agreement
   </button>}
   <div className="spm-sample-money-intro">
     <small>SECUREPAY MONEY · SAFE SAMPLE</small>
     <h2>{stage==='confirmed'?'Your purchase is in motion':
       stage==='pending'?'Checking your payment':'Choose how to pay'}</h2>
     <p>{stage==='confirmed'?'The example payment has been confirmed and your Living Agreement is ready.':
       'Choose how to fund this sample Agreement. Only rails certified for the exact real payment would be offered outside this rehearsal.'}</p>
   </div>
   <div className="spm-sample-money-amount">
     <span>{stage==='confirmed'?'Simulated amount paid':'Amount to fund'}</span>
     <strong>{fmt(amountMinor)}</strong>
     <small>Includes any separate delivery mini Agreements. No real provider fee quote.</small>
   </div>
   {stage==='choose'&&<>
     <div className="spm-sample-rails" role="group" aria-label="Choose sample payment rail">
       {rails.map(r=><button key={r.id} type="button" className={rail===r.id?'selected':''}
         aria-pressed={rail===r.id} onClick={()=>setRail(r.id)}>
         <r.icon size={19}/>
         <span><strong>{r.title}</strong><small>{r.details}</small></span>
         <span className="spm-sample-rail-circle">{rail===r.id&&<CheckCircle2 size={16}/>}</span>
       </button>)}
     </div>
     {selected&&<div className="spm-sample-money-caution">
       <ShieldCheck size={17}/>
       <span>{rail==='MPESA_STK'?'No real STK push or PIN will be requested.':
         rail==='PESALINK'?'No real bank-to-bank transfer will be initiated.':
         'No bank account or payment instruction is needed.'} This is only a payment rehearsal.</span>
     </div>}
     <button type="button" className="spm-shop-proceed" disabled={!rail} onClick={start}>
       <span>{rail?'Pay '+fmt(amountMinor)+' with '+selected?.title+' · sample':'Choose a payment method'}</span><ArrowRight size={18}/>
     </button>
   </>}
   {stage==='pending'&&<div className="spm-sample-payment-pending">
      <Clock3 size={24}/>
      <h3>Waiting for payment confirmation</h3>
      <p>{selected?.title} selected. A real payment would remain pending until the provider confirms the transaction.</p>
      <p>A fictional payment confirmation is arriving automatically. No real provider has been contacted or money moved.</p>
   </div>}
   {stage==='confirmed'&&receipt&&<>
     <div className="spm-sample-money-success" role="status">
       <div className="spm-shop-living-light"><CheckCircle2 size={24}/></div>
       <strong>Payment confirmed in this sample</strong>
       <p>{selected?.title} · {fmt(receipt.amountMinor)}</p>
       <small>{receipt.id} · Fictional receipt, no actual transaction.</small>
     </div>
     <div className="spm-shop-living-demo">
       <small>NOW LIVING · EXAMPLE AGREEMENT</small>
       <h3>{receipt.title}</h3>
       <p>Payment is complete in this rehearsal. The next work belongs to each provider.</p>
       {receipt.progress.map((p,i)=><div key={i}>
         <strong>{p.status==='done'?'✓':p.status==='current'?'●':'○'} {p.title}</strong>
         <small>{p.status==='current'?'Up next':p.status==='upcoming'?'To follow':'Sample completed'}</small>
       </div>)}
     </div>
     <button type="button" className="spm-shop-proceed" onClick={onViewAgreements}>
       <span>View in My Agreements</span><ArrowRight size={18}/>
     </button>
     <p className="spm-shop-gentle-note">The real Mini Agreements and Money screens still require the authenticated SecurePayAPI and certified payment-provider evidence.</p>
   </>}
 </div>;
}
