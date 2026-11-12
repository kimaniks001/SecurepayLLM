import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CircleAlert, MessageCircle, RefreshCcw, Send, ShieldCheck } from 'lucide-react';
import { createHttpClient } from '../api/securepay/http';
import { createAgentGateway } from '../api/securepay/agent';
import { createAgentController } from '../features/agent/controller';
import type { AgreementFormationDto } from '../api/securepay/agent/dto';
import { miniDiscussionPrompt } from './miniGuestConfig';
import type { MiniDraft, MiniLanguage } from './miniModel';

/**
 * Exactly the same AgentGateway / AgentController / first-party Agreement
 * Formation contract already used by the Living Workspace.
 *
 * Enabled ONLY by an explicitly approved staging origin (not by a query
 * parameter or an arbitrary embedded host). Nothing here signs an Agreement,
 * grants identity, issues a SecureLink or interacts with a provider rail.
 *
 * Unlike the legacy guest installation contract, this route exists in the
 * currently inspected SecurePayAPI main source as /api/agent/conversations.
 */
export function MiniFirstPartyKs001({ apiOrigin, draft, language, onBack }: {
  apiOrigin: string;
  draft: MiniDraft | null;
  language: MiniLanguage;
  onBack: () => void;
}) {
  const sw = language === 'sw';
  const [epoch,setEpoch] = useState(0);
  const pair = useMemo(() => {
    const gateway = createAgentGateway(createHttpClient(apiOrigin, () => null));
    return { gateway, controller: createAgentController(gateway) };
  },[apiOrigin,epoch]);
  const [state,setState] = useState(pair.controller.getSnapshot());
  const [status,setStatus] = useState<'checking'|'ready'|'continuity-unavailable'|'expired'>('checking');
  const [message,setMessage] = useState(() => draft
    ? miniDiscussionPrompt(draft.description,draft.amount,draft.quantity,draft.unit,draft.note) : '');
  const [resetAsked,setResetAsked] = useState(false);
  const [review,setReview] = useState<AgreementFormationDto|null>(null);
  const [reviewError,setReviewError] = useState('');
  const [recoveryAttempt,setRecoveryAttempt] = useState(0);

  useEffect(() => pair.controller.subscribe(() => setState(pair.controller.getSnapshot())),[pair]);
  useEffect(() => {
    let alive = true;
    setStatus('checking');
    setReview(null);setReviewError('');
    const check = async () => {
      const priorId = pair.gateway.resumableConversationId();
      if (!priorId) {
        // This is a valid *new* locally configured guest. Do not create a
        // server conversation before a real human message is submitted.
        if (alive) setStatus('ready');
        return;
      }
      try {
        // Never show a clean/empty chat as if it were the original conversation.
        const history = await pair.gateway.conversationHistory(priorId,20);
        if (!history || !Array.isArray(history.entries)) throw new Error('Invalid history');
        await pair.controller.resumeConversation(priorId);
        const snapshot = pair.controller.getSnapshot();
        // A second transient read failure in resumeConversation cannot
        // silently produce a healthy empty transcript.
        if (snapshot.turns.length !== history.entries.length ||
            snapshot.context.status !== 'ready') throw new Error('History could not be restored');
        if (alive) setStatus('ready');
      } catch (error) {
        if (!alive) return;
        const code = error && typeof error === 'object' && 'status' in error ? error.status : null;
        setStatus(code === 404 ? 'expired' : 'continuity-unavailable');
      }
    };
    void check();
    return () => {alive=false;};
  },[pair,recoveryAttempt]);

  const submit = async () => {
    const text = message.trim();
    if (!text || text.length>1200 || status!=='ready' || state.busy || state.pending) return;
    setReview(null);setReviewError('');
    await pair.controller.send(text);
    const current=pair.controller.getSnapshot();
    // Turn failures are deliberately left pending in the EXISTING controller.
    // Retry uses the SAME clientTurnId; no silent duplicate message.
    if (!current.pending && !current.error) setMessage('');
  };
  const retry = async () => {
    if (status!=='ready' || state.busy || !state.pending) return;
    await pair.controller.retry();
    const current=pair.controller.getSnapshot();
    if (!current.pending && !current.error) setMessage('');
  };
  const readAgreement = async () => {
    if (!state.conversationId || state.pending || state.busy || status!=='ready') return;
    setReviewError('');
    setReview(null);
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result=await pair.gateway.readAgreementFormation(state.conversationId,zone);
      if (!result || result.conversationId !== state.conversationId ||
        typeof result.version !== 'number' || !Array.isArray(result.openPoints))
        throw new Error('Invalid Agreement Formation');
      setReview(result);
    } catch {
      setReviewError('Cannot verify this Agreement review right now. Nothing has been accepted or sent.');
    }
  };
  const reset = () => {
    if (!resetAsked) {setResetAsked(true);return;}
    pair.gateway.forgetResumableConversation();
    setMessage('');setResetAsked(false);setReview(null);setReviewError('');
    setEpoch(n=>n+1);
  };
  return <section className="spm-guest spm-content" data-mini-first-party-ks001="staging">
    <button type="button" className="spm-back" onClick={onBack}><ArrowLeft size={18}/>{sw?'Rudi':'Back'}</button>
    <div className="spm-persona"><MessageCircle size={16}/><span>KS001</span>
      <span className="spm-dot"/><span>First-party staging conversation</span></div>
    <h1 className="spm-question">{sw?'Ungependa kuuliza nini?':'What would you like help with?'}</h1>
    {status==='checking' && <p className="spm-capture-note" role="status">Checking the previous SecurePay conversation…</p>}
    {(status==='continuity-unavailable'||status==='expired') && <div className="spm-guest-warning" role="alert">
      <CircleAlert size={20}/><div>
        <strong>{status==='expired'?'The previous conversation has expired or is unavailable.':
          'The previous conversation could not be restored.'}</strong>
        <p>Mini will not pretend your old conversation is a new one. Try rechecking first.</p>
      </div>
    </div>}
    {status!=='ready' && <div className="spm-actions">
      <button type="button" className="spm-secondary spm-guest-retry"
        onClick={()=>setRecoveryAttempt(n=>n+1)} disabled={status==='checking'}>
        <RefreshCcw size={17}/>Recheck existing conversation</button>
      {(status==='expired') && <button type="button" className="spm-quiet-button" onClick={reset}>
        {resetAsked?'Confirm: clear the previous conversation':'Clear and start a new conversation'}</button>}
    </div>}
    {status==='ready' && <>
      {!state.conversationId && <p className="spm-capture-note">
        This preview uses the existing SecurePay Agent API. A conversation will only be created when you send a message.
      </p>}
      <div className="spm-guest-chat" role="log" aria-label="KS001 server conversation">
        {state.turns.map(turn => <div key={turn.id} className={'spm-guest-bubble'+
          (turn.sender==='user'?' spm-guest-human':'')}>
          <small>{turn.sender==='user'?'You':'KS001'}</small>
          <span>{turn.sender==='user' ? turn.text :
            typeof turn.response.message==='string' ? turn.response.message :
            turn.response.message.text}</span>
        </div>)}
      </div>
      {state.error && <p className="spm-error" role="alert">{state.error}</p>}
      {state.pending && <button className="spm-secondary" type="button"
        onClick={()=>void retry()} disabled={state.busy}>
        <RefreshCcw size={16}/>Check the same message again</button>}
      <form className="spm-guest-compose" onSubmit={event=>{event.preventDefault();void submit();}}>
        <label className="spm-label" htmlFor="spm-first-party-text">Your message</label>
        <textarea id="spm-first-party-text" className="spm-field" maxLength={1200} rows={2}
          value={message} onChange={event=>setMessage(event.target.value)}
          placeholder="Tell KS001 in your own words…" disabled={state.busy||!!state.pending}/>
        <button type="submit" className="spm-primary" disabled={!message.trim()||state.busy||!!state.pending}>
          <Send size={16}/>{state.busy?'Confirming…':'Send to KS001'}<ArrowRight size={16}/>
        </button>
      </form>
      {!!state.conversationId && <button type="button" className="spm-secondary"
        onClick={()=>void readAgreement()} disabled={state.busy||!!state.pending}>
        <ShieldCheck size={17}/>Review what SecurePay understands</button>}
      {reviewError && <p className="spm-error" role="alert">{reviewError}</p>}
      {review && <div className="spm-guest-prepared" aria-label="Read-only real Agreement Formation">
        <strong>Agreement forming · {review.stage}</strong>
        <p>{review.summary||'SecurePay has not established the full details yet.'}</p>
        <small>Version {review.version} · {review.openPoints.length} open point(s).</small>
        {review.openPoints.slice(0,4).map(point=><p key={point.id}>{point.text}</p>)}
        <p>Read-only proposal. No participant accepted, no SecureLink issued and no Money moved.</p>
      </div>}
    </>}
    <p className="spm-disclaimer">Staging-only Agent conversation; no automatic agreement, participant invitation or payment.</p>
  </section>;
}
