import { useState } from 'react';
import { ArrowUp, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { MiniContextInput, type MiniKind } from './MiniContextInput';
import { WorkspaceWelcome } from './WorkspaceWelcome';
import { phase2Examples, phase2ExampleById, type Phase2ExampleId } from './phase2Examples';
import { answerActions } from './answerActions';

/** Preview-only, in-memory draft notes. Never an Agent turn, Agreement or server record. */
export type PreviewWorkNote = { id:number; text:string; exampleId:Phase2ExampleId|null;thumbnail?:string|null;filename?:string;mime?:string|null;size?:number|null;snippet?:string|null };
const detailOptions: ReadonlyArray<{kind:MiniKind; label:string}> = [
  {kind:'person',label:'Person'}, {kind:'date',label:'Date'},
  {kind:'money',label:'Amount'}, {kind:'place',label:'Place'},
];
function displayNote(text:string):{label:string;value:string}{
  const matched=/^(Person|Date|Amount|Place|Photos?|Documents?|Goods|Purpose|Deliverable|Milestone|Responsibility|Pickup|Destination|Evidence|Proposed (?:delivery|commencement|completion|inspection|contribution|check-in|check-out|pickup|other) timing)\s*:\s*(.+)$/is.exec(text.trim());
  if(matched)return {label:matched[1].startsWith('Proposed')?'Time & milestones':matched[1],value:matched[2]};
  if(/^Proposed .+ timing\b/i.test(text))return {label:'Time & milestones',value:text};
  return {label:'Your added detail',value:text};
}
export function PreviewWorkComposer({notes,onAdd,onOpenTools,onSelectExample,exampleId=null}:{
  notes:readonly PreviewWorkNote[];onAdd:(text:string)=>void;onOpenTools:()=>void;onSelectExample?:(id:Phase2ExampleId|null)=>void;exampleId?:Phase2ExampleId|null;
}){
  const [draft,setDraft]=useState('');
  const [expanded,setExpanded]=useState(false);
  const [showDetails,setShowDetails]=useState(false);
  const [mini,setMini]=useState<MiniKind|null>(null);
  const chosenExample=phase2ExampleById(exampleId);
  const exampleHelpers=chosenExample?answerActions(chosenExample.question).filter(a=>a.type==='focus'||a.type==='tool'):[];
  const focusComposer=(prefix='')=>{
    if(prefix&&!draft.trim())setDraft(prefix);
    setExpanded(true);
    window.requestAnimationFrame(()=>document.getElementById('phase1-local-note')?.focus());
  };
  const add=()=>{
    const value=draft.trim();
    if(!value)return;
    onAdd(value);
    setDraft('');
    setExpanded(false);
  };
  return <div data-phase1-preview-composer className="flex min-h-0 min-w-0 flex-1 flex-col">
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-white to-[#fcfcf8] px-4 py-3 sm:px-5" aria-label="Workspace conversation preview">
      {!notes.length&&!draft.trim()&&!chosenExample&&<WorkspaceWelcome area="work" onExample={example=>{if(example.prompt){setDraft(example.prompt);setExpanded(true);}}}/>}
      {onSelectExample&&<details className="sticky top-0 z-10 mx-auto w-full max-w-2xl rounded-xl border border-cream-200 bg-white/95 px-3 py-1 shadow-sm" data-phase2-scenarios>
        <summary className="cursor-pointer py-2 text-xs font-semibold text-forest-800">
          Try an example{chosenExample?' · '+chosenExample.title:''}
        </summary>
        <div className="grid grid-cols-1 gap-1 pb-2 sm:grid-cols-2" aria-label="Example choices">
          {phase2Examples.map(example=><button type="button" key={example.id}
            aria-pressed={exampleId===example.id} onClick={e=>{onSelectExample(example.id);e.currentTarget.closest('details')?.removeAttribute('open');}}
            className="min-h-11 rounded-lg px-3 py-2 text-left text-sm text-forest-800 hover:bg-cream-100">{example.title}</button>)}
          <button type="button" aria-pressed={exampleId===null} onClick={e=>{onSelectExample(null);e.currentTarget.closest('details')?.removeAttribute('open');}}
            className="min-h-11 rounded-lg px-3 py-2 text-left text-sm text-forest-800 hover:bg-cream-100">My own work</button>
        </div>
        <p className="pb-2 text-xs text-sand-600">Your notes remain here when you switch. Examples are not live KS001 responses.</p>
      </details>}
      {chosenExample&&<div className="space-y-3" data-phase2-example-conversation>
        <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-cream-100 px-4 py-3">
          <p className="mb-1 text-xs text-sand-600">Example request · You</p>
          <p className="text-sm leading-6 text-forest-900">{chosenExample.humanSays}</p>
        </div>
        <div className="max-w-[95%] space-y-2 py-2" data-phase2-example-guidance>
          <p className="text-xs font-medium text-sand-600">Example guidance · not a live KS001 reply</p>
          <p className="font-display text-lg font-semibold leading-7 text-forest-900">{chosenExample.question}</p>
          {notes.length>0&&<p className="text-xs leading-5 text-sand-700">
            Your additional details are shown in SecurePay Check as proposals. They have not been examined or accepted.
          </p>}
        </div>
      </div>}
      {notes.map(note=><div key={note.id} className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-cream-100 px-4 py-3" data-phase1-preview-message>
        <p className="mb-1 text-xs font-medium text-sand-600">You</p>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-forest-900">{note.text}</p>
        {note.thumbnail&&<details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-forest-800">View selected photo</summary><img src={note.thumbnail} alt={'Local photo '+(note.filename||'')} className="mt-2 max-h-48 w-full rounded-lg object-contain"/></details>}
      </div>)}
    </div>
    <div className="shrink-0 space-y-2 border-t border-cream-100 bg-white px-3 py-3 sm:px-4">
      <p role="status" className="text-xs leading-5 text-sand-600" data-preview-truth>
        <span className="font-semibold text-forest-800">Design preview · Example guidance only.</span> KS001 is not responding live; no Agreement is saved.
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
      {exampleHelpers.length>0&&<div aria-label="Example answer helpers" className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-sand-600">You can respond</span>
        {exampleHelpers.map(hint=><button type="button" key={hint.label} onClick={()=>{
          if(hint.type==='tool')onOpenTools();
          else focusComposer(chosenExample?.id==='delivery'?'Goods: ':'');
        }} className="min-h-9 rounded-full border border-cream-200 px-3 text-xs font-medium text-forest-800 hover:bg-cream-50">
          {hint.type==='focus'&&chosenExample?.id==='delivery'?'Describe the goods':hint.label}
        </button>)}
        <button type="button" onClick={()=>focusComposer()} className="min-h-9 rounded-full border border-cream-200 px-3 text-xs font-medium text-forest-800 hover:bg-cream-50">More details</button>
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
export function PreviewWorkBoard({notes,onUpdate,onRemove,onFocusComposer,exampleId=null}:{
  notes:readonly PreviewWorkNote[];onUpdate:(id:number,text:string)=>void;onRemove:(id:number)=>void;
  onFocusComposer:()=>void;exampleId?:Phase2ExampleId|null;
}){
  const [editing,setEditing]=useState<number|null>(null);
  const [draft,setDraft]=useState('');
  const example=phase2ExampleById(exampleId);
  const enteredGoods=example?.id==='delivery'&&notes.some(note=>displayNote(note.text).label==='Goods');
  return <section aria-label="SecurePay Check" data-phase1-preview-board data-phase2-check className="space-y-6">
    <header>
      <p className="sp-brand-kicker">My Work</p>
      <h2 className="mt-1 font-display text-2xl text-forest-900">SecurePay Check</h2>
      <p className="mt-2 text-sm text-sand-600">What we're agreeing</p>
    </header>
    {example&&<div className="space-y-3 border-b border-cream-200 pb-4" aria-label="Illustrative proposed terms">
      <p className="text-xs font-medium text-sand-600">{example.title} · illustrative example</p>
      {example.proposed.filter(proposal=>!notes.some(note=>displayNote(note.text).label===proposal.label)).map(proposal=><div key={proposal.label}>
        <p className="text-xs font-semibold text-sand-600">{proposal.label} · proposed</p>
        <p className="mt-1 text-sm leading-6 text-forest-900">{proposal.value}</p>
      </div>)}
    </div>}
    {!notes.length&&!example?<div className="space-y-3 py-3">
      <p className="font-display text-lg text-forest-900">A clear place for your work.</p>
      <p className="text-sm leading-7 text-sand-700">Start with what you want to achieve. Your ideas and details will take shape here.</p>
    </div>:null}
    {notes.length>0&&<section aria-label="Proposed information" className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-sand-600">Your proposed information</h3>
      <div className="divide-y divide-cream-200">{notes.map((note,i)=>{
        const shown=displayNote(note.text);
        return <article key={note.id} className="py-3" data-phase1-preview-fact>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-sand-600">{shown.label}</p>
            <span className="text-[0.7rem] text-sand-600">Not checked</span>
          </div>
          {editing===note.id?<form className="mt-2 space-y-2" onSubmit={event=>{event.preventDefault();if(draft.trim()){onUpdate(note.id,draft.trim());setEditing(null);}}}>
            <textarea autoFocus aria-label="Edit local preview note" value={draft} maxLength={1200} rows={3} onChange={event=>setDraft(event.target.value)}
              className="w-full rounded-xl border border-cream-200 bg-white p-3 text-sm"/>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={!draft.trim()} className="min-h-11 rounded-lg bg-forest-800 px-3 text-sm text-white disabled:opacity-40">Save locally</button>
              <button type="button" onClick={()=>setEditing(null)} className="min-h-11 rounded-lg border border-cream-200 px-3 text-sm">Cancel</button>
            </div>
          </form>:<>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-forest-900">{shown.value}</p>
            {note.thumbnail&&<details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-forest-800">View selected photo</summary><img src={note.thumbnail} alt={'Local photograph of '+(note.filename||'selected goods')} className="mt-2 max-h-64 w-full rounded-xl object-contain"/></details>}
            {note.snippet&&<details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-forest-800">Read selected text</summary><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words bg-cream-50 p-2 text-xs">{note.snippet}</pre></details>}
            {note.filename&&<p className="mt-1 text-xs text-sand-600">Selected locally · {note.mime||'Unknown file type'} · {note.size??0} bytes · not uploaded or examined</p>}
            <div className="mt-1 flex gap-2">
              <button type="button" aria-label={'Edit preview note '+(i+1)} onClick={()=>{setEditing(note.id);setDraft(note.text);}}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs text-forest-800 hover:bg-cream-100"><Pencil size={14}/> Edit</button>
              <button type="button" aria-label={'Remove preview note '+(i+1)} onClick={()=>onRemove(note.id)}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs text-sand-700 hover:bg-cream-100"><Trash2 size={14}/> Remove</button>
            </div>
          </>}
        </article>;
      })}</div>
    </section>}
    {(notes.length>0||example)&&<section aria-label="What deserves attention" className="border-t border-cream-200 pt-4">
      <h3 className="text-sm font-semibold text-forest-900">What deserves attention</h3>
      <p className="mt-2 text-sm leading-6 text-sand-700">
        {example?(enteredGoods?'The goods you entered remain a proposal. Pickup, destination and handover arrangements may still need clarification.':example.attention):'These details have not been examined by KS001. Their meaning and any missing facts still need review.'}
      </p>
    </section>}
    <details className="border-t border-cream-200 pt-4" aria-label="Fair Trade examination" data-phase2-fairtrade>
      <summary className="cursor-pointer text-sm font-semibold text-forest-900">Fair Trade <span className="font-normal text-sand-600">· Awaiting examination</span></summary>
      <p className="mt-2 text-xs leading-6 text-sand-700">SecurePay's canonical twelve Fair Trade Principles must be examined by the authorised backend. No principle has been evaluated in this demonstration, and no score or clearance is shown.</p>
    </details>
    <section aria-label="Next step" className="rounded-xl bg-[#f3f6ef] p-4" data-phase2-next>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-forest-700">One useful next step</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-forest-900">{enteredGoods?'Add a pickup or delivery detail.':example?example.question:notes.length?'Add another detail to your proposal.':'Describe what you want to do.'}</p>
      <button type="button" onClick={onFocusComposer} className="mt-3 min-h-11 rounded-lg bg-forest-800 px-4 text-xs font-semibold text-white">Continue in conversation</button>
    </section>
    <details className="border-t border-cream-200 pt-4" aria-label="Action readiness" data-phase2-readiness>
      <summary className="cursor-pointer text-sm font-semibold text-forest-900">What can happen next?</summary>
      <div className="mt-3 space-y-2 text-sm">
        <p><strong>Continue building:</strong> Explore and correct your local notes.</p>
        <p><strong>Review the draft:</strong> Requires a real SecurePay draft.</p>
        <p><strong>Invite or share:</strong> Requires actual permissions and an explicit invitation.</p>
        <p><strong>Request acceptance:</strong> Not authorised in this preview.</p>
        <p><strong>Connect Money:</strong> Not authorised in this preview.</p>
        <p><strong>Proceed with agreed work:</strong> Requires accepted terms and real authority.</p>
      </div>
    </details>
  </section>;
}
