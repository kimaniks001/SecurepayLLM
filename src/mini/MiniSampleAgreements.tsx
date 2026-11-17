import {useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle2,ClipboardList,Clock3,Landmark,ShieldCheck} from 'lucide-react';
import type {MiniSamplePurchase} from './miniSampleLivingPurchases.mjs';

const fmt=(n:number)=>'KSh '+(n/100).toLocaleString('en-KE');
const short=(n:string)=>n.replace(/\s*·\s*Sample$/i,'');
export function MiniSampleAgreements({purchases,focusId,onBack,onShop}:{
 purchases:MiniSamplePurchase[];focusId:string|null;onBack:()=>void;onShop:()=>void;
}){
 const [chosen,setChosen]=useState<string|null>(focusId);
 const selected=purchases.find(x=>x.id===chosen)||null;
 return <section className="spm-content spm-sample-agreements" data-sample-agreements="isolated-owner-preview">
   <div className="spm-shop-basket-top">
     <button type="button" className="spm-shop-back" onClick={selected?()=>setChosen(null):onBack}
       aria-label={selected?'Back to all Agreements':'Back to Mini'}><ArrowLeft size={19}/></button>
     <span>{selected?'Living Agreement':'My Agreements'}</span>
     <span className="spm-sample-list-flag">Sample</span>
   </div>
   {!selected?<>
     <div className="spm-shop-basket-intro">
       <small>YOUR SAMPLE AGREEMENTS</small>
       <h1>Every trade has a life.</h1>
       <p>See what has been agreed and funded, and what happens next.</p>
     </div>
     <div className="spm-sample-agreement-list">
       {purchases.map(item=><button type="button" className="spm-sample-agreement-card"
         key={item.id} onClick={()=>setChosen(item.id)}>
         <span className="spm-sample-list-icon"><ClipboardList size={19}/></span>
         <span>
           <strong>{item.title}</strong>
           <small>{fmt(item.amountMinor)} · Sample funded</small>
           <small>Next: {item.progress.find(p=>p.status==='current')?.title||'Follow the agreed work'}</small>
         </span>
         <ArrowRight size={17}/>
       </button>)}
     </div>
     <button type="button" className="spm-shop-proceed" onClick={onShop}>
       <span>Make another purchase</span><ArrowRight size={18}/>
     </button>
   </>:<>
     <div className="spm-sample-agreement-detail">
       <div className="spm-shop-living-light"><CheckCircle2 size={24}/></div>
       <small>LIVING AGREEMENT · DEMONSTRATION</small>
       <h1>{selected.title}</h1>
       <span className="spm-sample-agreement-funding"><ShieldCheck size={16}/>
          Simulated funding confirmed</span>
       <div className="spm-sample-agreement-value">
         <span>Example funded amount</span><strong>{fmt(selected.amountMinor)}</strong>
       </div>
       <div className="spm-sample-agreement-facts">
         <div><Landmark size={15}/> Rail: {selected.rail==='MPESA_STK'?'M-PESA':
           selected.rail==='PESALINK'?'PesaLink':'Choice Bank'}</div>
         <div><Clock3 size={15}/> Payment event: {new Date(selected.fundedAt).toLocaleString('en-KE')}</div>
         <div>Receiving: {selected.delivery}</div>
         <small>Example reference: {selected.id}</small>
       </div>
       <h2>Who is doing what</h2>
       {selected.items.map((item,i)=><div key={item.sellerKsNumber+':'+i} className="spm-sample-duty">
         <strong>{short(item.sellerName)}</strong>
         <small>{item.quantity} × {item.title}</small>
         <small>{fmt(item.amountMinor)} · Separate responsibility</small>
       </div>)}
       <h2>What happens next</h2>
       <div className="spm-sample-timeline">
         {selected.progress.map((p,i)=><div key={i} className={'spm-sample-timeline-item '+p.status}>
           <span>{p.status==='done'?'✓':p.status==='current'?'●':'○'}</span>
           <div><strong>{p.title}</strong>
             <small>{p.status==='done'?'Sample event recorded':p.status==='current'?'In progress · example':'Waiting for earlier steps'}</small>
           </div>
         </div>)}
       </div>
       <p className="spm-shop-gentle-note">This is an isolated sample Living Agreement. Real duties, evidence, refunds, provider confirmations and payments must be verified through the canonical SecurePay systems.</p>
       <button type="button" className="spm-shop-proceed" onClick={()=>setChosen(null)}>
         <span>Back to My Agreements</span><ArrowRight size={17}/>
       </button>
     </div>
   </>}
 </section>;
}
