import { useState } from 'react';
import { Lightbulb, Pencil, Image, BookOpen, Store, MapPin, Plus, Clock3, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';

type VisionArea = 'discoveries'|'board'|'possibilities'|'allowance';
type Idea = {id:number; title:string; detail:string; origin:string; saved:boolean};
const seed: Idea[] = [
 {id:1,title:'Start small, expand later',detail:'Explore a first productive workshop area while preserving room for growth.',origin:'Exploration suggestion',saved:false},
 {id:2,title:'Compare construction methods',detail:'Consider a phased foundation and alternative materials before choosing suppliers.',origin:'Exploration suggestion',saved:false},
];
export function LivingVisionPanel() {
 const [area,setArea]=useState<VisionArea>('discoveries');
 const [ideas,setIdeas]=useState<Idea[]>(seed);
 const [note,setNote]=useState('');
 const [freeLimit,setFreeLimit]=useState(false);
 const [cards,setCards]=useState(['What could the workshop make?']);
 const [picked,setPicked]=useState<string[]>([]);
 function saveIdea(id:number){setIdeas(items=>items.map(i=>i.id===id?{...i,saved:!i.saved}:i));}
 function addNote(){const value=note.trim();if(!value)return;setCards(items=>[...items,value]);setNote('');}
 return <div className="sp-brand-vision space-y-4" data-living-vision-preview>
  <div className="flex items-start justify-between gap-2"><div><p className="text-xs uppercase tracking-wider text-sand-600">My Living Vision</p><h2 className="mt-2 font-display text-xl">My workshop dream</h2></div><span className="rounded-full bg-cream-100 px-3 py-1 text-xs">Exploring</span></div>
  <p className="text-sm leading-6 text-sand-700">Make space for ideas. Nothing here becomes an Agreement unless you choose to bring it into My Work.</p>
  <div role="tablist" aria-label="Vision sections" className="flex flex-wrap gap-1">
   {([['discoveries','Discoveries'],['board','My Board'],['possibilities','Possibilities'],['allowance','Explore freely']] as const).map(([id,label])=><button key={id} role="tab" aria-selected={area===id} onClick={()=>setArea(id)} className={`min-h-11 rounded-lg px-3 text-xs ${area===id?'bg-forest-800 text-white':'bg-cream-100'}`}>{label}</button>)}
  </div>
  {area==='discoveries'&&<section className="space-y-3">
   <div className="flex items-center gap-2 text-sm font-semibold"><Lightbulb size={17}/> Light-bulb moments</div>
   <p className="text-xs text-sand-600">Ideas suggested for consideration—not verified research or decisions.</p>
   {ideas.map(i=><article key={i.id} className="rounded-xl border border-cream-200 p-4"><h3 className="text-sm font-semibold">{i.title}</h3><p className="mt-2 text-sm leading-6 text-sand-700">{i.detail}</p><p className="mt-2 text-xs text-sand-600">{i.origin}</p><button className="mt-2 min-h-11 rounded-lg bg-cream-100 px-3 text-xs" onClick={()=>saveIdea(i.id)}>{i.saved?'✓ Saved to Vision':'Save this possibility'}</button></article>)}
  </section>}
  {area==='board'&&<section className="space-y-3">
   <p className="text-xs text-sand-600">A lightweight idea board. Future creative tools will add drawing, photographs, arrows, sketches and references.</p>
   <div className="grid grid-cols-2 gap-2">{cards.map((card,i)=><div key={i} className="min-h-28 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm shadow-sm">{card}</div>)}{ideas.filter(i=>i.saved).map(i=><div key={'idea'+i.id} className="min-h-28 rounded-xl border border-cream-200 bg-cream-100 p-3 text-sm">{i.title}</div>)}</div>
   <label htmlFor="vision-note" className="block text-xs font-semibold">Add your thought</label>
   <textarea id="vision-note" value={note} onChange={e=>setNote(e.target.value)} placeholder="An idea, question or note…" rows={3} className="w-full rounded-xl border border-cream-200 bg-white p-3 text-sm"/>
   <button onClick={addNote} disabled={!note.trim()} className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm text-white disabled:opacity-40"><Plus size={15} className="mr-1 inline"/>Add to board</button>
  </section>}
  {area==='possibilities'&&<section className="space-y-3"><p className="text-sm font-semibold">Paths worth exploring</p>
   {[
    {title:'Visit a working workshop',icon:MapPin,detail:'Learn from the layout and day-to-day practical needs.'},
    {title:'Explore equipment and suppliers',icon:Store,detail:'Compare options without implying real price verification.'},
    {title:'Learn from a Master',icon:BookOpen,detail:'Ask about materials, tools, skills and phased construction.'},
    {title:'Try sketching a layout',icon:Pencil,detail:'Explore possibilities visually before committing to a design.'},
    {title:'Collect inspiration photos',icon:Image,detail:'Keep reference imagery and the ideas it inspires together.'},
   ].map(item=><button key={item.title} onClick={()=>setPicked(items=>items.includes(item.title)?items.filter(x=>x!==item.title):[...items,item.title])} className="flex min-h-14 w-full items-start gap-3 rounded-xl border border-cream-200 p-3 text-left"><item.icon className="mt-1 shrink-0" size={18}/><span><span className="block text-sm font-semibold">{item.title} {picked.includes(item.title)?'✓':''}</span><span className="mt-1 block text-xs text-sand-700">{item.detail}</span></span></button>)}
   <p className="text-xs text-sand-600">{picked.length} possibilities marked for exploration. These are not purchases or bookings.</p>
  </section>}
  {area==='allowance'&&<section className="space-y-3">
   <div className="rounded-xl bg-cream-100 p-4"><div className="flex gap-2 text-sm font-semibold"><Sparkles size={17}/> A generous space to dream</div><p className="mt-2 text-sm">Explore naturally. SecurePay measures resource-intensive intelligence behind the scenes rather than charging for every message or minute.</p></div>
   {!freeLimit?<p className="text-sm text-sand-700">Free exploration is available in this preview.</p>:<div role="status" className="rounded-xl border border-cream-200 p-4"><div className="flex items-center gap-2 font-semibold"><Clock3 size={18}/> Your exploration is resting</div><p className="mt-2 text-sm">Your Vision stays saved and readable. Continue for free after your allowance refreshes, or choose paid continuation once pricing is available.</p><p className="mt-2 text-xs text-sand-600">My Work and free Agreement drafting remain available.</p></div>}
   <button className="min-h-11 rounded-xl bg-cream-100 px-4 text-sm" onClick={()=>setFreeLimit(v=>!v)}>{freeLimit?'Return to normal preview':'Preview allowance exhausted'}</button>
   <div className="flex items-start gap-2 text-xs text-sand-600"><ShieldCheck size={17}/> No payment is taken or allowance consumed by this demonstration.</div>
  </section>}
  <div className="rounded-xl border border-cream-200 p-3"><p className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 size={16}/> Your work stays yours</p><p className="mt-2 text-xs text-sand-700">Only the ideas you select should move into a Circle or proposed Agreement, subject to explicit permission. No automatic commitments.</p></div>
 </div>;
}
