import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, HeartHandshake, LockKeyhole, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import type { HumanDiscovery, HumanDiscoveryGateway, HumanHelpIntent, HumanHelperOption } from '../api/securepay/human-discovery';

const choices:ReadonlyArray<{intent:HumanHelpIntent;label:string;hint:string}>=[
  {intent:'CONVERSATION',label:'Talk to someone',hint:'Reassurance or help talking through a decision'},
  {intent:'LOCAL_KNOWLEDGE',label:'Someone who knows the area',hint:'Local knowledge without sharing an exact address'},
  {intent:'FIELD_CHECK',label:'Check something in person',hint:'Count, measure or document observable facts'},
  {intent:'SPECIALIST',label:'Specific expertise',hint:'Someone reviewed for the particular kind of work'}
];

function displayRate(currency:string,minor:string,basis:string) {
  const value=BigInt(minor);
  const whole=(value/100n).toLocaleString('en-KE');
  const cents=(value%100n).toString().padStart(2,'0');
  const frequency=basis==='HOURLY'?'per hour':basis==='PER_SESSION'?'per session':'fixed';
  return `${currency} ${whole}.${cents} · ${frequency}`;
}

/** Native Mini H4C: real authenticated lookup only, no simulation or hiring. */
export function MiniHumanDiscovery({initialIntent,context,enabled,signedIn,gateway,prepare,
  onSignIn,onAskKs001,onBack,onSelectHelper,onMyRequests}:{
  initialIntent:HumanHelpIntent;
  context?:string|null;
  enabled:boolean;
  signedIn:boolean;
  gateway:Pick<HumanDiscoveryGateway,'discover'>;
  prepare:()=>Promise<unknown>;
  onSignIn:()=>void;
  onAskKs001:()=>void;
  onBack:()=>void;
  /** H4D: shown only after real H4C providers are returned by Core. */
  onSelectHelper?:(person:HumanHelperOption)=>void;
  onMyRequests?:()=>void;
}) {
  const [intent,setIntent]=useState<HumanHelpIntent>(initialIntent);
  const [state,setState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [result,setResult]=useState<HumanDiscovery|null>(null);
  const [error,setError]=useState('');
  const [showNext,setShowNext]=useState(false);
  const revision=useRef(0);
  useEffect(()=>{
    revision.current++;
    setResult(null);setState('idle');setError('');setShowNext(false);
    return ()=>{revision.current++;};
  },[intent,signedIn,enabled]);

  const search=async()=>{
    if(!signedIn||!enabled||state==='loading')return;
    const run=++revision.current;
    setState('loading');setResult(null);setError('');
    try {
      await prepare();
      const response=await gateway.discover(intent);
      if(run!==revision.current)return;
      setResult(response);setState('ready');
    }catch{
      if(run!==revision.current)return;
      setState('error');
      setError('We could not verify any current helper options. No one was contacted.');
    }
  };
  return <section className="spm-human spm-human-discovery" data-mini-h4c-discovery
    aria-label="Talk to someone — verified options">
    <div className="spm-persona"><HeartHandshake size={16}/>Human help · Your choice</div>
    <h1 className="spm-question">Who would you like to talk to?</h1>
    <p className="spm-lead">You can ask for a real person even when nothing has gone wrong.
      Only verified, opted-in services may appear.</p>
    {context&&<p className="spm-human-case-label">You chose: {context}</p>}
    <div className="spm-human-pills" role="group" aria-label="Kind of human help">
      {choices.map(option=><button key={option.intent} type="button"
        className="spm-human-pill" aria-pressed={intent===option.intent}
        onClick={()=>setIntent(option.intent)}>
        <span><strong>{option.label}</strong><small style={{display:'block',fontWeight:400}}>
          {option.hint}</small></span>{intent===option.intent&&<Check size={16}/>}
      </button>)}
    </div>
    {intent==='LOCAL_KNOWLEDGE'&&<p className="spm-human-case-caution">
      Local matching will require approved broad-area information. We never assume your location
      or expose an exact home or pickup point.
    </p>}
    {!enabled&&<div className="spm-human-result" role="status">
      <strong>Verified helper lookup is not connected in this preview.</strong>
      <p>The journey is available to examine. Real helper search needs the matching
      certified Core service and approved staging connection. No sample people are shown as real.</p>
    </div>}
    {enabled&&!signedIn&&<div className="spm-human-result">
      <strong>Your SecurePay identity is needed for private discovery.</strong>
      <p>Signing in does not contact anyone, send your story or agree to a price.</p>
      <button type="button" className="spm-secondary" onClick={onSignIn}>
        <LockKeyhole size={16}/>Sign in to see verified options <ArrowRight size={15}/>
      </button>
    </div>}
    {enabled&&signedIn&&<button type="button" className="spm-primary spm-human-continue"
      disabled={state==='loading'} onClick={()=>void search()}>
      <Users size={17}/>{state==='loading'?'Checking current options…':'See verified options'}
      <ArrowRight size={16}/>
    </button>}
    {error&&<p className="spm-error" role="alert">{error}</p>}
    {result&&state==='ready'&&<section className="spm-human-case-body" aria-live="polite">
      <strong>{result.helpers.length===0
        ?'No verified, opted-in helper options found'
        :`${result.helpers.length} possible helper ${result.helpers.length===1?'service':'services'}`}</strong>
      {result.helpers.length===0&&<p className="spm-human-case-caution">
        No one has been contacted. We will not invent providers or claim people are available.
        You can choose another kind of help or Ask KS001.
      </p>}
      {result.helpers.map(person=><div className="spm-human-service-option"
        key={person.helperIdentityId+':'+person.serviceKey}>
        <span className="spm-human-source">{person.helperRole==='PLUG'?'Plug':'Master'} · Reviewed service</span>
        <strong>{person.serviceLabel}</strong>
        <span>{displayRate(person.currency,person.rateMinor,person.billingBasis)}</span>
        <p>Provider-declared availability; no appointment is confirmed.
          Statutory professional licensing has not been verified here.</p>
        {onSelectHelper&&<button type="button" className="spm-secondary"
          onClick={()=>onSelectHelper(person)}>
          Prepare a private request <ArrowRight size={15}/>
        </button>}
      </div>)}
      <p className="spm-human-case-caution">{result.limitation}</p>
      {result.helpers.length>0&&<button type="button" className="spm-secondary"
        onClick={()=>setShowNext(s=>!s)}>
        <MessageCircle size={15}/>{showNext?'Hide next steps':'How would I engage someone?'}
      </button>}
      {showNext&&<p className="spm-human-case-caution">
        In H4D, a helper request will become a separately scoped SecureLink and Agreement.
        You will review the person, service, price and permissions before agreeing.
        No request has been sent from this screen.
      </p>}
    </section>}
    {enabled&&signedIn&&onMyRequests&&<button type="button" className="spm-secondary"
      onClick={onMyRequests}><Users size={16}/>My human requests</button>}
    <button type="button" className="spm-secondary" onClick={onAskKs001}>
      <MessageCircle size={16}/>Ask KS001 instead
    </button>
    <button type="button" className="spm-quiet-button" onClick={onBack}>Back to my help choices</button>
    <div className="spm-human-truth" role="note">
      <ShieldCheck size={16}/>
      <p>No helper is contacted, hired or given your Agreement, evidence, precise location
        or Money details. A published rate is not an accepted quote.</p>
    </div>
  </section>;
}
