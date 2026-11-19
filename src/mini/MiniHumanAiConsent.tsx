import { useEffect, useRef, useState } from 'react';
import { Check, FileLock2, RefreshCcw, ShieldCheck, ShieldX } from 'lucide-react';
import type { HumanConsentGateway, HumanConsentScope, HumanConsentStatus } from '../api/securepay/human-consent';
import type { HumanReviewScope } from '../api/securepay/human-party-submissions';

/** Genuine authenticated Mini consent controls. NOT a fictional approval UI. */
export function MiniHumanAiConsent({scope,gateway,prepare}: {
  scope: HumanReviewScope;
  gateway: Pick<HumanConsentGateway,'status'|'grant'|'withdraw'>;
  prepare: () => Promise<unknown>;
}) {
  const [dataScope,setDataScope]=useState<HumanConsentScope['dataScope']>('SUBMITTED_STATEMENT_TEXT');
  const [duration,setDuration]=useState<1|7>(1);
  const [confirmed,setConfirmed]=useState(false);
  const [status,setStatus]=useState<HumanConsentStatus|null>(null);
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const serial=useRef(0);
  const fullScope:HumanConsentScope={...scope,dataScope};

  useEffect(()=>{
    serial.current+=1;
    setStatus(null);setConfirmed(false);setError(null);setMessage(null);
    return ()=>{serial.current+=1;};
  },[scope.agreementId,scope.acceptedVersionId,scope.reviewCaseId,dataScope]);

  const check=async()=>{
    if(working)return;
    const run=++serial.current;
    setWorking(true);setError(null);setMessage(null);setStatus(null);
    try{
      await prepare();
      const response=await gateway.status(fullScope);
      if(run!==serial.current)return;
      setStatus(response);
    }catch{
      if(run!==serial.current)return;
      setError('Consent status could not be verified. No permission has been assumed.');
    }finally{if(run===serial.current)setWorking(false);}
  };
  const decide=async(action:'grant'|'withdraw')=>{
    if(working||!status||action==='grant'&&!confirmed)return;
    const run=++serial.current;
    setWorking(true);setError(null);setMessage(null);
    try{
      await prepare();
      const requestId=crypto.randomUUID();
      const response=action==='grant'
        ?await gateway.grant(fullScope,new Date(Date.now()+duration*24*60*60*1000).toISOString(),requestId)
        :await gateway.withdraw(fullScope,requestId);
      if(run!==serial.current)return;
      setStatus(response);
      setConfirmed(false);
      setMessage(action==='grant'
        ?'Your permission has been recorded. This does not start an AI examination.'
        :'Your permission was withdrawn for this exact review and information type.');
    }catch{
      if(run!==serial.current)return;
      setStatus(null);
      setConfirmed(false);
      setError('The permission change could not be confirmed. Recheck your status before proceeding.');
    }finally{if(run===serial.current)setWorking(false);}
  };

  const hasGrant=status?.myPermission==='GRANTED';
  return <section className="spm-human-case-body" aria-label="KS001 private-review permission" data-mini-h3-consent>
    <div className="spm-persona"><FileLock2 size={16}/>Your privacy choice</div>
    <p className="spm-human-case-caution">
      SecurePay can help explain your Agreement without sharing another party's private statement with AI.
      For a future joint AI examination, each person decides for themselves.
    </p>
    <p className="spm-label">Which information?</p>
    <div className="spm-human-pills" role="group" aria-label="Information permission type">
      <button type="button" className="spm-human-pill"
        aria-pressed={dataScope==='SUBMITTED_STATEMENT_TEXT'}
        onClick={()=>setDataScope('SUBMITTED_STATEMENT_TEXT')}>My submitted statement</button>
      <button type="button" className="spm-human-pill"
        aria-pressed={dataScope==='SUBMITTED_EVIDENCE_METADATA'}
        onClick={()=>setDataScope('SUBMITTED_EVIDENCE_METADATA')}>Only supporting-item details</button>
    </div>
    <button type="button" className="spm-secondary spm-human-case-trigger"
      disabled={working} onClick={()=>void check()}>
      <RefreshCcw size={16}/>{working?'Checking your permission…':'Check my permission'}
    </button>
    {error&&<p role="alert" className="spm-error">{error}</p>}
    {message&&<p role="status" className="spm-human-case-caution">{message}</p>}
    {status&&<>
      <p className="spm-human-case-caution" role="status">
        <ShieldCheck size={16}/>
        {hasGrant?'You have given permission':status.myPermission==='WITHDRAWN'
          ?'Your permission is withdrawn':status.myPermission==='EXPIRED'
          ?'Your previous permission has expired':'You have not given permission'}
      </p>
      <p className="spm-human-case-caution">
        {status.participation.explicitlyConsentingPartyCount} of {status.participation.requiredOriginalPartyCount}
        {' '}active parties have permitted this information type.
        {status.participation.stillAwaitingPartyCount>0&&' Others have not yet agreed.'}
      </p>
      {hasGrant
        ?<button type="button" className="spm-secondary spm-human-case-trigger"
           disabled={working} onClick={()=>void decide('withdraw')}>
          <ShieldX size={16}/>Withdraw my permission
         </button>
        :<>
          <p className="spm-label">For how long?</p>
          <div className="spm-human-pills" role="group" aria-label="Consent expiry">
            {[1,7].map(days=><button type="button" key={days}
               className="spm-human-pill" aria-pressed={duration===days}
               onClick={()=>setDuration(days as 1|7)}>
              {days===1?'24 hours':'7 days'}{duration===days&&<Check size={15}/>}
            </button>)}
          </div>
          <label className="spm-human-consent-choice">
            <input type="checkbox" checked={confirmed}
              onChange={e=>setConfirmed(e.target.checked)}/>
            <span>I choose to permit a future KS001 examination of <strong>
              {dataScope==='SUBMITTED_STATEMENT_TEXT'?'my submitted statement':'my supporting-item metadata'}
            </strong> for this Agreement review. I can withdraw this permission.</span>
          </label>
          <button type="button" className="spm-primary spm-human-continue"
            disabled={working||!confirmed} onClick={()=>void decide('grant')}>
            Record my permission <ShieldCheck size={16}/>
          </button>
        </>}
      <p className="spm-human-case-caution">
        Even if everyone agrees, no private review is sent to AI yet.
        KS001 needs a separately certified, auditable examination process.
      </p>
    </>}
  </section>;
}
