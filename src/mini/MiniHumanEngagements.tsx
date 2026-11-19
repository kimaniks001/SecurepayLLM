import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardList, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import type {
  HumanEngagement, HumanEngagementAction, HumanEngagementGateway, H4dSelectedHelper
} from '../api/securepay/human-engagement';

function money(currency:string,minor:string) {
  const amt=BigInt(minor);
  return `${currency} ${(amt/100n).toLocaleString('en-KE')}.${(amt%100n).toString().padStart(2,'0')}`;
}
const ends=[
  'A conversation and short summary of the options',
  'An observation checklist of what was counted or measured',
  'A written explanation of the practical next steps',
  'A brief record of the advice and its limitations'
];
const scopeHints=[
  'Help me understand a service before I decide',
  'Talk through my options and what to ask next',
  'Check observable facts and explain what was found'
];
/** H4D native Mini: truthfully distinct invitation, independent decisions,
 * followed by a separately governed official Agreement and SecureLink. */
export function MiniHumanEngagements({
  selected=null,context=null,enabled,signedIn,gateway,prepare,onSignIn,onBack
}:{
  selected?:H4dSelectedHelper|null;
  context?:string|null;
  enabled:boolean;
  signedIn:boolean;
  gateway:Pick<HumanEngagementGateway,'create'|'mine'|'decide'>;
  prepare:()=>Promise<unknown>;
  onSignIn:()=>void;
  onBack:()=>void;
}) {
  const [scope,setScope]=useState(context?.length&&context.length>12?context:'');
  const [completion,setCompletion]=useState('');
  const [units,setUnits]=useState(1);
  const [understood,setUnderstood]=useState(false);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState<'idle'|'ready'|'error'>('idle');
  const [inbox,setInbox]=useState<HumanEngagement[]>([]);
  const [response,setResponse]=useState<HumanEngagement|null>(null);
  const [error,setError]=useState('');
  const [showInbox,setShowInbox]=useState(!selected);
  const requestKey=useRef<string|null>(null);
  const loading=useRef(0);
  const currentKey=()=>{
    if(!requestKey.current) requestKey.current=crypto.randomUUID();
    return requestKey.current;
  };
  useEffect(()=>{
    loading.current++;
    setInbox([]);setResponse(null);setStatus('idle');setError('');
    return ()=>{loading.current++;};
  },[signedIn,enabled]);

  const load=async()=>{
    if(!enabled||!signedIn||busy)return;
    const rev=++loading.current;
    setBusy(true);setError('');
    try{
      await prepare();
      const got=await gateway.mine();
      if(rev!==loading.current)return;
      setInbox(got);setStatus('ready');setShowInbox(true);
    }catch{
      if(rev!==loading.current)return;
      setStatus('error');setError('Your human-help requests could not be checked. No decisions were made.');
    }finally{if(rev===loading.current)setBusy(false);}
  };
  const send=async()=>{
    if(!enabled||!signedIn||busy||!selected||!understood
        ||scope.trim().length<12||completion.trim().length<8)return;
    const rev=++loading.current;
    setBusy(true);setError('');
    try{
      await prepare();
      const result=await gateway.create({
        idempotencyKey:currentKey(),
        helperIdentityId:selected.helperIdentityId,helperRole:selected.helperRole,
        serviceKey:selected.serviceKey,scopeStatement:scope.trim(),
        completionCondition:completion.trim(),units,
        expectedUnitRateMinor:selected.rateMinor,
        expectedCurrency:selected.currency,
        expectedBillingBasis:selected.billingBasis,
        consentVersion:'H4D_TASK_BRIEF_V1'
      });
      if(rev!==loading.current)return;
      setResponse(result);setShowInbox(false);
    }catch{
      if(rev!==loading.current)return;
      setError('We could not confirm whether the request was saved. Check My human requests before retrying. No Money was sent.');
    }finally{if(rev===loading.current)setBusy(false);}
  };
  const act=async(entry:HumanEngagement,action:HumanEngagementAction)=>{
    if(!enabled||busy||!signedIn)return;
    const rev=++loading.current;
    setBusy(true);setError('');
    try{
      await prepare();
      const result=await gateway.decide(entry.engagementId,action,entry.version);
      if(rev!==loading.current)return;
      setInbox(old=>old.map(item=>item.engagementId===result.engagementId?result:item));
      setResponse(result);
    }catch{
      if(rev!==loading.current)return;
      setError('That request may have changed or the helper is no longer eligible. Refresh before deciding.');
    }finally{if(rev===loading.current)setBusy(false);}
  };
  const price=selected?money(selected.currency,selected.rateMinor):null;
  const choiceList=(entry:HumanEngagement):HumanEngagementAction[]=>{
    if(entry.status==='REQUESTED')
      return entry.viewerRole==='HELPER'?['HELPER_ACCEPT','HELPER_DECLINE']:['REQUESTER_WITHDRAW'];
    if(entry.status==='HELPER_ACCEPTED')
      return entry.viewerRole==='REQUESTER'?['REQUESTER_CONFIRM','REQUESTER_WITHDRAW']:[];
    return [];
  };
  const actionText:Record<HumanEngagementAction,string>={
    HELPER_ACCEPT:'Accept this request',
    HELPER_DECLINE:'Decline',
    REQUESTER_CONFIRM:'Confirm the reviewed task',
    REQUESTER_WITHDRAW:'Withdraw request'
  };
  const card=(entry:HumanEngagement)=><div key={entry.engagementId}
      className="spm-human-service-option" data-mini-h4d-private-request>
    <span className="spm-human-source">{entry.viewerRole==='HELPER'?'Request for my service':'My request'}
      {' · '}{entry.status.replaceAll('_',' ').toLowerCase()}</span>
    <strong>{entry.serviceLabel}</strong>
    <p>{entry.scopeStatement}</p>
    <span>Complete when: {entry.completionCondition}</span>
    <span>{money(entry.currency,entry.totalQuoteMinor)} · {entry.units} × {entry.billingBasis.toLowerCase()}</span>
    <p>Expires: {new Date(entry.expiresAt).toLocaleString('en-KE')}</p>
    {entry.status==='READY_FOR_AGREEMENT'&&<div className="spm-human-result">
      <strong>Both parties are ready to prepare a separate Agreement.</strong>
      <p>This is not a funded or activated SecureLink. Continue through the canonical
      Agreement process; no Money or work is authorised here.</p>
    </div>}
    {choiceList(entry).map(action=><button key={action} type="button"
      className={action==='HELPER_ACCEPT'||action==='REQUESTER_CONFIRM'?'spm-primary':'spm-secondary'}
      disabled={busy} onClick={()=>void act(entry,action)}>
      {actionText[action]}
    </button>)}
  </div>;

  return <section className="spm-human spm-human-engagement" data-mini-h4d-native>
    <button className="spm-back" type="button" onClick={onBack}>
      <ArrowLeft size={18}/>Back</button>
    <div className="spm-persona"><Users size={16}/>Human help · SecurePay Mini</div>
    <h1 className="spm-question">{selected&&!showInbox?'Ask this person for help':'My human requests'}</h1>
    <p className="spm-lead">A clear piece of work, a published rate, and a separate choice for
      each person. Sending a request does not hire the helper or start work.</p>
    {!enabled&&<div className="spm-human-result" role="status">
      <strong>H4D is available for design review only.</strong>
      <p>The real invitation service requires an isolated, certified Core connection.
        No fictional helpers, messages or SecureLinks are issued here.</p>
    </div>}
    {enabled&&!signedIn&&<button className="spm-secondary" type="button" onClick={onSignIn}>
      Sign in to check private requests <ArrowRight size={16}/></button>}
    {selected&&!showInbox&& !response&&<>
      <div className="spm-human-service-option">
        <span className="spm-human-source">Chosen {selected.helperRole==='PLUG'?'Plug':'Master'} · {selected.serviceKey}</span>
        <strong>{selected.serviceLabel}</strong>
        <span>{price} · {selected.billingBasis==='HOURLY'?'per hour':selected.billingBasis==='PER_SESSION'?'per session':'fixed service'}</span>
        <p>The provider has declared availability, but has not accepted your work.</p>
      </div>
      <p className="spm-label">What help do you need?</p>
      <div className="spm-human-pills" aria-label="Choose a useful task description">
        {scopeHints.map(hint=><button className="spm-human-pill" key={hint}
          type="button" onClick={()=>{setScope(hint);requestKey.current=null;}}>
          <span>{hint}</span>{scope===hint&&<Check size={16}/>}
        </button>)}
      </div>
      <label className="spm-label" htmlFor="h4d-scope">Your task brief</label>
      <textarea id="h4d-scope" className="spm-field" rows={3} maxLength={1000}
        value={scope} onChange={e=>{setScope(e.target.value);requestKey.current=null;}}
        placeholder="Only what this helper needs to know. Do not paste a private Agreement."/>
      <p className="spm-label">What will count as finished?</p>
      <div className="spm-human-pills" role="group" aria-label="Completion condition">
        {ends.map(item=><button type="button" key={item}
          className="spm-human-pill" aria-pressed={completion===item}
          onClick={()=>{setCompletion(item);requestKey.current=null;}}>
          <span>{item}</span>{completion===item&&<Check size={16}/>}
        </button>)}
      </div>
      {selected.billingBasis!=='FIXED'&&<div className="spm-human-pills"
        role="group" aria-label="How many sessions or hours">
        <span className="spm-label">How many {selected.billingBasis==='HOURLY'?'hours':'sessions'}?</span>
        {[1,2,3,4].map(value=><button type="button" key={value}
          className="spm-human-pill" aria-pressed={units===value}
          onClick={()=>{setUnits(value);requestKey.current=null;}}>{value} {units===value&&<Check size={15}/>}</button>)}
      </div>}
      <div className="spm-human-result" role="note">
        <strong>Review this estimate: {selected.currency} {selected.billingBasis==='FIXED'?price?.replace(selected.currency+' ',''):
          money(selected.currency,(BigInt(selected.rateMinor)*BigInt(units)).toString()).replace(selected.currency+' ','')}</strong>
        <p>Rate and qualification will be rechecked by Core before the request is sent
          and again before either party confirms.</p>
      </div>
      <label className="spm-human-consent-choice">
        <input type="checkbox" checked={understood} onChange={e=>setUnderstood(e.target.checked)}/>
        <span><strong>Share this task brief only.</strong> No original Agreement,
          statements, evidence, location, phone number or Money details will be shared.</span>
      </label>
      <button type="button" className="spm-primary spm-human-continue"
        disabled={!enabled||!signedIn||busy||!understood||scope.trim().length<12||completion.trim().length<8}
        onClick={()=>void send()}>
        {busy?'Checking…':'Send this request'}<ArrowRight size={16}/>
      </button>
    </>}
    {response&&!showInbox&&<div className="spm-human-result" role="status">
      <strong>{response.status==='REQUESTED'?'Request created for helper review':
        response.status==='READY_FOR_AGREEMENT'?'Ready for a separate Agreement':
        'Request status: '+response.status.replaceAll('_',' ').toLowerCase()}</strong>
      <p>Nothing has been paid, accepted as a canonical Agreement or issued as a SecureLink.</p>
      <button type="button" className="spm-secondary"
        onClick={()=>{setResponse(null);void load();}}>
        <ClipboardList size={16}/>Open my human requests
      </button>
    </div>}
    {enabled&&signedIn&&<button type="button" className="spm-secondary"
      disabled={busy} onClick={()=>{setResponse(null);void load();}}>
      <ClipboardList size={16}/>{busy?'Checking…':'My human requests'}
    </button>}
    {error&&<p role="alert" className="spm-error">{error}</p>}
    {showInbox&&status==='ready'&&<section aria-live="polite">
      {inbox.length===0?<p className="spm-human-case-caution">
        No verified human requests yet. Nothing is awaiting your acceptance.</p>
        :<div className="spm-actions">{inbox.map(card)}</div>}
    </section>}
    <div className="spm-human-truth" role="note"><ShieldCheck size={16}/>
      <p>H4D is a private bilateral request, not a live SecureLink or payment.
        The original Agreement and its evidence remain private. Any actual service
        Agreement, public SecureLink and Money must pass their independent gates.</p>
    </div>
  </section>;
}
