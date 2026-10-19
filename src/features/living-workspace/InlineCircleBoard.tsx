import { useEffect, useState } from 'react';
import { CircleBoard } from '../community/CircleBoard';
import type { CircleResponse, CircleMembershipResponse, CommunityObjectResponse } from '../../api/securepay/community/dto';
import type { SessionStore } from '../../api/securepay/session';
import { ensureFreshSession } from '../../api/securepay/session';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';

type CirclePlanningKind = 'DISCUSSION' | 'QUESTION' | 'NEED' | 'OPPORTUNITY' | 'WORK_STORY';
const planningKinds: ReadonlyArray<{value:CirclePlanningKind;label:string;hint:string}> = [
  {value:'DISCUSSION',label:'Discussion note',hint:'Context to explore together'},
  {value:'QUESTION',label:'Question for the group',hint:'Not a vote or approved decision'},
  {value:'NEED',label:'Help or resources needed',hint:'A request, not a confirmed assignment'},
  {value:'OPPORTUNITY',label:'Option to explore',hint:'Not a supplier commitment'},
  {value:'WORK_STORY',label:'Progress checkpoint',hint:'Not an Agreement milestone'},
];
function freshKey() {
  return 'circle-board-' + (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
}

/** S3: reuses the existing CircleBoard and its coordination engine, not a second
 * set of Circle membership, governance or Agreement decisions. Both Circle
 * identity and ACTIVE membership must be confirmed before loading private posts.
 */
export function InlineCircleBoard({ id, gateways, session, onBack }: {
  id:string; gateways:PreviewWorkspaceGateways; session:SessionStore; onBack:()=>void;
}) {
  const [scope,setScope]=useState<{circle:CircleResponse; member:CircleMembershipResponse}|null>(null);
  const [objects,setObjects]=useState<CommunityObjectResponse[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const [composing,setComposing]=useState(false);
  const [draft,setDraft]=useState<{title:string;body:string;kind:CirclePlanningKind}>({title:'',body:'',kind:'DISCUSSION'});
  const [intent,setIntent]=useState(freshKey);
  const [submitting,setSubmitting]=useState(false);

  useEffect(()=>{
    let active=true;
    setLoading(true); setScope(null); setObjects([]); setError(null);
    void (async()=>{
      try {
        await ensureFreshSession(session,gateways.auth);
        if (!active || session.getSnapshot().status!=='signed-in') return;
        const [circle,member]=await Promise.all([
          gateways.community.circles.get(id),
          gateways.community.circles.membership(id),
        ]);
        if(circle.id!==id)throw new Error('Wrong Circle returned');
        if(member.status!=='ACTIVE' && !member.isOwner) {
          throw new Error('An ACTIVE Circle membership is needed to open its shared work.');
        }
        const rows=await gateways.community.circles.objects.list(id,30,0);
        if(rows.some(item=>item.circleId!==id))throw new Error('The Circle returned mismatched content');
        if(active){setScope({circle,member});setObjects(rows);}
      } catch {
        if(active)setError('SecurePay could not verify this Circle or your current membership. No private Circle content was loaded.');
      } finally {if(active)setLoading(false);}
    })();
    return ()=>{active=false;};
  },[id,gateways,session]);

  const add=async()=>{
    if (!scope || scope.circle.status!=='ACTIVE' || submitting) return;
    const title=draft.title.trim(),body=draft.body.trim();
    if(!title || !body)return;
    setSubmitting(true);setError(null);
    try{
      const saved=await gateways.community.circles.objects.create(id,draft.kind,title,body,null,intent);
      if(saved.circleId!==id || saved.objectType!==draft.kind)throw new Error('Unexpected Circle response');
      setObjects(prev=>[saved,...prev.filter(o=>o.id!==saved.id)]);
      setDraft({title:'',body:'',kind:'DISCUSSION'});setIntent(freshKey());setComposing(false);
    } catch {
      setError('The Circle note was not confirmed saved. Retry the same note rather than creating a second one.');
    } finally{setSubmitting(false);}
  };
  const visible=objects.find(o=>o.id===selected)??null;
  return <section data-inline-circle-board aria-label="Your Circle Board" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-xs uppercase tracking-wider text-sand-600">Circle · Authenticated work</p>
        <h2 className="font-display text-xl">{scope?.circle.name ?? 'Opening Circle…'}</h2></div>
      <button type="button" className="min-h-11 rounded-xl border border-cream-200 bg-white px-4 text-sm" onClick={onBack}>Back to my Circles</button>
    </div>
    <p className="text-xs text-sand-600">Only active members and owners see the shared board. Circle notes and quick responses never accept Agreements or move Money.</p>
    {loading && <p role="status" className="rounded-xl bg-cream-100 p-4 text-sm">Checking membership and private Circle work…</p>}
    {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">{error}</p>}
    {scope && <div className="space-y-3">
      <p className="text-sm text-sand-700">{scope.circle.purpose}</p>
      <CircleBoard circleId={id} gateway={gateways.community} objects={objects}
        loading={loading} active={scope.circle.status==='ACTIVE'}
        onOpenObject={setSelected} onAdd={()=>setComposing(true)}/>
      {visible&&<div className="rounded-xl border border-cream-200 bg-cream-50 p-4">
        <p className="text-xs text-sand-600">Circle-only · {visible.objectType}</p>
        <h3 className="mt-2 text-sm font-semibold">{visible.title}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm">{visible.body}</p>
        <button type="button" className="mt-2 min-h-11 rounded-lg bg-white px-3 text-xs" onClick={()=>setSelected(null)}>Close detail</button>
      </div>}
      {composing && <form onSubmit={event=>{event.preventDefault();void add();}} className="space-y-3 rounded-xl border border-cream-200 p-4">
        <p className="text-sm font-semibold">Add something to our Circle's plan</p>
        <label className="block text-xs">What kind of contribution?
          <select value={draft.kind} onChange={e=>{setDraft(v=>({...v,kind:e.target.value as CirclePlanningKind}));setIntent(freshKey());}}
            className="mt-1 min-h-11 block w-full rounded-lg border border-cream-200 p-3 text-sm">
            {planningKinds.map(kind=><option value={kind.value} key={kind.value}>{kind.label}</option>)}
          </select>
        </label>
        <p className="text-xs text-sand-600">{planningKinds.find(kind=>kind.value===draft.kind)?.hint}</p>
        <label className="block text-xs">Title <input required maxLength={160} value={draft.title} onChange={e=>setDraft(v=>({...v,title:e.target.value}))} className="mt-1 block w-full rounded-lg border border-cream-200 p-3 text-sm"/></label>
        <label className="block text-xs">Note <textarea required maxLength={4000} rows={4} value={draft.body} onChange={e=>setDraft(v=>({...v,body:e.target.value}))} className="mt-1 block w-full rounded-lg border border-cream-200 p-3 text-sm"/></label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={submitting||!draft.title.trim()||!draft.body.trim()||scope.circle.status!=='ACTIVE'} className="min-h-11 rounded-lg bg-forest-800 px-4 text-xs text-white disabled:opacity-40">{submitting?'Posting…':'Share in Circle'}</button>
          <button type="button" disabled={submitting} onClick={()=>setComposing(false)} className="min-h-11 rounded-lg bg-cream-100 px-4 text-xs">Cancel</button>
        </div>
        <p className="text-xs text-sand-600">This is a Circle planning contribution, not an approved group decision. SecurePay checks membership; no Agreement, formal vote, invitation or payment is created.</p>
      </form>}
    </div>}
  </section>;
}
