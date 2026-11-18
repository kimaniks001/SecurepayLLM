import {useState} from 'react';
import {CheckCircle2,RotateCcw,ShieldCheck,XCircle} from 'lucide-react';
import {communitySaverPreScreen} from './communitySaverPreScreen.mjs';

type Vote='PENDING'|'ACCEPT'|'DECLINE';
type Participant={key:'a'|'b'|'provider'|'plug';label:string;role:string};
const people:Participant[]=[
  {key:'a',label:'Trader A',role:'Mabati transport'},
  {key:'b',label:'Trader B',role:'Interior boards transport'},
  {key:'provider',label:'Transport provider',role:'Lorry and compatible loading'},
  {key:'plug',label:'Qualified Plug',role:'Cargo sharing verifier'}
];
const blank=():Record<Participant['key'],Vote>=>({
  a:'PENDING',b:'PENDING',provider:'PENDING',plug:'PENDING'
});
const show=(minor:number)=>'KSh '+(minor/100).toLocaleString('en-KE',{
  maximumFractionDigits:2,minimumFractionDigits:0
});
const quote=communitySaverPreScreen({
  platformCode:'MY_RIDE',
  items:[
    {agreementId:'fictional-mabati',agreementVersionId:'example-1',itemId:'mabati-transport',baselineMinor:1000000,currency:'KES'},
    {agreementId:'fictional-boards',agreementVersionId:'example-1',itemId:'boards-transport',baselineMinor:400000,currency:'KES'}
  ],
  carrierOrHostCostMinor:1000000,
  otherIncrementalCostMinor:10000,
  additionalProviderRewardMinor:0
});

/**
 * Static fictional-owner journey only; the real participant flow requires
 * separately authenticated, source-bound inbox authority and the Phase 7D
 * private controller. No real Agreement, Plug or Money is mutated here.
 */
export function MiniCommunitySaverConsentPreview(){
  const [chosen,setChosen]=useState<Participant['key']>('a');
  const [votes,setVotes]=useState<Record<Participant['key'],Vote>>(blank);
  const [quoteRevision,setQuoteRevision]=useState(1);
  const [invalidated,setInvalidated]=useState(false);
  const person=people.find(p=>p.key===chosen)!;
  const refused=Object.values(votes).includes('DECLINE');
  const all=people.every(p=>votes[p.key]==='ACCEPT');
  const state=invalidated?'Quote changed — new consent needed':
    refused?'Stopped — somebody declined':
    all?'All agreed — formal Agreement review needed':'Awaiting separate decisions';
  const decide=(vote:Vote)=>{
    if(invalidated||refused)return;
    setVotes(old=>({...old,[chosen]:vote}));
  };
  const reset=()=>{
    setVotes(blank());
    setQuoteRevision(n=>n+1);
    setInvalidated(false);
  };
  const invalidate=()=>{
    setVotes(blank());
    setInvalidated(true);
    setQuoteRevision(n=>n+1);
  };
  if(!quote.ok)return null;
  return <section className="spm-saver-card" data-mini-saver-consent-preview>
    <div className="spm-saver-card-heading">
      <span>How everyone decides</span>
      <strong>Fictional review</strong>
    </div>
    <p className="spm-saver-description">The same Nyeri arrangement, but four independent decisions. No one can approve for another person.</p>
    <div className="spm-sell-pill-row" aria-label="Switch fictional participant">
      {people.map(p=><button type="button" key={p.key}
        className={'spm-sell-answer-pill'+(chosen===p.key?' selected':'')}
        aria-pressed={chosen===p.key} onClick={()=>setChosen(p.key)}>
        {p.label}
      </button>)}
    </div>
    <div className="spm-saver-detail">
      <strong>{person.label} · {person.role}</strong>
      {chosen==='a'||chosen==='b'?(()=>{
        const item=quote.allocations[chosen==='a'?0:1];
        return <div className="spm-saver-participant">
          <div className="spm-saver-row">
            <span>My agreed item</span><strong>{show(item.baselineMinor)}</strong>
          </div>
          <div className="spm-saver-row">
            <span>My proposed all-in item cost</span><strong>{show(item.projectedCostMinor)}</strong>
          </div>
          <div className="spm-saver-row">
            <span>My projected saving</span>
            <strong>{show(item.projectedSavingMinor)} ({(100*item.projectedSavingMinor/item.baselineMinor).toFixed(2)}%)</strong>
          </div>
        </div>;
      })():null}
      {chosen==='provider'&&<p>Proposed provider compensation: <strong>{show(1000000)}</strong>. The vehicle, loading rights and service commitments still require their own confirmation. No contract changes automatically.</p>}
      {chosen==='plug'&&<p>Proposed reward: <strong>{show(quote.plugFeeMinor)}</strong>. The cargo-verification task must be properly qualified and separately assigned. Accepting here is not a job or a payment entitlement.</p>}
      <div className="spm-saver-row">
        <span>My decision</span><strong>{votes[chosen]==='PENDING'?'Not decided':votes[chosen]==='ACCEPT'?'Agreed for review':'Declined'}</strong>
      </div>
      {!invalidated&&!refused&&<div className="spm-sell-pill-row">
        <button type="button" className="spm-sell-answer-pill"
          disabled={votes[chosen]==='ACCEPT'}
          onClick={()=>decide('ACCEPT')}>Agree for review</button>
        <button type="button" className="spm-sell-answer-pill"
          disabled={votes[chosen]==='DECLINE'}
          onClick={()=>decide('DECLINE')}>Decline</button>
        {votes[chosen]==='ACCEPT'&&
          <button type="button" className="spm-sell-answer-pill"
            onClick={()=>decide('PENDING')}>Withdraw my agreement</button>}
      </div>}
    </div>
    <div className="spm-saver-divider"/>
    <div className="spm-saver-card-heading">
      <span>{state}</span><strong>{people.filter(p=>votes[p.key]==='ACCEPT').length} of 4</strong>
    </div>
    <div className="spm-saver-detail">
      {people.map(p=><div className="spm-saver-row" key={p.key}>
        <span>{p.label}</span>
        <strong>{votes[p.key]==='ACCEPT'?<CheckCircle2 size={16}/>:
          votes[p.key]==='DECLINE'?<XCircle size={16}/>: 'Waiting'}</strong>
      </div>)}
    </div>
    {all&&!invalidated&&<p className="spm-saver-description">
      Everyone has agreed to REVIEW the fixed proposal. Each original funded Agreement stays unchanged; fresh canonical approvals, any cancellation/rebate and regulated Money steps remain separate.
    </p>}
    {refused&&<p className="spm-saver-description">The proposal is stopped. Neither trader is charged and no Plug commission becomes payable merely because this was considered.</p>}
    {invalidated&&<p className="spm-saver-description">The quote or its Agreement sources changed. Every former approval is invalid; a fresh verified quote is needed before anyone can decide again.</p>}
    <div className="spm-sell-pill-row">
      <button type="button" className="spm-quiet-button" onClick={invalidate}
        disabled={invalidated}><RotateCcw size={15}/>Simulate changed terms</button>
      <button type="button" className="spm-quiet-button" onClick={reset}>
        <RotateCcw size={15}/>Reset fictional journey</button>
    </div>
    <p className="spm-saver-footer"><ShieldCheck size={15}/>
      Fictional proposal revision {quoteRevision}. No identity, Agreement, notification, provider booking or payment exists in this walkthrough.
    </p>
  </section>;
}
