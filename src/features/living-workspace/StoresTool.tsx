import { useState } from 'react';
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
 const effectiveNeed=intent==='agreement'?(selectedNeed||query.trim()):query.trim();
 const canContinue=(!busy&&(intent==='my-store'||!!effectiveNeed));
 async function continueWork(){
  if(!canContinue)return;
  setBusy(true);setError('');setDone(false);
  const message=intent==='my-store'
   ? 'Help me organise my SecurePay Store. Explain what my active KS identity can publish, show the next authorised Store action, and do not claim anything is published.'
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
  {intent==='my-store'&&<p className="rounded-xl bg-cream-50 p-3 text-xs">Your Store belongs to your active SecurePay identity. KS001 can help you organise it, but publishing and changing offers require an authorised Store session.</p>}
  {intent!=='my-store'&&<button type="button" onClick={()=>setMore(v=>!v)} aria-expanded={more} className="text-xs font-semibold underline">{more?'Less details':'More details'}</button>}
  {more&&intent!=='my-store'&&<div className="space-y-2">
   <label className="block text-xs">Location or service area (optional)<input value={location} onChange={e=>setLocation(e.target.value)} maxLength={120} className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 p-2 text-sm"/></label>
   <label className="block text-xs">Requirements (optional)<textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} maxLength={400} className="mt-1 w-full rounded-xl border border-cream-200 p-2 text-sm"/></label>
  </div>}
  <button type="button" disabled={!canContinue} onClick={()=>void continueWork()} className="min-h-11 w-full rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white disabled:opacity-40">{busy?'Working…':intent==='my-store'?'Organise my Store with KS001':'Continue with KS001'}</button>
  {done&&<p role="status" className="text-xs">Request sent to KS001 Chat. No order or Store listing was created.</p>}
  {error&&<p role="alert" className="text-xs text-amber-900">{error}</p>}
  <p className="text-xs text-sand-600">Offers, availability and prices must come from real Store records. A search request does not reserve stock, invite a seller, or create an Agreement.</p>
 </section>;
}