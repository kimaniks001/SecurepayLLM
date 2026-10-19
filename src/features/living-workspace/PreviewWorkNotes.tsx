import { useState } from 'react';
import { ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { MiniContextInput, type MiniKind } from './MiniContextInput';

/** A UI-only demonstration of the existing Workspace's interaction geometry.
 * It is NOT an AgentController, a Trade Context, an Agreement or server storage.
 * No network calls, fabricated KS001 replies or persistence are allowed here.
 */
export type PreviewWorkNote = { id:number; text:string };
const additions: ReadonlyArray<{kind:MiniKind; label:string}> = [
  {kind:'person',label:'Person'}, {kind:'date',label:'Date'},
  {kind:'money',label:'Amount'}, {kind:'place',label:'Place'},
];
export function PreviewWorkComposer({notes,onAdd}:{
  notes:readonly PreviewWorkNote[];onAdd:(text:string)=>void;
}){
  const [draft,setDraft]=useState('');
  const [mini,setMini]=useState<MiniKind|null>(null);
  const add=()=>{
    const value=draft.trim();
    if(!value)return;
    onAdd(value);setDraft('');
  };
  return <div data-phase1-preview-composer className="flex min-h-0 min-w-0 flex-1 flex-col">
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-white to-[#fcfcf8] p-4" aria-label="Local preview notes">
      <div className="rounded-xl border border-cream-200 bg-cream-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-forest-800">Interactive design preview · Local only</p>
        <p className="mt-2 text-sm leading-6">Try entering a request, adding a detail or editing the right-hand board. This preview does not contact KS001 or create an Agreement.</p>
        {!notes.length&&<button type="button" onClick={()=>setDraft('I need 200 chairs delivered to a school')} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-cream-200 bg-white px-3 text-sm font-medium">
          Try a delivery request <ArrowRight size={16}/>
        </button>}
      </div>
      {notes.map(n=><div key={n.id} className="ml-auto max-w-[95%] rounded-xl bg-cream-100 p-3" data-phase1-preview-message>
        <p className="mb-1 text-xs font-semibold text-sand-600">You · local note</p>
        <p className="whitespace-pre-wrap break-words text-sm text-forest-900">{n.text}</p>
      </div>)}
      {notes.length>0&&<p className="text-xs text-sand-600">These are your own notes, not KS001 responses or agreed terms. Edit them in the Living Board.</p>}
    </div>
    <div className="space-y-3 border-t border-cream-100 bg-white p-4">
      <div className="flex flex-wrap gap-2" aria-label="Preview quick additions">
        {additions.map(item=><button key={item.kind} type="button" onClick={()=>setMini(item.kind)} aria-label={'Preview add '+item.label}
          className="min-h-10 rounded-full border border-cream-200 bg-cream-50 px-3 text-xs font-semibold text-forest-800 hover:bg-cream-100">
          + {item.label}
        </button>)}
      </div>
      {mini&&<MiniContextInput key={mini} kind={mini} label={additions.find(x=>x.kind===mini)?.label||'Detail'}
        onSubmit={async value=>{onAdd((additions.find(x=>x.kind===mini)?.label||'Detail')+': '+value);setMini(null);}}
        onCancel={()=>setMini(null)} submitLabel="Add locally"/>}
      <form onSubmit={event=>{event.preventDefault();add();}} className="space-y-2">
        <label htmlFor="phase1-local-note" className="text-xs font-medium text-sand-600">Your request · preview only</label>
        <textarea id="phase1-local-note" aria-label="Preview a message to KS001" value={draft} onChange={event=>setDraft(event.target.value)}
          rows={2} maxLength={1200} placeholder="What would you like to get done?"
          className="w-full resize-y rounded-xl border border-cream-200 bg-white px-3 py-3 text-sm text-forest-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-800"/>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-sand-600">Not sent · not saved · no AI response</p>
          <button type="submit" disabled={!draft.trim()} className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white disabled:opacity-40">Add to preview</button>
        </div>
      </form>
    </div>
  </div>;
}
export function PreviewWorkBoard({notes,onUpdate,onRemove}:{
  notes:readonly PreviewWorkNote[];onUpdate:(id:number,text:string)=>void;onRemove:(id:number)=>void;
}){
  const [editing,setEditing]=useState<number|null>(null);
  const [draft,setDraft]=useState('');
  return <section aria-label="Local preview board" data-phase1-preview-board className="space-y-4">
    <div className="border-b border-cream-100 pb-3">
      <p className="sp-brand-kicker">My Work · Design preview</p>
      <h2 className="mt-1 font-display text-xl text-forest-900">What you're shaping</h2>
      <p className="mt-2 text-xs leading-5 text-sand-600">Local notes only. SecurePay has not examined, accepted or saved any terms.</p>
    </div>
    {!notes.length?<p className="rounded-xl bg-cream-100 p-4 text-sm leading-6">Describe what you want to do in the centre. Your own notes will appear here, ready to edit.</p>
      : <div className="space-y-3">{notes.map((note,i)=><article key={note.id} className="rounded-xl border border-cream-200 bg-white p-3" data-phase1-preview-fact>
          <p className="text-xs font-semibold text-sand-600">Draft note {i+1} · unverified</p>
          {editing===note.id?<form className="mt-2 space-y-2" onSubmit={e=>{e.preventDefault();if(draft.trim()){onUpdate(note.id,draft.trim());setEditing(null);}}}>
            <textarea autoFocus aria-label="Edit local preview note" value={draft} maxLength={1200} rows={3} onChange={event=>setDraft(event.target.value)}
              className="w-full rounded-xl border border-cream-200 p-2 text-sm"/>
            <div className="flex gap-2">
              <button type="submit" disabled={!draft.trim()} className="min-h-11 rounded-lg bg-forest-800 px-3 text-sm text-white disabled:opacity-40">Save locally</button>
              <button type="button" onClick={()=>setEditing(null)} className="min-h-11 rounded-lg border border-cream-200 px-3 text-sm">Cancel</button>
            </div>
          </form>:<>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{note.text}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" aria-label={'Edit preview note '+(i+1)} onClick={()=>{setEditing(note.id);setDraft(note.text);}}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-cream-200 px-3 text-xs"><Pencil size={14}/> Edit</button>
              <button type="button" aria-label={'Remove preview note '+(i+1)} onClick={()=>onRemove(note.id)}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-cream-200 px-3 text-xs"><Trash2 size={14}/> Remove</button>
            </div>
          </>}
        </article>)}</div>}
    <p className="rounded-xl border border-cream-200 bg-[#f9faf7] p-3 text-xs leading-5 text-sand-700">
      Nothing in this preview is an Agreement, KS001 finding or financial authorisation. Reloading clears these notes.
    </p>
  </section>;
}
