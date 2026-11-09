import { useCallback, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, CircleAlert, MessageCircle, ShieldCheck, ShoppingBag, TestTube2 } from 'lucide-react';
import { getMiniDemoAmount, miniDemoStatusLabel, type MiniCheckoutDemoRecord, type MiniDemoStatus } from './checkoutDemoFixtures';
import { MiniFundingPreview } from './MiniFundingPreview';
import { MiniGuestChat } from './MiniGuestChat';
import type { MiniDraft, MiniLanguage } from './miniModel';
import type { MiniFundingTestStatus, MiniTestRailId } from './miniFundingSimulator';

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
export function MiniHostedCheckoutDemo({ record, language }: {
  record: MiniCheckoutDemoRecord;
  language: MiniLanguage;
}) {
  const sw = language === 'sw';
  const [step, setStep] = useState<Step>('review');
  const [cameFrom, setCameFrom] = useState<'review' | 'funding'>('review');
  const [chatStarted, setChatStarted] = useState(false);
  const [simulatedStatus, setSimulatedStatus] = useState<MiniDemoStatus>('NOT_STARTED');

  const draft: MiniDraft = {
    intent: 'pay',
    description: record.itemDescription,
    amount: getMiniDemoAmount(record),
    quantity: record.quantity,
    unit: record.unit,
    note: record.terms,
    counterparty: '',
  };

  const onStatusChange = useCallback((status: MiniFundingTestStatus, method: MiniTestRailId | null) => {
    // SELECT_METHOD is not proof a test attempt occurred. No financial
    // outcome is ever inferred from a radio button.
    setSimulatedStatus(current =>
      status === 'SELECT_METHOD' && !method ? 'NOT_STARTED' : status
    );
  }, []);

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

  return <section className="spm-hosted-demo" data-checkout-test-id={record.id}>
    {step === 'review' && <div className="spm-hosted-review">
      <div className="spm-demo-flag"><TestTube2 size={16}/>
        {sw ? 'JARIBIO TU · Hakuna malipo' : 'SIMULATION ONLY · No payment'}
      </div>
      <div className="spm-hosted-source"><SourceIcon size={18}/>
        <span>{record.source === 'STORE' ? 'Digital Store' : 'ShortStays'}</span>
        <small>{sw ? 'Tovuti ya mfano' : 'Sample website'}</small>
      </div>

      <h1 className="spm-question">{sw ? 'Kagua kabla ya kulipa' : 'Review before paying'}</h1>
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

      <button type="button" className="spm-primary" onClick={() => setStep('funding')}>
        {sw ? 'Chagua njia ya malipo' : 'Choose how to pay'}<ArrowRight size={18}/>
      </button>
      <button className="spm-quiet-button" type="button" onClick={showChat}>
        <MessageCircle size={16}/>{sw ? 'Uliza KS001' : 'Ask KS001'}
      </button>
      <button className="spm-hosted-return spm-quiet-button" type="button" onClick={returnToHost}>
        <ArrowLeft size={16}/>{sw ? 'Rudi kwenye tovuti' : 'Back to website'}
      </button>
    </div>}

    {/* Keep the SAME funding component mounted across review/chat to preserve
        the local pending/unknown attempt when the owner reopens it. */}
    <div className="spm-hosted-finance" hidden={step !== 'funding'}>
      <MiniFundingPreview
        draft={draft} language={language}
        onBack={() => setStep('review')}
        onDemoStateChange={onStatusChange}
        onReturnToHost={returnToHost}
      />
      <button type="button" className="spm-quiet-button" onClick={showChat}>
        <MessageCircle size={16}/>{sw ? 'Uliza KS001 kuhusu hii' : 'Ask KS001 about this'}
      </button>
    </div>

    {chatStarted && <div className="spm-hosted-chat" hidden={step !== 'chat'}>
      <MiniGuestChat draft={draft} language={language} onBack={() => setStep(cameFrom)}/>
    </div>}

    {step !== 'chat' && <div className="spm-hosted-mini-status">
      <CircleAlert size={14}/>
      <span>{simulatedStatus === 'NOT_STARTED'
        ? (sw ? 'Hakuna pesa zilizotumwa' : 'No money sent')
        : miniDemoStatusLabel(simulatedStatus)}</span>
    </div>}
  </section>;
}

export const MINI_CHECKOUT_DEMO_RETURN_EVENT = RETURN_EVENT;
