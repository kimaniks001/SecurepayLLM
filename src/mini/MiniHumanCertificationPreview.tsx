import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, HeartHandshake, ShieldCheck } from 'lucide-react';

/**
 * H4E native Mini journey inspection only. No synthetic helper/person,
 * no forged status or SecureLink, and no network calls.
 */
const steps=[
  {
    title:'Choose the help you need',
    human:'I can speak to someone even when nothing has gone wrong.',
    detail:'Only independently reviewed, explicitly discoverable services may appear. Locality and professional licences cannot be assumed.',
    needs:'Qualified, current and opted-in helper',
  },{
    title:'Agree on the work',
    human:'I know what the person will do, what counts as finished, and the price.',
    detail:'I choose a short task brief and completion condition, review the exact published rate, and consent to sharing only that brief.',
    needs:'Source rate, scope and limited disclosure',
  },{
    title:'Let both people decide',
    human:'The helper can say yes or no. I confirm the unchanged terms separately.',
    detail:'My request remains private to the two identities. An old price, changed capability, revoked opt-in or expired request blocks approval.',
    needs:'Two real authenticated decisions',
  },{
    title:'Prepare the actual Agreement',
    human:'My request becomes an official proposal—not an automatic booking.',
    detail:'After both decisions, SecurePay creates a distinct proposed Agreement through the original Agreement service and binds the H4D source/version. The helper still joins and confirms its real version.',
    needs:'Canonical Agreement, version and parties',
  },{
    title:'SecureLink follows acceptance',
    human:'A shared link comes only after proper Agreement formation.',
    detail:'Money, public link/QR, obligations, source evidence disclosure and authority to begin work remain governed by their existing separate checks. This preview does not issue any of them.',
    needs:'Independent Fair Trade, product and Money gates',
  }
] as const;
export function MiniHumanCertificationPreview({onBack}:{onBack:()=>void}) {
  const [step,setStep]=useState(0);
  const selected=steps[step];
  return <section className="spm-human spm-human-h4e-preview" data-mini-h4e-native
    aria-label="Human help usability and certification preview">
    <button className="spm-back" type="button" onClick={onBack}>
      <ArrowLeft size={18}/>Back</button>
    <div className="spm-persona"><HeartHandshake size={16}/>Human help · H4E preview</div>
    <h1 className="spm-question">From asking for help to a fair Agreement</h1>
    <p className="spm-lead">Five simple choices for people. Separate checks behind the scenes.</p>
    <div className="spm-human-pills" role="group" aria-label="Explore human help stages">
      {steps.map((s,i)=><button key={s.title} type="button" className="spm-human-pill"
        aria-pressed={step===i} onClick={()=>setStep(i)}>
        <span>{i+1}. {s.title}</span>{step===i&&<CheckCircle2 size={16}/>}
      </button>)}
    </div>
    <div className="spm-human-result" aria-live="polite" data-mini-h4e-active-step>
      <span className="spm-human-step">Step {step+1} of {steps.length}</span>
      <strong>{selected.human}</strong>
      <p>{selected.detail}</p>
      <p><ShieldCheck size={14} style={{verticalAlign:'middle',marginRight:5}}/>
        Verified gate: {selected.needs}</p>
    </div>
    <button className="spm-primary spm-human-continue" type="button"
      onClick={()=>setStep(s=>(s+1)%steps.length)}>
      {step===steps.length-1?'Review from the beginning':'Next step'}<ArrowRight size={16}/>
    </button>
    <div className="spm-human-truth" role="note">
      <ClipboardList size={16}/>
      <p>Design inspection only. This screen shows no real helpers, issued SecureLinks,
        bookings, accepted Agreements or payments. Real connection and certification
        are separate from a successful visual build.</p>
    </div>
  </section>;
}
