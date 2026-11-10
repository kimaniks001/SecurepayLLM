import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, CircleAlert, MessageCircle, ShieldCheck, ShoppingBag, TestTube2 } from 'lucide-react';
import { getMiniDemoAmount, miniDemoStatusLabel, type MiniCheckoutDemoRecord, type MiniDemoStatus } from './checkoutDemoFixtures';
import { MiniFundingPreview } from './MiniFundingPreview';
import { MiniGuestChat } from './MiniGuestChat';
import type { MiniDraft, MiniLanguage } from './miniModel';
import type { MiniFundingTestStatus, MiniTestRailId } from './miniFundingSimulator';
import {
  createOfflineJourney,moveOfflineJourney,nextOfflineAction,offlineObligations,
  type OfflineParticipant,type OfflineAction,type OfflineSimResult
} from './offlineAgreementJourney';

type Step = 'review' | 'funding' | 'chat';
const RETURN_EVENT = 'SECUREPAY_MINI_OWNER_DEMO_RETURN_V1';

/**
 * Phase 1: same checkout surface for a fictional Store and ShortStays host.
 * NO money/session server request: the context is a source-controlled TEST
 * FIXTURE, not an actual booked room, signed Agreement, price quote or order.
 *
 * The synthetic postMessage is only an owner UX notification; a real host MUST
 * await authenticated server evidence and not derive paid/confirmed from it.
 */
export function MiniHostedCheckoutDemo({ record, language, sessionExpiresAt, journeyMode = false }: {
  record: MiniCheckoutDemoRecord;
  language: MiniLanguage;
  /** Expiring preview-server display session; never payment authority. */
  sessionExpiresAt?: number;
  /** Source-to-Agreement owner rehearsal inside existing Mini, entirely offline. */
  journeyMode?: boolean;
}) {
  const sw = language === 'sw';
  const [step, setStep] = useState<Step>('review');
  const [participant,setParticipant] = useState<OfflineParticipant>('CUSTOMER');
  const [journey,setJourney] = useState(()=>createOfflineJourney(record.orderVersion));
  const [actionText,setActionText]=useState('');
  const [previewOverdue,setPreviewOverdue]=useState(false);
  const obligations=offlineObligations(record.amountMinor,record.source,journey.plan);
  const currentObligation=obligations[journey.obligationIndex];
  const nextAction=nextOfflineAction(journey,record.source,
    previewOverdue?journey.createdAt+25*86400000:Date.now());
  const money=(minor:number)=>'KSh '+(minor/100).toLocaleString('en-KE',
    {maximumFractionDigits:2});
  const switchSource = () => {
    const revised=moveOfflineJourney(journey,participant,'SOURCE_CHANGED');
    if(!revised)return;
    setJourney(revised);setStep('review');setParticipant('PROVIDER');
    setActionText('');setPreviewOverdue(false);setSimulatedStatus('NOT_STARTED');
  };
  const takeOfflineAction=(action:OfflineAction,detail='') => {
    const updated=moveOfflineJourney(journey,participant,action,detail,obligations.length);
    if(!updated)return;
    setJourney(updated);setActionText('');
    if(action==='SELECT_PLAN'||action==='SOURCE_CHANGED')setSimulatedStatus('NOT_STARTED');
    if(action==='CONTINUE_SIMULATION')setStep('funding');
    if(action==='ACK_FICTIONAL_RESULT'){
      setStep('review');setParticipant('PROVIDER');
    }
    if(action==='SUBMIT_EVIDENCE')setParticipant('CUSTOMER');
    if(action==='RAISE_CONCERN')setParticipant('PROVIDER');
    if(action==='APPROVE_STAGE'){setStep('review');setParticipant('CUSTOMER');}
  };
  const [cameFrom, setCameFrom] = useState<'review' | 'funding'>('review');
  const [chatStarted, setChatStarted] = useState(false);
  const [simulatedStatus, setSimulatedStatus] = useState<MiniDemoStatus>('NOT_STARTED');
  const [expired, setExpired] = useState(() => Boolean(sessionExpiresAt && Date.now() >= sessionExpiresAt));
  useEffect(() => {
    if (!sessionExpiresAt) return;
    const ms = Math.max(0, sessionExpiresAt - Date.now());
    const id = window.setTimeout(() => setExpired(true), ms);
    return () => window.clearTimeout(id);
  }, [sessionExpiresAt]);

  // Screens must begin at the top without the customer hunting for the next action.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>('.spm-frame')?.scrollTo(0, 0);
  }, [step, simulatedStatus]);

  const draft: MiniDraft = {
    intent: 'pay',
    description:journeyMode ?
      record.itemDescription+' · '+currentObligation.label : record.itemDescription,
    amount:journeyMode?(currentObligation.amountMinor/100).toFixed(2):getMiniDemoAmount(record),
    quantity: record.quantity,
    unit: record.unit,
    note: record.terms,
    counterparty: '',
  };

  const onStatusChange = useCallback((status: MiniFundingTestStatus, method: MiniTestRailId | null) => {
    // A client-side fictional outcome is NOT actual funding or provider truth.
    const sampleStatus=status === 'SELECT_METHOD' && !method ? 'NOT_STARTED' : status;
    setSimulatedStatus(current=>current===sampleStatus?current:sampleStatus);
    if(journeyMode && sampleStatus!=='NOT_STARTED') {
      const capturedRevision=journey.revision;
      const capturedIndex=journey.obligationIndex;
      setJourney(current=>{
        if(current.revision!==capturedRevision||
          current.obligationIndex!==capturedIndex||current.stage!=='FUNDING_PREVIEW')
          return current;
        return moveOfflineJourney(current,'CUSTOMER','RECORD_SIMULATION',
          sampleStatus as OfflineSimResult,obligations.length)??current;
      });
    }
  }, [journeyMode,journey.revision,journey.obligationIndex,journey.stage,obligations.length]);

  const returnToHost = () => {
    if (window.parent !== window) {
      // ONLY same-origin sample pages. No payment/booking verification event.
      window.parent.postMessage({
        type: RETURN_EVENT,
        version: 1,
        fixtureId: record.id,
        result: simulatedStatus,
        simulated: true,
      }, window.location.origin);
      return;
    }
    // Standalone preview: no result in query strings or promise of payment.
    window.location.assign(record.hostReturnPath);
  };

  const showChat = () => {
    setChatStarted(true);
    setCameFrom(step === 'funding' ? 'funding' : 'review');
    setStep('chat');
  };

  const SourceIcon = record.source === 'STORE' ? ShoppingBag : CalendarDays;

  if (expired) return <section className="spm-content spm-hosted-expired" role="alert">
    <h1 className="spm-question">{sw ? 'Checkout imeisha muda' : 'Checkout expired'}</h1>
    <p className="spm-lead">{sw ? 'Hakuna malipo yaliyotumwa. Rudi uanze tena.' :
      'No payment was made. Return to the website and start again.'}</p>
    <button type="button" className="spm-primary" onClick={returnToHost}>
      <ArrowLeft size={17}/>{sw ? 'Rudi kwenye tovuti' :
        (record.source === 'STORE' ? 'Return to Store' : 'Return to ShortStays')}
    </button>
  </section>;

  return <section className="spm-hosted-demo" data-checkout-test-id={record.id}>
    {step === 'review' && <div className="spm-hosted-review">
      <div className="spm-demo-flag"><TestTube2 size={16}/>
        {sw ? 'JARIBIO TU · Hakuna malipo' : 'SIMULATION ONLY · No payment'}
      </div>
      <div className="spm-hosted-source"><SourceIcon size={18}/>
        <span>{record.source === 'STORE' ? 'Digital Store' : 'ShortStays'}</span>
        <small>{sw ? 'Tovuti ya mfano' : 'Sample website'}</small>
      </div>

      <h1 className="spm-question">{sw ? 'Kagua malipo yako' : 'Review your checkout'}</h1>
      <div className="spm-hosted-summary">
        <small>{record.reference} · {record.orderVersion}</small>
        <strong>{record.itemDescription}</strong>
        <span>{record.details}</span>
        <div className="spm-hosted-price">{'KSh ' + (record.amountMinor / 100).toLocaleString('en-KE')}</div>
        <span>{record.merchant}</span>
        <div className="spm-hosted-rule">{record.terms}</div>
      </div>
      <p className="spm-hosted-safety"><ShieldCheck size={15}/>
        {sw ? 'Hii si oda au booking halisi. Hakuna makubaliano yaliyotiwa sahihi.' :
          'Test order only. No accepted agreement, reserved stock or booking.'}
      </p>

      {journeyMode ? <div className="spm-journey" data-simulation-journey={record.source}>
        <div className="spm-journey-label">FULL-JOURNEY SIMULATION · no API</div>
        <div className="spm-journey-schedule" aria-label="Illustrative payment obligations">
          <div className="spm-journey-schedule-head">
            <strong>Payment schedule</strong>
            <span>{journey.plan==='FULL'?'Pay once':'Deposit + 2 milestones'}</span>
          </div>
          {journey.stage==='TERMS_REVIEW'&&participant==='CUSTOMER'&&
            <div className="spm-journey-plan" role="group" aria-label="Test a payment schedule">
              <button type="button" aria-pressed={journey.plan==='FULL'}
                onClick={()=>takeOfflineAction('SELECT_PLAN','FULL')}
                className={journey.plan==='FULL'?'spm-journey-selected':''}>Pay once</button>
              <button type="button" aria-pressed={journey.plan==='STAGED'}
                onClick={()=>takeOfflineAction('SELECT_PLAN','STAGED')}
                className={journey.plan==='STAGED'?'spm-journey-selected':''}>Deposit + stages</button>
            </div>}
          {obligations.map(o=><div className={'spm-journey-obligation'+
            (o.index===journey.obligationIndex?' spm-journey-current':'')} key={o.id}>
            <span>{o.index+1}. {o.label}</span><strong>{money(o.amountMinor)}</strong>
          </div>)}
          <small>Illustration only. Changing the schedule resets both sample reviews.
            No money or real due-date obligation is created.</small>
        </div>
        <div className="spm-journey-roles" role="group" aria-label="Participant for this sample">
          <button type="button" aria-pressed={participant==='CUSTOMER'}
            onClick={()=>setParticipant('CUSTOMER')}
            className={participant==='CUSTOMER'?'spm-journey-selected':''}>Buyer / guest</button>
          <button type="button" aria-pressed={participant==='PROVIDER'}
            onClick={()=>setParticipant('PROVIDER')}
            className={participant==='PROVIDER'?'spm-journey-selected':''}>
            {record.source==='STORE'?'Seller':'Stay host'}</button>
        </div>
        <div className="spm-journey-next" role="status" aria-live="polite">
          <span className="spm-journey-kicker">Next-action prompt · in-app preview only</span>
          <strong>{nextAction.title}</strong>
          <p>{nextAction.description}</p>
          <small>For: {nextAction.participant==='CUSTOMER'?'Buyer / guest':
            record.source==='STORE'?'Seller':'Stay host'} · No notification sent</small>
          {nextAction.dueAt!==null&&<small>
            Sample due: {new Date(nextAction.dueAt).toLocaleDateString('en-KE',
              {day:'numeric',month:'short'})}
            {nextAction.overdue?' · OVERDUE PREVIEW':''}
          </small>}
        </div>
        <label className="spm-journey-overdue">
          <input type="checkbox" checked={previewOverdue}
            onChange={e=>setPreviewOverdue(e.target.checked)}/>
          Show overdue action reminder (sample only)
        </label>
        {journey.stage==='SOURCE_REVIEW'&&participant==='PROVIDER'&&
          <button type="button" className="spm-primary"
            onClick={()=>takeOfflineAction('REVIEW_SOURCE')}>
            Review sample source <ArrowRight size={17}/>
          </button>}
        {journey.stage==='TERMS_REVIEW'&&!journey.reviewed[participant]&&
          <button type="button" className="spm-primary"
            onClick={()=>takeOfflineAction('REVIEW_TERMS')}>
            I have reviewed these sample terms <ArrowRight size={17}/>
          </button>}
        {journey.stage==='TERMS_REVIEW'&&<p className="spm-journey-progress">
          Buyer / guest {journey.reviewed.CUSTOMER?'reviewed':'pending'} ·
          {record.source==='STORE'?' Seller ':' Host '}
          {journey.reviewed.PROVIDER?'reviewed':'pending'} · NOT SIGNED
        </p>}
        {journey.stage==='TERMS_REVIEW'&&journey.reviewed.CUSTOMER&&
          journey.reviewed.PROVIDER&&participant==='CUSTOMER'&&
          <button type="button" className="spm-primary"
            onClick={()=>takeOfflineAction('CONTINUE_SIMULATION')}>
            Continue to simulated payment <ArrowRight size={17}/>
          </button>}
        {journey.stage==='FUNDING_PREVIEW'&&participant==='CUSTOMER'&&
          <button type="button" className="spm-primary" onClick={()=>setStep('funding')}>
            {journey.simulatedResult==='SIMULATED_CONFIRMED'?
              'Check fictional result':'Return to payment simulation'}
            <ArrowRight size={17}/>
          </button>}
        {(journey.stage==='EVIDENCE_DUE'||journey.stage==='CONCERN_OPEN')&&
          participant==='PROVIDER'&&<>
            {journey.concern&&<p className="spm-journey-evidence">
              Buyer concern: {journey.concern}</p>}
            <label className="spm-label" htmlFor="spm-offline-evidence">
              {journey.stage==='CONCERN_OPEN'?'Describe the correction':'Evidence caption (sample)'}
            </label>
            <textarea id="spm-offline-evidence" className="spm-field" rows={2}
              maxLength={200} value={actionText}
              onChange={e=>setActionText(e.target.value)}
              placeholder="What has been completed or corrected?"/>
            <button type="button" className="spm-primary"
              disabled={actionText.trim().length<3}
              onClick={()=>takeOfflineAction('SUBMIT_EVIDENCE',actionText)}>
              Submit sample evidence <ArrowRight size={17}/>
            </button>
          </>}
        {journey.stage==='BUYER_REVIEW'&&<>
          <p className="spm-journey-evidence"><strong>Example evidence:</strong> {journey.evidence}</p>
          {participant==='CUSTOMER'&&<>
            <button type="button" className="spm-primary"
              onClick={()=>takeOfflineAction('APPROVE_STAGE')}>
              Approve example stage <ArrowRight size={17}/>
            </button>
            <label className="spm-label" htmlFor="spm-offline-concern">
              Need a correction?
            </label>
            <textarea id="spm-offline-concern" className="spm-field"
              rows={2} maxLength={200} value={actionText}
              onChange={e=>setActionText(e.target.value)}
              placeholder="Describe the concern"/>
            <button type="button" className="spm-secondary"
              disabled={actionText.trim().length<3}
              onClick={()=>takeOfflineAction('RAISE_CONCERN',actionText)}>
              Raise a sample concern
            </button>
          </>}
        </>}
        {journey.stage==='DONE'&&<p className="spm-journey-complete">
          All sample obligations explored. NOT PAID · Not signed · No fulfilment.
        </p>}
        {nextAction.participant!==participant&&journey.stage!=='FUNDING_PREVIEW'&&
          journey.stage!=='DONE'&&
          <button className="spm-secondary" type="button"
            onClick={()=>setParticipant(nextAction.participant)}>
            Switch to next participant
          </button>}
        <button className="spm-quiet-button" type="button" onClick={switchSource}>
          Test changed source / revised terms
        </button>
        <p className="spm-journey-warning">
          No signatures, inventory or room holds, actual deposits, releases, payments
          or notifications. The entire journey is simulated.
        </p>
      </div> :
      <button type="button" className="spm-primary" onClick={() => setStep('funding')}>
        {sw ? 'Endelea kulipa' : 'Continue to payment'}<ArrowRight size={18}/>
      </button>}
      <button className="spm-quiet-button" type="button" onClick={showChat}>
        <MessageCircle size={16}/>{sw ? 'Unahitaji msaada? Uliza KS001' : 'Need help? Ask KS001'}
      </button>
      <button className="spm-hosted-return spm-quiet-button" type="button" onClick={returnToHost}>
        <ArrowLeft size={16}/>{sw ? 'Rudi kwenye tovuti' : 'Back to website'}
      </button>
    </div>}

    {/* Keep the SAME funding component mounted across review/chat to preserve
        the local pending/unknown attempt when the owner reopens it. */}
    <div className="spm-hosted-finance" hidden={step !== 'funding'}>
      <MiniFundingPreview
        key={journeyMode ? 'offline-'+record.id+'-'+journey.revision+'-'+
          journey.obligationIndex+'-'+journey.stage : 'original'}
        draft={draft} language={language}
        onBack={() => setStep('review')}
        onDemoStateChange={onStatusChange}
        onReturnToHost={returnToHost}
        guidedDemo={!journeyMode}
        returnLabel={sw ? (record.source === 'STORE' ? 'Rudi dukani' : 'Rudi ShortStays') :
          (record.source === 'STORE' ? 'Return to Store' : 'Return to ShortStays')}
      />
      {journeyMode&&journey.stage==='FUNDING_PREVIEW'&&
        journey.simulatedResult==='SIMULATED_CONFIRMED'&&
        <div className="spm-journey-funding-next">
          <strong>Next action · fictional payment only</strong>
          <p>This is NOT a funded deposit or milestone. Continue only to
            rehearse the provider’s completion evidence and buyer inspection.</p>
          <button type="button" className="spm-primary"
            onClick={()=>takeOfflineAction('ACK_FICTIONAL_RESULT')}>
            Continue sample work step <ArrowRight size={16}/>
          </button>
        </div>}
      <button type="button" className="spm-quiet-button" onClick={showChat}>
        <MessageCircle size={16}/>{sw ? 'Unahitaji msaada? Uliza KS001' : 'Need help? Ask KS001'}
      </button>
    </div>

    {chatStarted && <div className="spm-hosted-chat" hidden={step !== 'chat'}>
      <MiniGuestChat draft={draft} language={language} onBack={() => setStep(cameFrom)}/>
    </div>}

    {step === 'review' && <div className="spm-hosted-mini-status">
      <CircleAlert size={14}/>
      <span>{simulatedStatus === 'NOT_STARTED'
        ? (sw ? 'Hakuna pesa zilizotumwa' : 'No money sent')
        : miniDemoStatusLabel(simulatedStatus)}</span>
    </div>}
  </section>;
}

export const MINI_CHECKOUT_DEMO_RETURN_EVENT = RETURN_EVENT;
