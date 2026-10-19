import { useState } from 'react';
import { ArrowLeft, Check, ChevronRight, MapPin, Minus, Plus, Pencil, Trash2, Users } from 'lucide-react';

/**
 * A locally editable buyer intention, never an order, payment instruction or
 * accepted Agreement. Store identities remain attached to every offer line.
 */
export type StoreBuyingLine={
 key:string;
 storeName:string;
 storeKsNumber:string|null;
 originPlace:string|null;
 offerId:string;
 title:string;
 kind:'PRODUCT'|'SERVICE'|'CAPACITY';
 priceLabel:string;
 currency:string|null;
 quantity:number;
 specification:string;
};
export type StoreBuyingPlanDraft={
 title:string;
 place:string;
 desiredDate:string;
 coordination:'separate'|'combined'|'community';
 notes:string;
};
export const MAX_STORE_PLAN_LINES=20;
export const emptyStoreBuyingPlan:StoreBuyingPlanDraft={
 title:'My buying plan',place:'',desiredDate:'',coordination:'separate',notes:'',
};
export function addStoreBuyingLine(previous:StoreBuyingLine[],item:Omit<StoreBuyingLine,'quantity'|'specification'>):StoreBuyingLine[]{
 const existing=previous.find(line=>line.key===item.key);
 if(existing)return previous.map(line=>line.key===item.key?{...line,quantity:Math.min(999,line.quantity+1)}:line);
 if(previous.length>=MAX_STORE_PLAN_LINES)return previous;
 return [...previous,{...item,quantity:1,specification:''}];
}
/** Keep the buyer's proposal distinct from Store truth and every seller's acceptance. */
export function storeBuyingPrompt(lines:StoreBuyingLine[],draft:StoreBuyingPlanDraft,example=false):string{
 if(lines.length>MAX_STORE_PLAN_LINES)throw new Error('Buying plan exceeds the supported preview size');
 const stores=new Set(lines.map(line=>line.storeKsNumber||line.storeName));
 return [
  'Help me shape ONE coordinated buying plan for '+stores.size+' different Store(s), not an executed purchase.',
  example?'These are fictional sample offers for a practice walkthrough. No real Store identity or quote exists.':'Each listed offer is a public source, not a seller acceptance or reservation.',
  'Proposed purpose: '+draft.title.slice(0,120)+'.',
  'Proposed delivery or service location: '+(draft.place.trim().slice(0,160)||'Needs confirming')+'.',
  'Proposed date: '+(draft.desiredDate||'Needs confirming')+'.',
  'Coordination preference: '+draft.coordination+'.',
  ...lines.map((line,index)=>[
   'Proposed line '+(index+1)+': '+line.title.slice(0,140)+
   ' | Store: '+line.storeName.slice(0,90)+
   ' | Store KS: '+(line.storeKsNumber||'SAMPLE/UNVERIFIED')+
   ' | Store origin: '+(line.originPlace?.slice(0,90)||'Unverified')+
   ' | Offer ID: '+line.offerId.slice(0,90)+
   ' | Kind: '+line.kind+
   ' | Quantity proposed: '+line.quantity+
   ' | Displayed price: '+line.priceLabel.slice(0,100)+
   ' | Requirements: '+(line.specification.trim().slice(0,200)||'To confirm'),
  ].join('')),
  draft.notes.trim()?'Buyer notes: '+draft.notes.trim().slice(0,450):'',
  'Keep each seller and offer traceable. Verify quoted amounts, quantities, availability, separate seller acceptance and delivery obligations before describing anything as agreed.',
  draft.coordination==='community'?
   'Explore Community coordination with an authorised Plug. Do not publish private buyer or seller details without consent. Community Saver must prove genuine savings for buyer, seller and Plug, with each party consenting; do not claim savings or participation yet.':
   draft.coordination==='combined'?
   'Explore pooled delivery and a common schedule; do not imply a Plug, provider, seller or price is already confirmed.':'Keep deliveries independently priced until the buyer chooses otherwise.',
  'The buyer wants one clear overall commitment to review, with independently accepted supplier obligations where needed. Do not combine unaccepted offers into a binding contract. Money must follow accepted Agreements and provider checks.',
  example?'This is a practice example; never call real payment, invitations, Agreements or Store writes.':'Ask the next material question and preserve the Store source references.',
 ].filter(Boolean).join('\n');
}
export function StoreBuyingPlan({lines,draft,onDraft,onLines,onBack,onPrepare,sample=false,busy=false}:{
 lines:StoreBuyingLine[];draft:StoreBuyingPlanDraft;onDraft:(next:StoreBuyingPlanDraft)=>void;
 onLines:(next:StoreBuyingLine[])=>void;onBack:()=>void;onPrepare:()=>void;
 sample?:boolean;busy?:boolean;
}){
 const [editing,setEditing]=useState<string|null>(null);
 const [practice,setPractice]=useState(false);
 const shops=new Set(lines.map(line=>line.storeKsNumber||line.storeName)).size;
 const patch=(key:keyof StoreBuyingPlanDraft,value:string)=>{
  if(key==='coordination'){if(value==='separate'||value==='combined'||value==='community')onDraft({...draft,coordination:value});}
  else onDraft({...draft,[key]:value});
  setPractice(false);
 };
 const changeLine=(key:string,changes:Partial<StoreBuyingLine>)=>{
  onLines(lines.map(line=>line.key===key?{...line,...changes}:line));setPractice(false);
 };
 return <section aria-label="Editable buying plan summary" className="space-y-3 rounded-2xl border border-forest-200 bg-white p-3 shadow-sm">
   <div className="flex items-start justify-between gap-2">
    <div><p className="text-xs font-semibold text-sand-600">MY BUYING PLAN · NOT AN ORDER</p>
     <div className="mt-1 flex items-center gap-2"><h3 className="font-display text-lg">{draft.title||'My buying plan'}</h3>
      <button type="button" aria-label="Edit buying plan title" onClick={()=>setEditing(editing==='title'?null:'title')} className="rounded-lg border border-cream-200 p-1.5"><Pencil size={13}/></button></div>
     <p className="text-xs text-sand-600">{lines.length} item{lines.length===1?'':'s'} · {shops} Store{shops===1?'':'s'} · Draft</p></div>
    <button type="button" onClick={onBack} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-cream-200 px-2 text-xs"><ArrowLeft size={13}/> Browse</button>
   </div>
   {editing==='title'&&<form onSubmit={e=>{e.preventDefault();setEditing(null);}} className="flex gap-2">
    <input autoFocus aria-label="Buying plan title" maxLength={120} value={draft.title} onChange={e=>patch('title',e.target.value)} className="min-w-0 flex-1 rounded-lg border border-cream-200 p-2 text-sm"/>
    <button type="submit" className="rounded-full bg-forest-800 px-3 text-xs text-white"><Check size={16}/></button>
   </form>}
   <div className="space-y-2">
    {lines.map(line=><article key={line.key} className="rounded-xl border border-cream-200 bg-cream-50 p-3">
      <div className="flex items-start justify-between gap-2">
       <div className="min-w-0">
        <p className="text-sm font-semibold">{line.title}</p>
        <p className="mt-1 text-xs text-sand-600">{line.storeName}{line.originPlace?' · '+line.originPlace:''} · {line.kind==='CAPACITY'?'Capacity':line.kind==='SERVICE'?'Service':'Product'}</p>
        <p className="mt-1 text-xs font-semibold">{line.priceLabel} <span className="font-normal text-sand-600">· indicative, not quoted</span></p>
       </div>
       <button type="button" aria-label={'Remove '+line.title} onClick={()=>onLines(lines.filter(item=>item.key!==line.key))} className="rounded-lg border border-cream-200 p-2"><Trash2 size={15}/></button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
       <div className="flex items-center gap-2"><span className="text-xs text-sand-600">Qty</span>
        <button type="button" aria-label={'Reduce quantity of '+line.title} disabled={line.quantity<=1} onClick={()=>changeLine(line.key,{quantity:Math.max(1,line.quantity-1)})} className="rounded-lg border border-cream-200 bg-white p-2 disabled:opacity-40"><Minus size={13}/></button>
        <span className="min-w-6 text-center text-xs font-semibold">{line.quantity}</span>
        <button type="button" aria-label={'Increase quantity of '+line.title} disabled={line.quantity>=999} onClick={()=>changeLine(line.key,{quantity:Math.min(999,line.quantity+1)})} className="rounded-lg border border-cream-200 bg-white p-2 disabled:opacity-40"><Plus size={13}/></button>
       </div>
       <button type="button" onClick={()=>setEditing(editing===line.key?null:line.key)} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-cream-200 bg-white px-3 text-xs"><Pencil size={13}/> {line.specification?'Edit details':'Add details'}</button>
      </div>
      {line.specification&&editing!==line.key&&<p className="mt-2 text-xs text-sand-700">{line.specification}</p>}
      {editing===line.key&&<div className="mt-2 space-y-2">
       <textarea autoFocus rows={2} maxLength={300} aria-label={'Requirements for '+line.title} value={line.specification} onChange={e=>changeLine(line.key,{specification:e.target.value})} placeholder="Size, colour, quality, service scope…" className="w-full rounded-lg border border-cream-200 bg-white p-2 text-sm"/>
       <button type="button" onClick={()=>setEditing(null)} className="min-h-9 rounded-full bg-white px-3 text-xs font-semibold">Done</button>
      </div>}
    </article>)}
   </div>
   <div className="space-y-2 border-t border-cream-200 pt-3">
    <div className="flex items-center justify-between"><strong className="text-xs">Delivery & timing</strong><MapPin size={15}/></div>
    {([{id:'place',label:'Place',value:draft.place||'Where should items arrive?'},{id:'desiredDate',label:'When',value:draft.desiredDate||'Date not set'}] as const).map(field=><div key={field.id} className="rounded-lg bg-cream-50 p-2">
     <div className="flex items-center justify-between gap-2"><span className="text-xs text-sand-600">{field.label}</span><button type="button" onClick={()=>setEditing(editing===field.id?null:field.id)} className="rounded-lg border border-cream-200 bg-white px-2 py-1 text-xs">Edit</button></div>
     {editing===field.id?<input autoFocus type={field.id==='desiredDate'?'date':'text'} maxLength={160} aria-label={'Edit '+field.label} value={draft[field.id]} onChange={e=>patch(field.id,e.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-cream-200 bg-white p-2 text-sm"/>:<p className="mt-1 text-xs">{field.value}</p>}
    </div>)}
   </div>
   <div className="space-y-2 border-t border-cream-200 pt-3">
    <strong className="text-xs">How shall we coordinate?</strong>
    <div className="grid grid-cols-3 gap-1">
     {([{id:'separate',title:'Separate'},{id:'combined',title:'Combine'},{id:'community',title:'Community'}] as const).map(option=><button type="button" key={option.id} onClick={()=>patch('coordination',option.id)}
      aria-pressed={draft.coordination===option.id} className={draft.coordination===option.id?'min-h-10 rounded-lg bg-forest-800 px-1 text-xs text-white':'min-h-10 rounded-lg border border-cream-200 px-1 text-xs'}>{option.title}</button>)}
    </div>
    <p className="text-xs text-sand-600">{draft.coordination==='community'?'A Plug can help check pooled transport, feasible delivery and fair savings. No one is invited until they consent.':draft.coordination==='combined'?'Explore one delivery plan while keeping every supplier’s acceptance separate.':'Each Store provides and confirms its own work. One overall plan keeps everything together.'}</p>
    {draft.coordination==='community'&&<p className="flex gap-2 rounded-lg bg-cream-50 p-2 text-xs"><Users size={17} className="shrink-0"/> A Community Saver requires a Plug and verified benefit and consent for buyer, seller and Plug.</p>}
    <button type="button" onClick={()=>setEditing(editing==='notes'?null:'notes')} className="text-xs font-semibold underline"> {draft.notes?'Edit other requirements':'Other requirements (optional)'}</button>
    {editing==='notes'&&<textarea autoFocus rows={2} maxLength={450} aria-label="Other buying plan requirements" value={draft.notes} onChange={e=>patch('notes',e.target.value)} className="w-full rounded-lg border border-cream-200 bg-white p-2 text-sm"/>}
   </div>
   <div className="border-t border-cream-200 pt-3">
    <p className="mb-2 text-xs text-sand-600">One proposed plan · {shops} independent Store{shops===1?'':'s'} must confirm their part. Prices, logistics and savings are not yet agreed. This preview supports up to {MAX_STORE_PLAN_LINES} distinct offers per KS001 handoff.</p>
    <button type="button" disabled={!lines.length||busy} onClick={()=>{if(sample)setPractice(true);onPrepare();}}
     className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-3 text-sm font-semibold text-white disabled:opacity-50">
     {busy?'Working…':sample?'Practice with KS001':'Prepare one plan with KS001'} <ChevronRight size={16}/>
    </button>
    {sample&&practice&&<p role="status" className="mt-2 text-xs text-forest-800">Practice summary prepared locally. No real Agreement, quote, reservation or payment was created.</p>}
   </div>
 </section>;
}