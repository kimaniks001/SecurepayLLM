import { useState } from 'react';
import { ArrowLeft, CalendarDays, Check, ChevronRight, MapPin, Minus, Plus, Pencil, Trash2 } from 'lucide-react';
import { MiniContextInput } from './MiniContextInput';
import { UniversalSourceTray } from './UniversalSourceTray';
import { DateTimeTool, compactTimingProposal } from './DateTimeTool';

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
/** UI-only review snapshot; never a saved Agreement, quotation or order. */
export type LocalStoreBuyingPlan={lines:StoreBuyingLine[];draft:StoreBuyingPlanDraft};
export function localBuyingPlanNextQuestion(plan:LocalStoreBuyingPlan):string{
 if(!plan.draft.place.trim())return 'Where should these items be delivered or used?';
 if(!plan.draft.desiredDate)return 'When do you need the items or services?';
 return 'Have the relevant Stores confirmed the quantities, specifications, delivered prices and their responsibilities?';
}
export const MAX_STORE_PLAN_LINES=20;
export const distinctStoreCount=(lines:readonly StoreBuyingLine[])=>new Set(lines.map(x=>x.storeKsNumber||x.storeName)).size;
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
 const coordination=stores.size>=2?draft.coordination:'separate';
 return [
  'Help me shape ONE coordinated buying plan for '+stores.size+' different Store(s), not an executed purchase.',
  example?'These are fictional sample offers for a practice walkthrough. No real Store identity or quote exists.':'Each listed offer is a public source, not a seller acceptance or reservation.',
  'Proposed purpose: '+draft.title.slice(0,120)+'.',
  'Proposed delivery or service location: '+(draft.place.trim().slice(0,320)||'Needs confirming')+'.',
  'Proposed delivery or service timing: '+(draft.desiredDate||'Needs confirming')+'.',
  'Coordination preference: '+coordination+'.',
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
  coordination==='community'?
   'Explore Community coordination with an authorised Plug. Do not publish private buyer or seller details without consent. Community Saver must prove genuine savings for buyer, seller and Plug, with each party consenting; do not claim savings or participation yet.':
   coordination==='combined'?
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
 const [resetNotice,setResetNotice]=useState(false);
 const [saverOptIn,setSaverOptIn]=useState(false);
 const shops=distinctStoreCount(lines);
 const crossStore=shops>=2;
 const removeLine=(key:string)=>{
   const next=lines.filter(x=>x.key!==key);
   if(distinctStoreCount(next)<2&&draft.coordination!=='separate'){
      onDraft({...draft,coordination:'separate'});setSaverOptIn(false);setResetNotice(true);
   }
   onLines(next);setPractice(false);
 };
 const patch=(key:keyof StoreBuyingPlanDraft,value:string)=>{
  if(key==='coordination'){if(value==='separate'||(crossStore&&(value==='combined'||value==='community')))onDraft({...draft,coordination:value});if(value!=='community')setSaverOptIn(false);}
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
       <button type="button" aria-label={'Remove '+line.title} onClick={()=>removeLine(line.key)} className="rounded-lg border border-cream-200 p-2"><Trash2 size={15}/></button>
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
   <div className="space-y-2 border-t border-cream-200 pt-3" data-store-plan-delivery-tools>
     <div className="flex items-center justify-between gap-2"><strong className="text-xs">Delivery & timing</strong><MapPin size={15} aria-hidden="true"/></div>
     <div className="rounded-lg bg-cream-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
       <span className="inline-flex items-center gap-1 text-xs font-semibold text-sand-700"><MapPin size={15} aria-hidden="true"/> Place</span>
       <div className="flex flex-wrap gap-2">
        <button type="button" onClick={()=>setEditing(editing==='place'?null:'place')} aria-expanded={editing==='place'}
          className="min-h-10 rounded-lg border border-cream-200 bg-white px-3 text-xs">Type place</button>
        <button type="button" onClick={()=>setEditing(editing==='place-tool'?null:'place-tool')} aria-expanded={editing==='place-tool'}
          className="min-h-10 rounded-lg border border-cream-200 bg-white px-3 text-xs">Map / Plus Code</button>
       </div>
      </div>
      <p className="mt-1 break-words text-xs">{draft.place||'Where should items arrive?'}</p>
      {editing==='place'&&<div className="mt-3" data-store-plan-mini-place>
       <MiniContextInput kind="place" label="Delivery address, entrance or Plus Code" initialValue={draft.place}
         submitLabel="Use in buying plan" onCancel={()=>setEditing(null)}
         onSubmit={async value=>{patch('place',value);setEditing(null);}}/>
      </div>}
      {editing==='place-tool'&&<div data-store-plan-place-picker className="mt-3 space-y-2 rounded-xl border border-cream-200 bg-white p-3">
       <p className="text-xs text-sand-700">Choose a point on the map, paste map coordinates or enter a Plus Code and the delivery entrance.</p>
       <UniversalSourceTray tool="Places" area="Buying plan" isDemo={true}
         onLocalProposal={proposal=>{
           if(proposal.kind!=='Places')return;
           patch('place',proposal.text);
           setEditing(null);
         }}/>
       <button type="button" className="min-h-10 text-xs font-semibold underline" onClick={()=>setEditing(null)}>Back to buying plan</button>
      </div>}
      <p className="mt-2 text-[11px] text-sand-600">Proposed location only. No automatic GPS access, verification or Store sharing.</p>
     </div>
     <div className="rounded-lg bg-cream-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
       <span className="inline-flex items-center gap-1 text-xs font-semibold text-sand-700"><CalendarDays size={15} aria-hidden="true"/> When</span>
       <div className="flex flex-wrap gap-2">
        <button type="button" onClick={()=>setEditing(editing==='desiredDate'?null:'desiredDate')} aria-expanded={editing==='desiredDate'}
          className="min-h-10 rounded-lg border border-cream-200 bg-white px-3 text-xs">Choose date</button>
        <button type="button" onClick={()=>setEditing(editing==='timing-tool'?null:'timing-tool')} aria-expanded={editing==='timing-tool'}
          className="min-h-10 rounded-lg border border-cream-200 bg-white px-3 text-xs">Date & Time</button>
       </div>
      </div>
      <p className="mt-1 break-words text-xs">{draft.desiredDate||'Date not set'}</p>
      {editing==='desiredDate'&&<div className="mt-3" data-store-plan-mini-date>
       <MiniContextInput kind="date" label="Proposed delivery date"
         initialValue={/^\d{4}-\d{2}-\d{2}$/.test(draft.desiredDate)?draft.desiredDate:''}
         submitLabel="Use date in buying plan" onCancel={()=>setEditing(null)}
         onSubmit={async value=>{patch('desiredDate',value);setEditing(null);}}/>
      </div>}
      {editing==='timing-tool'&&<div data-store-plan-timing-picker className="mt-3 space-y-2 rounded-xl border border-cream-200 bg-white p-3">
       <DateTimeTool context="Store buying plan delivery" isLocalPreview
         onChoose={async selected=>{
           const result=compactTimingProposal(selected);
           if(result.error)throw new Error(result.error);
           patch('desiredDate',result.text);
           setEditing(null);
         }} onClose={()=>setEditing(null)}/>
       <button type="button" className="min-h-10 text-xs font-semibold underline" onClick={()=>setEditing(null)}>Back to buying plan</button>
      </div>}
      <p className="mt-2 text-[11px] text-sand-600">Proposed timing only. A date, range or event condition is not a booking or seller commitment.</p>
     </div>
    </div>
    <div className="space-y-2 border-t border-cream-200 pt-3" data-store-coordination>
    {resetNotice&&<p role="status" className="rounded-lg bg-cream-50 p-2 text-xs">Only one Store remains. The earlier cross-Store coordination choice was cleared.</p>}
    {!crossStore?<p className="text-xs text-sand-700" data-single-store>One Store · arrange purchase and delivery directly with that seller. No cross-Store coordination or Community Saver selection is needed.</p>:<>
      <strong className="text-xs">Coordinate {shops} different Stores</strong>
      <div className="grid grid-cols-3 gap-1">
        {([{id:'separate',title:'Separate deliveries'},{id:'combined',title:'Combined delivery'},{id:'community',title:'Community Saver'}] as const).map(option=><button type="button" key={option.id}
          onClick={()=>patch('coordination',option.id)} aria-pressed={draft.coordination===option.id}
          className={draft.coordination===option.id?'min-h-11 rounded-lg bg-forest-800 px-1 text-xs text-white':'min-h-11 rounded-lg border border-cream-200 px-1 text-xs'}>{option.title}</button>)}
      </div>
      <p className="text-xs text-sand-600">{draft.coordination==='community'?'Explore a possible saving with a Plug. This is not consent or an enrolment.':draft.coordination==='combined'?'Ask about sharing transport, with each seller still confirming their responsibilities.':'Let each seller arrange their own delivery and confirm their own terms.'}</p>
      {draft.coordination==='community'&&<section aria-label="Community Saver consent and economics" data-saver-consent className="space-y-2 rounded-xl bg-cream-50 p-3">
        <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={saverOptIn} onChange={e=>setSaverOptIn(e.target.checked)}
          className="mt-1" /> I want to explore this Saver opportunity. This does not enrol anyone.</label>
        <p className="text-xs font-semibold">Consent · not yet obtained</p>
        <p className="text-xs">Buyer: {saverOptIn?'Interested in exploring; formal agreement pending':'Not opted in'} · Each seller: pending · Plug: not appointed or consented</p>
        <p className="text-xs font-semibold">Evidence before any agreement</p>
        <dl className="space-y-1 text-xs text-sand-700">
          <div><dt className="inline font-semibold">Ordinary cost baseline:</dt> <dd className="inline">Not evidenced</dd></div>
          <div><dt className="inline font-semibold">Coordinated costs:</dt> <dd className="inline">Unquoted</dd></div>
          <div><dt className="inline font-semibold">Plug compensation:</dt> <dd className="inline">Not agreed</dd></div>
          <div><dt className="inline font-semibold">Net benefit to buyer, sellers and Plug:</dt> <dd className="inline">Unverified</dd></div>
          <div><dt className="inline font-semibold">Benefit allocation:</dt> <dd className="inline">Not proposed or agreed</dd></div>
        </dl>
        <p className="text-xs leading-5 text-sand-700">A Plug must participate. Membership never implies Saver consent. All parties must separately agree and verify genuine benefits before commitments or payouts.</p>
      </section>}
    </>}
    <button type="button" onClick={()=>setEditing(editing==='notes'?null:'notes')} className="text-xs font-semibold underline"> {draft.notes?'Edit other requirements':'Other requirements (optional)'}</button>
    {editing==='notes'&&<textarea autoFocus rows={2} maxLength={450} aria-label="Other buying plan requirements" value={draft.notes} onChange={e=>patch('notes',e.target.value)} className="w-full rounded-lg border border-cream-200 bg-white p-2 text-sm"/>}
   </div>
   <div className="border-t border-cream-200 pt-3">
    <p className="mb-2 text-xs text-sand-600">One proposed plan · {shops} independent Store{shops===1?'':'s'} must confirm their part. Prices, logistics and savings are not yet agreed. This preview supports up to {MAX_STORE_PLAN_LINES} distinct offers per KS001 handoff.</p>
    <button type="button" disabled={!lines.length||busy} onClick={()=>{if(sample)setPractice(true);onPrepare();}}
     className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-3 text-sm font-semibold text-white disabled:opacity-50">
     {busy?'Working…':sample?'Continue with KS001 · sample':'Prepare one plan with KS001'} <ChevronRight size={16}/>
    </button>
    {sample&&practice&&<p role="status" className="mt-2 text-xs text-forest-800">Illustrative proposal only. No real Agreement, quote, reservation or payment was created.</p>}
   </div>
 </section>;
}