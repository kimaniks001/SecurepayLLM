import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, MailOpen, RefreshCcw } from 'lucide-react';
import type { AgreementGateway } from '../api/securepay/agreements';
import { createInvitationInboxController } from '../features/invitation-inbox/controller';
import { createRecipientController } from '../features/recipient/controller';
import { recipientReviewView, exactVersionView, participantsView } from '../features/recipient/view';

/**
 * M3B RECIPIENT SIDE. The exact existing SecurePay RecipientController is the
 * sole authority for invitation review, Join and current-version confirmation.
 * This component merely presents its states inside the approved quiet Mini.
 * There are never hidden calls to join/confirm from effects or sign-in.
 */
export function MiniParticipantInvitations({ gateway, signedIn, onReauthenticate, onBack }: {
  gateway: AgreementGateway;
  signedIn: boolean;
  onReauthenticate: () => void;
  onBack: () => void;
}) {
  const [inbox] = useState(() => createInvitationInboxController(gateway));
  const state = useSyncExternalStore(inbox.subscribe,inbox.getSnapshot,inbox.getSnapshot);
  const [selected,setSelected] = useState<string | null>(null);
  useEffect(()=>{if(signedIn)void inbox.load();},[inbox,signedIn]);
  if(!signedIn) return <section className="spm-mini-owned-list" role="status">
    <p>Sign in with your KS Number to see invitations meant for your account. No one is joined or confirmed automatically.</p>
    <button type="button" className="spm-secondary" onClick={onReauthenticate}>Sign in</button>
  </section>;
  if(selected) return <MiniRecipientDecision key={selected} invitationId={selected} gateway={gateway}
    onBack={()=>{setSelected(null);void inbox.load();}}
    onReauthenticate={onReauthenticate}/>;
  return <section className="spm-mini-owned-list" aria-label="Invitations for you">
    <button type="button" className="spm-back" onClick={onBack}><ArrowLeft size={16}/>Back to KS001</button>
    <div className="spm-persona"><MailOpen size={16}/>Invitations for you</div>
    <p>These are invitations to review. An invitation isn't participation or agreement.</p>
    {state.status==='loading' && <p role="status">Checking your invitations…</p>}
    {state.status==='error' && <p role="alert">{state.message}</p>}
    {state.status==='error' && <button type="button" className="spm-secondary"
      onClick={()=>void inbox.load()}><RefreshCcw size={15}/>Try again</button>}
    {state.status==='ready' && state.items.length===0 && <p>No invitations for this account yet.</p>}
    {state.status==='ready' && state.items.map(item=><div key={item.invitationId}
      className="spm-mini-owned-item">
      <div>
        <strong>{item.agreementTitle||'Agreement invitation'}</strong>
        <small>{item.roleCode} · {item.status==='ISSUED'?'Awaiting review':
          item.status==='VIEWED'?'Viewed, not joined':item.status==='JOINED'?'Joined, not necessarily agreed':
          item.status==='REVOKED'?'Revoked':item.status==='EXPIRED'?'Expired':'Status unavailable'}</small>
        {item.inviterDisplayName && <small>From {item.inviterDisplayName}</small>}
      </div>
      {item.needsAttention && <button type="button" className="spm-secondary"
        onClick={()=>setSelected(item.invitationId)}>Review <ArrowRight size={14}/></button>}
    </div>)}
    {state.status==='ready' && state.items.length<state.total && <button type="button"
      className="spm-quiet-button" disabled={state.loadingMore} onClick={()=>void inbox.loadMore()}>
      {state.loadingMore?'Loading…':'More invitations'}
    </button>}
  </section>;
}

function MiniRecipientDecision({gateway,invitationId,onBack,onReauthenticate}:{
  gateway:AgreementGateway;invitationId:string;onBack:()=>void;onReauthenticate:()=>void;
}) {
  const recipient=useMemo(()=>createRecipientController(gateway,{invitationId}),[gateway,invitationId]);
  const state=useSyncExternalStore(recipient.subscribe,recipient.getSnapshot,recipient.getSnapshot);
  const [showChangeNote,setShowChangeNote]=useState(false);
  useEffect(()=>{void recipient.load();},[recipient]);
  const review=state.invitation ? recipientReviewView(state.invitation):null;
  const parties=state.version ? participantsView(state.participants,state.join?.participantId||null):[];
  const version=state.version?exactVersionView(state.version,parties):null;
  const canConfirm=(state.phase==='version-ready'||state.phase==='confirm-error'||
    state.phase==='confirm-uncertain') && state.version?.versionStatus==='CURRENT';
  return <section className="spm-mini-owned-list" aria-label="Review your Agreement invitation">
    <button type="button" className="spm-back" onClick={onBack}><ArrowLeft size={16}/>Invitations</button>
    {['idle','loading-invitation','joining','version-loading','confirming'].includes(state.phase) &&
      <p role="status">Checking this Agreement with SecurePay…</p>}
    {review && <div className="spm-mini-participant-review">
      <strong>{review.title}</strong>
      {review.inviterName && <p>From {review.inviterName}</p>}
      <p>Your proposed role: {review.role}</p>
      {review.purpose && <p>{review.purpose}</p>}
      {review.proposedAmount && <p>Proposed amount: {review.proposedAmount}</p>}
      <small>{review.expiry}</small>
      {!state.invitation?.isCurrentVersion && <p role="alert">
        The invitation's version may have changed. SecurePay must show the current version before anyone confirms.
      </p>}
    </div>}
    {state.phase==='invitation-ready' && <div className="spm-mini-owned-actions">
      <button type="button" className="spm-primary" onClick={()=>recipient.proceed(true)}>
        Review before joining
      </button>
      <button type="button" className="spm-quiet-button" onClick={onBack}>Not now</button>
    </div>}
    {state.phase==='identity-required' && <>
      <p role="alert">{state.authNotice||'Sign in again to continue with your own account.'}</p>
      <button type="button" className="spm-secondary" onClick={onReauthenticate}>Sign in again</button>
      <p>Signing in does not join or confirm the Agreement.</p>
    </>}
    {(state.phase==='join-prompt'||state.phase==='join-error'||state.phase==='join-uncertain') && <>
      {state.error && <p role="alert">{state.error}</p>}
      <p><strong>Taking part</strong> adds you as a participant. It does not agree to any terms or move money.</p>
      <button type="button" className="spm-primary" onClick={()=>void recipient.join()}>
        {state.phase==='join-uncertain'?'Check the same Join request':'Take part — not yet agreeing'}
      </button>
      <button type="button" className="spm-quiet-button" onClick={onBack}>Not now</button>
    </>}
    {version && (canConfirm||state.phase==='confirming'||state.phase==='confirmed') && <>
      <div className="spm-mini-participant-review" data-reviewed-agreement-version={state.version?.id}>
        <strong>{version.title}</strong>
        <p>Agreement version {state.version?.versionNumber} · {state.version?.versionStatus}</p>
        {state.changed && <p role="alert">This Agreement changed. Review the current version before deciding.</p>}
        {version.work.map((item,i)=><p key={i}>{item}</p>)}
        <p>Proposed amount: {version.price}</p>
        {version.parties.map((p,i)=><small key={i}>{p.name} · {p.role}</small>)}
        <p>{version.consequence}</p>
      </div>
      {state.error && <p role="alert">{state.error}</p>}
      {canConfirm && <div className="spm-mini-owned-actions">
        <button type="button" className="spm-primary" onClick={()=>void recipient.confirm()}>
          {state.phase==='confirm-uncertain'?'Check the same confirmation':'I agree to this exact version'}
        </button>
        <button type="button" className="spm-quiet-button" onClick={()=>setShowChangeNote(true)}>
          This needs changing
        </button>
      </div>}
      {showChangeNote && <p role="status">
        No change request has been sent. Don't confirm this version. Ask the inviter to revise it;
        SecurePay will require a fresh review if the version changes.
      </p>}
      {state.phase==='confirmed' && <p role="status">
        SecurePay recorded only your confirmation of this exact version. Others may still be waiting. No money has moved.
      </p>}
    </>}
    {state.phase==='invitation-error' && <p role="alert">{state.error||'Invitation unavailable. No action was taken.'}</p>}
    {state.phase==='error' && <><p role="alert">{state.error||'SecurePay could not verify this Agreement.'}</p>
      {!!state.join && <button type="button" className="spm-secondary" onClick={()=>void recipient.reloadVersion()}>
        Retry the current Agreement review
      </button>}</>}
  </section>;
}
