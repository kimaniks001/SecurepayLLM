import { useState } from 'react';
import { SignatureAgreementTitle } from '../brand/SignatureAgreementTitle';
import { FileText, MapPin, Camera, Users, CheckCircle2, AlertCircle, ListChecks, ShieldCheck, Clock3, Printer } from 'lucide-react';

export type LivingAgreementStage = 'building' | 'review' | 'invited' | 'accepted';
type EvidenceStatus = 'proposed' | 'confirmed';
export interface LivingFact { id: string; label: string; value: string; source: string; status: EvidenceStatus }
const initialFacts: LivingFact[] = [
 { id:'scope', label:'Subject', value:'200 chairs for delivery', source:'User conversation', status:'confirmed' },
 { id:'date', label:'When', value:'Saturday, 17 October', source:'User conversation', status:'proposed' },
];
const initialMilestones = [
 { id:'deliver', name:'Deliver 200 chairs', detail:'Receipt and condition to be checked' },
 { id:'return', name:'Return or handover', detail:'Only if required by the final terms' },
];
export function LivingAgreementPanel() {
 const [facts,setFacts] = useState<LivingFact[]>(initialFacts);
 const [stage,setStage] = useState<LivingAgreementStage>('building');
 const [milestones,setMilestones] = useState(false);
 const [history,setHistory] = useState<string[]>(['Draft opened from conversation']);
 const [activeSection,setActiveSection] = useState<'facts'|'sources'|'milestones'|'review'>('facts');
 const addFact=(fact:LivingFact)=>{setFacts(items=>items.some(x=>x.id===fact.id)?items: [...items,fact]);setHistory(h=>[...h, fact.label+' proposed from '+fact.source]);};
 const confirm=(id:string)=>{setFacts(items=>items.map(x=>x.id===id?{...x,status:'confirmed'}:x));setHistory(h=>[...h,'Preview: fact confirmed by user']);};
 const missing = ['Supplier identity and authority','Delivery location','Agreed price and payment terms'];
 const ready = false; // Preview deliberately cannot claim a legally accepted or fundable agreement.
 return <div className="space-y-4" data-living-agreement-preview>
   <div className="flex items-start justify-between gap-2"><div><p className="text-xs uppercase tracking-wider text-sand-600">Living Agreement</p><h2 className="mt-2 font-display text-xl"><SignatureAgreementTitle title="Chair delivery"/></h2></div><span className="rounded-full bg-cream-100 px-2 py-1 text-xs">{stage==='building'?'Building':stage==='review'?'Review preview':stage==='invited'?'Invitation preview':'Acceptance preview'}</span></div>
   <p className="text-xs text-sand-600">A working illustration. Suggested details are not automatically agreed terms.</p>
   <div className="flex flex-wrap gap-1" role="tablist" aria-label="Agreement details">
    {(['facts','sources','milestones','review'] as const).map(id=><button key={id} role="tab" aria-selected={activeSection===id} onClick={()=>setActiveSection(id)} className={`min-h-10 rounded-lg px-3 text-xs ${activeSection===id?'bg-forest-800 text-white':'bg-cream-100'}`}>{id==='facts'?'Summary':id==='sources'?'Sources':id==='milestones'?'Milestones':'Review'}</button>)}
   </div>
   {activeSection==='facts'&&<section aria-label="Established and proposed facts" className="space-y-2">
    {facts.map(f=><div key={f.id} className="rounded-xl border border-cream-200 p-3"><div className="flex items-center gap-2 text-sm">{f.status==='confirmed'?<CheckCircle2 size={16} className="text-forest-700"/>:<Clock3 size={16} className="text-sand-600"/>}<strong>{f.label}</strong></div><p className="mt-1 text-sm">{f.value}</p><p className="mt-1 text-xs text-sand-600">{f.status==='confirmed'?'Confirmed for this draft':'Proposed — please check'} · {f.source}</p>{f.status==='proposed'&&<button className="mt-2 min-h-10 rounded-lg bg-cream-100 px-3 text-xs" onClick={()=>confirm(f.id)}>Confirm proposed fact (preview)</button>}</div>)}
    <div className="rounded-xl bg-cream-100 p-3"><p className="text-sm font-semibold">Still needed</p>{missing.filter(x=>!(x==='Delivery location'&&facts.some(f=>f.id==='place'))).map(x=><p key={x} className="mt-2 flex gap-2 text-xs"><AlertCircle size={15}/> {x}</p>)}</div>
   </section>}
   {activeSection==='sources'&&<section className="space-y-2" aria-label="Source provenance"><p className="text-xs text-sand-600">What was supplied, and what is still only a proposal.</p>{facts.map(f=><div key={f.id} className="rounded-xl border border-cream-200 p-3"><p className="text-sm font-semibold">{f.label}: {f.value}</p><p className="mt-1 text-xs text-sand-600">{f.source} · {f.status}</p></div>)}<button className="min-h-11 w-full rounded-xl bg-cream-100 p-3 text-left text-sm" onClick={()=>addFact({id:'place',label:'Delivery site',value:'Workshop site, Nairobi',source:'Saved Places selection (demonstration)',status:'proposed'})}><MapPin size={16} className="mr-2 inline"/>Simulate choosing a saved Place</button><button className="min-h-11 w-full rounded-xl bg-cream-100 p-3 text-left text-sm" onClick={()=>addFact({id:'quote',label:'Quotation',value:'Quotation received; price not verified',source:'Document upload (demonstration)',status:'proposed'})}><FileText size={16} className="mr-2 inline"/>Simulate adding quotation</button><button className="min-h-11 w-full rounded-xl bg-cream-100 p-3 text-left text-sm" onClick={()=>addFact({id:'photo',label:'Site evidence',value:'Entrance photo with caption',source:'Photo and chat caption (demonstration)',status:'proposed'})}><Camera size={16} className="mr-2 inline"/>Simulate captioned photo</button></section>}
   {activeSection==='milestones'&&<section aria-label="Milestone planning" className="space-y-2"><p className="text-xs text-sand-600">A simple trade can become milestone-based without starting over. Proposals are not accepted payment releases.</p><button className="min-h-11 w-full rounded-xl bg-cream-100 p-3 text-left text-sm" onClick={()=>{setMilestones(v=>!v);setHistory(h=>[...h,'Milestone proposal toggled']);}}><ListChecks size={16} className="mr-2 inline"/>{milestones?'Remove proposed milestones':'Propose milestone-based arrangement'}</button>{milestones&&initialMilestones.map((m,i)=><div className="rounded-xl border border-cream-200 p-3" key={m.id}><p className="text-sm font-semibold">{i+1}. {m.name}</p><p className="text-xs text-sand-600">{m.detail} · Proposed</p></div>)}</section>}
   {activeSection==='review'&&<section aria-label="Review and approval" className="space-y-3"><div className="rounded-xl bg-cream-100 p-3"><p className="flex gap-2 text-sm font-semibold"><ShieldCheck size={17}/> Review readiness</p><p className="mt-2 text-xs">Supplier, amount, terms and participant authority have not been established. This draft is not ready for acceptance or Money.</p></div><p className="text-sm font-semibold">Decisions and invitations</p><p className="text-xs text-sand-600">Review → Invite → Participant response → Acceptance → Authorised execution. Each step must use the real backend and consent.</p><button className="min-h-11 rounded-lg bg-cream-100 px-4 text-sm" onClick={()=>setStage('review')}>Preview review stage</button><button disabled={!ready} className="ml-2 min-h-11 rounded-lg bg-forest-800 px-4 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"><Users size={15} className="mr-2 inline"/>Send invitations</button><p className="text-xs text-sand-600">Invitations and approval are intentionally disabled in this visual preview.</p></section>}
   <details className="rounded-xl border border-cream-200 p-3"><summary className="cursor-pointer text-sm font-semibold">Version and activity history</summary>{history.map((entry,i)=><p key={i} className="mt-2 text-xs text-sand-600">{i+1}. {entry}</p>)}</details>
   <button className="flex min-h-11 items-center gap-2 rounded-xl border border-cream-200 px-3 text-sm" onClick={()=>window.print()}><Printer size={16}/> Print preview</button>
 </div>;
}
