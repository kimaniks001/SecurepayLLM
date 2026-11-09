import {useEffect,useState} from 'react';
import {Bell,CheckCircle2,Clock3,FileText,MessageCircle,RotateCcw,ShieldCheck} from 'lucide-react';
import {
  newSampleJourney,restoreSampleJourney,transitionSample,sampleNextAction,
  sampleActionOptions,SAMPLE_TOTAL_MINOR,SAMPLE_DEPOSIT_MINOR,
  SAMPLE_MILESTONES,SAMPLE_MONEY_AUTHORITY,
  type SampleActor,type SampleAction,type SampleJourney
} from './miniMilestonesModel';

const KEY='spm-gate5-milestone-sample-v1';
const money=(minor:number)=>'KSh '+(minor/100).toLocaleString('en-KE');
const titleByAction:Record<SampleAction,string>={
  REVIEW:'I have reviewed this sample',
  ACK_DEPOSIT:'Preview deposit commitment',
  SUBMIT_EVIDENCE:'Submit sample evidence',
  RAISE_CONCERN:'Raise a concern',
  APPROVE_MILESTONE:'Approve this sample milestone',
  ACK_MILESTONE:'Preview next scheduled payment'
};
const initial=():SampleJourney=>{
  try {
    const saved=sessionStorage.getItem(KEY);
    if(saved){const restored=restoreSampleJourney(JSON.parse(saved));
      if(restored)return restored;}
  }catch{/* Optional tab-local preview state */}
  return newSampleJourney();
};
export function MiniMilestonesSandbox() {
  const [journey,setJourney]=useState<SampleJourney>(initial);
  const [actor,setActor]=useState<SampleActor>('BUYER');
  const [caption,setCaption]=useState('');
  const [showOverdue,setShowOverdue]=useState(false);
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    try{sessionStorage.setItem(KEY,JSON.stringify(journey));}
    catch{/* Tab storage unavailable: current screen still works */}
  },[journey]);
  const asOf=showOverdue?journey.createdAt+25*86400000:Date.now();
  const notification=sampleNextAction(journey,asOf);
  const options=sampleActionOptions(journey,actor);
  const next=SAMPLE_MILESTONES[journey.milestoneIndex];
  const complete=journey.phase==='COMPLETE_SAMPLE';
  const needText=journey.phase==='CONCERN_OPEN'||journey.phase==='WORK_IN_PROGRESS'||
    journey.phase==='BUYER_REVIEW';
  const submit=(action:SampleAction)=>{
    const value=action==='SUBMIT_EVIDENCE'||action==='RAISE_CONCERN'?caption:'';
    const updated=transitionSample(journey,actor,action,value);
    if(!updated){
      setNotice('This sample action is not available to this person at this step.');
      return;
    }
    setJourney(updated);setCaption('');setNotice('');
  };
  const reset=()=>{
    const fresh=newSampleJourney();
    setJourney(fresh);setActor('BUYER');setCaption('');setShowOverdue(false);
    setNotice('Sample restarted. Nothing was sent or paid.');
  };
  return <section className="spm-content spm-milestone-sandbox" data-gate5="milestones"
    aria-label="Sample milestones, deposits and next actions">
    <div className="spm-demo-flag"><ShieldCheck size={16}/>PHASE 4 GATE 5 · OFFLINE SAMPLE</div>
    <h1 className="spm-question">One agreement. Clear next actions.</h1>
    <p className="spm-lead spm-m5-intro">A kitchen installation example: decide what is due,
      who acts next, and when evidence needs review. No agreement is signed and no money moves.</p>

    <div className="spm-m5-total">
      <span><small>Illustrative agreement total</small><strong>{money(SAMPLE_TOTAL_MINOR)}</strong></span>
      <span className="spm-m5-safety">NOT FUNDED</span>
    </div>
    <div className="spm-m5-timeline" aria-label="Sample financial schedule">
      <div className="spm-m5-step">
        <span className="spm-m5-step-icon">1</span>
        <span><strong>Deposit · materials</strong><small>Before work starts</small></span>
        <b>{money(SAMPLE_DEPOSIT_MINOR)}</b>
      </div>
      {SAMPLE_MILESTONES.map((m,i)=><div key={m.id} className="spm-m5-step">
        <span className="spm-m5-step-icon">{i+2}</span>
        <span><strong>{m.title}</strong><small>After evidence and buyer approval</small></span>
        <b>{money(m.amountMinor)}</b>
      </div>)}
    </div>
    <div className="spm-m5-status"><FileText size={16}/>
      <span>{complete?'Sample journey completed':journey.phase==='REVIEW_SCHEDULE'?
        'Schedule review · not accepted':journey.phase==='DEPOSIT_DUE'?
        'Deposit obligation · no funds received':journey.phase==='WORK_IN_PROGRESS'?
        'Work evidence needed':journey.phase==='BUYER_REVIEW'?
        'Buyer inspection needed':journey.phase==='CONCERN_OPEN'?
        'Concern open · builder response needed':'Milestone reviewed · next payment obligation'}</span>
    </div>

    <div className="spm-m5-actor-header">
      <strong>View as</strong><small>Switch roles to explore both sides</small>
    </div>
    <div className="spm-m5-roles" role="group" aria-label="Sample participant">
      <button type="button" aria-pressed={actor==='BUYER'} onClick={()=>{setActor('BUYER');setNotice('');setCaption('');}}
        className={actor==='BUYER'?'spm-m5-selected':''}>Buyer</button>
      <button type="button" aria-pressed={actor==='BUILDER'} onClick={()=>{setActor('BUILDER');setNotice('');setCaption('');}}
        className={actor==='BUILDER'?'spm-m5-selected':''}>Builder</button>
    </div>

    <div className="spm-m5-next" role="status" aria-live="polite">
      <div className="spm-m5-next-top"><Bell size={17}/><strong>Next-action notification</strong></div>
      <small className="spm-m5-no-send">In-app preview only · no message sent</small>
      <strong>{notification.title}</strong>
      <p>{notification.body}</p>
      <div className="spm-m5-recipient">
        <span>For: {notification.recipient==='BUYER'?'Buyer':'Builder'}</span>
        {notification.dueAt&&<span><Clock3 size={13}/>
          {new Date(notification.dueAt).toLocaleDateString('en-KE',{day:'numeric',month:'short'})}
          {notification.overdue?' · Overdue example':''}
        </span>}
      </div>
      {!complete&&notification.recipient!==actor&&<button className="spm-secondary"
        type="button" onClick={()=>setActor(notification.recipient)}>
        View {notification.recipient==='BUYER'?'buyer':'builder'} action
      </button>}
    </div>

    {journey.phase==='REVIEW_SCHEDULE'&&<p className="spm-m5-hint">
      Sample reviews: Buyer {journey.reviewedBy.BUYER?'✓':'pending'} ·
      Builder {journey.reviewedBy.BUILDER?'✓':'pending'}. Neither is a legal signature.
    </p>}
    {journey.evidence&&<div className="spm-m5-note">
      <strong>Sample evidence caption</strong><p>{journey.evidence}</p>
    </div>}
    {journey.concern&&<div className="spm-m5-note">
      <strong>Buyer concern</strong><p>{journey.concern}</p>
    </div>}
    {options.includes('SUBMIT_EVIDENCE')&&<label className="spm-label" htmlFor="spm-m5-evidence">
      Evidence caption (sample only)
    </label>}
    {options.includes('RAISE_CONCERN')&&<label className="spm-label" htmlFor="spm-m5-evidence">
      What needs correction?
    </label>}
    {(options.includes('SUBMIT_EVIDENCE')||options.includes('RAISE_CONCERN'))&&
      <textarea id="spm-m5-evidence" rows={2} maxLength={200} className="spm-field"
        value={caption} onChange={e=>setCaption(e.target.value)}
        placeholder={journey.phase==='CONCERN_OPEN'?'Describe the correction made':
          actor==='BUILDER'?'Describe the work completed':'Describe your concern'}/>}
    {options.length>0?<div className="spm-m5-actions">
      {options.map(action=><button type="button" key={action}
        className={action==='RAISE_CONCERN'?'spm-secondary':'spm-primary'}
        disabled={(action==='SUBMIT_EVIDENCE'||action==='RAISE_CONCERN')&&!caption.trim()}
        onClick={()=>submit(action)}>
        {action==='RAISE_CONCERN'?<MessageCircle size={16}/>:<CheckCircle2 size={16}/>}
        {titleByAction[action]}
      </button>)}
    </div>:<p className="spm-m5-hint">
      {complete?'No next step in this fictional sample.':
        'No action is due from this person now. The other participant must act next.'}
    </p>}
    {notice&&<p className="spm-m5-hint" role="status">{notice}</p>}
    <details className="spm-m5-more">
      <summary>Reminders and action history</summary>
      <p>Notifications are generated from the current sample state. They are not sent
        by email, WhatsApp, push or KS001. No AI is connected.</p>
      <label className="spm-m5-overdue">
        <input type="checkbox" checked={showOverdue}
          onChange={e=>setShowOverdue(e.target.checked)}/>
        Preview an overdue reminder (advance sample date)
      </label>
      {journey.history.length===0?<p>No sample actions yet.</p>:<ol>
        {[...journey.history].reverse().slice(0,8).map(h=><li key={h.revision}>
          {h.by==='BUYER'?'Buyer':'Builder'} · {titleByAction[h.action]}
        </li>)}
      </ol>}
    </details>
    <button type="button" className="spm-quiet-button spm-m5-reset" onClick={reset}>
      <RotateCcw size={15}/>Restart this sample
    </button>
    <div className="spm-m5-foot">
      {SAMPLE_MONEY_AUTHORITY.realPaymentVerified?'':'NO REAL PAYMENT'}
      {' · NO SIGNATURE · NO NOTIFICATIONS SENT'}
      {needText&&<span> · Evidence is text only, stored in this browser tab</span>}
    </div>
  </section>;
}
