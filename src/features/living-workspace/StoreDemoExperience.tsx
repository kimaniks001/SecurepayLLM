import { useState } from 'react';
import { StorePhoto, type StoreImage } from './StorePhotoViewer';
import { StoreHumanHelp } from './StoreHumanHelp';
import { StoreBuyingPlan, addStoreBuyingLine, emptyStoreBuyingPlan, MAX_STORE_PLAN_LINES, type StoreBuyingLine } from './StoreBuyingPlan';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardList, FileText, Handshake, HeartHandshake, Images, MapPin, Plus, Store, Users } from 'lucide-react';

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
 jobs:[{title:'Deliveries completed',image:photo('photo-1601584115197-04ecc0da31d7')},{title:'Loading arrangements',image:photo('photo-1586191582151-f73872dfd183')}]},
 {id:'schoolchairs',name:'Sample School Furnishings',trade:'Event chairs',place:'Location not confirmed',cover:photo('photo-1503602642458-232111445657'),offers:[
  {id:'chairs-delivered',name:'Stacking chairs',kind:'PRODUCT',price:'Sample KES 250 per chair',image:photo('photo-1503602642458-232111445657'),description:'Local transport described as included, but delivery area, quantity and stock still need confirmation.',availability:'Stock not verified'}],jobs:[]},
 {id:'eventchairs',name:'Example Event Seating',trade:'Chairs for events',place:'Location not confirmed',cover:'',offers:[
  {id:'chairs-ex-transport',name:'Event chairs',kind:'PRODUCT',price:'Sample KES 210 per chair',image:'',description:'Transport cost NOT stated. Lower unit price does not establish lower delivered cost.',availability:'Stock not verified'}],jobs:[]}];
const allOffers=samples.flatMap(store=>store.offers.map(offer=>({store,offer})));
const sampleSeller=samples[0];
type View='buyer'|'seller'|'together';
const sectionLabels={buyer:'Find good work',seller:'Manage your Store',together:'Build together'};
function Photo({src,title,className='',gallery}:{src:string;title:string;className?:string;gallery?:StoreImage[]}){
 const images=gallery??[{src:src||null,title}];
 const index=Math.max(0,images.findIndex(item=>item.src===src&&item.title===title));
 return <StorePhoto images={images} index={index} className={className} sample/>;
}
function SampleBadge(){return <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-900">SAMPLE · NOT A REAL STORE</span>;}
export function StoreDemoExperience({onLocalProposal,initialSearch='',initialAssistance}:{onLocalProposal?:(text:string)=>void;initialSearch?:string;initialAssistance?:'plug'|'master'|null}={}){
 const [view,setView]=useState<View>(initialAssistance?'together':'buyer');
 const [filter,setFilter]=useState<'ALL'|'PRODUCT'|'SERVICE'|'CAPACITY'>('ALL');
 const [search,setSearch]=useState(initialSearch);
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
 const [buyingLines,setBuyingLines]=useState<StoreBuyingLine[]>([]);
 const [buyingDraft,setBuyingDraft]=useState({...emptyStoreBuyingPlan});
 const [buyingActive,setBuyingActive]=useState(false);
 const [practiceReady,setPracticeReady]=useState(false);
 const [planLimit,setPlanLimit]=useState(false);
 const [considered,setConsidered]=useState<Array<{store:DemoStore;offer:DemoOffer}>>([]);
 const [comparisonOpen,setComparisonOpen]=useState(false);

 const matched=allOffers.filter(item=>(filter==='ALL'||item.offer.kind===filter)&&
   (!search.trim()||[item.offer.name,item.offer.description,item.store.name,item.store.trade].join(' ').toLowerCase().includes(search.toLowerCase())));
 const openSample=(store:DemoStore,offer:DemoOffer)=>{setSelected({store,offer});setAnswer('');};
 const isConsidered=(store:DemoStore,offer:DemoOffer)=>considered.some(x=>x.store.id===store.id&&x.offer.id===offer.id);
 const toggleConsider=(store:DemoStore,offer:DemoOffer)=>{
   setConsidered(current=>current.some(x=>x.store.id===store.id&&x.offer.id===offer.id)
     ?current.filter(x=>!(x.store.id===store.id&&x.offer.id===offer.id))
     :[...current,{store,offer}].slice(-5));
   setComparisonOpen(true);
 };
 const propose=(store:DemoStore,offer:DemoOffer)=>{
   onLocalProposal?.('Store offer: '+offer.name+' — offered by '+store.name+' (illustrative source '+store.id+'/'+offer.id+'). '+offer.price+'. '+offer.description+' Stock, identity, final location, quantity, delivery cost and seller consent remain unverified. Proposed for discussion only; no purchase or acceptance.');
 };
 const addToPlan=(store:DemoStore,offer:DemoOffer)=>{
  if(buyingLines.length>=MAX_STORE_PLAN_LINES&&!buyingLines.some(line=>line.key==='sample:'+store.id+':'+offer.id)){setPlanLimit(true);return;}
  setPlanLimit(false);
  setBuyingLines(current=>addStoreBuyingLine(current,{
    key:'sample:'+store.id+':'+offer.id,storeName:store.name,storeKsNumber:null,originPlace:store.place,
    offerId:offer.id,title:offer.name,kind:offer.kind,priceLabel:offer.price,currency:'KES',
  }));
  setBuyingActive(true);setPracticeReady(false);setSelected(null);
 };

 const swapView=(next:View)=>{setView(next);setSelected(null);setSelectedStore(null);};
 return <section aria-label="Sample Store experience" className="space-y-3 text-sm">
  <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-base">{sectionLabels[view]}</strong><SampleBadge/></div>
  <p className="text-xs text-sand-600">Explore made-up traders and illustrative prices. Everything here is local to this preview—no real offers, Agreements or money.</p>
  <div role="group" aria-label="Sample Store viewpoint" className="grid grid-cols-3 gap-1 rounded-xl bg-cream-100 p-1">
   {([{id:'buyer',label:'Buyer'},{id:'seller',label:'Seller'},{id:'together',label:'Together'}] as const).map(item=><button type="button" key={item.id} onClick={()=>swapView(item.id)} className={view===item.id?'min-h-10 rounded-lg bg-white px-2 text-xs font-semibold shadow-sm':'min-h-10 rounded-lg px-2 text-xs'}>{item.label}</button>)}
  </div>
  {planLimit&&view==='buyer'&&<p role="alert" className="rounded-lg bg-amber-50 p-2 text-xs">This preview supports up to {MAX_STORE_PLAN_LINES} distinct offers in one KS001 handoff. Review your plan before adding more.</p>}
  {view==='buyer'&&<div className={buyingLines.length&&buyingActive?'grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.95fr)]':'space-y-3'}>
   <div className="min-w-0 space-y-3">
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
       <Photo src={offer.image} title={offer.name} gallery={selectedStore.offers.map(x=>({src:x.image,title:x.name}))} className="aspect-[4/3] w-full rounded-lg"/>
       <p className="font-semibold">{offer.name}</p><p className="text-xs">{offer.price}</p>
       <button type="button" onClick={()=>addToPlan(selectedStore,offer)} className="min-h-11 w-full rounded-lg bg-forest-800 px-2 text-xs font-semibold text-white">Add to buying plan</button>
       <button type="button" onClick={()=>onLocalProposal?propose(selectedStore,offer):openSample(selectedStore,offer)} className="min-h-11 w-full rounded-lg border border-cream-200 px-2 text-xs font-semibold">{onLocalProposal?"Propose in My Work":"Take to KS001"}</button>
        <button type="button" aria-pressed={isConsidered(selectedStore,offer)} onClick={()=>toggleConsider(selectedStore,offer)} className="min-h-10 w-full rounded-lg border border-cream-200 px-2 text-xs">Consider for comparison</button>
      </div>)}</div>
      <p className="font-semibold">Completed work · sample gallery</p>
      <div className="grid grid-cols-3 gap-2">{selectedStore.jobs.map(job=><div key={job.title}><Photo src={job.image} title={job.title} gallery={selectedStore.jobs.map(x=>({src:x.image,title:x.title}))} className="aspect-square w-full rounded-lg"/><p className="mt-1 text-[11px]">{job.title}</p></div>)}</div>
    </div>:<>
     <div className="relative"><input aria-label="Search sample Stores" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Try tiles, delivery, furniture…" maxLength={100} className="min-h-11 w-full rounded-xl border border-cream-200 bg-white pl-9 pr-3 text-sm"/><span className="pointer-events-none absolute left-3 top-3 text-sand-500"><Store size={17}/></span></div>
     <div className="flex flex-wrap gap-2">{(['ALL','PRODUCT','SERVICE','CAPACITY'] as const).map(kind=><button key={kind} type="button" onClick={()=>setFilter(kind)} className={filter===kind?'rounded-full bg-forest-800 px-3 py-2 text-xs text-white':'rounded-full border border-cream-200 px-3 py-2 text-xs'}>{kind==='ALL'?'All':kind==='CAPACITY'?'Capacity':kind==='PRODUCT'?'Products':'Services'}</button>)}</div>
     <p className="text-xs font-semibold">Explore {samples.length} sample Stores</p>
     <div className="grid grid-cols-2 gap-2">{samples.map(store=><article key={store.id} className="overflow-hidden rounded-xl border border-cream-200 bg-white text-left">
       <Photo src={store.cover} title={store.name} className="aspect-[4/3] w-full"/>
       <button type="button" onClick={()=>setSelectedStore(store)} className="min-h-11 w-full p-2 text-left"><p className="font-semibold">{store.name}</p><p className="mt-0.5 text-xs text-sand-600">{store.trade} · {store.place}</p></button>
     </article>)}</div>
     <p className="text-xs font-semibold">Offers you can try ({matched.length})</p>
      <p className="text-xs text-sand-600">Viewed is not considered. Considered is not proposed. Nothing is accepted by browsing.</p>
      {considered.length>0&&<section data-phase4-comparison aria-label="Compare considered offers" className="space-y-2 rounded-xl border border-cream-200 bg-[#f7f9f3] p-3">
       <button type="button" aria-expanded={comparisonOpen} onClick={()=>setComparisonOpen(v=>!v)} className="min-h-10 text-left text-xs font-semibold">
        Compare considered offers ({considered.length}) {comparisonOpen?'▴':'▾'}
       </button>
       {comparisonOpen&&<div className="grid grid-cols-2 gap-2">
        {considered.map(({store,offer})=><article key={store.id+'-'+offer.id} className="space-y-1 rounded-lg bg-white p-2 text-xs">
         <Photo src={offer.image} title={offer.name} gallery={considered.map(x=>({src:x.offer.image,title:x.offer.name}))} className="aspect-[4/3] w-full rounded-lg"/><strong>{offer.name}</strong><p>{store.name}</p><p>{offer.price}</p>
         <p className="text-sand-600">{offer.description}</p><p className="text-sand-600">{offer.availability}</p>
         {onLocalProposal&&<button type="button" onClick={()=>propose(store,offer)} className="min-h-10 rounded-lg border border-cream-200 px-2 text-xs font-semibold">Propose in My Work</button>}
        </article>)}
        {considered.length===1&&<p className="self-center text-xs text-sand-600">Consider another option to compare.</p>}
       </div>}
       <p className="text-xs text-sand-700">Sample offers only. Delivery inclusions can differ and missing costs stay unknown. No reservation or payment.</p>
      </section>}
     {matched.length===0&&<p className="rounded-lg bg-cream-50 p-3 text-xs">No sample offers match your search.</p>}
     <div className="grid grid-cols-2 gap-2">{matched.map(({store,offer})=><article key={store.id+'-'+offer.id} className="space-y-2 rounded-xl border border-cream-200 bg-white p-2">
      <Photo src={offer.image} title={offer.name} className="aspect-[4/3] rounded-lg"/>
      <div><p className="font-semibold">{offer.name}</p><p className="text-xs text-sand-600">{store.name}</p><p className="mt-1 text-xs font-semibold">{offer.price}</p></div>
      <button type="button" onClick={()=>addToPlan(store,offer)} className="min-h-11 w-full rounded-lg bg-forest-800 px-2 text-xs font-semibold text-white">Add to buying plan</button>
      <button type="button" onClick={()=>onLocalProposal?propose(store,offer):openSample(store,offer)} className="min-h-11 w-full rounded-lg border border-cream-200 px-2 text-xs font-semibold">{onLocalProposal?'Propose in My Work':'Take to KS001'}</button>
       <button type="button" aria-pressed={isConsidered(store,offer)} onClick={()=>toggleConsider(store,offer)} className="min-h-10 w-full rounded-lg border border-cream-200 px-2 text-xs font-semibold">{isConsidered(store,offer)?'Remove from considered':'Consider for comparison'}</button>
     </article>)}</div>
    </>}
   </>}
   </div>
   {buyingLines.length>0&&buyingActive&&<StoreBuyingPlan
     sample lines={buyingLines} draft={buyingDraft} onLines={setBuyingLines} onDraft={setBuyingDraft}
     onBack={()=>{setBuyingActive(false);setSelected(null);}}
     onPrepare={()=>setPracticeReady(true)}/>}
   {buyingLines.length>0&&!buyingActive&&<button type="button" onClick={()=>setBuyingActive(true)}
     className="min-h-11 rounded-full border border-forest-200 bg-cream-50 px-3 text-xs font-semibold">Review buying plan · {buyingLines.length} items</button>}
   {practiceReady&&<p role="status" className="rounded-lg bg-cream-50 p-2 text-xs">Your sample buying plan is ready for practice. No real sellers have been contacted.</p>}
  </div>}
  {view==='seller'&&<div className="space-y-3"><StoreHumanHelp owner onPropose={onLocalProposal}/>
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
  {view==='together'&&<div className="space-y-3"><StoreHumanHelp initial={initialAssistance??'plug'} onPropose={onLocalProposal}/>
    <div data-phase4-human-help className="space-y-2 rounded-xl border border-cream-200 bg-white p-3">
       <h3 className="text-sm font-semibold">Get help from capable people</h3>
       <p className="text-xs leading-5 text-sand-700">A Plug can coordinate or check practical work. A Master can advise, review difficult terms or mentor. No person, rate, location, qualification or availability is verified here.</p>
       <div className="grid grid-cols-2 gap-2">
        <button type="button" className="min-h-11 rounded-xl bg-cream-100 px-2 text-xs font-semibold" onClick={()=>onLocalProposal?.('Assistance: Find an authorised Plug for delivery coordination or evidence checking. Need scope, service area, training evidence, availability, rate and consent; nobody contacted or assigned.')}>Ask for a Plug</button>
        <button type="button" className="min-h-11 rounded-xl bg-cream-100 px-2 text-xs font-semibold" onClick={()=>onLocalProposal?.('Assistance: Request a Master for experienced advice or milestone review. Need scope, consent, qualifications, availability and fee; no private records shared or engagement confirmed.')}>Ask for a Master</button>
       </div>
       <p className="text-xs text-sand-600">Local proposals only, not invitations, certified matches, appointments or confirmations.</p>
     </div>
     <div className="overflow-hidden rounded-xl border border-cream-200"><Photo src={samples[0].cover} title="Example joint renovation" className="aspect-[16/8]"/><div className="p-3"><strong>One job, several people</strong><p className="mt-1 text-xs text-sand-600">Example: renovate a bathroom, supply tiles and coordinate delivery.</p></div></div>
    <div className="grid grid-cols-3 gap-2">{[{role:'Buyer',name:'Needs tiling'},{role:'Seller',name:'Supplies the work'},{role:'Plug',name:'Coordinates'}].map(person=><div key={person.role} className="rounded-xl border border-cream-200 bg-white p-2 text-center"><Users size={18} className="mx-auto"/><p className="mt-1 text-xs font-semibold">{person.role}</p><p className="mt-1 text-[11px] text-sand-600">{person.name}</p></div>)}</div>
    <button type="button" onClick={()=>setSaver(v=>!v)} aria-expanded={saver} className="min-h-11 w-full rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white">{saver?'Close Saver example':'Explore Community Saver'}</button>
    {saver&&<div className="space-y-2 rounded-xl bg-cream-50 p-3"><strong>Is there a genuine saving?</strong><p className="text-xs">KS001 can compare separate delivery against shared delivery, but a Plug must verify feasibility, evidence, consent and the actual benefit to buyer, seller and Plug.</p><p className="text-xs font-semibold">Savings: not verified · Distribution: not agreed</p><p className="text-xs text-sand-600">No Community Saver or payout is created by this example.</p></div>}
    <div className="rounded-xl border border-cream-200 p-3"><strong>Ready for real community</strong><p className="mt-1 text-xs text-sand-600">Community projects, local skills, apprenticeships and Store cooperation belong here. Actual participation follows Trust Project membership, organiser authority and the person's consent.</p></div>
  </div>}
 </section>;
}
