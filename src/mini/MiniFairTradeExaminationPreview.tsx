import {useState} from 'react';
import {AlertCircle,ChevronDown,ChevronUp,Eye,Info} from 'lucide-react';
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
const n=(value:number,label:string)=>value+' '+label+(value===1?'':'s');

export function MiniFairTradeExaminationPreview({preflight,cart,fulfilmentChoice,buyerQuestions,showcase=false}:{
 preflight:Examination;cart:MiniStorePlanLine[];
 fulfilmentChoice:MiniBasketFulfilment|null;buyerQuestions:number;showcase?:boolean;
}) {
 // One short, human-first check. Full examination is always another optional
 // layer. The owner showcase expands ONLY this summary, not twelve rows.
 const [expanded,setExpanded]=useState(showcase);
 const [details,setDetails]=useState(false);
 const [showLenses,setShowLenses]=useState(false);
 const sellers=[...new Set(cart.map(x=>x.sellerKsNumber))];
 const hasCart=cart.length>0;
 const providerRequests=preflight.pendingProviderRequests;
 const unpriced=cart.filter(x=>x.priceMinor===null);
 const needCount=providerRequests.length+unpriced.length+buyerQuestions;
 const sourceCount=preflight.sourceReferences.filter(Boolean).length;
 const summary=hasCart
   ? n(cart.length,'item')+' from '+n(sellers.length,'Store')
   : 'Choose something to begin';
 const next=providerRequests.length
   ? 'Ask the provider to clarify the terms before acceptance.'
   : buyerQuestions>0
   ? 'Answer the next basket question.'
   : unpriced.length>0
   ? 'Request a price from the Store.'
   : 'Review the proposal and send it to the right people.';

 const firstRequest=providerRequests[0];
 const firstIssues=firstRequest?.topics.map(t=>t.code==='COVERAGE'?'what maintenance covers':
   t.code==='SERVICE_START'?'when coverage starts':t.question);
 const alertText=firstRequest
   ? firstRequest.title+': confirm '+(firstIssues||[]).join(' and ')+
       (providerRequests.length>1?' (and '+(providerRequests.length-1)+' other provider request'+
         (providerRequests.length>2?'s':'')+')':'')+'.'
   : buyerQuestions>0
   ? n(buyerQuestions,'answer')+' still needed from you.'
   : unpriced.length>0
   ? n(unpriced.length,'price')+' to confirm with the seller.'
   : 'No further question detected from these published details.';

 const essentials=[
   ['Who',hasCart?n(sellers.length,'Store')+' identified':'Not selected'],
   ['What',hasCart?n(cart.length,'item')+' in the proposal':'No item yet'],
   ['Where',fulfilmentChoice==='collect'?'Collection chosen':
     preflight.wwwwWh.where.source==='BUYER_PROPOSED'?
       'Proposed delivery location recorded':'To be arranged if relevant'],
   ['When',cart.some(x=>x.kind==='SERVICE')?
     'Service timing to be agreed':'No service appointment needed yet'],
   ['Why','Only ask when the purpose changes the terms'],
   ['How',unpriced.length?'Seller quotation needed':'Terms, acceptance and payment follow'],
 ];
 return <section className="spm-fair-inspection spm-fair-compact"
   data-mini-fair-examination-preview="non-authoritative"
   aria-label="See how SecurePay would examine this trade">
   <button className="spm-fair-inspection-toggle" type="button"
     onClick={()=>setExpanded(value=>!value)}
     aria-expanded={expanded}
     aria-controls="mini-fair-inspection-panel">
     <span className="spm-fair-inspection-icon"><Eye size={17}/></span>
     <span className="spm-fair-inspection-toggle-copy">
       <strong>Fair Trade check</strong>
       <small>{!hasCart?'A quiet check before agreement':
         needCount?n(needCount,'detail')+' to clarify':'Ready to prepare for review'}</small>
     </span>
     {expanded?<ChevronUp size={17}/>:<ChevronDown size={17}/>}
   </button>
   {expanded&&<div className="spm-fair-inspection-panel" id="mini-fair-inspection-panel">
     <div className="spm-fair-compact-row">
       <span className="spm-fair-compact-label">Understood</span>
       <strong>{summary}</strong>
     </div>
     <div className="spm-fair-compact-row spm-fair-compact-attention">
       <span className="spm-fair-compact-label">Needs attention</span>
       <strong>{alertText}</strong>
     </div>
     <div className="spm-fair-compact-row">
       <span className="spm-fair-compact-label">Next</span>
       <strong>{next}</strong>
     </div>
     <div className="spm-fair-compact-footer">
       <span><Info size={13}/> Sample preview · 12 principles not yet assessed</span>
       <button type="button" onClick={()=>setDetails(v=>!v)} aria-expanded={details}>
         {details?'Hide details':'See details'}
         {details?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
       </button>
     </div>
     {details&&<div className="spm-fair-compact-deep">
       <h3>Six essentials of a clear Agreement</h3>
       <div className="spm-fair-compact-essentials">
         {essentials.map(([label,value])=><div key={label}>
           <b>{label}</b><span>{value}</span>
         </div>)}
       </div>
       {firstRequest&&<div className="spm-fair-compact-source">
         <AlertCircle size={14}/>
         <div>
           <strong>Question for {firstRequest.supplierLabel}</strong>
           <p>{firstRequest.topics.map(t=>t.question).join(' ')}</p>
           <details>
             <summary>Offer source and version</summary>
             <p>Offer: {firstRequest.source.offerId}</p>
             <p>Published: {firstRequest.source.offerUpdatedAt}</p>
           </details>
         </div>
       </div>}
       <button className="spm-fair-compact-lenses-btn" type="button"
         onClick={()=>setShowLenses(v=>!v)} aria-expanded={showLenses}>
         <span>The 12 Fair Trade principles</span>
         {showLenses?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
       </button>
       {showLenses&&<ol className="spm-fair-compact-lenses-list">
         {FAIR_TRADE_PREVIEW_TITLES.map((title,i)=><li key={title}>
           <span>{i+1}.</span><strong>{title}</strong>
         </li>)}
       </ol>}
       <p className="spm-fair-compact-disclaimer">
         This is a demonstration of the examination view, not a Fair Trade approval.
         The 12 principles have not been assessed by SecurePayAPI for this sample basket.
         Real examination, seller acceptance and Money authorisation come from
         the canonical server for the accepted Agreement version.
       </p>
       <small className="spm-fair-compact-sources">Source references recorded: {sourceCount}</small>
     </div>}
   </div>}
 </section>;
}
