import { useState } from 'react';
import { FileLock2, ShieldCheck } from 'lucide-react';

/** Local, explicitly fictional design review. No HTTP and no fake grant. */
export function MiniHumanConsentExample() {
  const [scope,setScope]=useState<'statement'|'metadata'>('statement');
  const [duration,setDuration]=useState<1|7>(1);
  return <section className="spm-human-case-body" data-h3-consent-example>
    <p className="spm-human-case-label">Sample permission screen — nothing can be saved here</p>
    <div className="spm-persona"><FileLock2 size={16}/>Your privacy choice</div>
    <p className="spm-human-case-caution">
      Everyone decides separately whether KS001 may examine their private review information.
      You can still get ordinary Agreement help without giving this permission.
    </p>
    <p className="spm-label">What would you allow?</p>
    <div className="spm-human-pills" role="group" aria-label="Sample consent information type">
      <button type="button" className="spm-human-pill" aria-pressed={scope==='statement'}
        onClick={()=>setScope('statement')}>My submitted statement</button>
      <button type="button" className="spm-human-pill" aria-pressed={scope==='metadata'}
        onClick={()=>setScope('metadata')}>Only supporting-item details</button>
    </div>
    <p className="spm-label">For how long?</p>
    <div className="spm-human-pills" role="group" aria-label="Sample consent duration">
      <button type="button" className="spm-human-pill" aria-pressed={duration===1}
        onClick={()=>setDuration(1)}>24 hours</button>
      <button type="button" className="spm-human-pill" aria-pressed={duration===7}
        onClick={()=>setDuration(7)}>7 days</button>
    </div>
    <div className="spm-human-consent-choice">
      <ShieldCheck size={17}/> In the real signed-in Agreement, you would explicitly record
      or withdraw your own decision. This preview does neither.
    </div>
    <p className="spm-human-case-caution">
      Even after every person's permission is recorded, AI examination remains unavailable
      until that separate process is tested and certified.
    </p>
  </section>;
}
