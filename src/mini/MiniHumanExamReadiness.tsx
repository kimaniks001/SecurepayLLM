import { useRef, useState } from 'react';
import { ClipboardCheck, ShieldCheck } from 'lucide-react';
import type { HumanConsentScope } from '../api/securepay/human-consent';
import type { HumanExamReadiness, HumanExamReadinessGateway } from '../api/securepay/human-exam-readiness';

/** A READINESS check only. No private statements go to an AI model. */
export function MiniHumanExamReadiness({scope,gateway,prepare}:{
  scope:HumanConsentScope;
  gateway:Pick<HumanExamReadinessGateway,'prepare'>;
  prepare:()=>Promise<unknown>;
}) {
  const [result,setResult]=useState<HumanExamReadiness|null>(null);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const request=useRef(0);
  const check=async()=>{
    if(pending)return;
    const seq=++request.current;
    setPending(true);setResult(null);setError(null);
    try{
      await prepare();
      const current=await gateway.prepare(scope,crypto.randomUUID());
      if(request.current!==seq)return;
      setResult(current);
    }catch{
      if(request.current!==seq)return;
      setError('Could not verify joint-review readiness. No AI examination was started.');
    }finally{if(request.current===seq)setPending(false);}
  };
  return <div className="spm-human-exam-readiness" data-h3-examination-readiness>
    <button type="button" disabled={pending}
      className="spm-secondary spm-human-case-trigger" onClick={()=>void check()}>
      <ClipboardCheck size={16}/>
      {pending?'Checking current permissions…':'Check if joint examination is ready'}
    </button>
    {error&&<p role="alert" className="spm-error">{error}</p>}
    {result&&<section role="status" className="spm-human-case-body">
      <p className="spm-human-case-caution"><ShieldCheck size={15}/>
        {result.consentingOriginalPartyCount} of {result.activeOriginalPartyCount}
        {' '}original parties currently permit this information type.
      </p>
      {result.outcome==='AWAITING_PARTY_CONSENT'
        ?<p className="spm-human-case-caution">
           Permission is still missing from {result.awaitingOriginalPartyCount}
           {' '}part{result.awaitingOriginalPartyCount===1?'y':'ies'}. Everyone decides independently.
         </p>
        :<p className="spm-human-case-caution">
          Everyone's recorded permission was checked. A live KS001 examination
          is still unavailable until its separate security and privacy certification.
         </p>}
      {result.nonbindingQuestions.length>0&&<>
        <p className="spm-label">Questions we can explore without deciding a dispute</p>
        <div className="spm-human-pills">
          {result.nonbindingQuestions.map(q=><p className="spm-human-case-caution" key={q}>{q}</p>)}
        </div>
      </>}
      <p className="spm-human-case-caution">
        Nothing was sent to AI. No facts were certified, Agreement changed,
        or Money instructed. Refresh to check again after any withdrawal.
      </p>
    </section>}
  </div>;
}
