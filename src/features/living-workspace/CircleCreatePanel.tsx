import { useState } from 'react';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';

const intent = () => globalThis.crypto?.randomUUID?.() ?? 'circle-new-'+Math.random().toString(36).slice(2);
type Admission = 'OPEN' | 'REQUEST_TO_JOIN' | 'INVITE_ONLY';
export function CircleCreatePanel({gateways,session,onCreated}:{
  gateways:PreviewWorkspaceGateways;
  session:SessionStore;
  onCreated:(id:string)=>void;
}) {
  const [expanded,setExpanded]=useState(false);
  const [name,setName]=useState('');
  const [purpose,setPurpose]=useState('');
  const [admission,setAdmission]=useState<Admission>('INVITE_ONLY');
  const [visibility,setVisibility]=useState<'PRIVATE'|'PUBLIC'>('PRIVATE');
  const [approved,setApproved]=useState(false);
  const [key,setKey]=useState(intent);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const create=async()=>{
    if(!approved || !name.trim() || !purpose.trim() || busy)return;
    setBusy(true);setError(null);
    try {
      await ensureFreshSession(session,gateways.auth);
      if(session.getSnapshot().status!=='signed-in')throw Error('Sign in required');
      const membership=await gateways.community.membership.me();
      if(membership.status!=='ACTIVE')throw Error('Join the Trust Project explicitly before creating a Circle.');
      const result=await gateways.community.circles.create(
        name.trim(),purpose.trim(),admission,visibility,null,null,key);
      if(result.name!==name.trim() || result.purpose!==purpose.trim() || !result.id)
        throw Error('SecurePay did not confirm this exact Circle. Recheck before trying again.');
      onCreated(result.id);
      setKey(intent());setApproved(false);setExpanded(false);
    }catch(cause){
      setError(cause instanceof Error ? cause.message : 'SecurePay could not confirm Circle creation. Retry the same intent.');
    }finally{setBusy(false);}
  };
  return <section className="rounded-2xl border border-forest-100 bg-[#f8faf6] p-3 space-y-2" data-phase5-circle-create>
    <div className="flex items-center justify-between gap-2">
      <div><h3 className="font-display text-lg">Build something together</h3>
        <p className="text-xs text-sand-600">Create an authorised shared planning Circle</p></div>
      <button type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}
        className="min-h-11 rounded-xl border border-cream-200 bg-white px-3 text-xs">
        {expanded?'Close':'Create Circle'}</button>
    </div>
    {expanded && <form onSubmit={event=>{event.preventDefault();void create();}} className="space-y-3">
      <label className="block text-xs">Circle name
        <input required maxLength={120} value={name} onChange={e=>{setName(e.target.value);setApproved(false);setKey(intent());}}
          className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm"/></label>
      <label className="block text-xs">What will your Circle try to achieve?
        <textarea required maxLength={1600} rows={3} value={purpose} onChange={e=>{setPurpose(e.target.value);setApproved(false);setKey(intent());}}
          className="mt-1 w-full rounded-xl border border-cream-200 bg-white p-3 text-sm"/></label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block text-xs">Who can see this Circle?
          <select value={visibility} onChange={e=>{setVisibility(e.target.value as 'PRIVATE'|'PUBLIC');setApproved(false);setKey(intent());}}
            className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm">
            <option value="PRIVATE">Private</option><option value="PUBLIC">Public listing</option>
          </select></label>
        <label className="block text-xs">How do people join?
          <select value={admission} onChange={e=>{setAdmission(e.target.value as Admission);setApproved(false);setKey(intent());}}
            className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm">
            <option value="INVITE_ONLY">By invitation</option>
            <option value="REQUEST_TO_JOIN">Request approval</option>
            <option value="OPEN">Open to join</option>
          </select></label>
      </div>
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" className="mt-1" checked={approved} onChange={e=>setApproved(e.target.checked)}/>
        <span>I reviewed this Circle's purpose and admission rules. Creating a Circle does not
          add members, send invitations, approve contributions or create an Agreement.</span>
      </label>
      <button type="submit" disabled={busy||!approved||!name.trim()||!purpose.trim()}
        className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white disabled:opacity-40">
        {busy?'Confirming Circle…':'Create this Circle'}</button>
      {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs">{error}</p>}
    </form>}
  </section>;
}
