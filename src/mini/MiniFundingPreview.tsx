import { useReducer } from 'react';
import {
  ArrowLeft, ArrowLeftRight, CircleAlert, CircleCheck, Clock3,
  Landmark, RotateCcw, ShieldAlert, ShieldCheck, Smartphone, TestTube2
} from 'lucide-react';
import {
  INITIAL_MINI_FUNDING_TEST, MINI_TEST_RAILS,
  miniFundingTestTransition, miniFundingTestWords, miniTestAmount,
  type MiniTestRailId
} from './miniFundingSimulator';
import type { MiniDraft, MiniLanguage } from './miniModel';

/**
 * This is a DEMONSTRATION ONLY. This component does not import an API gateway
 * or acquire permissions to create Agreement/payment intentions.
 *
 * Live rail discovery, version-bound quote, payer authentication, custody,
 * funding confirmation and reconciliation must be SecurePayAPI-owned.
 */
export function MiniFundingPreview({ draft, language, onBack }: {
  draft: MiniDraft;
  language: MiniLanguage;
  onBack: () => void;
}) {
  const [demo, dispatch] = useReducer(miniFundingTestTransition, INITIAL_MINI_FUNDING_TEST);
  const sw = language === 'sw';
  const amount = miniTestAmount(draft.amount);
  const selected = MINI_TEST_RAILS.find(item => item.id === demo.method);
  const stage = miniFundingTestWords(demo.status);
  const canSelect = demo.status === 'SELECT_METHOD' || demo.status === 'SIMULATED_FAILED';
  const pending = demo.status === 'AWAITING_FAKE_PROVIDER';
  const unknown = demo.status === 'SIMULATED_UNKNOWN';
  const failed = demo.status === 'SIMULATED_FAILED';
  const confirmed = demo.status === 'SIMULATED_CONFIRMED';
  const canStart = Boolean(amount && demo.method && (canSelect || failed));

  const selectMethod = (method: MiniTestRailId) =>
    dispatch({ type: 'SELECT_METHOD', method });

  return <section className="spm-content spm-money-demo" data-simulation="true" aria-label="Simulated funding preview">
    <button className="spm-back" type="button" onClick={onBack}>
      <ArrowLeft size={18}/>{sw ? 'Rudi kwenye rasimu' : 'Back to draft'}
    </button>
    <div className="spm-demo-flag"><TestTube2 size={17}/>
      {sw ? 'JARIBIO TU · Hakuna pesa halisi' : 'SIMULATION ONLY · No real money'}
    </div>
    <h1 className="spm-question">{sw ? 'Ungelipaje?' : 'How would you pay?'}</h1>
    <p className="spm-support-text">
      {sw
        ? 'Chagua moja ya njia tatu, kisha uone jinsi Mini ingeonyesha hali ya malipo. Haya si malipo ya kweli.'
        : 'Choose one of the three methods, then explore how Mini would explain a payment. Nothing is actually sent.'}
    </p>

    <div className="spm-demo-context">
      <span>{sw ? 'Rasimu unayoijaribu' : 'Local draft under discussion'}</span>
      <strong>{draft.description}</strong>
      <div className="spm-demo-amount">{amount ? amount.formatted : (sw ? 'Kiasi hakijawekwa' : 'Amount not specified')}</div>
      <small>{sw
        ? 'Hii si mkataba uliokubaliwa; mlipaji, mpokeaji na masharti bado havijathibitishwa.'
        : 'Not an accepted Agreement. Payer, recipient, version and funding authority have not been verified.'}</small>
    </div>

    {!amount && <div className="spm-guest-warning" role="alert">
      <CircleAlert size={18}/>
      <div><strong>{sw ? 'Weka kiasi kwenye rasimu kwanza.' : 'Enter an amount in the draft first.'}</strong>
        <p>{sw ? 'Mini haitabuni kiasi cha malipo.' : 'Mini will not invent an amount for a trade or contribution.'}</p>
      </div>
    </div>}

    <h2 className="spm-demo-section-heading">{sw ? 'Njia za kulipia (za majaribio)' : 'Choose a test payment method'}</h2>
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

    {selected && <div className="spm-demo-selection" role="status">
      <strong>{selected.name} · {sw ? 'jaribio' : 'test route'}</strong>
      <p>{sw ? selected.swDetail : selected.detail}</p>
      <div className="spm-demo-fees">
        <span>{sw ? 'Ada ya SecurePay' : 'SecurePay fee'}</span>
        <strong>{sw ? 'Haijanukuliwa' : 'Not quoted'}</strong>
        <span>{sw ? 'Ada ya mtoa huduma' : 'Provider charge'}</span>
        <strong>{sw ? 'Haijanukuliwa' : 'Not quoted'}</strong>
        <span>{sw ? 'Jumla ya kulipa' : 'Final amount to pay'}</span>
        <strong>{sw ? 'Haijathibitishwa' : 'Not authorised'}</strong>
      </div>
    </div>}

    {!selected && <div className="spm-demo-neutral" role="status">
      {sw ? 'Chagua benki, M-Pesa au PesaLink kuendelea.' : 'Choose Choice Bank, M-Pesa or PesaLink to continue.'}
    </div>}

    {demo.status === 'SELECT_METHOD' && <button type="button" className="spm-primary"
      disabled={!canStart} onClick={() => dispatch({type:'START_ATTEMPT'})}>
      <TestTube2 size={18}/>{sw ? 'Jaribu malipo (si halisi)' : 'Start simulated payment'}
    </button>}

    {(pending || unknown || confirmed || failed) && <div className={'spm-demo-result spm-demo-result-'+demo.status.toLowerCase()}
      role="status" aria-live="polite">
      {confirmed ? <CircleCheck size={22}/> : pending ? <Clock3 size={22}/> : <CircleAlert size={22}/>}
      <div>
        <strong>{stage.title}</strong>
        <p>{stage.detail}</p>
        <small>{sw ? 'Jaribio namba' : 'Test attempt'} {demo.attemptNumber} · {selected?.name}</small>
      </div>
    </div>}

    {(pending || unknown) && <details className="spm-demo-controls">
      <summary><TestTube2 size={17}/>{sw ? 'Udhibiti wa jaribio' : 'Testing controls — choose fictional provider response'}</summary>
      <p>{sw
        ? 'Hizi si hatua ambazo mteja anaweza kudhibiti katika malipo ya kweli.'
        : 'These controls belong to the owner test only. An actual customer cannot decide whether a provider confirms their payment.'}</p>
      <div className="spm-demo-control-grid">
        <button type="button" className="spm-secondary"
          onClick={() => dispatch({type:'SIMULATE_CONFIRMED'})}>
          <CircleCheck size={16}/>{sw ? 'Jibu: imethibitishwa' : 'Simulate confirmed'}
        </button>
        <button type="button" className="spm-secondary"
          onClick={() => dispatch({type:'SIMULATE_FAILED'})}>
          <CircleAlert size={16}/>{sw ? 'Jibu: imeshindikana' : 'Simulate failed'}
        </button>
        {pending && <button type="button" className="spm-secondary"
          onClick={() => dispatch({type:'SIMULATE_UNKNOWN'})}>
          <Clock3 size={16}/>{sw ? 'Jibu halijulikani' : 'Simulate unknown'}
        </button>}
        {unknown && <button type="button" className="spm-secondary"
          onClick={() => dispatch({type:'RESOLVE_PENDING'})}>
          <RotateCcw size={16}/>{sw ? 'Endelea kusubiri' : 'Continue waiting'}
        </button>}
      </div>
    </details>}

    {unknown && <p className="spm-demo-unknown">
      <ShieldAlert size={17}/>
      {sw
        ? 'Usifanye jaribio jingine mpaka hali ya malipo ijulikane.'
        : 'Do not start a second payment while the outcome is unknown. An authorised provider must resolve the original attempt.'}
    </p>}

    {failed && <button type="button" className="spm-primary" disabled={!canStart}
      onClick={() => dispatch({type:'START_ATTEMPT'})}>
      <RotateCcw size={18}/>{sw ? 'Anza jaribio jipya' : 'Start a new simulated attempt'}
    </button>}

    {confirmed && <p className="spm-demo-unknown">
      <ShieldAlert size={17}/>
      {sw
        ? 'Jibu la mtoa huduma ni la majaribio tu. Hakuna pesa iliyohifadhiwa, kupokewa au kutolewa.'
        : 'This is only a fictional provider reply. SecurePayAPI has not verified or safeguarded funds, credited a ledger or permitted release.'}
    </p>}

    {(confirmed || failed) && <button className="spm-quiet-button" type="button"
      onClick={() => dispatch({type:'RESET'})}>
      <RotateCcw size={16}/>{sw ? 'Anza mfano mwingine' : 'Reset and compare another method'}
    </button>}

    <div className="spm-guest-identity spm-demo-bottom">
      <ShieldCheck size={17}/>
      <p>{sw
        ? 'Katika SecurePay halisi, ni API pekee inayoruhusu njia zilizopo, nukuu, hali ya pesa na uhamisho.'
        : 'Real funding will use SecurePayAPI for available rails, authenticated authority, exact-version quotes, payment status and reconciliation. This preview makes no financial request.'}</p>
    </div>
  </section>;
}
