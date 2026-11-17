import {useState} from 'react';
import {ChevronDown, ChevronUp, Eye, ShieldCheck, CircleHelp, AlertCircle, CheckCircle2} from 'lucide-react';
import {miniBasketQuietPreflight} from './miniBasketQuietFairTrade.mjs';
import type {MiniStorePlanLine,MiniBasketFulfilment} from './MiniBuyStore';

/**
 * DISPLAY-ONLY canonical title snapshot, copied exactly from SecurePayAPI
 * services/agreement/src/main/resources/fair-trade/principles-v1.json
 * on 17 November 2026. Never use this snapshot for policy, decisions, pass
 * marks, legal findings or Money. In the real product the API must return
 * canonical principleCoverage and evidence scoped to the Agreement version.
 */
export const FAIR_TRADE_PREVIEW_TITLES=[
 'To Protect Trust',
 'To Safeguard Buyers & Sellers',
 'To Build Long-Term Relationships',
 'To Protect the Reputation of Every Store',
 'To Strengthen the Marketplace',
 'To Honour Our Commitments',
 'To Prevent Exploitation',
 'To Encourage Healthy Competition',
 'To Uphold the Law',
 'To Empower Growth',
 'To Protect Community Goodwill',
 'To Honour Good',
] as const;

type Examination=ReturnType<typeof miniBasketQuietPreflight>;
const n=(count:number,label:string)=>count+' '+label+(count===1?'':'s');
export function MiniFairTradeExaminationPreview({preflight,cart,fulfilmentChoice,buyerQuestions,showcase=false}:{
 preflight:Examination;cart:MiniStorePlanLine[];
 fulfilmentChoice:MiniBasketFulfilment|null;buyerQuestions:number;showcase?:boolean;
}) {
 const [expanded,setExpanded]=useState(showcase);
 const [showLenses,setShowLenses]=useState(showcase);
 const incomplete=preflight.pendingProviderRequests.length;
 const goods=cart.filter(x=>x.kind==='PRODUCT');
 const priced=cart.every(x=>x.priceMinor!==null);
 const sellers=[...new Set(cart.map(x=>x.sellerKsNumber))];
 const relevant=cart.length>0;
 const considerations=[
   ...preflight.pendingProviderRequests.map(request=>({
     label:request.title,
     content:request.topics.map(x=>x.question).join(' '),
     reason:'The Store has not yet agreed these terms. Its answer belongs to the provider.',
     source:request.source.offerId,sourceVersion:request.source.offerUpdatedAt,
   })),
   ...(!priced&&cart.length?[{label:'Price still to agree',
     content:'Ask the relevant Store for a quotation before the amount can be agreed.',
     reason:'A published item without a price is not a seller quotation.',
     source:'',sourceVersion:''}]:[]),
   ...(buyerQuestions>0?[{label:'One of your preferences needs clarifying',
     content:'The basket will ask the next useful question above.',
     reason:'Your answer is a proposal until the relevant provider agrees.',
     source:'',sourceVersion:''}]:[]),
 ];
 const evidence=[
   {label:'Who',value:sellers.length?n(sellers.length,'Store')+' identified from the selected offers':
     'No Store selected yet',note:'The people accepting and receiving Money still require authorisation.'},
   {label:'What',value:cart.length?cart.map(x=>x.quantity+' × '+x.title).join(' · '):
     'Choose something first',note:'Exact goods and services come from the published Store offers.'},
   {label:'Where',value:fulfilmentChoice==='collect'?'You would collect the goods':
     preflight.wwwwWh.where.source==='BUYER_PROPOSED'?
       preflight.wwwwWh.where.detail.replace(/^Buyer proposes /,''):
       'Collection, delivery or service place not yet settled',
     note:'Only ask for a place when it matters to this trade.'},
   {label:'When',value:incomplete?'Service dates or start terms need the provider':
     cart.some(x=>x.kind==='SERVICE')?'Service timing requires agreement':
     'No specific service appointment needed for browsing',
     note:'A preference does not become a guaranteed appointment.'},
   {label:'Why',value:'Your purpose matters when it changes the agreement',
     note:'No compulsory “why” question for an ordinary purchase.'},
   {label:'How',value:!priced?'A quotation is needed':
     'Selected prices are visible; payment and handover need agreement',
     note:'Published prices alone cannot authorise payment.'},
 ];
 return <section className="spm-fair-inspection" data-mini-fair-examination-preview="non-authoritative"
   aria-label="See how SecurePay would examine this trade">
   <button className="spm-fair-inspection-toggle" type="button"
     onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}
     aria-controls="mini-fair-inspection-panel">
     <span className="spm-fair-inspection-icon"><Eye size={18}/></span>
     <span className="spm-fair-inspection-toggle-copy">
       <strong>See the Fair Trade check</strong>
       <small>{!relevant?'A peek at how your basket is understood':
         considerations.length?n(considerations.length,'detail')+' worth clarifying':
           'What SecurePay understands about this proposal'}</small>
     </span>
     {expanded?<ChevronUp size={18}/>:<ChevronDown size={18}/>}
   </button>
   {expanded&&<div className="spm-fair-inspection-panel" id="mini-fair-inspection-panel">
     <div className="spm-fair-inspection-heading">
       <small>FAIR TRADE · OWNER PREVIEW</small>
       <h2>Behind your basket</h2>
       <p>Here is what SecurePay can read from your choices and what still needs agreement.
         You don't have to complete a checklist.</p>
     </div>
     <div className="spm-fair-inspection-summary">
       <div className="spm-fair-inspection-summary-icon"><ShieldCheck size={20}/></div>
       <div>
         <strong>{!relevant?'Choose something to begin':
           considerations.length?'Some details still need agreement':
           'Your proposal is coming together'}</strong>
         <small>{relevant?n(cart.length,'offer')+' · '+n(sellers.length,'Store')+' · '+
           n(preflight.sourceReferences.filter(Boolean).length,'source reference'):
           'No Agreement has been created'}</small>
       </div>
     </div>
     <h3>What do we understand?</h3>
     <div className="spm-fair-evidence-list">
       {evidence.map(item=><div key={item.label} className="spm-fair-evidence-row">
         <span className="spm-fair-evidence-name">{item.label}</span>
         <div><strong>{item.value}</strong><small>{item.note}</small></div>
       </div>)}
     </div>
     <h3>{considerations.length?'What is worth clarifying?':'What happens next?'}</h3>
     {considerations.length?considerations.map((item,i)=><div className="spm-fair-attention" key={i}>
       <div className="spm-fair-attention-head"><AlertCircle size={16}/><strong>{item.label}</strong></div>
       <p>{item.content}</p>
       <small>{item.reason}</small>
       {item.source&&<details><summary>Where this comes from</summary>
         <p>Published offer: {item.source}</p>
         <p>Store version observed: {item.sourceVersion}</p>
       </details>}
     </div>):<div className="spm-fair-follow">
       <CheckCircle2 size={17}/>
       <p>Review the proposal. Each party still confirms its own responsibilities.</p>
     </div>}
     <div className="spm-fair-lenses">
       <button type="button" className="spm-fair-lenses-toggle" onClick={()=>setShowLenses(v=>!v)}
         aria-expanded={showLenses}>
         <span><strong>The 12 Fair Trade principles</strong>
           <small>Canonical principles · assessment not yet performed by the server</small></span>
         {showLenses?<ChevronUp size={17}/>:<ChevronDown size={17}/>}
       </button>
       {showLenses&&<ol className="spm-fair-lenses-list">
         {FAIR_TRADE_PREVIEW_TITLES.map((title,i)=><li key={title}>
           <span className="spm-fair-lens-number">{i+1}</span>
           <span><strong>{title}</strong><small>Not yet assessed</small></span>
         </li>)}
       </ol>}
     </div>
     <div className="spm-fair-truth">
       <CircleHelp size={16}/>
       <p><strong>This is a demonstration of the examination view, not a Fair Trade approval.</strong>
         The 12 principles have not been assessed by SecurePayAPI for this sample basket.
         Real fairness observations, participant acceptance and payment readiness must
         come from the authorised backend on the exact Agreement version.</p>
     </div>
   </div>}
 </section>;
}
