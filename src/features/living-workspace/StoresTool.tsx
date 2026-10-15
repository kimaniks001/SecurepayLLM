import { useState } from 'react';
import { CalendarDays, Camera, FilePlus2, GalleryHorizontalEnd, Handshake, HeartHandshake, ImagePlus, LayoutGrid, ListChecks, Store } from 'lucide-react';
type StoreIntent='find'|'my-store'|'agreement';
const labels:Record<StoreIntent,string>={find:'Find something','my-store':'My Store',agreement:'From Agreement'};
export function StoresTool({onContinue,agreementNeeds=[]}:{onContinue:(message:string)=>Promise<void>;agreementNeeds?:string[]}){
 const [intent,setIntent]=useState<StoreIntent>('find');
 const [kind,setKind]=useState<'product'|'service'|'capacity'>('product');
 const [query,setQuery]=useState('');
 const [location,setLocation]=useState('');
 const [note,setNote]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [done,setDone]=useState(false);
 const [more,setMore]=useState(false);
 const [selectedNeed,setSelectedNeed]=useState('');
 const [storeAction,setStoreAction]=useState('');
 const [storeNote,setStoreNote]=useState('');
 const actions=[
  {id:'offer',title:'Make an offer',Icon:ImagePlus},
  {id:'gallery',title:'Completed jobs',Icon:GalleryHorizontalEnd},
  {id:'decisions',title:'Decisions',Icon:ListChecks},
  {id:'agreements',title:'Agreements',Icon:Handshake},
  {id:'quote',title:'Quotation',Icon:FilePlus2},
  {id:'contract',title:'Quick Contract',Icon:FilePlus2},
  {id:'saver',title:'Community Saver',Icon:HeartHandshake},
  {id:'calendar',title:'Calendar & balance',Icon:CalendarDays},
 ];
 const effectiveNeed=intent==='agreement'?(selectedNeed||query.trim()):query.trim();
 const canContinue=(!busy&&(intent==='my-store'?!!storeAction:!!effectiveNeed));
 async function continueWork(){
  if(!canContinue)return;
  setBusy(true);setError('');setDone(false);
  const message=intent==='my-store'
   ? ['Help me with '+(actions.find(a=>a.id===storeAction)?.title||'my Store')+' for my SecurePay Store.',storeNote.trim()?'My note: '+storeNote.trim()+'.':'',
    storeAction==='saver'?'Community Saver requires a Plug, genuine savings for buyer seller and Plug, and informed consent.':'',
    storeAction==='calendar'?'Help schedule my work, commitments, available hours and rest.':'',
    'Use actual authorised Store and Agreement records only. Never claim that a listing, quotation, contract, action or appointment is saved or completed without backend confirmation.'].filter(Boolean).join('\n')
   : ['Help me find '+kind+' offers through SecurePay Stores, for: '+effectiveNeed+'.',
      location.trim()?'Preferred location or service area: '+location.trim()+'.':'',
      note.trim()?'Additional requirements: '+note.trim()+'.':'',
      intent==='agreement'?'This need comes from the current draft Agreement; do not treat proposed details as agreed.':'',
      'Use real Store data only when available. If Store search is unavailable in this conversation, say so and help define search criteria instead. Do not invent suppliers, prices, availability or Agreements.',
      'Ask only the next material question.'].filter(Boolean).join('\n');
  try{await onContinue(message);setDone(true);}catch{setError('KS001 could not confirm this request. Check Chat before retrying.');}finally{setBusy(false);}
 }
 return <section aria-label="Stores tool" className="space-y-3 text-sm">
  <p className="font-semibold">What would you like to do?</p>
  <div className="flex flex-wrap gap-2" role="group" aria-label="Store action">
   {(Object.keys(labels) as StoreIntent[]).map(option=><button type="button" key={option} onClick={()=>{setIntent(option);setError('');setDone(false);}}
    className={intent===option?'rounded-full bg-forest-800 px-3 py-2 text-xs text-white':'rounded-full border border-cream-200 bg-white px-3 py-2 text-xs'}>{labels[option]}</button>)}
  </div>
  {intent==='find'&&<>
    <div className="flex flex-wrap gap-2" role="group" aria-label="What are you looking for">
     {(['product','service','capacity'] as const).map(type=><button type="button" key={type} onClick={()=>setKind(type)}
      className={kind===type?'rounded-full bg-cream-200 px-3 py-2 text-xs font-semibold':'rounded-full border border-cream-200 px-3 py-2 text-xs'}>{type==='capacity'?'Available capacity':type==='product'?'Products':'Services'}</button>)}
    </div>
    <label className="block text-xs">What do you need?
     <input value={query} maxLength={240} onChange={e=>setQuery(e.target.value)} placeholder="e.g. bathroom tiles, plumber, transport"
      className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm"/>
    </label>
  </>}
  {intent==='agreement'&&<div className="space-y-2">
    <p className="text-xs text-sand-600">Use a requirement already noted in your draft</p>
    {agreementNeeds.length>0?<div className="flex flex-wrap gap-2">{agreementNeeds.slice(0,5).map((need,index)=><button type="button" key={index} onClick={()=>setSelectedNeed(need)}
      className={selectedNeed===need?'rounded-full bg-forest-800 px-3 py-2 text-xs text-white':'rounded-full border border-cream-200 bg-white px-3 py-2 text-xs'}>{need.slice(0,60)}</button>)}</div>
     :<p className="text-xs text-sand-600">No specific item is recorded yet. Describe what you need below.</p>}
    <input value={query} maxLength={240} onChange={e=>{setQuery(e.target.value);setSelectedNeed('');}} placeholder="What should a Store supply?"
      className="min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm"/>
  </div>}
  {intent==='my-store'&&<div className="space-y-3">
    <div className="rounded-xl border border-cream-200 bg-cream-50 p-3">
      <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 font-semibold"><Store size={17}/> My Store</span><span className="text-xs text-sand-600">Your workspace</span></div>
      <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Store gallery">
        {([{id:'offer',title:'My offers',Icon:ImagePlus},{id:'gallery',title:'Jobs done',Icon:GalleryHorizontalEnd},{id:'gallery',title:'Add pictures',Icon:Camera}] as const).map(tile=><button type="button" key={tile.title} onClick={()=>setStoreAction(tile.id)}
         className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-cream-200 bg-white p-2 text-center text-xs"><tile.Icon size={23}/>{tile.title}</button>)}
      </div>
      <p className="mt-2 text-xs text-sand-600">Images appear here when connected to your Store. These are not fabricated job photos.</p>
    </div>
    <p className="text-xs font-semibold">What would you like to handle?</p>
    <div className="grid grid-cols-2 gap-2">
      {actions.map(action=><button type="button" key={action.id} onClick={()=>{setStoreAction(action.id);setError('');}}
        className={storeAction===action.id?'flex min-h-14 items-center gap-2 rounded-xl bg-forest-800 p-3 text-left text-xs font-semibold text-white':'flex min-h-14 items-center gap-2 rounded-xl border border-cream-200 bg-white p-3 text-left text-xs font-semibold'}>
        <action.Icon size={18} className="shrink-0"/>{action.title}</button>)}
    </div>
    {storeAction&&<div className="rounded-xl bg-cream-50 p-3">
      <p className="text-xs font-semibold">{actions.find(a=>a.id===storeAction)?.title}</p>
      <textarea rows={2} maxLength={400} value={storeNote} onChange={e=>setStoreNote(e.target.value)} placeholder="Add a short note, if useful…" className="mt-2 w-full rounded-lg border border-cream-200 bg-white p-2 text-sm"/>
      {storeAction==='saver'&&<p className="mt-2 text-xs text-sand-600">A Plug must participate before a Community Saver can be verified.</p>}
      {storeAction==='calendar'&&<p className="mt-2 text-xs text-sand-600">Plan your commitments, free hours and rest.</p>}
    </div>}
  </div>}
  {intent!=='my-store'&&<button type="button" onClick={()=>setMore(v=>!v)} aria-expanded={more} className="text-xs font-semibold underline">{more?'Less details':'More details'}</button>}
  {more&&intent!=='my-store'&&<div className="space-y-2">
   <label className="block text-xs">Location or service area (optional)<input value={location} onChange={e=>setLocation(e.target.value)} maxLength={120} className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 p-2 text-sm"/></label>
   <label className="block text-xs">Requirements (optional)<textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} maxLength={400} className="mt-1 w-full rounded-xl border border-cream-200 p-2 text-sm"/></label>
  </div>}
  <button type="button" disabled={!canContinue} onClick={()=>void continueWork()} className="min-h-11 w-full rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white disabled:opacity-40">{busy?'Working…':intent==='my-store'?'Continue with KS001':'Continue with KS001'}</button>
  {done&&<p role="status" className="text-xs">Request sent to KS001 Chat. No order or Store listing was created.</p>}
  {error&&<p role="alert" className="text-xs text-amber-900">{error}</p>}
  <p className="text-xs text-sand-600">Offers, availability and prices must come from real Store records. A search request does not reserve stock, invite a seller, or create an Agreement.</p>
 </section>;
}