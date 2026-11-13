import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, BookmarkPlus, CircleAlert, ClipboardList, FolderOpen, LogOut, Mail, MessageCircle, RefreshCcw, Send, ShieldCheck, ShoppingBag, Store, Users } from 'lucide-react';
import { createHttpClient } from '../api/securepay/http';
import { createAgentGateway } from '../api/securepay/agent';
import { createConversationAccessStore } from '../api/securepay/agent/continuity';
import { createMiniDemoHttpClient, miniDemoSeedAccess, miniDemoTokens } from './miniInteractiveDemo';
import { createAuthGateway } from '../api/securepay/auth';
import { createAgreementGateway } from '../api/securepay/agreements';
import { createBusinessGateway } from '../api/securepay/business';
import { MiniSellerStore } from './MiniSellerStore';
import { createStoreGateway } from '../api/securepay/store';
import { createStoreQuotationGateway } from '../api/securepay/store-quotations';
import { m5QuotationExperienceEnabled } from '../config/securepay';
import { createNotificationsGateway } from '../api/securepay/notifications';
import { MiniBuyStore, type MiniStorePlanLine } from './MiniBuyStore';
import { miniStoreIntent } from './miniStoreIntent.mjs';
import type { MiniStoreIntent } from './miniStoreIntent.mjs';
import type { MiniSellerQuotationDraft } from './miniSellerQuotationDraft.mjs';
import { MiniParticipantInvitations } from './MiniParticipantInvitations';
import { MiniCreatorInvitations } from './MiniCreatorInvitations';
import { MiniMyAgreements } from './MiniMyAgreements';
import { createSessionStore, ensureFreshSession } from '../api/securepay/session';
import { createAgentController } from '../features/agent/controller';
import type { AgreementFormationDto } from '../api/securepay/agent/dto';
import { MiniIdentityStep } from './MiniIdentityStep';
import { miniListServerBuilds, miniResumeServerBuild, miniSaveServerBuild } from './miniSavedWorkFlow.mjs';
import type { MiniSavedWorkItem } from './miniOwnedWork.mjs';
import { miniDiscussionPrompt } from './miniGuestConfig';
import { miniHistoryRestored } from './miniHistoryProof.mjs';
import { MiniAgreementSlots } from './MiniAgreementSlots';
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
export function MiniFirstPartyKs001({ apiOrigin, draft, language, onBack, demo = false }: {
  apiOrigin: string;
  draft: MiniDraft | null;
  language: MiniLanguage;
  onBack: () => void;
  demo?: boolean;
}) {
  const sw = language === 'sw';
  const expiredKey = 'securepay.mini.firstparty.expired.v1:' + apiOrigin;
  // Store ONLY an expiry marker; never move anonymous possession tokens into
  // this component. The existing canonical gateway manages them separately.
  const expiredWasAcknowledged = () => {
    try { return sessionStorage.getItem(expiredKey)==='1'; } catch { return false; }
  };
  // Use SecurePay's canonical, memory-only session store; never write identity
  // tokens or account listings into Mini's local browser draft storage.
  const [session] = useState(() => {
    const owner = createSessionStore();
    if (demo) owner.setTokens(miniDemoTokens('amina'));
    return owner;
  });
  const [demoAccess] = useState(() => {
    const access = createConversationAccessStore(null);
    if (demo) miniDemoSeedAccess(access);
    return access;
  });
  const sessionState = useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot);
  const signedIn = sessionState.status === 'signed-in';
  const http = useMemo(() => demo
    ? createMiniDemoHttpClient(session.getAccessToken)
    : createHttpClient(apiOrigin,session.getAccessToken),[apiOrigin,demo,session]);
  const auth = useMemo(() => createAuthGateway(http),[http]);
  const agreements=useMemo(()=>createAgreementGateway(http),[http]);
  const stores=useMemo(()=>createStoreGateway(http),[http]);
  const quotations=useMemo(()=>createStoreQuotationGateway(http),[http]);
  const notifications=useMemo(()=>createNotificationsGateway(http),[http]);
  const businesses=useMemo(()=>createBusinessGateway(http),[http]);
  // NO real seller/buyer quote requests just because someone opened Mini.
  // Enabled only in isolated stage when the matching M5 API branch is present.
  const liveQuotes=!demo &&
    m5QuotationExperienceEnabled(import.meta.env.VITE_SECUREPAY_M5_QUOTATIONS);
  const [epoch,setEpoch] = useState(0);
  const pair = useMemo(() => {
    const gateway = demo
      ? createAgentGateway(http,demoAccess)
      : createAgentGateway(http);
    return { gateway, controller: createAgentController(gateway) };
  },[http,epoch,demo,demoAccess]);
  const [state,setState] = useState(pair.controller.getSnapshot());
  const [status,setStatus] = useState<'checking'|'ready'|'continuity-unavailable'|'expired'>('checking');
  const [message,setMessage] = useState(() => draft
    ? miniDiscussionPrompt(draft.description,draft.amount,draft.quantity,draft.unit,draft.note) : '');
  const [resetAsked,setResetAsked] = useState(false);
  const [review,setReview] = useState<AgreementFormationDto|null>(null);
  const [reviewError,setReviewError] = useState('');
  const [recoveryAttempt,setRecoveryAttempt] = useState(0);
  const [identityOpen,setIdentityOpen] = useState(false);
  const [identityGoal,setIdentityGoal] = useState<'saved'|'inbox'|'creator'|'agreements'|'seller'>('saved');
  const [peopleOpen,setPeopleOpen] = useState<'inbox'|'creator'|null>(null);
  const [agreementsOpen,setAgreementsOpen] = useState(false);
  const [sellerOpen,setSellerOpen] = useState(false);
  const [ownedOpen,setOwnedOpen] = useState(false);
  const [ownedStatus,setOwnedStatus] = useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [ownedList,setOwnedList] = useState<MiniSavedWorkItem[]>([]);
  const [saveBusy,setSaveBusy] = useState(false);
  const [savedNotice,setSavedNotice] = useState('');
  const [ownedError,setOwnedError] = useState('');
  const [failedResumeId,setFailedResumeId] = useState<string|null>(null);
  const [signOutAsked,setSignOutAsked] = useState(false);
  const [storeOpen,setStoreOpen] = useState(false);
  const [storeBusy,setStoreBusy] = useState(false);
  const [storeError,setStoreError] = useState('');
  const [heldStorePlan,setHeldStorePlan] = useState<MiniStoreIntent|null>(null);

  useEffect(() => {
    setState(pair.controller.getSnapshot());
    return pair.controller.subscribe(() => setState(pair.controller.getSnapshot()));
  },[pair]);
  useEffect(() => {
    let alive = true;
    setStatus('checking');
    setReview(null);setReviewError('');
    const check = async () => {
      // The Agent Gateway deliberately forgets a rejected token on 404. Mini
      // must not silently present the replacement empty chat on next reload.
      if (expiredWasAcknowledged()) {
        if (alive) setStatus('expired');
        return;
      }
      const priorId = pair.gateway.resumableConversationId();
      if (!priorId) {
        // This is a valid *new* locally configured guest. Do not create a
        // server conversation before a real human message is submitted.
        if (alive) setStatus('ready');
        return;
      }
      try {
        // Never show a clean/empty chat as if it were the original conversation.
        // Read ONCE and reuse the same authorised snapshot in the canonical
        // controller. The earlier limit=20 could reject valid 12-turn sessions
        // when the controller fetched a different history window.
        const history = await pair.gateway.conversationHistory(priorId);
        if (!history || !Array.isArray(history.entries)) throw new Error('Invalid history');
        await pair.controller.resumeConversation(priorId, history);
        const snapshot = pair.controller.getSnapshot();
        // Verify every message ID, actor and text plus the canonical context,
        // not merely an equal number of messages.
        if (!miniHistoryRestored(history, snapshot, priorId))
          throw new Error('History could not be restored');
        if (alive) setStatus('ready');
      } catch (error) {
        if (!alive) return;
        const code = error && typeof error === 'object' && 'status' in error ? error.status : null;
        if (code === 404) {
          try {sessionStorage.setItem(expiredKey,'1');} catch { /* private-mode */ }
        }
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
  // Authenticated M3 Save/Return is explicitly separate from the anonymous
  // short-term tab continuation and Mini's local, unsigned form preview.
  // Backend owns account rights and idempotency; the frontend never stores an
  // Agreement/KSNumber or creates a synthetic owner ID.
  const loadOwned = async () => {
    if (session.getSnapshot().status !== 'signed-in') {
      setOwnedError('Sign in with your KS Number to see your own saved work.');
      return;
    }
    setOwnedStatus('loading');setOwnedError('');
    try {
      await ensureFreshSession(session,auth);
      const safe = await miniListServerBuilds(pair.gateway);
      setOwnedList(safe);setOwnedStatus('ready');
    } catch {
      setOwnedList([]);setOwnedStatus('error');
      setOwnedError('Saved work is unavailable. No Agreement has been changed.');
    }
  };
  const saveOwned = async () => {
    if (!signedIn){setIdentityGoal('saved');setIdentityOpen(true);return;}
    const conversationId = state.conversationId;
    if (!conversationId || status!=='ready' || state.pending || state.busy || saveBusy) return;
    setSaveBusy(true);setOwnedError('');setSavedNotice('');
    try {
      await ensureFreshSession(session,auth);
      await miniSaveServerBuild(pair.gateway,conversationId);
      setSavedNotice('Saved to your SecurePay account. It is still an unfinished Agreement, not accepted or funded.');
      setOwnedOpen(true);
      await loadOwned();
    } catch {
      setOwnedError('SecurePay could not confirm this save. Check your connection or sign in again before relying on it.');
    } finally {setSaveBusy(false);}
  };
  const resumeOwned = async (savedBuildId: string) => {
    if (session.getSnapshot().status!=='signed-in' || saveBusy || state.busy || state.pending) return;
    setSaveBusy(true);setOwnedError('');setSavedNotice('');setStatus('checking');
    setFailedResumeId(savedBuildId);
    try {
      await ensureFreshSession(session,auth);
      // A signed-in, server-authorised owner receives the original conversation
      // ID, never a new transcript or Agreement clone.
      await miniResumeServerBuild(pair.gateway,pair.controller,savedBuildId);
      setReview(null);setMessage('');setStatus('ready');
      setFailedResumeId(null);setOwnedOpen(false);
      setSavedNotice('Your original SecurePay conversation has been restored.');
    } catch {
      // Stay blocked. In particular, do NOT show a healthy empty conversation
      // or start a second Agreement after an authorised resume read fails.
      setStatus('continuity-unavailable');
      setOwnedError('SecurePay could not safely restore this saved conversation. Recheck it; nothing was accepted or paid.');
    } finally {setSaveBusy(false);}
  };
  const openOwned = () => {
    if (!signedIn) {setIdentityGoal('saved');setIdentityOpen(true);return;}
    const next=!ownedOpen;
    setOwnedOpen(next);
    if (next) void loadOwned();
  };
  const openSeller = () => {
    setPeopleOpen(null);setAgreementsOpen(false);
    setOwnedOpen(false);setOwnedList([]);setOwnedStatus('idle');
    setStoreOpen(false);
    if(!signedIn){
      setIdentityGoal('seller');setIdentityOpen(true);return;
    }
    setSellerOpen(true);
  };
  const openAgreements = () => {
    setOwnedOpen(false);setOwnedList([]);setOwnedStatus('idle');
    setPeopleOpen(null);setSellerOpen(false);
    if(!signedIn){
      setIdentityGoal('agreements');setIdentityOpen(true);return;
    }
    setAgreementsOpen(true);
  };
  const reauthenticateAgreements = () => {
    session.clear();setAgreementsOpen(false);
    setPeopleOpen(null);setOwnedOpen(false);setOwnedList([]);
    setReview(null);setSavedNotice('');setOwnedError('');
    setIdentityGoal('agreements');setIdentityOpen(true);
    setEpoch(n=>n+1);
  };
  const openPeople = (kind:'inbox'|'creator') => {
    setOwnedOpen(false);setOwnedList([]);setOwnedStatus('idle');
    setAgreementsOpen(false);setSellerOpen(false);
    if(!signedIn){
      setIdentityGoal(kind);setIdentityOpen(true);return;
    }
    setPeopleOpen(kind);
  };
  const reauthenticatePeople = () => {
    // Switching an account never leaves the old account's private data,
    // recipient review or saved-work list visible behind the identity step.
    session.clear();
    setPeopleOpen(null);setOwnedOpen(false);setOwnedList([]);
    setReview(null);setSavedNotice('');setOwnedError('');
    setIdentityGoal('inbox');setIdentityOpen(true);
    setEpoch(n=>n+1);
  };
  const afterMiniIdentity = () => {
    setIdentityOpen(false);
    if(identityGoal==='saved'){setOwnedOpen(true);void loadOwned();}
    else if(identityGoal==='agreements'){setAgreementsOpen(true);}
    else if(identityGoal==='seller'){setSellerOpen(true);}
    else {setPeopleOpen(identityGoal);}
  };
  const changeDemoPersona = (actor:'amina'|'njeri') => {
    if (!demo) return;
    demoAccess.forget();
    if (actor==='amina') miniDemoSeedAccess(demoAccess);
    session.setTokens(miniDemoTokens(actor));
    setReview(null);setReviewError('');setOwnedList([]);
    setOwnedOpen(false);setPeopleOpen(null);setAgreementsOpen(false);setSellerOpen(false);
    setIdentityOpen(false);setSavedNotice('');setOwnedError('');
    setStoreOpen(false);setHeldStorePlan(null);setStoreError('');
    setMessage('');setStatus('checking');setEpoch(n=>n+1);
  };
  // M5: Use the same canonical AgentController for a Store source and the
  // SAME ongoing conversation. No checkout or new Agreement is minted here.
  const forwardStorePlan = async(plan:MiniStoreIntent) => {
    if (storeBusy || state.busy || !!state.pending || status!=='ready')return;
    setStoreBusy(true);setStoreError('');setHeldStorePlan(null);
    try{
      if(plan.source){
        const result=await pair.controller.useOffer(plan.source);
        if(result.status!=='selected'){
          setHeldStorePlan(plan);
          setStoreError(result.status==='failed'
            ? 'SecurePay could not verify that Store offer. Recheck the same source; nothing has been ordered.'
            : 'SecurePay is still working. No Store item was added to an Agreement.');
          return;
        }
      }else if(state.source){
        setStoreError('This conversation already has a selected Store source. Start a separate buying-plan conversation before combining other sellers.');
        return;
      }
      setStoreOpen(false);
      await pair.controller.send(plan.statement);
      // The controller owns uncertain-turn reconciliation, and the next
      // Agreement review uses the same conversation ID and API authority.
      setReview(null);
    }catch{
      setStoreError('Could not discuss the Store plan with KS001. No order or Agreement was created.');
    }finally{setStoreBusy(false);}
  };
  const discussStorePlan = (lines:MiniStorePlanLine[]) => {
    const plan=miniStoreIntent(lines);
    if(!plan){setStoreError('Check the Store, quantity and offer references again. No Agreement was created.');return;}
    void forwardStorePlan(plan);
  };
  // M5C: an owner-authorised seller's proposed terms use the SAME
  // AgentController/source selection and ongoing KS001 conversation. This is
  // NOT a seller-issued backend quote or canonical Agreement version yet.
  const discussSellerQuotation = async(proposal:MiniSellerQuotationDraft):Promise<boolean> => {
    if(storeBusy||state.busy||!!state.pending||status!=='ready')return false;
    setStoreBusy(true);setStoreError('');
    try{
      const outcome=await pair.controller.useOffer(proposal.source);
      if(outcome.status!=='selected'){
        setStoreError('The Store source could not be selected. Nothing was committed.');
        return false;
      }
      await pair.controller.send(proposal.statement);
      const next=pair.controller.getSnapshot();
      if(next.pending||next.error){
        setStoreError('KS001 could not confirm the same conversation turn. Nothing was agreed.');
        return false;
      }
      setSellerOpen(false);setReview(null);
      return true;
    }catch{
      setStoreError('The seller proposal could not be discussed. No Agreement or buyer invitation was created.');
      return false;
    }finally{setStoreBusy(false);}
  };
  const retryStoreSource = async () => {
    const plan=heldStorePlan;
    if(!plan||!plan.source||storeBusy||state.busy||!!state.pending)return;
    setStoreBusy(true);setStoreError('');
    try{
      const outcome=await pair.controller.retryOfferSelection();
      if(outcome.status==='selected'){
        setHeldStorePlan(null);setStoreOpen(false);
        await pair.controller.send(plan.statement);
        setReview(null);
      }else setStoreError(outcome.status==='failed'
        ? 'The original Store offer still cannot be verified. Reopen the Store or retry the same source.'
        : 'SecurePay is still checking the previous Store choice.');
    }catch{
      setStoreError('The Store offer could not be verified. No Agreement was accepted.');
    }finally{setStoreBusy(false);}
  };
  const signOut = () => {
    // Explicit privacy boundary: never leave one signed-in person's saved
    // transcript or account list visible after their token is dropped.
    session.clear();
    pair.gateway.forgetResumableConversation();
    setOwnedList([]);setOwnedOpen(false);setPeopleOpen(null);setAgreementsOpen(false);setSellerOpen(false);setIdentityOpen(false);
    setStoreOpen(false);setHeldStorePlan(null);setStoreError('');
    setOwnedStatus('idle');setOwnedError('');setSavedNotice('');
    setFailedResumeId(null);setReview(null);setMessage('');
    setSignOutAsked(false);
    setStatus('checking');setEpoch(n=>n+1);
  };
  const reset = () => {
    if (!resetAsked) {setResetAsked(true);return;}
    pair.gateway.forgetResumableConversation();
    try {sessionStorage.removeItem(expiredKey);} catch { /* blocked storage */ }
    setMessage('');setResetAsked(false);setReview(null);setReviewError('');
    setOwnedOpen(false);setPeopleOpen(null);setAgreementsOpen(false);setSellerOpen(false);setOwnedError('');setSavedNotice('');
    setStoreOpen(false);setHeldStorePlan(null);setStoreError('');
    setFailedResumeId(null);
    setEpoch(n=>n+1);
  };
  return <section className="spm-guest spm-content" data-mini-first-party-ks001="staging">
    <button type="button" className="spm-back" onClick={onBack}><ArrowLeft size={18}/>{sw?'Rudi':'Back'}</button>
    <div className="spm-persona"><MessageCircle size={16}/><span>KS001</span>
      <span className="spm-dot"/><span>{demo?'Scripted preview · Not live AI':'First-party staging conversation'}</span></div>
    {demo && <div className="spm-mini-preview-banner" role="status">
      <strong>Interactive M1–M5 preview · SYNTHETIC DATA</strong>
      <p>Try the existing Mini components as Amina or Njeri. Replies are scripted;
        identities, stock, Agreements and Money are not real. No requests reach SecurePayAPI.</p>
      <div className="spm-mini-demo-switch" aria-label="Choose a sample account">
        <button type="button" className="spm-secondary"
          aria-pressed={sessionState.status==='signed-in'&&sessionState.tokens.accessToken==='mini-demo-amina'}
          onClick={()=>changeDemoPersona('amina')}>Amina · Buyer</button>
        <button type="button" className="spm-secondary"
          aria-pressed={sessionState.status==='signed-in'&&sessionState.tokens.accessToken==='mini-demo-njeri'}
          onClick={()=>changeDemoPersona('njeri')}>Njeri · Seller</button>
      </div>
    </div>}
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
        onClick={()=>failedResumeId?void resumeOwned(failedResumeId):setRecoveryAttempt(n=>n+1)}
        disabled={status==='checking'||saveBusy}>
        <RefreshCcw size={17}/>Recheck existing conversation</button>
      {failedResumeId && signedIn && <button type="button" className="spm-quiet-button"
        onClick={()=>{
          // Return to the owner's list, not a partly recovered transcript.
          // Explicitly replace the failed controller with an empty one.
          setFailedResumeId(null);setStatus('checking');setReview(null);
          setEpoch(n=>n+1);setOwnedOpen(true);void loadOwned();
        }}>
        Return to my saved work
      </button>}
      {(status==='expired') && <button type="button" className="spm-quiet-button" onClick={reset}>
        {resetAsked?'Confirm: clear the previous conversation':'Clear and start a new conversation'}</button>}
    </div>}
    {identityOpen && <MiniIdentityStep auth={auth} session={session}
      onDone={afterMiniIdentity}
      onCancel={()=>setIdentityOpen(false)}/>}
    {status==='ready' && !identityOpen && peopleOpen==='inbox' &&
      <MiniParticipantInvitations gateway={agreements} signedIn={signedIn}
        onBack={()=>setPeopleOpen(null)} onReauthenticate={reauthenticatePeople}/>}
    {status==='ready' && !identityOpen && peopleOpen==='creator' &&
      <MiniCreatorInvitations gateway={agreements}
        onBack={()=>setPeopleOpen(null)}/>}
    {status==='ready' && !identityOpen && agreementsOpen &&
      <MiniMyAgreements gateway={agreements}
        quotationGateway={quotations} notificationGateway={notifications} liveQuotes={liveQuotes}
        prepare={()=>ensureFreshSession(session,auth)}
        onBack={()=>setAgreementsOpen(false)}
        onReauthenticate={reauthenticateAgreements}
      />}
    {status==='ready' && !identityOpen && sellerOpen &&
      <MiniSellerStore storeGateway={stores} businessGateway={businesses}
        quotationGateway={quotations} liveQuotes={liveQuotes}
        prepare={()=>ensureFreshSession(session,auth)}
        onBack={()=>setSellerOpen(false)}
        onInvitations={()=>{setSellerOpen(false);openPeople('inbox');}}
        onSellerDiscuss={discussSellerQuotation}
      />}
    {status==='ready' && !identityOpen && !peopleOpen && !agreementsOpen && !sellerOpen && <>
      <button type="button" className="spm-secondary spm-mini-store-entry"
        onClick={()=>{setStoreOpen(open=>!open);setStoreError('');}}
        disabled={storeBusy||state.busy||!!state.pending}>
        <ShoppingBag size={16}/>{storeOpen?'Close Stores':'Browse Stores'}
        <ArrowRight size={15}/>
      </button>
      {storeOpen && <div className="spm-mini-store-drawer"
        aria-label="Digital Store alongside your existing KS001 conversation">
        <MiniBuyStore language={language} onBack={()=>setStoreOpen(false)}
          storeGateway={stores} onDiscuss={discussStorePlan}/>
      </div>}
      {storeBusy && <p role="status" className="spm-mini-owned-note">
        KS001 is checking the selected Store information. Nothing is ordered or reserved.
      </p>}
      {storeError && <p className="spm-error" role="alert">{storeError}</p>}
      {heldStorePlan && <div className="spm-mini-owned-actions">
        <button type="button" className="spm-secondary"
          disabled={storeBusy||state.busy||!!state.pending}
          onClick={()=>void retryStoreSource()}>
          <RefreshCcw size={15}/>Recheck the same Store source
        </button>
        <button type="button" className="spm-quiet-button"
          onClick={()=>{setHeldStorePlan(null);setStoreOpen(true);setStoreError('');}}>
          Return to Stores
        </button>
      </div>}
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
      {review && <MiniAgreementSlots formation={review}/>}
      <div className="spm-mini-owned-actions" aria-label="Save and return to SecurePay work">
        {state.conversationId && <button type="button" className="spm-secondary"
          onClick={()=>void saveOwned()} disabled={state.busy||!!state.pending||saveBusy}>
          <BookmarkPlus size={16}/>{saveBusy?'Checking…':signedIn?'Save for later':'Sign in to save'}
        </button>}
        <details className="spm-mini-account-menu">
          <summary><FolderOpen size={16}/>My SecurePay <ArrowRight size={14}/></summary>
          <div className="spm-mini-account-options">
            <button type="button" className="spm-quiet-button"
              onClick={openOwned} disabled={saveBusy}>My saved work</button>
            <button type="button" className="spm-quiet-button" onClick={openAgreements}
              disabled={saveBusy}><ClipboardList size={15}/>My Agreements</button>
            <button type="button" className="spm-quiet-button" onClick={openSeller}
              disabled={saveBusy}><Store size={15}/>My Store</button>
            <button type="button" className="spm-quiet-button"
              onClick={()=>openPeople('inbox')} disabled={saveBusy}>
              <Mail size={15}/>Invitations for me
            </button>
            <button type="button" className="spm-quiet-button"
              onClick={()=>openPeople('creator')} disabled={saveBusy}>
              <Users size={15}/>Invite someone
            </button>
            {signedIn && !demo && <button type="button" className="spm-quiet-button"
              onClick={()=>{if (!signOutAsked){setSignOutAsked(true);return;}signOut();}}
              aria-label={signOutAsked?'Confirm sign out; unsaved work may be lost':'Sign out of SecurePay Mini'}>
              <LogOut size={15}/>{signOutAsked?'Confirm sign out':'Sign out'}
            </button>}
          </div>
        </details>
      </div>
      {signOutAsked && <p className="spm-mini-owned-note" role="status">
        Unsaved work may be lost when you sign out. Press Confirm sign out, or continue working.
      </p>}
      {savedNotice && <p className="spm-mini-owned-note" role="status">{savedNotice}</p>}
      {ownedError && <p className="spm-error" role="alert">{ownedError}</p>}
      {ownedOpen && signedIn && <section className="spm-mini-owned-list"
        aria-label="Saved unfinished SecurePay work">
        <strong>My saved work</strong>
        <p>Only your server-authorised drafts appear here. Saving does not accept an Agreement.</p>
        {ownedStatus==='loading' && <p role="status">Checking your saved work…</p>}
        {ownedStatus==='ready' && ownedList?.length===0 && <p>No saved work yet.</p>}
        {ownedStatus==='ready' && ownedList?.map(item=>
          <div key={item.savedBuildId} className="spm-mini-owned-item">
            <div><strong>{item.title}</strong>
              <small>{item.openMatterCount} open {item.openMatterCount===1?'matter':'matters'} · Unfinished</small>
            </div>
            <button type="button" className="spm-secondary" onClick={()=>void resumeOwned(item.savedBuildId)}
              disabled={saveBusy||state.busy||!!state.pending}>
              Continue
            </button>
          </div>)}
        {ownedStatus==='error' && <button type="button" className="spm-quiet-button"
          onClick={()=>void loadOwned()}>Recheck saved work</button>}
      </section>}
    </>}
    <p className="spm-disclaimer">{demo
      ? 'SYNTHETIC DEMO ONLY — no real KS001 intelligence, identities, Store stock, Agreement acceptance or Money.'
      : 'Staging-only Agent conversation; no automatic agreement, participant invitation or payment.'}</p>
  </section>;
}
