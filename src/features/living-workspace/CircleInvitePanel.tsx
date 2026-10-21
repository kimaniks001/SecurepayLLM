import { useState } from 'react';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';

const makeKey = () => globalThis.crypto?.randomUUID?.() ?? 'invite-' + Math.random().toString(36).slice(2);

/** One deliberate, server-authorised invitation at a time, never a fabricated roster. */
export function CircleInvitePanel({id,gateways,session,onClose}:{
  id:string;gateways:PreviewWorkspaceGateways;session:SessionStore;onClose:()=>void;
}) {
  const [ksNumber,setKsNumber] = useState('');
  const [agree,setAgree] = useState(false);
  const [key,setKey] = useState(makeKey);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [invited,setInvited] = useState<Array<{ks:string;status:'INVITED'|'ACTIVE'}>>([]);
  const invite=async()=>{
    const proposed = ksNumber.trim();
    if(!proposed || busy || !agree) return;
    setBusy(true);setError(null);
    try {
      await ensureFreshSession(session,gateways.auth);
      if(session.getSnapshot().status!=='signed-in')throw Error('Sign in required');
      const [circle,member] = await Promise.all([
        gateways.community.circles.get(id), gateways.community.circles.membership(id),
      ]);
      if(circle.id!==id || circle.status!=='ACTIVE' || !(member.isSteward||member.isOwner))
        throw Error('SecurePay did not confirm invitation authority for this Circle.');
      const result=await gateways.community.circles.invite(id,proposed,key);
      if(result.status!=='INVITED' && result.status!=='ACTIVE')throw Error('SecurePay did not confirm this invitation.');
      setInvited(rows=>[...rows,{ks:proposed,status:result.status as 'INVITED'|'ACTIVE'}]);
      setKsNumber('');setAgree(false);setKey(makeKey());
    } catch(e) {
      setError(e instanceof Error ? e.message : 'SecurePay has not confirmed the invitation. Retry the same request.');
    } finally{setBusy(false);}
  };
  return <section aria-label="Invite someone to this Circle" data-phase5-circle-invites
    className="rounded-2xl border border-forest-200 bg-white p-4 space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-display text-lg">Invite someone to our Circle</h3>
      <button type="button" onClick={onClose} disabled={busy}
        className="min-h-11 rounded-lg border border-cream-200 px-3 text-xs">Close</button>
    </div>
    <p className="text-xs text-sand-600">Each person chooses whether to accept. A Circle invite does not create
      Trust Project membership, financial commitments or an Agreement.</p>
    <label className="block text-xs">Invitee's KS Number
      <input value={ksNumber} maxLength={60}
        onChange={e=>{setKsNumber(e.target.value);setKey(makeKey());setAgree(false);setError(null);}}
        placeholder="KS Number" className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 p-3 text-sm" />
    </label>
    <label className="flex items-start gap-2 text-xs">
      <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} className="mt-1"/>
      I intend to invite exactly this KS Number to our Circle. The person must accept separately.
    </label>
    <button type="button" disabled={!ksNumber.trim()||!agree||busy} onClick={()=>void invite()}
      className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white disabled:opacity-40">
      {busy?'Requesting invitation…':'Send Circle invitation'}</button>
    {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs">{error}</p>}
    {invited.length>0 && <div role="status" className="rounded-xl bg-forest-50 p-3 text-xs">
      <p>{invited.length} Circle membership result(s) confirmed during this session.</p>
      {invited.map((row,index)=><p key={index} className="mt-1">{row.ks} · {row.status==='ACTIVE'?'Already an active Circle member':'Invitation pending acceptance'}</p>)}
    </div>}
  </section>;
}
