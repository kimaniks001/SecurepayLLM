import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, MessageCircle, RefreshCcw, Send, ShieldCheck } from 'lucide-react';
import { getMiniPilotConfig, miniDiscussionPrompt } from './miniGuestConfig';
import type { MiniDraft, MiniLanguage } from './miniModel';

interface GuestLine { sender: 'HUMAN' | 'KS001'; text: string }
interface AgreementReview {
  stage: string;
  summary: string;
  version: number;
  reviewable: boolean;
  confirmable: boolean;
  reviewBlockedReason?: string;
  confirmationBlockedReason?: string;
  openPoints: Array<string | { question?: string; description?: string; label?: string }>;
  question?: string | null;
}
interface PreparedReview {
  status: string;
  tradeContextVersion: number;
  mustResolve: string[];
  stillToDecide: string[];
}
interface GuestSnapshot {
  status: string;
  ready: boolean;
  error: string;
  conversationId: string | null;
  entries: GuestLine[];
  agreement: AgreementReview | null;
  agreementError: string;
  preparedReview: PreparedReview | null;
  pending: { message: string } | null;
}
interface GuestAgent {
  snapshot(): GuestSnapshot;
  connect(): Promise<GuestSnapshot>;
  send(message: string, timeZone?: string): Promise<GuestSnapshot>;
  retry(): Promise<GuestSnapshot>;
  reviewAgreement(timeZone?: string): Promise<GuestSnapshot>;
  prepareAgreementReview(): Promise<GuestSnapshot>;
  reset(): GuestSnapshot;
}
declare global {
  interface Window {
    SecurePayGuestAgent?: {
      version: string;
      create(options: { siteId: string; apiBaseUrl: string }): GuestAgent;
    };
  }
}
const tz = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
};

export function MiniGuestChat({ draft, language, onBack }: {
  draft: MiniDraft | null;
  language: MiniLanguage;
  onBack: () => void;
}) {
  const sw = language === 'sw';
  const [message, setMessage] = useState(() =>
    draft ? miniDiscussionPrompt(draft.description, draft.amount, draft.quantity, draft.unit, draft.note) : '');
  const [status, setStatus] = useState('not-configured');
  const [snapshot, setSnapshot] = useState<GuestSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const [askingReset, setAskingReset] = useState(false);
  const agent = useRef<GuestAgent | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const config = getMiniPilotConfig();
    if (!config) {
      setStatus('not-configured');
      return () => { mounted.current = false; };
    }
    if (!window.SecurePayGuestAgent || window.SecurePayGuestAgent.version !== '0.5.0') {
      setStatus('client-missing');
      return () => { mounted.current = false; };
    }
    try {
      const client = window.SecurePayGuestAgent.create(config);
      agent.current = client;
      setStatus('checking');
      void client.connect().then(result => {
        if (!mounted.current) return;
        setSnapshot(result);
        setStatus(result.ready ? 'ready' : result.status);
      }).catch(() => {
        if (mounted.current) setStatus('unavailable');
      });
    } catch {
      setStatus('unavailable');
    }
    return () => {
      mounted.current = false;
      agent.current = null;
    };
  }, []);

  const action = async (task: (client: GuestAgent) => Promise<GuestSnapshot>) => {
    const client = agent.current;
    if (!client || busy) return;
    setBusy(true);
    setLocalError('');
    try {
      const result = await task(client);
      if (mounted.current) {
        setSnapshot(result);
        setStatus(result.ready ? 'ready' : result.status);
      }
    } catch {
      if (mounted.current) setLocalError(sw ? 'Hatua haikuthibitishwa. Jaribu tena.' : 'SecurePay did not confirm that action. Nothing has been sent or signed by this screen.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const send = () => {
    const text = message.trim();
    if (!text || text.length > 1200 || busy || !snapshot?.ready || snapshot.pending) return;
    void action(async client => {
      const result = await client.send(text, tz());
      if (!result.pending && !result.error && mounted.current) setMessage('');
      return result;
    });
  };
  const retry = () => void action(client => client.retry());
  const review = () => void action(client => client.reviewAgreement(tz()));
  const prepare = () => void action(client => client.prepareAgreementReview());
  const refresh = () => {
    if (busy) return;
    void action(client => client.connect());
  };
  const reset = () => {
    if (!askingReset) { setAskingReset(true); return; }
    if (busy || !agent.current) return;
    const result = agent.current.reset();
    setSnapshot(result);
    setMessage('');
    setAskingReset(false);
    setLocalError('');
  };
  const agreement = snapshot?.agreement;
  const ready = snapshot?.ready === true;
  const openPoints = agreement?.openPoints || [];

  return <section className="spm-guest spm-content">
    <button type="button" className="spm-back" onClick={onBack}>
      <ArrowLeft size={18}/>{sw ? 'Rudi' : 'Back'}
    </button>
    <div className="spm-persona"><MessageCircle size={16}/><span>KS001</span><span className="spm-dot"/><span>{sw ? 'Mazungumzo halisi yakithibitishwa' : 'Real conversation when authorised'}</span></div>
    <h1 className="spm-question">{sw ? 'Ungependa kuuliza nini?' : 'What would you like help with?'}</h1>

    {!ready && <div className="spm-guest-warning" role="status">
      <CircleAlert size={20}/>
      <div>
        <strong>{status === 'checking' ? (sw ? 'Inaunganisha...' : 'Checking secure connection…') :
          sw ? 'KS001 haijaunganishwa kwenye jaribio hili.' : 'KS001 is not connected in this preview.'}</strong>
        <p>{status === 'not-configured'
          ? (sw ? 'Usajili wa eneo la majaribio na API haujawekwa. Hakuna jibu la kubuni.' : 'An approved staging site and API have not been configured. Mini will not invent an AI reply.')
          : status === 'client-missing'
            ? 'The trusted SecurePay guest client could not load.'
            : status === 'disabled'
              ? 'The backend has not authorised guest KS001 for this website.'
              : status === 'checking'
                ? 'Checking the registered SecurePay pilot installation.'
                : 'The approved SecurePay staging service is unavailable or has refused the connection.'}</p>
      </div>
    </div>}

    {snapshot?.error && <p className="spm-error" role="alert">{snapshot.error}</p>}
    {localError && <p className="spm-error" role="alert">{localError}</p>}

    {ready && <>
      <div className="spm-guest-chat" role="log" aria-label="KS001 conversation">
        {!snapshot?.entries.length && <p className="spm-capture-note">
          {sw ? 'Tuambie unachohitaji. Jibu litakuja kutoka SecurePayAPI, si mfano.' : 'Tell KS001 what you need. Any answer must come from the approved SecurePayAPI, not this interface.'}
        </p>}
        {snapshot?.entries.map((line, index) => <div key={index}
          className={'spm-guest-bubble' + (line.sender === 'HUMAN' ? ' spm-guest-human' : '')}>
          <small>{line.sender === 'HUMAN' ? (sw ? 'Wewe' : 'You') : 'KS001'}</small>
          <span>{line.text}</span>
        </div>)}
      </div>
      {snapshot?.pending && <div className="spm-guest-warning">
        <CircleAlert size={17}/>
        <div><strong>{sw ? 'Ombi bado linasubiri' : 'Last message still awaiting confirmation'}</strong>
          <p>{snapshot.pending.message}</p>
          <button type="button" className="spm-secondary" disabled={busy} onClick={retry}>
            <RefreshCcw size={16}/>{sw ? 'Jaribu ombi lile lile' : 'Retry the same request'}
          </button>
        </div>
      </div>}
      <label className="spm-label" htmlFor="spm-guest-message">{sw ? 'Ujumbe wako kwa KS001' : 'Your message to KS001'}</label>
      <textarea id="spm-guest-message" className="spm-field" rows={3} maxLength={1200}
        value={message} disabled={busy || Boolean(snapshot?.pending)}
        onChange={e => setMessage(e.target.value)}
        placeholder={sw ? 'Niambie unachohitaji…' : 'Describe what you need…'}/>
      <button type="button" className="spm-primary" disabled={busy || !message.trim() || Boolean(snapshot?.pending)}
        onClick={send}><Send size={17}/>{busy ? (sw ? 'Inatuma…' : 'Working…') : (sw ? 'Tuma kwa KS001' : 'Ask KS001')}</button>
      {snapshot?.conversationId && !snapshot.pending && <div className="spm-guest-review">
        <div className="spm-guest-review-title"><ShieldCheck size={17}/>
          <strong>{sw ? 'Kagua makubaliano' : 'Review an Agreement proposal'}</strong>
        </div>
        <p>{sw ? 'SecurePayAPI pekee ndiyo inaweza kuonyesha hali halisi ya mapendekezo.' : 'The canonical SecurePayAPI decides whether there is enough information to review. No participant has accepted yet.'}</p>
        <button type="button" className="spm-secondary" onClick={review} disabled={busy}>
          {sw ? 'Angalia mapendekezo' : 'Check canonical Agreement review'}<ArrowRight size={16}/>
        </button>
      </div>}
      {agreement && <div className="spm-guest-agreement">
        <small>{sw ? 'Mapendekezo ya kagua tu' : 'Read-only canonical proposal'} · v{agreement.version} · {agreement.stage}</small>
        <p>{agreement.summary}</p>
        {openPoints.length > 0 && <div>
          <strong>{sw ? 'Mambo yanayohitaji kujadiliwa' : 'Questions still to resolve'}</strong>
          <ul>{openPoints.slice(0,8).map((point, i) => <li key={i}>{typeof point === 'string'
            ? point : point.question || point.description || point.label || 'Unresolved term'}</li>)}</ul>
        </div>}
        {!agreement.reviewable && <p className="spm-capture-note">{agreement.reviewBlockedReason || (sw ? 'Ongeza maelezo kabla ya ukaguzi.' : 'More information is needed before preparing a review.')}</p>}
        {agreement.reviewable && !snapshot?.pending && <button type="button" className="spm-secondary"
          disabled={busy} onClick={prepare}>
          <CheckCircle2 size={17}/>{sw ? 'Andaa kwa ukaguzi' : 'Prepare for review (not acceptance)'}
        </button>}
        {snapshot?.agreementError && <p className="spm-error">{snapshot.agreementError}</p>}
      </div>}
      {snapshot?.preparedReview && <div className="spm-guest-prepared" role="status">
        <CheckCircle2 size={20}/>
        <div><strong>{sw ? 'Maandalizi ya ukaguzi yamefanyika' : 'Review preparation acknowledged by SecurePay'}</strong>
          <p>{sw ? 'Hii si sahihi ya mkataba, mwaliko wala malipo.' : 'Not signed, not invited, not accepted and not funded. Participants must still authenticate and review the exact terms.'}</p>
        </div>
      </div>}
      <button type="button" className="spm-quiet-button" disabled={busy} onClick={reset}>
        {askingReset ? (sw ? 'Bonyeza tena kuanza upya' : 'Press again to clear this guest conversation') :
          (sw ? 'Anza mazungumzo mapya' : 'Start new guest conversation')}
      </button>
    </>}

    {!ready && status !== 'not-configured' && <button type="button" className="spm-secondary spm-guest-retry"
      onClick={refresh} disabled={busy || status === 'checking'}><RefreshCcw size={17}/>Recheck approved connection</button>}

    <div className="spm-guest-identity">
      <ShieldCheck size={17}/><p>
        {sw ? 'KS Number si uthibitisho wa mtu hapa. Hakuna mwaliko, kukubali mkataba au malipo kutoka kwenye Mini hii.' :
          'A typed KS Number does not verify someone. Mini does not sign, send invitations, accept an Agreement or move money in guest mode.'}
      </p>
    </div>
    <a className="spm-quiet-link" href="https://securepay.ke/" target="_blank" rel="noopener noreferrer">
      {sw ? 'Fungua SecurePay kamili' : 'Open SecurePay for identity and invitations'}
    </a>
    <p className="spm-disclaimer">{sw ? 'Mazungumzo haya hayahamishwi kiotomatiki kwenye tovuti kamili.' :
      'Opening the full workspace does not transfer this guest conversation automatically. Verified continuation is a separate, user-approved step.'}</p>
  </section>;
}
