import { useState } from 'react';
import { ArrowUp, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { MiniContextInput, type MiniKind } from './MiniContextInput';
import { WorkspaceWelcome } from './WorkspaceWelcome';

/** Preview-only, in-memory draft notes. Never an Agent turn, Agreement or server record. */
export type PreviewWorkNote = { id:number; text:string };
const detailOptions: ReadonlyArray<{kind:MiniKind; label:string}> = [
  {kind:'person',label:'Person'}, {kind:'date',label:'Date'},
  {kind:'money',label:'Amount'}, {kind:'place',label:'Place'},
];
function displayNote(text:string):{label:string;value:string}{
  const matched=/^(Person|Date|Amount|Place|Proposed (?:delivery|commencement|completion|inspection|contribution|check-in|check-out|pickup|other) timing)\s*:\s*(.+)$/is.exec(text.trim());
  if(matched)return {label:matched[1].startsWith('Proposed')?'Time & milestones':matched[1],value:matched[2]};
  if(/^Proposed .+ timing\b/i.test(text))return {label:'Time & milestones',value:text};
  return {label:'Your plan',value:text};
}
export function PreviewWorkComposer({notes,onAdd,onOpenTools}:{
  notes:readonly PreviewWorkNote[];onAdd:(text:string)=>void;onOpenTools:()=>void;
}){
  const [draft,setDraft]=useState('');
  const [expanded,setExpanded]=useState(false);
  const [showDetails,setShowDetails]=useState(false);
  const [mini,setMini]=useState<MiniKind|null>(null);
  const add=()=>{
    const value=draft.trim();
    if(!value)return;
    onAdd(value);
    setDraft('');
    setExpanded(false);
  };
  return <div data-phase1-preview-composer className="flex min-h-0 min-w-0 flex-1 flex-col">
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-white to-[#fcfcf8] px-4 py-3 sm:px-5" aria-label="Workspace conversation preview">
      {!notes.length&&!draft.trim()&&<WorkspaceWelcome area="work" onExample={example=>{if(example.prompt){setDraft(example.prompt);setExpanded(true);}}}/>}
      {notes.map(note=><div key={note.id} className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-cream-100 px-4 py-3" data-phase1-preview-message>
        <p className="mb-1 text-xs font-medium text-sand-600">You</p>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-forest-900">{note.text}</p>
      </div>)}
    </div>
    <div className="shrink-0 space-y-2 border-t border-cream-100 bg-white px-3 py-3 sm:px-4">
      <p role="status" className="text-xs leading-5 text-sand-600" data-preview-truth>
        <span className="font-semibold text-forest-800">Design preview.</span> KS001 isn't responding; nothing here is saved as an Agreement.
      </p>
      {notes.length>0&&<div className="flex items-center justify-end">
        <button type="button" aria-expanded={showDetails} aria-controls="preview-contextual-details"
          onClick={()=>{setShowDetails(v=>!v);setMini(null);}}
          className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-xs font-medium text-forest-800 hover:bg-cream-50">
          Add a detail {showDetails?<ChevronUp size={15}/>:<ChevronDown size={15}/>}
        </button>
      </div>}
      {notes.length>0&&showDetails&&<div id="preview-contextual-details" className="space-y-2">
        <div className="flex flex-wrap gap-2" aria-label="Preview quick additions">
          {detailOptions.map(item=><button key={item.kind} type="button"
            onClick={()=>setMini(item.kind)} aria-label={'Preview add '+item.label}
            className="min-h-10 rounded-full border border-cream-200 bg-cream-50 px-3 text-xs font-medium text-forest-800 hover:bg-cream-100">
            {item.label}
          </button>)}
        </div>
        {mini&&<MiniContextInput key={mini} kind={mini} label={detailOptions.find(x=>x.kind===mini)?.label||'Detail'}
          onSubmit={async value=>{onAdd((detailOptions.find(x=>x.kind===mini)?.label||'Detail')+': '+value);setMini(null);setShowDetails(false);}}
          onCancel={()=>setMini(null)} submitLabel="Add locally"/>}
      </div>}
      <form onSubmit={event=>{event.preventDefault();add();}} className="flex min-w-0 items-end gap-2 rounded-2xl border border-cream-200 bg-white p-2 shadow-[0_4px_20px_-18px_rgba(25,55,38,.45)] focus-within:border-forest-300">
        <button type="button" aria-label="Add a tool or source" title="Add something" onClick={onOpenTools}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream-100 text-forest-800 hover:bg-cream-200">
          <Plus size={21}/>
        </button>
        <textarea id="phase1-local-note" aria-label="Preview a message to KS001"
          value={draft} onChange={event=>setDraft(event.target.value)}
          onFocus={()=>setExpanded(true)} onBlur={()=>{if(!draft.trim())setExpanded(false);}}
          rows={expanded||draft.includes('\n')?2:1} maxLength={1200}
          onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();add();}}}
          placeholder="What would you like to do?"
          className="max-h-36 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-6 text-forest-900 outline-none placeholder:text-sand-600"/>
        <button type="submit" aria-label="Add to preview" title="Add to preview" disabled={!draft.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-800 text-white disabled:bg-[#a3b0a9]">
          <ArrowUp size={19}/>
        </button>
      </form>
    </div>
  </div>;
}
export function PreviewWorkBoard({notes,onUpdate,onRemove}:{
  notes:readonly PreviewWorkNote[];onUpdate:(id:number,text:string)=>void;onRemove:(id:number)=>void;
}){
  const [editing,setEditing]=useState<number|null>(null);
  const [draft,setDraft]=useState('');
  return <section aria-label="Local preview board" data-phase1-preview-board className="space-y-5">
    <header className="pb-2">
      <p className="sp-brand-kicker">My Work</p>
      <h2 className="mt-1 font-display text-2xl text-forest-900">Taking shape</h2>
      <p className="mt-1 text-sm text-sand-600">Your proposed details</p>
    </header>
    {!notes.length?<div className="space-y-3 py-5">
      <p className="font-display text-xl text-forest-900">A clear place for your work.</p>
      <p className="text-sm leading-7 text-sand-700">Start with what you want to achieve. Your ideas and details will take shape here.</p>
    </div>:
      <div className="divide-y divide-cream-200">{notes.map((note,i)=>{
        const shown=displayNote(note.text);
        return <article key={note.id} className="group py-4 first:pt-1" data-phase1-preview-fact>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-wide text-sand-600">{shown.label}</p>
            <span className="text-[0.7rem] text-sand-600">Proposed</span>
          </div>
          {editing===note.id?<form className="mt-2 space-y-2" onSubmit={event=>{event.preventDefault();if(draft.trim()){onUpdate(note.id,draft.trim());setEditing(null);}}}>
            <textarea autoFocus aria-label="Edit local preview note" value={draft} maxLength={1200} rows={3} onChange={event=>setDraft(event.target.value)}
              className="w-full rounded-xl border border-cream-200 bg-white p-3 text-sm"/>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={!draft.trim()} className="min-h-11 rounded-lg bg-forest-800 px-3 text-sm text-white disabled:opacity-40">Save locally</button>
              <button type="button" onClick={()=>setEditing(null)} className="min-h-11 rounded-lg border border-cream-200 px-3 text-sm">Cancel</button>
            </div>
          </form>:<>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-forest-900">{shown.value}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <button type="button" aria-label={'Edit preview note '+(i+1)}
                onClick={()=>{setEditing(note.id);setDraft(note.text);}}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs text-forest-800 hover:bg-cream-100">
                <Pencil size={14}/> Edit
              </button>
              <button type="button" aria-label={'Remove preview note '+(i+1)} onClick={()=>onRemove(note.id)}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs text-sand-700 hover:bg-cream-100">
                <Trash2 size={14}/> Remove
              </button>
            </div>
          </>}
        </article>;
      })}</div>}
  </section>;
}
