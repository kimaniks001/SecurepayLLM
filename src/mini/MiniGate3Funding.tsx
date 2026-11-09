import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowLeftRight, CheckCircle2, CircleAlert, Clock3,
  Landmark, RotateCcw, ShieldCheck, Smartphone, TestTube2 } from 'lucide-react';
import { MINI_TEST_RAILS, type MiniTestRailId, type MiniFundingTestStatus } from './miniFundingSimulator';
import type { MiniLanguage } from './miniModel';
import {
  getGate3Simulation, startGate3Simulation, type Gate3Scenario, type Gate3Result
} from './gate3SandboxClient';

type Expected = {orderId:string;fixtureId:string;amountMinor:number};
type Terminal = 'none' | 'expired' | 'unavailable';

/** Standalone inside the EXISTING Mini. All payment outcomes are decided by
 * signed server simulation responses, never by client dispatch or a timer.
 */
export function MiniGate3Funding({reviewSession, expected, description,
  language, onBack, onReturnToHost, onDemoStateChange, returnLabel,
  reconcileMode = false, onAttemptReference}:{
  reviewSession:string;
  expected:Expected;
  description:string;
  language:MiniLanguage;
  onBack:()=>void;
  onReturnToHost:()=>void;
  returnLabel:string;
  onDemoStateChange?:(status:MiniFundingTestStatus,method:MiniTestRailId|null)=>void;
  /** Gate 4: send only the signed fictional attempt reference, never a status claim. */
  reconcileMode?:boolean;
  onAttemptReference?:(attempt:string|null)=>void;
}) {
  const sw=language==='sw';
  const [rail,setRail]=useState<MiniTestRailId|null>(null);
  const [scenario,setScenario]=useState<Gate3Scenario>('SUCCESS');
  const [attempt,setAttempt]=useState<string|null>(null);
  const [snapshot,setSnapshot]=useState<Gate3Result|null>(null);
  const [busy,setBusy]=useState(false);
  const [terminal,setTerminal]=useState<Terminal>('none');
  const [error,setError]=useState('');
  const [refresh,setRefresh]=useState(0);
  const firstAttempt=useRef(false);
  const storageKey='spm-gate3-mock-attempt-'+expected.orderId;
  const status=snapshot?.status||'SELECT_METHOD';
  useEffect(()=>{
    if(reconcileMode)onAttemptReference?.(attempt);
  },[attempt,reconcileMode,onAttemptReference]);
  const pending=status==='SIMULATED_PENDING';
  const unknown=status==='SIMULATED_UNKNOWN';
  const confirmed=status==='SIMULATED_CONFIRMED';
  const failed=status==='SIMULATED_FAILED';
  const mayChange=!attempt || failed || terminal==='expired';

  useEffect(()=>{
    // A simulated attempt token may persist across this browser tab's reload,
    // never as real payment or Agreement authority.
    if(firstAttempt.current)return;
    firstAttempt.current=true;
    try{
      const cached=sessionStorage.getItem(storageKey);
      if(cached && cached.length<=1500)setAttempt(cached);
    }catch{/* storage optional */}
  },[storageKey]);

  const checkStatus=useCallback(async(token:string,signal?:AbortSignal)=>{
    const result=await getGate3Simulation(token,expected,signal);
    if(signal?.aborted)return;
    if(result.kind==='ready'){
      setSnapshot(result.data);
      setRail(result.data.rail);
      setTerminal('none');
      setError('');
    }else{
      setTerminal(result.kind);
      if(result.kind==='expired'){
        setSnapshot(null);
        setAttempt(null);
        try{sessionStorage.removeItem(storageKey);}catch{/* optional */}
      }else setError('Unable to check the original test attempt. Do not retry blindly.');
    }
  },[expected.orderId,expected.fixtureId,expected.amountMinor,storageKey]);

  useEffect(()=>{
    if(!attempt)return;
    const controller=new AbortController();
    void checkStatus(attempt,controller.signal);
    // Polls request the server's latest *fictional* status. No timer is
    // permitted to set a confirmed/failed/unknown result in this component.
    if(snapshot?.status==='SIMULATED_CONFIRMED'||
       snapshot?.status==='SIMULATED_FAILED'||
       (snapshot?.status==='SIMULATED_UNKNOWN'&&!reconcileMode))
      return ()=>controller.abort();
    const timer=window.setInterval(()=>void checkStatus(attempt,controller.signal),1250);
    return ()=>{window.clearInterval(timer);controller.abort();};
  },[attempt,checkStatus,refresh,snapshot?.status,reconcileMode]);

  useEffect(()=>{
    const translated:MiniFundingTestStatus =
      pending ? 'AWAITING_FAKE_PROVIDER' : unknown ? 'SIMULATED_UNKNOWN' :
      confirmed ? 'SIMULATED_CONFIRMED' : failed ? 'SIMULATED_FAILED' : 'SELECT_METHOD';
    onDemoStateChange?.(translated,rail);
  },[status,rail,onDemoStateChange]);

  async function start() {
    if(busy||!rail||(!mayChange&&attempt)||terminal==='unavailable')return;
    setBusy(true);setError('');setSnapshot(null);setTerminal('none');
    try{
      const result=await startGate3Simulation(reviewSession,rail,scenario);
      if(result.kind!=='ready'){
        setError(result.kind==='ineligible'
          ? 'Sample terms are no longer eligible. Return and review them again.'
          : 'The simulation could not start. No payment was made.');
        return;
      }
      setAttempt(result.attempt);
      try{sessionStorage.setItem(storageKey,result.attempt);}catch{/* optional */}
    }finally{setBusy(false);}
  }
  const current=MINI_TEST_RAILS.find(x=>x.id===rail);
  return <section className="spm-content spm-money-demo spm-gate3-funding"
    aria-label="Server-simulated payment status" data-simulation="true">
    <button type="button" className="spm-back" onClick={onBack}>
      <ArrowLeft size={18}/>{sw?'Rudi':'Back to terms'}
    </button>
    <div className="spm-demo-flag"><TestTube2 size={16}/>SIMULATION ONLY · No real money</div>
    <div className="spm-demo-topsum">
      <h1 className="spm-question">
        {'KSh '+(expected.amountMinor/100).toLocaleString('en-KE',{maximumFractionDigits:2})}
      </h1>
      <p title={description}>{description}</p>
    </div>

    {(!attempt || failed || terminal==='expired')&&<>
      <h2 className="spm-demo-section-heading">Pay with (simulation)</h2>
      <div role="radiogroup" aria-label="Simulated payment rail" className="spm-demo-rails">
        {MINI_TEST_RAILS.map(item=>{
          const Icon=item.id==='CHOICE_BANK'?Landmark:
            item.id==='MPESA'?Smartphone:ArrowLeftRight;
          return <button type="button" role="radio" key={item.id}
            aria-checked={rail===item.id} disabled={busy}
            className={'spm-demo-rail'+(rail===item.id?' spm-demo-rail-active':'')}
            onClick={()=>setRail(item.id)}>
            <span className="spm-demo-rail-icon"><Icon size={19}/></span>
            <span className="spm-demo-rail-name"><strong>{item.name}</strong><small>{item.category}</small></span>
            <span className="spm-demo-rail-choice" aria-hidden="true">
              {rail===item.id?<CheckCircle2 size={18}/>:<span/>}
            </span>
          </button>;
        })}
      </div>
      <details className="spm-gate3-scenarios">
        <summary>Other test outcomes</summary>
        <div className="spm-gate3-scenario-list">
          <label htmlFor="spm-g3-scenario">Simulated provider response</label>
          <select id="spm-g3-scenario" value={scenario}
            onChange={e=>setScenario(e.target.value as Gate3Scenario)}>
            <option value="SUCCESS">Confirm after checking (default)</option>
            <option value="FAILURE">Fail the attempt</option>
            <option value="UNKNOWN">Result unknown — no retry</option>
            <option value="SLOW">Remain pending longer</option>
          {reconcileMode&&<option value="UNKNOWN_THEN_CONFIRMED">Unknown → reconciled test confirmation</option>}
          {reconcileMode&&<option value="UNKNOWN_THEN_FAILED">Unknown → reconciled test failure</option>}
          </select>
        </div>
      </details>
      <button className="spm-primary" type="button"
        disabled={!rail||busy} onClick={()=>void start()}>
        <TestTube2 size={18}/>
        {busy?'Starting test…':failed?'Try another simulated attempt':
          'Continue with '+(current?.name||'this method')}
      </button>
    </>}

    {attempt&&snapshot&&!(failed||terminal==='expired')&&
      <div className={'spm-demo-result spm-demo-result-'+status.toLowerCase()}
        role="status" aria-live="polite">
        {confirmed?<CheckCircle2 size={22}/>:
          pending?<Clock3 size={22}/>:<CircleAlert size={22}/>}
        <div>
          <strong>{pending?'Checking server-simulated result…':
            confirmed?'Simulation complete — NOT PAID':
            unknown?'Status unknown — do not retry':
            'Simulated attempt failed'}</strong>
          <p>{pending?'No money was sent. Keep this attempt open or return to it.':
            confirmed?'Fictional provider confirmation only. Nothing was funded.':
            unknown?'The original attempt is unresolved. Check it, do not submit another.':
            'No payment occurred.'}</p>
          <small>{current?.name} · test attempt {snapshot.attemptId.slice(-6)}</small>
        </div>
      </div>}
    {attempt&&failed&&<div className="spm-demo-result" role="status">
      <CircleAlert size={20}/><div><strong>Simulated attempt failed</strong>
      <p>No money moved. You may choose another test rail.</p></div>
    </div>}

    {(pending||unknown||terminal==='unavailable')&&<button type="button"
      className="spm-secondary" onClick={()=>setRefresh(n=>n+1)}>
      <RotateCcw size={17}/>Check original attempt
    </button>}
    {error&&<p role="alert" className="spm-error">{error}</p>}
    {terminal==='expired'&&<p className="spm-error">
      Sample attempt expired. This does not authorise a payment or retry.
    </p>}

    <button className={confirmed?'spm-primary spm-demo-return':'spm-secondary spm-demo-return'}
      type="button" onClick={onReturnToHost}>
      <ArrowLeft size={16}/>{returnLabel}
    </button>
    <details className="spm-demo-explain">
      <summary>Fees &amp; payment details</summary>
      <p>No SecurePay fee or provider fee has been quoted. No live rail eligibility has been checked.</p>
      <p>The server calculates only fictional statuses from an expiring test reference. No
      bank, STK, payment gateway, ledger or escrow is connected.</p>
    </details>
    <div className="spm-demo-footnote"><ShieldCheck size={15}/>
      Preview only · No real payment
    </div>
  </section>;
}
