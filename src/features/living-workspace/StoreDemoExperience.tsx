import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Camera, Check, ClipboardList, FileText, Handshake, HeartHandshake, Images, MapPin, Plus, Send, Store, Users } from 'lucide-react';

/**
 * Preview-only sample Stores. Illustrative names, images, offers, prices and people.
 * No API, payment, identity, persisted storage, verified location or Agreement mutation.
 */
type DemoOffer={id:string;name:string;kind:'PRODUCT'|'SERVICE'|'CAPACITY';price:string;image:string;description:string;availability:string};
type DemoStore={id:string;name:string;trade:string;place:string;cover:string;offers:DemoOffer[];jobs:{title:string;image:string}[]};
const photo=(id:string,width=800)=>'https://images.unsplash.com/'+id+'?auto=format&fit=crop&w='+width+'&q=80';
const samples:DemoStore[]=[
 {id:'interiors',name:'Jenga Interiors',trade:'Tiling & renovations',place:'Nairobi',cover:photo('photo-1600607687920-4e2a09cf159d'),offers:[
  {id:'tiling',name:'Bathroom tiling labour',kind:'SERVICE',price:'From KES 35,000',image:photo('photo-1600566753190-17f0baa2a6c3'),description:'Walls and floors. Materials and exact measurements quoted separately.',availability:'Taking enquiries'},
  {id:'measurement',name:'Site measurement visit',kind:'SERVICE',price:'KES 2,500',image:photo('photo-1600585154340-be6161a56a0c'),description:'A proposed site visit to assess renovation measurements.',availability:'By appointment'},
  {id:'finishing',name:'Interior finishing',kind:'SERVICE',price:'Quotation',image:photo('photo-1600607687939-ce8a6c25118c'),description:'Finishing works for small homes and offices.',availability:'Taking enquiries'}],
 jobs:[{title:'Bathroom finish',image:photo('photo-1600566753086-00f18fb6b3ea')},{title:'Kitchen makeover',image:photo('photo-1600607688969-a5bfcd646154')},{title:'Tiled living room',image:photo('photo-1600607687920-4e2a09cf159d')}]},
 {id:'materials',name:'Mavuno Building Supplies',trade:'Building materials',place:'Nairobi',cover:photo('photo-1541888946425-d81bb19240f5'),offers:[
  {id:'tiles',name:'Porcelain floor tiles',kind:'PRODUCT',price:'KES 1,850 / m²',image:photo('photo-1600566752355-35792bedcfea'),description:'Illustrative tile pricing; stock and sizes require confirmation.',availability:'Stock to confirm'},
  {id:'cement',name:'Cement bags',kind:'PRODUCT',price:'KES 780 / bag',image:photo('photo-1504307651254-35680f356dfd'),description:'Example building-material supply for a renovation.',availability:'Stock to confirm'},
  {id:'plumbing',name:'Bathroom fittings',kind:'PRODUCT',price:'Quotation',image:photo('photo-1552321554-5fefe8c9ef14'),description:'Sample taps, fittings and accessories.',availability:'Ask for availability'}],
 jobs:[{title:'Materials display',image:photo('photo-1600566753086-00f18fb6b3ea')},{title:'Project materials',image:photo('photo-1504307651254-35680f356dfd')}]},
 {id:'wood',name:'Kijiji Woodworks',trade:'Furniture & cabinetry',place:'Kiambu & Nairobi',cover:photo('photo-1531835551805-16d864c8d311'),offers:[
  {id:'desk',name:'Custom work desk',kind:'PRODUCT',price:'From KES 18,000',image:photo('photo-1497366811353-6870744d04b2'),description:'Choose size, timber finish and delivery location.',availability:'Made to order'},
  {id:'shelves',name:'Fitted shelves',kind:'SERVICE',price:'Quotation',image:photo('photo-1594620302200-9a762244a156'),description:'Design, make and fit shelves to supplied measurements.',availability:'Taking enquiries'},
  {id:'team',name:'Carpentry team availability',kind:'CAPACITY',price:'Quotation',image:photo('photo-1504148455328-c376907d081c'),description:'Example team capacity for a scheduled installation.',availability:'Date to agree'}],
 jobs:[{title:'Desk installation',image:photo('photo-1497366811353-6870744d04b2')},{title:'Fitted interiors',image:photo('photo-1600210492486-724fe5c67fb0')}]},
 {id:'delivery',name:'Karibu Delivery Crew',trade:'Delivery & transport',place:'Nairobi metropolitan',cover:photo('photo-1601584115197-04ecc0da31d7'),offers:[
  {id:'pickup',name:'Local pickup and delivery',kind:'SERVICE',price:'From KES 2,000',image:photo('photo-1601584115197-04ecc0da31d7'),description:'Illustrative city delivery; weight, entrance and route must be confirmed.',availability:'Schedule to confirm'},
  {id:'truck',name:'Light truck capacity',kind:'CAPACITY',price:'Quotation',image:photo('photo-1586191582151-f73872dfd183'),description:'Shared loading and delivery slot subject to driver availability.',availability:'Ask for a slot'}],
 jobs:[{title:'Deliveries completed',image:photo('photo-1601584115197-04ecc0da31d7')},{title:'Loading arrangements',image:photo('photo-1586191582151-f73872dfd183')}]}];
const allOffers=samples.flatMap(store=>store.offers.map(offer=>({store,offer})));
const sampleSeller=samples[0];
type View='buyer'|'seller'|'together';
const sectionLabels={buyer:'Find good work',seller:'Manage your Store',together:'Build together'};
function Photo({src,title,className=''}:{src:string;title:string;className?:string}){
 const [failed,setFailed]=useState(false);
 return <div className={'relative overflow-hidden bg-gradient-to-br from-cream-100 via-cream-200 to-forest-100 '+className}>
  {!failed?<img src={src} alt={'Illustrative photo: '+title} loading="lazy" className="h-full w-full object-cover" onError={()=>setFailed(true)}/>:<span className="flex h-full items-center justify-center gap-2 text-xs text-sand-600"><Images size={20}/> {title}</span>}
  <span className="absolute bottom-1 right-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] text-forest-900">SAMPLE PHOTO</span>
 </div>;
}
function SampleBadge(){return <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-900">SAMPLE · NOT A REAL STORE</span>;}
export function StoreDemoExperience(){
 const [view,setView]=useState<View>('buyer');
 const [filter,setFilter]=useState<'ALL'|'PRODUCT'|'SERVICE'|'CAPACITY'>('ALL');
 const [search,setSearch]=useState('');
 const [selectedStore,setSelectedStore]=useState<DemoStore|null>(null);
 const [selected,setSelected]=useState<{store:DemoStore;offer:DemoOffer}|null>(null);
 const [answer,setAnswer]=useState('');
 const [sellerAction,setSellerAction]=useState('decisions');
 const [resolved,setResolved]=useState(false);
 const [sampleOffer,setSampleOffer]=useState(false);
 const [draftName,setDraftName]=useState('');
 const [draftPrice,setDraftPrice]=useState('');
 const [drafts,setDrafts]=useState<{name:string;price:string}[]>([]);
 const [saver,setSaver]=useState(false);
 const matched=allOffers.filter(item=>(filter==='ALL'||item.offer.kind===filter)&&
   (!search.trim()||[item.offer.name,item.offer.description,item.store.name,item.store.trade].join(' ').toLowerCase().includes(search.toLowerCase())));
 const openSample=(store:DemoStore,offer:DemoOffer)=>{setSelected({store,offer});setAnswer('');};
 const swapView=(next:View)=>{setView(next);setSelected(null);setSelectedStore(null);};
 return <section aria-label="Sample Store experience" className="space-y-3 text-sm">
  <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-base">{sectionLabels[view]}</strong><SampleBadge/></div>
  <p className="text-xs text-sand-600">Explore made-up traders and illustrative prices. Everything here is local to this preview—no real offers, Agreements or money.</p>
  <div role="group" aria-label="Sample Store viewpoint" className="grid grid-cols-3 gap-1 rounded-xl bg-cream-100 p-1">
   {([{id:'buyer',label:'Buyer'},{id:'seller',label:'Seller'},{id:'together',label:'Together'}] as const).map(item=><button type="button" key={item.id} onClick={()=>swapView(item.id)} className={view===item.id?'min-h-10 rounded-lg bg-white px-2 text-xs font-semibold shadow-sm':'min-h-10 rounded-lg px-2 text-xs'}>{item.label}</button>)}
  </div>
  {view==='buyer'&&<>
   {selected&&<div className="space-y-3 rounded-xl border border-forest-200 bg-white p-3" aria-label="Sample KS001 handoff">
     <button type="button" onClick={()=>setSelected(null)} className="inline-flex min-h-9 items-center gap-1 text-xs"><ArrowLeft size={14}/> Back to sample Store</button>
     <div className="flex items-center justify-between gap-2"><strong>KS001 · Practice conversation</strong><SampleBadge/></div>
     <div className="grid grid-cols-[88px_1fr] gap-3"><Photo src={selected.offer.image} title={selected.offer.name} className="aspect-square rounded-lg"/>
      <div><p className="font-semibold">{selected.offer.name}</p><p className="text-xs">{selected.offer.price}</p><p className="text-xs text-sand-600">{selected.store.name}</p></div></div>
     <div className="rounded-xl bg-cream-50 p-3">
      <p className="text-xs font-semibold text-sand-600">KS001 · Example reply, not a live model response</p>
      <p className="mt-1">You chose {selected.offer.name.toLowerCase()}. This is a sample offer, so we can explore it but not place an order.</p>
      <p className="mt-2 font-semibold">What would you like to do?</p>
      <div className="mt-2 flex flex-wrap gap-2">{['Compare options','Request a quotation','Plan an Agreement'].map(choice=><button type="button" key={choice} onClick={()=>setAnswer(choice)} className={answer===choice?'rounded-full bg-forest-800 px-3 py-2 text-xs text-white':'rounded-full border border-cream-200 bg-white px-3 py-2 text-xs'}>{choice}</button>)}</div>
      {answer&&<p className="mt-3 border-t border-cream-200 pt-2 text-xs">
       {answer==='Compare options'?'Next, compare scope, quality, delivery and total price against another real offer.':
        answer==='Request a quotation'?'Next, confirm quantity, specification, location and delivery date before asking the seller to quote.':
        'Next, clarify who is buying, what will be supplied, the agreed price and acceptance conditions. This sample does not create an Agreement.'}</p>}
     </div>
   </div>}
   {!selected&&<>
    {selectedStore?<div className="space-y-3">
      <button type="button" className="inline-flex min-h-10 items-center gap-1 text-xs" onClick={()=>setSelectedStore(null)}><ArrowLeft size={14}/> All sample Stores</button>
      <Photo src={selectedStore.cover} title={selectedStore.trade} className="aspect-[16/8] rounded-xl"/>
      <h3 className="text-lg font-semibold">{selectedStore.name}</h3>
      <p className="text-xs text-sand-600"><MapPin size={13} className="inline"/> {selectedStore.place} · {selectedStore.trade}</p>
      <p className="font-semibold">Offers</p>
      <div className="grid grid-cols-2 gap-2">{selectedStore.offers.map(offer=><div key={offer.id} className="space-y-1 rounded-xl border border-cream-200 p-2">
       <Photo src={offer.image} title={offer.name} className="aspect-[4/3] rounded-lg"/>
       <p className="font-semibold">{offer.name}</p><p className="text-xs">{offer.price}</p>
       <button type="button" onClick={()=>openSample(selectedStore,offer)} className="min-h-10 w-full rounded-lg bg-forest-800 px-2 text-xs font-semibold text-white">Take to KS001</button>
      </div>)}</div>
      <p className="font-semibold">Completed work · sample gallery</p>
      <div className="grid grid-cols-3 gap-2">{selectedStore.jobs.map(job=><div key={job.title}><Photo src={job.image} title={job.title} className="aspect-square rounded-lg"/><p className="mt-1 text-[11px]">{job.title}</p></div>)}</div>
    </div>:<>
     <div className="relative"><input aria-label="Search sample Stores" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Try tiles, delivery, furniture…" maxLength={100} className="min-h-11 w-full rounded-xl border border-cream-200 bg-white pl-9 pr-3 text-sm"/><span className="pointer-events-none absolute left-3 top-3 text-sand-500"><Store size={17}/></span></div>
     <div className="flex flex-wrap gap-2">{(['ALL','PRODUCT','SERVICE','CAPACITY'] as const).map(kind=><button key={kind} type="button" onClick={()=>setFilter(kind)} className={filter===kind?'rounded-full bg-forest-800 px-3 py-2 text-xs text-white':'rounded-full border border-cream-200 px-3 py-2 text-xs'}>{kind==='ALL'?'All':kind==='CAPACITY'?'Capacity':kind==='PRODUCT'?'Products':'Services'}</button>)}</div>
     <p className="text-xs font-semibold">Explore {samples.length} sample Stores</p>
     <div className="grid grid-cols-2 gap-2">{samples.map(store=><button type="button" key={store.id} onClick={()=>setSelectedStore(store)} className="overflow-hidden rounded-xl border border-cream-200 bg-white text-left">
       <Photo src={store.cover} title={store.name} className="aspect-[4/3]"/>
       <div className="p-2"><p className="font-semibold">{store.name}</p><p className="mt-0.5 text-xs text-sand-600">{store.trade} · {store.place}</p></div>
     </button>)}</div>
     <p className="text-xs font-semibold">Offers you can try ({matched.length})</p>
     {matched.length===0&&<p className="rounded-lg bg-cream-50 p-3 text-xs">No sample offers match your search.</p>}
     <div className="grid grid-cols-2 gap-2">{matched.map(({store,offer})=><article key={store.id+'-'+offer.id} className="space-y-2 rounded-xl border border-cream-200 bg-white p-2">
      <Photo src={offer.image} title={offer.name} className="aspect-[4/3] rounded-lg"/>
      <div><p className="font-semibold">{offer.name}</p><p className="text-xs text-sand-600">{store.name}</p><p className="mt-1 text-xs font-semibold">{offer.price}</p></div>
      <button type="button" onClick={()=>openSample(store,offer)} className="min-h-11 w-full rounded-lg bg-forest-800 px-2 text-xs font-semibold text-white">Take to KS001</button>
     </article>)}</div>
    </>}
   </>}
  </>}
  {view==='seller'&&<div className="space-y-3">
   <div className="overflow-hidden rounded-xl border border-cream-200 bg-white">
    <Photo src={sampleSeller.cover} title="Sample Store gallery" className="aspect-[16/7]"/>
    <div className="p-3"><p className="font-semibold">{sampleSeller.name}</p><p className="text-xs text-sand-600">{sampleSeller.trade} · Sample seller workspace</p></div>
   </div>
   <div className="grid grid-cols-3 gap-2">{sampleSeller.jobs.map(job=><div key={job.title}><Photo src={job.image} title={job.title} className="aspect-square rounded-lg"/><p className="mt-1 text-[11px]">{job.title}</p></div>)}</div>
   <button type="button" onClick={()=>setSellerAction('decisions')} className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs"><span><strong>{resolved?'No urgent examples':'1 decision'}</strong> to handle now</span><ArrowRight size={16}/></button>
   <div className="grid grid-cols-2 gap-2">{[
    {id:'offers',label:'Offers',Icon:Plus},{id:'decisions',label:'Decisions',Icon:ClipboardList},
    {id:'quote',label:'Quotation',Icon:FileText},{id:'contract',label:'Quick Contract',Icon:Handshake},
    {id:'saver',label:'Community Saver',Icon:HeartHandshake},{id:'calendar',label:'Calendar & balance',Icon:CalendarDays}
   ].map(action=><button type="button" key={action.id} onClick={()=>setSellerAction(action.id)}
      className={sellerAction===action.id?'flex min-h-12 items-center gap-2 rounded-xl bg-forest-800 p-3 text-left text-xs font-semibold text-white':'flex min-h-12 items-center gap-2 rounded-xl border border-cream-200 p-3 text-left text-xs'}>
      <action.Icon size={16}/>{action.label}</button>)}</div>
   <div className="space-y-2 rounded-xl bg-cream-50 p-3">
    {sellerAction==='decisions'&&<><strong>Needs your decision</strong>
      {resolved?<p className="text-xs">You've handled the sample enquiry for now.</p>:<><p className="text-xs">A buyer asks whether you can start bathroom tiling next Tuesday.</p>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setResolved(true)} className="rounded-full bg-white px-3 py-2 text-xs"><Check size={13} className="mr-1 inline"/> Mark reviewed</button><button type="button" onClick={()=>setSellerAction('quote')} className="rounded-full bg-white px-3 py-2 text-xs">Prepare quote</button></div></>}</>}
    {sellerAction==='offers'&&<><strong>Offers · sample</strong>
      {sampleSeller.offers.map(offer=><p key={offer.id} className="text-xs">{offer.name} · {offer.price}</p>)}
      {drafts.map((draft,i)=><p key={i} className="text-xs">{draft.name} · {draft.price||'Ask for price'} · Local draft</p>)}
      <button type="button" onClick={()=>setSampleOffer(v=>!v)} className="rounded-full border border-cream-200 bg-white px-3 py-2 text-xs">{sampleOffer?'Close':'+ Draft an offer'}</button>
      {sampleOffer&&<div className="space-y-2"><input aria-label="Sample offer name" value={draftName} onChange={e=>setDraftName(e.target.value)} maxLength={90} placeholder="Offer name" className="min-h-10 w-full rounded-lg border border-cream-200 p-2 text-sm"/><input aria-label="Sample price" value={draftPrice} onChange={e=>setDraftPrice(e.target.value)} maxLength={45} placeholder="Price or quote required" className="min-h-10 w-full rounded-lg border border-cream-200 p-2 text-sm"/>
      <button type="button" disabled={!draftName.trim()} onClick={()=>{setDrafts(current=>[...current,{name:draftName.trim(),price:draftPrice.trim()}]);setDraftName('');setDraftPrice('');setSampleOffer(false);}} className="min-h-10 rounded-lg bg-forest-800 px-3 text-xs text-white disabled:opacity-40">Add local draft</button></div>}</>}
    {sellerAction==='quote'&&<><strong>Quotation</strong><p className="text-xs">Bathroom tiling — confirm area, labour, materials, location and dates before quoting.</p><p className="text-xs text-sand-600">Example only; no quotation sent.</p></>}
    {sellerAction==='contract'&&<><strong>Quick Contract</strong><p className="text-xs">Start with the agreed work, parties, price and completion evidence; each party must accept.</p></>}
    {sellerAction==='saver'&&<><strong>Community Saver</strong><p className="text-xs">Buyer + Seller + an authorised Plug. All three must understand the real savings and consent.</p><button type="button" onClick={()=>{setView('together');setSaver(true);}} className="min-h-10 rounded-full bg-white px-3 text-xs">Explore together <ArrowRight size={13} className="inline"/></button></>}
    {sellerAction==='calendar'&&<><strong>Schedule and life balance</strong><div className="flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-2 text-xs">Tue · Site visit</span><span className="rounded-full bg-white px-3 py-2 text-xs">Wed · Work</span><span className="rounded-full bg-white px-3 py-2 text-xs">Sun · Rest</span></div><p className="text-xs text-sand-600">Sample schedule; nothing booked.</p></>}
   </div>
  </div>}
  {view==='together'&&<div className="space-y-3">
    <div className="overflow-hidden rounded-xl border border-cream-200"><Photo src={samples[0].cover} title="Example joint renovation" className="aspect-[16/8]"/><div className="p-3"><strong>One job, several people</strong><p className="mt-1 text-xs text-sand-600">Example: renovate a bathroom, supply tiles and coordinate delivery.</p></div></div>
    <div className="grid grid-cols-3 gap-2">{[{role:'Buyer',name:'Needs tiling'},{role:'Seller',name:'Supplies the work'},{role:'Plug',name:'Coordinates'}].map(person=><div key={person.role} className="rounded-xl border border-cream-200 bg-white p-2 text-center"><Users size={18} className="mx-auto"/><p className="mt-1 text-xs font-semibold">{person.role}</p><p className="mt-1 text-[11px] text-sand-600">{person.name}</p></div>)}</div>
    <button type="button" onClick={()=>setSaver(v=>!v)} aria-expanded={saver} className="min-h-11 w-full rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white">{saver?'Close Saver example':'Explore Community Saver'}</button>
    {saver&&<div className="space-y-2 rounded-xl bg-cream-50 p-3"><strong>Is there a genuine saving?</strong><p className="text-xs">KS001 can compare separate delivery against shared delivery, but a Plug must verify feasibility, evidence, consent and the actual benefit to buyer, seller and Plug.</p><p className="text-xs font-semibold">Savings: not verified · Distribution: not agreed</p><p className="text-xs text-sand-600">No Community Saver or payout is created by this example.</p></div>}
    <div className="rounded-xl border border-cream-200 p-3"><strong>Ready for real community</strong><p className="mt-1 text-xs text-sand-600">Community projects, local skills, apprenticeships and Store cooperation belong here. Actual participation follows Trust Project membership, organiser authority and the person's consent.</p></div>
  </div>}
 </section>;
}
