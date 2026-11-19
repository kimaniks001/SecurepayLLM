import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, HeartHandshake, MapPin, MessageCircle, ShieldCheck, Sparkles, Users } from 'lucide-react';
import type { MiniLanguage } from './miniModel';
import type { HumanHelpIntent } from '../api/securepay/human-discovery';
import { MiniHumanCaseEvidence, sampleHumanReview } from './MiniHumanCaseEvidence';
import { MiniHumanConsentExample } from './MiniHumanConsentExample';
import { MiniHumanDiscovery } from './MiniHumanDiscovery';
import { MiniHumanEngagements } from './MiniHumanEngagements';
import './miniHumanHelp.css';

/**
 * Native Mini Human Layer H3 design review.
 * Uses the exact Mini shell, spm option cards, typography, buttons and footer.
 * No new identity, Agreement, human booking, real KS001 review or Money rail.
 * Current UI is a local guide ONLY until H3 core can be certified in staging.
 */
export type MiniHelpJourney = 'general' | 'buy' | 'sell' | 'pay' | 'collect';
type ConcreteJourney = Exclude<MiniHelpJourney, 'general'>;
type Need = 'explain' | 'person' | 'problem' | 'local' | 'check' | 'specialist';
type Stage = 'journey' | 'need' | 'question' | 'next';
type Choice = 'ks001' | 'conversation' | 'human' | null;

const journeys: ReadonlyArray<{ value: ConcreteJourney; title: string; hint: string }> = [
  { value: 'buy', title: 'Buy something', hint: 'A purchase, delivery or service' },
  { value: 'sell', title: 'Sell something', hint: 'Your offer, a customer or a sale' },
  { value: 'pay', title: 'Pay someone or something', hint: 'An obligation, bill or payment' },
  { value: 'collect', title: 'Collect money', hint: 'A purpose, contribution or group' },
];
const needs: ReadonlyArray<{ value: Need; title: string; hint: string; Icon: typeof MessageCircle }> = [
  { value: 'explain', title: 'Help me understand', hint: 'What was agreed, and what should happen next?', Icon: Sparkles },
  { value: 'person', title: 'I want to talk to someone', hint: 'A real person, even when nothing is wrong', Icon: MessageCircle },
  { value: 'problem', title: 'Something is not going right', hint: 'Understand the concern and hear everyone fairly', Icon: HeartHandshake },
  { value: 'local', title: 'I need someone local', hint: 'Someone familiar with this area or service', Icon: MapPin },
  { value: 'check', title: 'Can someone check something?', hint: 'Count, measure, inspect or document facts', Icon: ClipboardCheck },
  { value: 'specialist', title: 'I need a specialist', hint: 'A qualified person for a particular skill', Icon: Users },
];
const answers: Record<Need, readonly string[]> = {
  explain: ['What did we agree?', 'What happens next?', 'What is still unclear?'],
  person: ['I need reassurance', 'Someone who understands the trade', 'Just a conversation'],
  problem: ['Delivery or timing', 'Different understanding of the terms', 'Quality or condition', 'A safety concern'],
  local: ['Advice about the area', 'Help finding a local service', 'Someone who knows the market'],
  check: ['Check a delivery', 'Count or measure', 'Photograph condition with permission'],
  specialist: ['Construction', 'Hospitality', 'Legal or regulated expertise', 'Something else'],
};

export function MiniHumanHelp({ language, fromJourney = 'general', directHumanHelp = false, directH4dPreview = false, onBack, onAskKs001, onFindHuman }: {
  language: MiniLanguage;
  fromJourney?: MiniHelpJourney;
  /** H4C preview begins with human intent, not a repeated H3 trade selection. */
  directHumanHelp?: boolean;
  /** Visual-only H4D Mini route: no fictional helper or live request. */
  directH4dPreview?: boolean;
  onBack: () => void;
  onAskKs001: () => void;
  /** Actual H4C needs first-party sign-in and an isolated Core backend. */
  onFindHuman?: (intent:HumanHelpIntent,localChoice:string)=>void;
}) {
  const [stage, setStage] = useState<Stage>(fromJourney === 'general' && !directHumanHelp ? 'journey' : 'need');
  const [journey, setJourney] = useState<ConcreteJourney>(fromJourney === 'general' ? 'buy' : fromJourney);
  const [need, setNeed] = useState<Need | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [choice, setChoice] = useState<Choice>(null);
  const isSw = language === 'sw';
  const back = () => {
    if (stage === 'journey') onBack();
    else if (stage === 'need') fromJourney === 'general' && !directHumanHelp ? setStage('journey') : onBack();
    else if (stage === 'question') setStage('need');
    else setStage('question');
    setChoice(null);
  };
  const pickNeed = (next: Need) => {
    setNeed(next); setAnswer(null); setChoice(null); setStage('question');
  };
  const name = directHumanHelp ? 'Human help' : journeys.find(j => j.value === journey)?.title ?? 'Your trade';
  const prompt = needs.find(n => n.value === need)?.title ?? 'What would help?';
  const helpIntent:HumanHelpIntent = need==='local'?'LOCAL_KNOWLEDGE'
    :need==='check'?'FIELD_CHECK':need==='specialist'?'SPECIALIST':'CONVERSATION';

  if(directH4dPreview)
    return <MiniHumanEngagements enabled={false} signedIn={false}
      gateway={{
        create:async()=>{throw new Error('No H4D Core connection in visual preview');},
        mine:async()=>{throw new Error('No H4D Core connection in visual preview');},
        decide:async()=>{throw new Error('No H4D Core connection in visual preview');}
      }} prepare={async()=>undefined} onSignIn={()=>undefined} onBack={onBack}/>;

  // The H4C route can display the REAL native discovery component with NO
  // backend activation, helpers or contact; it never invents sample providers.
  if(directHumanHelp && stage==='next' && choice==='human' && !onFindHuman)
    return <MiniHumanDiscovery initialIntent={helpIntent} context={answer}
      enabled={false} signedIn={false}
      gateway={{discover:async()=>{throw new Error('Design preview has no provider lookup');}}}
      prepare={async()=>undefined} onSignIn={()=>undefined}
      onAskKs001={onAskKs001} onBack={()=>setChoice(null)}/>;

  return <section className="spm-content spm-human" data-mini-h3-native aria-label="SecurePay Mini Human Layer">
    <button className="spm-back" type="button" onClick={back}>
      <ArrowLeft size={18}/>{isSw ? 'Rudi' : 'Back'}
    </button>
    <div className="spm-persona">
      <HeartHandshake size={16}/><span>KS001</span><span className="spm-dot"/><span>{isSw ? 'Msaada' : 'Here to help'}</span>
    </div>
    {directHumanHelp&&<span className="spm-human-step">H4C · Human help preview</span>}

    {stage === 'journey' && <>
      <h1 className="spm-question">{isSw ? 'Unahitaji msaada?' : 'Need a hand?'}</h1>
      <p className="spm-lead">You can ask for guidance, someone local or a real person to talk to. You do not need a dispute.</p>
      <p className="spm-label">What are you doing?</p>
      <div className="spm-actions">
        {journeys.map(item => <button type="button" key={item.value} className="spm-option" onClick={() => {setJourney(item.value);setNeed(null);setStage('need');}}>
          <span className="spm-option-text"><strong>{item.title}</strong><small>{item.hint}</small></span>
          <ArrowRight size={18}/>
        </button>)}
      </div>
    </>}

    {stage === 'need' && <>
      <span className="spm-human-step">{name}</span>
      <h1 className="spm-question">What would help?</h1>
      <p className="spm-lead">Choose what feels closest. We can work out the details together.</p>
      <div className="spm-actions">
        {needs.map(item => <button className="spm-option" type="button" key={item.value} onClick={() => pickNeed(item.value)}>
          <span className="spm-option-icon"><item.Icon size={19}/></span>
          <span className="spm-option-text"><strong>{item.title}</strong><small>{item.hint}</small></span><ArrowRight size={18}/>
        </button>)}
      </div>
    </>}

    {stage === 'question' && need && <>
      <span className="spm-human-step">{name} · Need a hand?</span>
      <h1 className="spm-question">{prompt}</h1>
      <p className="spm-lead">A simple choice is enough to begin. You can explain more later.</p>
      <div className="spm-human-pills" role="group" aria-label="What would help most">
        {answers[need].map(option => <button type="button" className="spm-human-pill"
          aria-pressed={answer === option} key={option} onClick={() => setAnswer(option)}>
          <span>{option}</span>{answer === option && <Check size={15}/>}
        </button>)}
      </div>
      <button type="button" className="spm-primary spm-human-continue" disabled={!answer}
        onClick={() => {setChoice(null);setStage('next');}}>
        Continue <ArrowRight size={17}/>
      </button>
    </>}

    {stage === 'next' && need && answer && <>
      <span className="spm-human-step">{name} · Your next step</span>
      <h1 className="spm-question">Here is how we can help.</h1>
      <div className="spm-quote">{answer}</div>
      <p className="spm-lead">There is no need to turn an ordinary question into a dispute.</p>
      <div className="spm-actions">
        <button type="button" className="spm-option" onClick={() => setChoice('ks001')}>
          <span className="spm-option-icon"><Sparkles size={19}/></span>
          <span className="spm-option-text"><strong>Ask KS001</strong><small>Understand your Agreement and possible next steps</small></span><ArrowRight size={18}/>
        </button>
        <button type="button" className="spm-option" onClick={() => setChoice('conversation')}>
          <span className="spm-option-icon"><MessageCircle size={19}/></span>
          <span className="spm-option-text"><strong>Talk it through together</strong><small>Use the Agreement conversation when available</small></span><ArrowRight size={18}/>
        </button>
        <button type="button" className="spm-option" onClick={() => setChoice('human')}>
          <span className="spm-option-icon"><Users size={19}/></span>
          <span className="spm-option-text"><strong>Talk to the right person</strong><small>Choose local practical help or qualified expertise</small></span><ArrowRight size={18}/>
        </button>
      </div>
      {(need === 'problem' || need === 'explain') && <>
        <MiniHumanCaseEvidence snapshot={sampleHumanReview} sample />
        <MiniHumanConsentExample />
      </>}
      {choice && <div className="spm-human-result" role="status">
        <strong>{choice === 'ks001' ? 'KS001 can guide you' : choice === 'human' ? 'Human help is your choice' : 'A conversation, not a verdict'}</strong>
        <p>{choice === 'ks001'
          ? 'In the real Mini service, KS001 needs your permission and the verified Agreement to examine the facts.'
          : choice === 'human'
          ? 'H4C can check genuinely reviewed, opted-in helper services in isolated staging. A recent availability declaration is not a booking. Nobody has been contacted.'
          : 'Both parties can explain their positions. A message alone cannot change agreed terms or authorize payment.'}</p>
        {choice === 'human' && onFindHuman && <button type="button"
          className="spm-secondary" data-mini-h4c-first-party-entry
          onClick={()=>onFindHuman(helpIntent,answer)}>
          See verified helper options <ArrowRight size={15}/>
        </button>}
        {choice === 'ks001' && <button type="button" className="spm-secondary" onClick={onAskKs001}>
          Open Ask KS001 <ArrowRight size={15}/>
        </button>}
      </div>}
    </>}

    <div className="spm-human-truth" role="note">
      <ShieldCheck size={16} aria-hidden="true"/>
      <p>This is a Mini H3 experience review. No real person was contacted, no case was opened, and no Money or Agreement was changed.</p>
    </div>
  </section>;
}
