import {useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle2,ChevronDown,ShieldCheck,Sparkles,Truck,Warehouse,House} from 'lucide-react';
import {communitySaverPreScreen,communitySaverRules} from './communitySaverPreScreen.mjs';

/** An isolated, fictional OWNER REVIEW of the Phase 7 mathematics.
 * Not a live notification, capacity check, Plug job or Agreement adjustment.
 */
const cases=[
  {code:'MY_RIDE' as const,name:'My Ride',short:'Nyeri delivery',icon:Truck,
    items:[
      {agreementId:'fictional-mabati',agreementVersionId:'v1-example',itemId:'transport-mabati',baselineMinor:1000000,currency:'KES' as const,label:'Trader A · Mabati lorry'},
      {agreementId:'fictional-boards',agreementVersionId:'v1-example',itemId:'transport-boards',baselineMinor:400000,currency:'KES' as const,label:'Trader B · Interior boards'}
    ],carrierOrHostCostMinor:1000000,otherIncrementalCostMinor:10000,additionalProviderRewardMinor:0},
  {code:'SHORTSTAYS' as const,name:'Shortstays',short:'Compatible guest stay',icon:House,
    items:[
      {agreementId:'fictional-stay-a',agreementVersionId:'v1-example',itemId:'nights',baselineMinor:1200000,currency:'KES' as const,label:'Guest A · Accommodation'},
      {agreementId:'fictional-stay-b',agreementVersionId:'v1-example',itemId:'nights',baselineMinor:800000,currency:'KES' as const,label:'Guest B · Accommodation'}
    ],carrierOrHostCostMinor:1370000,otherIncrementalCostMinor:80000,additionalProviderRewardMinor:0},
  {code:'STORAGE' as const,name:'Storage',short:'Shared capacity',icon:Warehouse,
    items:[
      {agreementId:'fictional-storage-a',agreementVersionId:'v1-example',itemId:'space',baselineMinor:600000,currency:'KES' as const,label:'Trader A · Storage'},
      {agreementId:'fictional-storage-b',agreementVersionId:'v1-example',itemId:'space',baselineMinor:400000,currency:'KES' as const,label:'Trader B · Storage'}
    ],carrierOrHostCostMinor:670000,otherIncrementalCostMinor:50000,additionalProviderRewardMinor:0}
] as const;
const shillings=(minor:number)=>'KSh '+(minor/100).toLocaleString('en-KE',{minimumFractionDigits:0,maximumFractionDigits:2});
export function MiniCommunitySaverPreview({onBack}:{onBack:()=>void}){
  const [selected,setSelected]=useState(0);
  const [details,setDetails]=useState(false);
  const [rules,setRules]=useState(false);
  const current=cases[selected];
  const quote=communitySaverPreScreen({
    platformCode:current.code,
    items:current.items.map(x=>({
      agreementId:x.agreementId,agreementVersionId:x.agreementVersionId,
      itemId:x.itemId,baselineMinor:x.baselineMinor,currency:x.currency
    })),
    carrierOrHostCostMinor:current.carrierOrHostCostMinor,
    otherIncrementalCostMinor:current.otherIncrementalCostMinor,
    additionalProviderRewardMinor:current.additionalProviderRewardMinor
  });
  return <section data-mini-community-saver-preview className="spm-saver">
    <button type="button" className="spm-quiet-button" onClick={onBack}>
      <ArrowLeft size={16}/> Back to Mini
    </button>
    <div className="spm-saver-intro">
      <span className="spm-saver-eyebrow"><Sparkles size={15}/> COMMUNITY SAVER</span>
      <h2>Make a genuine saving.</h2>
      <p>When two agreed needs can be fulfilled more efficiently, SecurePay can find a better way.</p>
      <small>Fictional owner walkthrough · no real traders, offers, notifications or payments</small>
    </div>
    <div className="spm-sell-pill-row" aria-label="Approved facilitation platform examples">
      {cases.map((sample,index)=><button type="button" key={sample.code}
        className={'spm-sell-answer-pill'+(selected===index?' selected':'')}
        aria-pressed={selected===index}
        onClick={()=>{setSelected(index);setDetails(false);setRules(false)}}>
        <sample.icon size={15}/>{sample.name}
      </button>)}
    </div>
    <div className="spm-saver-card">
      <div className="spm-saver-card-heading">
        <span>{current.short}</span>
        <strong>{quote.ok?'Potential match':'Not enough saving'}</strong>
      </div>
      {quote.ok?<><p className="spm-saver-description">One approved platform may fulfil these two independently agreed needs together. A qualified Plug must still confirm the real arrangement.</p>
        <div className="spm-saver-number">
          <span>Combined projected net saving</span>
          <strong>{shillings(quote.netSavingMinor)}</strong>
          <small>{quote.projectedNetSavingPercent.toFixed(2)}% after all example costs and the Plug fee</small>
        </div>
        <div className="spm-saver-row"><span>Original item costs together</span><strong>{shillings(quote.originalMinor)}</strong></div>
        <div className="spm-saver-row"><span>Projected all-in shared cost</span><strong>{shillings(quote.allInMinor)}</strong></div>
        <div className="spm-saver-divider"/>
        {quote.allocations.map((part,index)=><div key={part.itemId} className="spm-saver-participant">
          <strong>{current.items[index].label}</strong>
          <div className="spm-saver-row"><span>Previously {shillings(part.baselineMinor)}</span>
            <b>Now {shillings(part.projectedCostMinor)}</b></div>
          <small><CheckCircle2 size={13}/> Possible saving {shillings(part.projectedSavingMinor)} · {((part.projectedSavingMinor/part.baselineMinor)*100).toFixed(2)}%</small>
        </div>)}
        <button type="button" className="spm-saver-detail-toggle" onClick={()=>setDetails(v=>!v)}
          aria-expanded={details}>How was this calculated? <ChevronDown size={16}/></button>
        {details&&<div className="spm-saver-detail">
          <div className="spm-saver-row"><span>Shared provider cost</span><strong>{shillings(current.carrierOrHostCostMinor)}</strong></div>
          <div className="spm-saver-row"><span>Loading, fees, rails and other costs</span><strong>{shillings(current.otherIncrementalCostMinor)}</strong></div>
          <div className="spm-saver-row"><span>Additional provider reward</span><strong>{shillings(current.additionalProviderRewardMinor)}</strong></div>
          <div className="spm-saver-row"><span>Plug reward: 10% of 25% benchmark</span><strong>{shillings(quote.plugFeeMinor)}</strong></div>
          <p>Projected savings are shared proportionately to each independently agreed item's price. Both must save at least {communitySaverRules.minNetSavingPercent}%.</p>
        </div>}
        <button type="button" className="spm-secondary spm-sell-wide"
          onClick={()=>setRules(v=>!v)} aria-expanded={rules}>
          <ShieldCheck size={17}/> {rules?'Hide next steps':'What happens before this is offered?'} <ArrowRight size={15}/>
        </button>
        {rules&&<div className="spm-saver-detail">
          <p>1. Verify the current priced items and immutable accepted Agreement versions.</p>
          <p>2. Confirm suitable capacity, service quality, dates and actual all-in costs on this approved platform.</p>
          <p>3. Offer the stated fee to a qualified Plug, who can accept or decline.</p>
          <p>4. Ask each affected participant to approve the change. No money moves until the canonical Agreements authorize it.</p>
        </div>}
      </>:<p>This illustration does not meet the {communitySaverRules.minNetSavingPercent}% item-level net saving requirement. No opportunity is advertised.</p>}
    </div>
    <p className="spm-saver-footer"><ShieldCheck size={15}/> Screening is not verification. These prices are fictional. Real Community Saver remains off until item provenance, qualified Plugs, consent, rails and platform integrations are certified.</p>
  </section>;
}
