import { useState } from 'react';
import { UserRoundPlus, X } from 'lucide-react';

export type HumanCapacity='plug'|'master';
export const plugCapacities=['Delivery','Pickup','Stock inspection','Delivery inspection','Logistics','Coordination','Sourcing','Store onboarding','Other'] as const;
export const masterCapacities=['Technical consultation','Project review','Disputes','Mentoring','Construction','Costing','Other'] as const;
export type StoreHumanRelation={id:number;ks:string;kind:HumanCapacity;tag:string;requestedService:string};
export function StoreHumanHelp({initial='plug',owner=false,onPropose,relationships,onRelationshipsChange}:{
 initial?:HumanCapacity;owner?:boolean;onPropose?:(text:string)=>void;
 relationships?:StoreHumanRelation[];onRelationshipsChange?:(next:StoreHumanRelation[])=>void;
}){
 const [kind,setKind]=useState<HumanCapacity>(initial);
 const [capacity,setCapacity]=useState('Delivery');
 const [serviceArea,setServiceArea]=useState('');
 const [ks,setKs]=useState('');
 const [tag,setTag]=useState('');
 const [localRelations,setLocalRelations]=useState<StoreHumanRelation[]>([]);
 const relations=relationships??localRelations;
 const updateRelations=(next:StoreHumanRelation[])=>onRelationshipsChange?onRelationshipsChange(next):setLocalRelations(next);
 const [next,setNext]=useState(0);
 const [eligible,setEligible]=useState(false);
 const [storeSaverEligible,setStoreSaverEligible]=useState(false);
 const options=kind==='plug'?plugCapacities:masterCapacities;
 const changeKind=(nextKind:HumanCapacity)=>{setKind(nextKind);setCapacity(nextKind==='plug'?'Delivery':'Project review');};
 const save=()=>{
  if(!/^KS\d{3,18}$/i.test(ks.trim())||!tag.trim())return;
  setNext(n=>n+1);
  updateRelations([...relations,{id:next+1,ks:ks.trim().toUpperCase(),kind,tag:tag.trim().slice(0,48),requestedService:capacity}]);
  setKs('');setTag('');
 };
 const displayed=relations.filter(x=>x.kind===kind&&(!capacity||x.requestedService===capacity));
 return <section aria-label="Store human relationships" data-phase4-human-relations className="space-y-3 rounded-xl border border-cream-200 bg-white p-3">
   <h3 className="text-sm font-semibold">{owner?'My Plugs & My Masters':'Find capable human help'}</h3>
   <div className="grid grid-cols-2 gap-2" role="group" aria-label="Human help type">
     {(['plug','master'] as const).map(k=><button type="button" key={k} aria-pressed={kind===k}
       onClick={()=>changeKind(k)} className={kind===k?'min-h-11 rounded-lg bg-forest-800 text-xs font-semibold text-white':'min-h-11 rounded-lg bg-cream-100 text-xs font-semibold'}>{owner?'My ':''}{k==='plug'?'Plugs':'Masters'}</button>)}
   </div>
   <label className="block text-xs font-medium">What help do you need?
     <select aria-label="What help do you need?" value={capacity} onChange={e=>setCapacity(e.target.value)}
       className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 bg-white px-3 text-sm">
       {options.map(option=><option key={option} value={option}>{option}</option>)}
     </select>
   </label>
   <label className="block text-xs">Service area (optional, voluntarily supplied)
     <input aria-label="Requested service area" value={serviceArea} onChange={e=>setServiceArea(e.target.value.slice(0,90))}
       placeholder="Town or area — no GPS shared" className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 px-3"/>
   </label>
   <p className="text-xs leading-5 text-sand-700">Published capabilities, availability, training, credentials, rates and consent require live verification. No provider matches or appointment are available in this demonstration.</p>
   {onPropose&&<button type="button" onClick={()=>onPropose('Assistance request: '+(kind==='plug'?'Plug':'Master')+' for '+capacity+(serviceArea?' in requested area '+serviceArea:'')+'. No provider identified, contacted or assigned; published services, availability, consent, credentials and rate need authoritative checks.')}
     className="min-h-11 w-full rounded-lg border border-cream-200 px-3 text-sm font-semibold">Propose help in My Work</button>}
   {owner&&<>
     <div className="space-y-2 border-t border-cream-200 pt-3">
       <h4 className="text-xs font-semibold">{kind==='plug'?'My Plugs':'My Masters'} · private relationship tags</h4>
       <p className="text-xs text-sand-600">Tags describe your relationship only, not the provider's published skills. Local preview only: no identity lookup or backend saving.</p>
       <label className="block text-xs">KS Number (unverified)
         <input aria-label="Relationship KS Number" value={ks} onChange={e=>setKs(e.target.value.slice(0,24))}
           placeholder="KS001" className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 px-3"/>
       </label>
       <label className="block text-xs">Your private tag
         <input aria-label="Private relationship tag" value={tag} onChange={e=>setTag(e.target.value.slice(0,48))}
           placeholder={kind==='plug'?'Preferred deliveries, stock checker…':'Construction adviser, project mentor…'}
           className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 px-3"/>
       </label>
       <button type="button" onClick={save} disabled={!/^KS\d{3,18}$/i.test(ks.trim())||!tag.trim()}
         className="min-h-11 w-full rounded-lg bg-forest-800 px-3 text-xs font-semibold text-white disabled:opacity-40"><UserRoundPlus size={14} className="mr-1 inline"/> Add private tag locally</button>
       {displayed.length===0?<p className="text-xs text-sand-600">No locally tagged {kind==='plug'?'Plugs':'Masters'} for this category yet.</p>:
         displayed.map(item=><div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-cream-50 p-2 text-xs">
           <p><strong>{item.ks}</strong> · {item.tag}<span className="block text-sand-600">{item.requestedService} · Unverified identity and capabilities</span></p>
           <button type="button" aria-label={'Remove private tag '+item.tag} onClick={()=>updateRelations(relations.filter(x=>x.id!==item.id))}
             className="min-h-10 min-w-10 rounded-lg p-2"><X size={15}/></button>
         </div>)}
     </div>
     <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={storeSaverEligible}
       onChange={e=>setStoreSaverEligible(e.target.checked)}/>
       My Store may be considered for future Community Saver discovery (local preference only; not published; no customer or Plug has agreed)</label>
     <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={eligible} onChange={e=>setEligible(e.target.checked)}/>
       {kind==='plug'?'Interested in publishing eligibility for Saver opportunities':'Interested in participating in relevant community work'} (local preference only; not active or shared)</label>
     <p className="text-xs text-sand-600">Private tags are never advertised as verified capacity or public qualifications. Live connections require identity and explicit permission.</p>
   </>}
 </section>;
}
