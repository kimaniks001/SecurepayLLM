import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, MailPlus, RefreshCcw } from 'lucide-react';
import type { AgreementGateway, Page } from '../api/securepay/agreements';
import type { CurrentUserAgreementSummaryResponse } from '../api/securepay/agreements/dto';
import { createInviteController, INVITE_ROLES, INVITABLE_STATUSES, normalizeKs, isPlausibleKs } from '../features/invitations/controller';

/**
 * M3B CREATOR SIDE. Only a real, server-scoped Agreement may be selected.
 * The existing InviteController owns role and KS target checks, retries,
 * proposing the Agreement, issuance, status and revocation. Mini does not
 * turn the Agent's unconfirmed candidate into an Agreement or invite someone
 * from a typed name in a chat.
 */
export function MiniCreatorInvitations({gateway,onBack}:{
  gateway:AgreementGateway;onBack:()=>void;
}){
  const [list,setList]=useState<CurrentUserAgreementSummaryResponse[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [selected,setSelected]=useState<CurrentUserAgreementSummaryResponse|null>(null);
  const load=async()=>{
    setLoading(true);setError('');setSelected(null);
    try {
      const page:Page<CurrentUserAgreementSummaryResponse>=await gateway.currentUserAgreements(0,20);
      if(!page || !Array.isArray(page.items) || page.items.length>20)
        throw Error('Invalid owner-scoped Agreements');
      setList(page.items.filter(x=>x && typeof x.agreementId==='string' &&
        typeof x.title==='string' && x.currentActor &&
        (['DRAFT',...INVITABLE_STATUSES] as readonly string[]).includes(x.status)));
    }catch{
      setList([]);setError('SecurePay could not verify the Agreements accessible to this account.');
    }finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[gateway]);
  if(selected)return <MiniCreatorInvitationDetail key={selected.agreementId} agreement={selected}
    gateway={gateway} onBack={()=>void load()}/>;
  return <section className="spm-mini-owned-list" aria-label="Invite people on an existing Agreement">
    <button type="button" className="spm-back" onClick={onBack}><ArrowLeft size={16}/>Back to KS001</button>
    <div className="spm-persona"><MailPlus size={16}/>Invite someone to agree</div>
    <p>Choose an Agreement that SecurePay already recognises. A saved conversation alone cannot invite anyone.</p>
    {loading&&<p role="status">Checking your Agreements…</p>}
    {error&&<p role="alert">{error}</p>}
    {error&&<button type="button" className="spm-secondary" onClick={()=>void load()}>
      <RefreshCcw size={15}/>Recheck</button>}
    {!loading&&!error&&list.length===0&&<p>No existing Agreement is ready for invitations here.</p>}
    {list.map(item=><div key={item.agreementId} className="spm-mini-owned-item">
      <div><strong>{item.title}</strong><small>{item.status} · Invitation permission checked by SecurePay</small></div>
      <button type="button" className="spm-secondary" onClick={()=>setSelected(item)}>People</button>
    </div>)}
  </section>;
}
function MiniCreatorInvitationDetail({agreement,gateway,onBack}:{
  agreement:CurrentUserAgreementSummaryResponse;
  gateway:AgreementGateway;
  onBack:()=>void;
}){
  const [status,setStatus]=useState(agreement.status);
  const controller=useMemo(()=>createInviteController(gateway,agreement.agreementId,
    window.location.origin,()=>{void gateway.detail(agreement.agreementId).then(d=>{
      setStatus(d.overview.status);
    }).catch(()=>setStatus('UNVERIFIED'));}),[gateway,agreement.agreementId]);
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  const [copyStatus,setCopyStatus]=useState<'idle'|'copied'|'failed'>('idle');
  useEffect(()=>{void controller.loadList();},[controller]);
  const invitable=(INVITABLE_STATUSES as readonly string[]).includes(status);
  const pending=state.phase==='issuing'||state.phase==='uncertain';
  const currentKs=normalizeKs(state.ksNumber);
  const previewConfirmed=state.ksPreview.status==='found' && state.ksPreview.checked===currentKs;
  const canIssue=(state.phase==='form'||state.phase==='error') && !!state.roleCode &&
    isPlausibleKs(currentKs) && previewConfirmed;
  const copyLink=async()=>{
    const link=state.issued?.link;
    if(!link)return;
    try{await navigator.clipboard.writeText(link);setCopyStatus('copied');}
    catch{setCopyStatus('failed');}
  };
  const leave=()=>{controller.reset();onBack();};
  return <section className="spm-mini-owned-list" aria-label="Agreement people and invitation">
    <button type="button" className="spm-back" onClick={leave}><ArrowLeft size={16}/>Agreements</button>
    <strong>{agreement.title}</strong>
    <p>Current Agreement status: {status}. SecurePay checks whether this account may invite.</p>
    {status==='DRAFT'&&<>
      <p>A private draft cannot invite people. Making it ready to invite is a separate action; nobody is invited yet.</p>
      <button type="button" className="spm-secondary" disabled={state.proposing}
        onClick={()=>void controller.propose()}>
        {state.proposing?'Checking…':'Make Agreement ready to invite'}
      </button>
      {state.proposeError&&<p role="alert">{state.proposeError}</p>}
    </>}
    {invitable&&state.phase==='closed'&&<button type="button" className="spm-secondary"
      onClick={()=>controller.open()}>Invite someone to review</button>}
    {invitable&&['form','error','issuing','uncertain'].includes(state.phase)&&
      <div className="spm-mini-invite-form">
        <label className="spm-label" htmlFor="spm-m3b-role">Their role</label>
        <select id="spm-m3b-role" className="spm-field" value={state.roleCode||''}
          disabled={pending} onChange={event=>controller.setRole(event.target.value)}>
          <option value="">Choose a role</option>
          {INVITE_ROLES.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}
        </select>
        <label className="spm-label" htmlFor="spm-m3b-ks">Their KS Number</label>
        <input id="spm-m3b-ks" className="spm-field" value={state.ksNumber}
          autoComplete="off" spellCheck={false} disabled={pending}
          onChange={event=>controller.setKs(event.target.value)} placeholder="Enter their KS Number"/>
        <button type="button" className="spm-secondary" disabled={pending||
          state.ksPreview.status==='checking'||!isPlausibleKs(currentKs)}
          onClick={()=>void controller.checkKs()}>Check this KS Number</button>
        {state.ksPreview.status==='found'&&previewConfirmed&&<p role="status">
          SecurePay found {state.ksPreview.target.displayName||'an active identity'}
          {state.ksPreview.target.canonicalKsNumber?' · '+state.ksPreview.target.canonicalKsNumber:''}.
          This does not mean the person has agreed.
        </p>}
        {state.ksPreview.status==='not-found'&&<p role="alert">
          SecurePay could not verify an eligible identity for this invitation.
        </p>}
        {state.ksPreview.status==='error'&&<p role="alert">The identity check could not be completed. Try again.</p>}
        {state.error&&<p role="alert">{state.error}</p>}
        <button type="button" className="spm-primary" disabled={!canIssue&&!pending}
          onClick={()=>void controller.issue()}>
          {pending?'Recheck the same invitation':'Create invitation — no acceptance'}
        </button>
        <button type="button" className="spm-quiet-button" disabled={state.phase==='issuing'}
          onClick={()=>controller.reset()}>Cancel</button>
      </div>}
    {(state.phase==='issued'||state.phase==='issued-earlier')&&<>
      <p role="status">SecurePay recorded an invitation. The person has not necessarily seen, joined or agreed to it.</p>
      {state.issued?.link&&<button type="button" className="spm-secondary" onClick={()=>void copyLink()}>
        {copyStatus==='copied'?'Invitation link copied':copyStatus==='failed'?'Copy failed — try again':'Copy invitation link'}
      </button>}
      {!state.issued?.link&&<p>The invitation already exists. The one-time link is not recoverable.</p>}
      <button type="button" className="spm-quiet-button" onClick={()=>controller.reset()}>
        Done</button>
    </>}
    <div className="spm-mini-invite-history">
      <strong>Invitation status</strong>
      {state.list.status==='loading'&&<p>Checking invitations…</p>}
      {state.list.status==='error'&&<button type="button" className="spm-secondary"
        onClick={()=>void controller.loadList()}>Recheck invitation status</button>}
      {state.list.status==='ready'&&state.list.items.map(item=>
        <div key={item.id} className="spm-mini-owned-item">
          <div><strong>{item.roleCode}</strong><small>{item.status==='ISSUED'?'Not opened':
            item.status==='VIEWED'?'Opened, not joined':
            item.status==='JOINED'?'Joined, not necessarily agreed':
            item.status==='REVOKED'?'Revoked':item.status==='EXPIRED'?'Expired':'Unknown status'}</small></div>
          {(item.status==='ISSUED'||item.status==='VIEWED')&&
            <button type="button" className="spm-quiet-button"
              disabled={state.revokingId!==null}
              onClick={()=>void controller.revoke(item.id)}>Revoke</button>}
        </div>)}
      {state.revokeError&&<p role="alert">{state.revokeError}</p>}
    </div>
    <p>Creating or opening an invitation never confirms an Agreement or moves money.</p>
  </section>;
}
