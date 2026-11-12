import { useState } from 'react';
import { ArrowLeft, ArrowRight, HandCoins, MessageCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import {
  startCollectInterview, collectQuestion, answerCollectInterview,
  collectionReview, proposedCollectionDraft,
  type CollectionInterview, type CollectionDraft,
} from './miniCollectInterview.mjs';
import type { MiniLanguage } from './miniModel';

/**
 * Human-first Mini collection interview.
 *
 * This is a working, deterministic and genuinely branching local guided
 * conversation, NOT a configured KS001 AI connection. It cannot issue a
 * SecureLink, verify representation, record consent, invite contributors,
 * accept an Agreement, collect money or simulate that any of these happened.
 * Live services must be added only through canonical SecurePayAPI authority.
 */
export function MiniCollectConversation({ language, seed, onBack, onPrepareDraft }: {
  language:MiniLanguage;
  seed:string;
  onBack:()=>void;
  onPrepareDraft:(draft:CollectionDraft)=>void;
}) {
  const sw = language === 'sw';
  const [interview,setInterview] = useState<CollectionInterview>(() => startCollectInterview(seed));
  const [past,setPast] = useState<CollectionInterview[]>([]);
  const [typed,setTyped] = useState('');
  const [showEarlier,setShowEarlier] = useState(false);
  const question = collectQuestion(interview);
  const review=collectionReview(interview);
  const isReview=interview.stage==='review';

  const answer = (value:string) => {
    const next=answerCollectInterview(interview,value);
    if(next.lastError){setInterview(next);return;}
    setPast(old=>[...old,interview]);
    setInterview(next);
    setTyped('');
    setShowEarlier(false);
  };
  const back = () => {
    if(!past.length){onBack();return;}
    setInterview(past[past.length-1]);
    setPast(old=>old.slice(0,-1));
    setTyped('');
    setShowEarlier(false);
  };
  const startAgain=()=>{
    setInterview(startCollectInterview(''));
    setPast([]);
    setTyped('');
    setShowEarlier(false);
  };
  const history = interview.turns;
  const visibleHistory=showEarlier ? history : history.slice(-3);
  return <section className="spm-content spm-collect-interview" data-mini-collection-interview="local-guided-only">
    <button className="spm-back" type="button" onClick={back}>
      <ArrowLeft size={17}/>{past.length ? (sw?'Swali lililotangulia':'Previous question') : (sw?'Rudi':'Back')}
    </button>
    <div className="spm-persona"><HandCoins size={16}/><span>KS001</span>
      <span className="spm-dot"/><span>{sw?'Maswali ya kukusaidia':'Guided collection questions'}</span>
    </div>
    <h1 className="spm-question">{sw?'Tayarisha mchango':'Prepare a collection'}</h1>
    <p className="spm-collect-scope">
      {sw
        ? 'Haya ni maswali ya majaribio ya ndani. Sio AI iliyo moja kwa moja, wala mchango ulioruhusiwa.'
        : 'Interactive local guidance · Not connected to live KS001. No public collection or payment.'}
    </p>
    <div className="spm-collect-transcript" role="log" aria-label="Collection conversation">
      {history.length>3 && !showEarlier && <button type="button" className="spm-quiet-button"
          onClick={()=>setShowEarlier(true)}>
        {sw?'Angalia majibu yaliyotangulia':'Show earlier answers'} ({history.length-3})
      </button>}
      {visibleHistory.map((turn,index)=><div className="spm-collect-turn" key={index+':'+turn.stage}>
        <small>{sw?'Wewe':'You'}</small>
        <span>{turn.answer}</span>
      </div>)}
      <div className="spm-collect-question">
        <small>KS001 · {sw?'Swali':'Question'}</small>
        <strong>{question.text}</strong>
        <p>{question.note}</p>
      </div>
    </div>

    {!isReview && <>
      {question.options.length>0 && <div className="spm-collect-choices" aria-label="Suggested answers">
        {question.options.map(choice=><button type="button" key={choice.id}
          className="spm-collect-choice" onClick={()=>answer(choice.id)}>
          {choice.label}<ArrowRight size={15}/>
        </button>)}
      </div>}
      {(question.options.length===0 || interview.stage==='purpose') && <form onSubmit={event=>{
        event.preventDefault(); answer(typed);
      }}>
        <label className="spm-label" htmlFor="spm-collect-answer">
          {interview.stage==='purpose' ? 'Or describe the purpose in your own words' : 'Your answer'}
        </label>
        <div className="spm-collect-compose">
          <input className="spm-field" id="spm-collect-answer"
            value={typed} maxLength={160}
            inputMode={question.inputMode==='decimal'?'decimal':'text'}
            placeholder={question.placeholder || 'Tell KS001…'}
            onChange={event=>setTyped(event.target.value)}/>
          <button type="submit" className="spm-collect-send" disabled={!typed.trim()}
            aria-label="Continue with this answer"><ArrowRight size={19}/></button>
        </div>
      </form>}
      {interview.lastError && <p className="spm-error" role="alert">{interview.lastError}</p>}
    </>}

    {isReview && review && <div className="spm-collect-summary">
      <div className="spm-collect-summary-head"><ShieldCheck size={19}/>
        <strong>{sw?'Maelezo ya awali tu':'Local proposal — awaiting authorisation'}</strong>
      </div>
      <dl>
        <div><dt>For</dt><dd>{review.beneficiary}</dd></div>
        <div><dt>Purpose</dt><dd>{review.purpose}</dd></div>
        <div><dt>Permission</dt><dd>{review.consent}</dd></div>
        <div><dt>Who receives</dt><dd>{review.recipient}</dd></div>
        <div><dt>Target</dt><dd>{review.target}</dd></div>
        <div><dt>Updates</dt><dd>{review.reporting}</dd></div>
        <div><dt>Shared details</dt><dd>{review.disclosure}</dd></div>
      </dl>
      <div className="spm-collect-next">
        <strong>Before anyone contributes</strong>
        <ul>{review.checks.map((check,index)=><li key={index}>{check}</li>)}</ul>
      </div>
      <p className="spm-collect-scope">No one has consented or been verified by SecurePay. No Agreement, collection link, pledge or payment exists.</p>
      <button type="button" className="spm-primary" onClick={()=>{
        const draft=proposedCollectionDraft(interview);
        if(draft)onPrepareDraft(draft);
      }}>
        <MessageCircle size={17}/>Prepare local draft for review <ArrowRight size={17}/>
      </button>
      <button className="spm-secondary" type="button" onClick={back}>
        <ArrowLeft size={16}/>Change last answer
      </button>
      <button className="spm-quiet-button" type="button" onClick={startAgain}>
        <RotateCcw size={16}/>Start a new collection plan
      </button>
    </div>}
    <p className="spm-disclaimer">
      {sw?'Hatuna ruhusa ya kuchangisha au kupokea pesa kutoka kwenye skrini hii.':
        'A request for support is not proof of permission to collect on someone else’s behalf.'}
    </p>
  </section>;
}
