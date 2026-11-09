import { useEffect, useReducer } from 'react';
import {
  ArrowLeft, ArrowLeftRight, CircleAlert, CircleCheck, Clock3,
  Landmark, RotateCcw, ShieldCheck, Smartphone, TestTube2
} from 'lucide-react';
import {
  INITIAL_MINI_FUNDING_TEST, MINI_TEST_RAILS,
  miniFundingTestTransition, miniFundingTestWords, miniTestAmount,
  type MiniTestRailId, type MiniFundingTestStatus
} from './miniFundingSimulator';
import type { MiniDraft, MiniLanguage } from './miniModel';

/**
 * OWNER TEST ONLY: the following controls simulate three rail responses locally.
 * Real payment options, quotes, provider status and release belong to SecurePayAPI.
 */
export function MiniFundingPreview({ draft, language, onBack, onDemoStateChange, onReturnToHost, guidedDemo = false, returnLabel }: {
  draft: MiniDraft;
  language: MiniLanguage;
  onBack: () => void;
  /** Demo-only status, never an actual payment or verified host order result. */
  onDemoStateChange?: (status: MiniFundingTestStatus, method: MiniTestRailId | null) => void;
  onReturnToHost?: () => void;
  /** Fake owner-preview provider result only; not a live API status. */
  guidedDemo?: boolean;
  returnLabel?: string;
}) {
  const [demo, dispatch] = useReducer(miniFundingTestTransition, INITIAL_MINI_FUNDING_TEST);
  const sw = language === 'sw';
  const amount = miniTestAmount(draft.amount);
  const selected = MINI_TEST_RAILS.find(item => item.id === demo.method);
  useEffect(() => { onDemoStateChange?.(demo.status, demo.method); }, [demo.status, demo.method, onDemoStateChange]);
  // A guided owner demo resolves its fictional provider response automatically.
  // This effect NEVER calls a PSP or backend, and cannot verify funds.
  useEffect(() => {
    if (!guidedDemo || demo.status !== 'AWAITING_FAKE_PROVIDER') return;
    const pendingReply = window.setTimeout(() => dispatch({ type: 'SIMULATE_CONFIRMED' }), 1100);
    return () => window.clearTimeout(pendingReply);
  }, [guidedDemo, demo.status]);
  const stage = miniFundingTestWords(demo.status);
  const canSelect = demo.status === 'SELECT_METHOD' || demo.status === 'SIMULATED_FAILED';
  const pending = demo.status === 'AWAITING_FAKE_PROVIDER';
  const unknown = demo.status === 'SIMULATED_UNKNOWN';
  const failed = demo.status === 'SIMULATED_FAILED';
  const confirmed = demo.status === 'SIMULATED_CONFIRMED';
  const canStart = Boolean(amount && demo.method && canSelect);

  const selectMethod = (method: MiniTestRailId) => dispatch({ type: 'SELECT_METHOD', method });
  const statusLine = sw
    ? guidedDemo && confirmed ? 'Jaribio limekamilika' : pending ? 'Inasubiri jibu la jaribio' : unknown ? 'Haijulikani — usijaribu tena' :
      failed ? 'Jaribio limeshindwa' : 'Imethibitishwa kwenye jaribio tu'
    : guidedDemo && confirmed ? 'Test complete' : pending ? 'Checking test result…' : unknown ? 'Unknown — do not retry' :
      failed ? 'Test failed' : 'Confirmed in simulation';
  const statusSubline = sw
    ? confirmed ? 'Hakuna pesa iliyotumwa.' : pending ? 'Hakuna malipo yaliyotumwa.' :
      failed ? 'Hakuna malipo yaliyofanyika.' : 'Subiri jibu la awali.'
    : confirmed ? 'No money moved. This was only a demonstration.' : pending ? 'No payment sent.' :
      failed ? 'No payment made.' : 'The original result must be checked.';

  return <section className="spm-content spm-money-demo spm-demo-concise"
    data-simulation="true" aria-label="Simulated funding preview">
    <button className="spm-back" type="button" onClick={onBack}>
      <ArrowLeft size={18}/>{sw ? 'Rudi' : 'Back'}
    </button>

    <div className="spm-demo-flag"><TestTube2 size={16}/>
      {sw ? 'JARIBIO TU · Hakuna pesa' : 'SIMULATION ONLY · No real money'}
    </div>
    <div className="spm-demo-topsum">
      <h1 className="spm-question">{amount ? amount.formatted :
        (sw ? 'Kiasi hakijawekwa' : 'Amount not set')}</h1>
      <p title={draft.description}>{draft.description}</p>
    </div>

    {!amount && <p className="spm-error" role="alert">
      {sw ? 'Weka kiasi kwenye rasimu kwanza.' : 'Enter an amount in your draft first.'}
    </p>}

    <h2 className="spm-demo-section-heading">{sw ? 'Lipa kwa' : 'Pay with'}</h2>
    <div role="radiogroup" aria-label="Simulated payment method" className="spm-demo-rails">
      {MINI_TEST_RAILS.map(item => {
        const active = demo.method === item.id;
        const Icon = item.id === 'CHOICE_BANK' ? Landmark : item.id === 'MPESA' ? Smartphone : ArrowLeftRight;
        return <button key={item.id} type="button" role="radio" aria-checked={active}
          disabled={!canSelect || !amount}
          onClick={() => selectMethod(item.id)}
          className={'spm-demo-rail' + (active ? ' spm-demo-rail-active' : '')}>
          <span className="spm-demo-rail-icon"><Icon size={19}/></span>
          <span className="spm-demo-rail-name"><strong>{item.name}</strong><small>{item.category}</small></span>
          <span className="spm-demo-rail-choice" aria-hidden="true">{active ? <CircleCheck size={18}/> : <span/>}</span>
        </button>;
      })}
    </div>

    {demo.status === 'SELECT_METHOD' && <button type="button" className="spm-primary"
      disabled={!canStart} onClick={() => dispatch({ type: 'START_ATTEMPT' })}>
      <TestTube2 size={18}/>{guidedDemo ? (sw ? 'Endelea na ' : 'Continue with ') : (sw ? 'Jaribu ' : 'Try ')}{selected?.name || (sw ? 'njia hii' : 'this method')}
    </button>}

    {(pending || unknown || confirmed || failed) &&
      <div className={'spm-demo-result spm-demo-result-' + demo.status.toLowerCase()}
        role="status" aria-live="polite">
        {confirmed ? <CircleCheck size={21}/> : pending ? <Clock3 size={21}/> : <CircleAlert size={21}/>}
        <div>
          <strong>{statusLine}</strong>
          <p>{statusSubline}</p>
          <small>{sw ? 'Jaribio' : 'Test'} #{demo.attemptNumber} · {selected?.name}</small>
        </div>
      </div>}

    {(pending || unknown) && !guidedDemo && <details className="spm-demo-controls">
      <summary><TestTube2 size={17}/>{sw ? 'Badili matokeo ya jaribio' : 'Test a result'}</summary>
      <div className="spm-demo-control-grid">
        <button type="button" className="spm-secondary"
          onClick={() => dispatch({type:'SIMULATE_CONFIRMED'})}>
          <CircleCheck size={16}/>{sw ? 'Thibitisha (jaribio)' : 'Confirm (test)'}
        </button>
        <button type="button" className="spm-secondary"
          onClick={() => dispatch({type:'SIMULATE_FAILED'})}>
          <CircleAlert size={16}/>{sw ? 'Imeshindwa (jaribio)' : 'Fail (test)'}
        </button>
        {pending && <button type="button" className="spm-secondary"
          onClick={() => dispatch({type:'SIMULATE_UNKNOWN'})}>
          <Clock3 size={16}/>{sw ? 'Haijulikani (jaribio)' : 'Unknown (test)'}
        </button>}
        {unknown && <button type="button" className="spm-secondary"
          onClick={() => dispatch({type:'RESOLVE_PENDING'})}>
          <RotateCcw size={16}/>{sw ? 'Subiri tena' : 'Keep waiting'}
        </button>}
      </div>
    </details>}

    {failed && <button type="button" className="spm-primary" disabled={!canStart}
      onClick={() => dispatch({type:'START_ATTEMPT'})}>
      <RotateCcw size={18}/>{sw ? 'Jaribu tena' : 'Try again'}
    </button>}

    {(confirmed || failed) && !guidedDemo && <button className="spm-quiet-button" type="button"
      onClick={() => dispatch({type:'RESET'})}>
      <RotateCcw size={16}/>{sw ? 'Chagua njia nyingine' : 'Compare another method'}
    </button>}

    {onReturnToHost && <button type="button" className={confirmed && guidedDemo ? 'spm-primary spm-demo-return' : 'spm-secondary spm-demo-return'} onClick={onReturnToHost}>
      <ArrowLeft size={16}/>{returnLabel || (sw ? 'Rudi kwenye tovuti' : 'Return to website')}
    </button>}

    <details className="spm-demo-explain">
      <summary>{sw ? 'Ada na maelezo ya usalama' : 'Fees & payment details'}</summary>
      {selected && <p>{sw ? selected.swDetail : selected.detail}</p>}
      <div className="spm-demo-fees">
        <span>{sw ? 'Ada ya SecurePay' : 'SecurePay fee'}</span>
        <strong>{sw ? 'Haijanukuliwa' : 'Not quoted'}</strong>
        <span>{sw ? 'Ada ya mtoa huduma' : 'Provider charge'}</span>
        <strong>{sw ? 'Haijanukuliwa' : 'Not quoted'}</strong>
        <span>{sw ? 'Jumla ya kulipa' : 'Final amount to pay'}</span>
        <strong>{sw ? 'Haijathibitishwa' : 'Not authorised'}</strong>
      </div>
      <p>{sw
        ? 'Rasimu hii haijakubaliwa. Hakuna malipo yaliyofanyika. Kwa malipo halisi, SecurePayAPI itathibitisha watu, makubaliano, njia na kiasi.'
        : 'Not an accepted Agreement. The payer, recipient and funding authority have not been verified. Real funding must use SecurePayAPI to check the agreement, available methods, fees and payment status.'}</p>
      {(pending || unknown || confirmed || failed) && <p>{stage.detail} This is only a fictional provider reply.</p>}
    </details>
    <div className="spm-demo-footnote"><ShieldCheck size={15}/>
      {sw ? 'Jaribio tu · Hakuna malipo halisi' : 'Preview only · No real payment'}
    </div>
  </section>;
}
