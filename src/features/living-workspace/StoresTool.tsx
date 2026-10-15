import { useEffect, useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, CalendarDays, Camera, CheckCircle2, ChevronRight, FilePlus2, GalleryHorizontalEnd, Handshake, HeartHandshake, ImagePlus, ListChecks, MapPin, RefreshCw, Search, Store, Users } from 'lucide-react';
import type { PreviewWorkspaceGateways } from './previewWorkspaceGateways';
import type { OfferKind, PublicSearchResultView, PublicStoreView, StoreOfferResponse, StoreProfileResponse } from '../../api/securepay/store/dto';
import type { CurrentUserActionResponse } from '../../api/securepay/agreements/dto';
import type { CommunityProjectDto, CommunityServiceOpportunityDto } from '../../api/securepay/community/dto';
import { storeAgreementEntry } from '../experience/entryIntent';

type Area = 'buyer' | 'seller' | 'community';
type SellerAction = 'offers' | 'gallery' | 'decisions' | 'agreements' | 'quote' | 'contract' | 'saver' | 'calendar';
type ReadState<T>={status:'idle'|'loading'|'ready'|'error'; data:T; error:string|null};
const initial=<T,>(data:T):ReadState<T>=>({status:'idle',data,error:null});
const errorText='Could not load this from SecurePay. Try again.';
const titleCase=(value:string)=>value.replace(/_/g,' ').toLowerCase().replace(/^\w/,letter=>letter.toUpperCase());
const price=(minor:number|null,currency:string)=>minor===null?'Ask for price':currency+' '+(minor/100).toLocaleString('en-KE',{maximumFractionDigits:2});
const imageUrl=(refs:string[]):string|null=>{
  for(const ref of refs){
    try{const url=new URL(ref);if(url.protocol==='https:'&&url.origin==='https://securepay.ke')return ref;}catch{/* opaque media references are not URLs */}
  }
  return null;
};
const actions:{id:SellerAction;label:string;icon:typeof Store}[]=[
  {id:'offers',label:'Offers',icon:ImagePlus},
  {id:'gallery',label:'Jobs done',icon:GalleryHorizontalEnd},
  {id:'decisions',label:'Decisions',icon:ListChecks},
  {id:'agreements',label:'Agreements',icon:Handshake},
  {id:'quote',label:'Quotation',icon:FilePlus2},
  {id:'contract',label:'Quick Contract',icon:BriefcaseBusiness},
  {id:'saver',label:'Community Saver',icon:HeartHandshake},
  {id:'calendar',label:'Calendar & balance',icon:CalendarDays},
];

function OfferPhoto({refs,title}:{refs:string[];title:string}){
 const src=imageUrl(refs);
 return <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-cream-100">
  {src?<img src={src} alt={title} loading="lazy" className="h-full w-full object-cover"/>:<Store size={28} className="text-sand-400" aria-label="No verified photo available"/>}
 </div>;
}
function Status({text}:{text:string}){return <p role="status" className="rounded-xl bg-cream-50 p-3 text-xs text-sand-600">{text}</p>;}

export function StoresTool({onContinue,agreementNeeds=[],gateways,signedIn=false,onOpenPhoto}:{onContinue:(message:string)=>Promise<void>;agreementNeeds?:string[];gateways?:PreviewWorkspaceGateways;signedIn?:boolean;onOpenPhoto?:()=>void}){
 const [area,setArea]=useState<Area>('buyer');
 const [kind,setKind]=useState<OfferKind>('PRODUCT');
 const [query,setQuery]=useState('');
 const [location,setLocation]=useState('');
 const [search,setSearch]=useState<ReadState<PublicSearchResultView[]>>(initial([]));
 const [selectedStore,setSelectedStore]=useState<ReadState<PublicStoreView|null>>(initial(null));
 const [seller,setSeller]=useState<ReadState<{profile:StoreProfileResponse;offers:StoreOfferResponse[]} |null>>(initial(null));
 const [inbox,setInbox]=useState<ReadState<CurrentUserActionResponse[]>>(initial([]));
 const [community,setCommunity]=useState<ReadState<{projects:CommunityProjectDto[];opportunities:CommunityServiceOpportunityDto[]}|null>>(initial(null));
 const [membership,setMembership]=useState<string|null>(null);
 const [sellerAction,setSellerAction]=useState<SellerAction|null>(null);
 const [note,setNote]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [offerForm,setOfferForm]=useState(false);
 const [offerKind,setOfferKind]=useState<OfferKind>('PRODUCT');
 const [offerTitle,setOfferTitle]=useState('');
 const [offerDescription,setOfferDescription]=useState('');
 const [offerPrice,setOfferPrice]=useState('');
 const [offerBusy,setOfferBusy]=useState(false);
 const [revision,setRevision]=useState(0);

 async function findOffers(){
  if(!gateways)return;
  setSelectedStore(initial(null));setSearch({status:'loading',data:[],error:null});setError('');
  try{setSearch({status:'ready',data:await gateways.stores.search({kind,category:query.trim()||undefined,location:location.trim()||undefined,limit:10}),error:null});}
  catch{setSearch({status:'error',data:[],error:errorText});}
 }
 async function openStore(ksNumber:string){
  if(!gateways)return;
  setSelectedStore({status:'loading',data:null,error:null});
  try{setSelectedStore({status:'ready',data:await gateways.stores.store(ksNumber),error:null});}
  catch{setSelectedStore({status:'error',data:null,error:errorText});}
 }
 useEffect(()=>{
  setSeller(initial(null));setInbox(initial([]));setCommunity(initial(null));setMembership(null);
  if(!gateways||!signedIn||area!=='seller')return;
  let cancelled=false;
  setSeller({status:'loading',data:null,error:null});
  setInbox({status:'loading',data:[],error:null});
  void Promise.all([gateways.stores.myProfile(),gateways.stores.myOffers()])
    .then(([profile,offers])=>{if(!cancelled)setSeller({status:'ready',data:{profile,offers},error:null});})
    .catch(()=>{if(!cancelled)setSeller({status:'error',data:null,error:errorText});});
  void gateways.agreements.currentUserActions(0,10)
    .then(result=>{if(!cancelled)setInbox({status:'ready',data:result.items,error:null});})
    .catch(()=>{if(!cancelled)setInbox({status:'error',data:[],error:errorText});});
  return()=>{cancelled=true;};
 },[gateways,signedIn,area,revision]);

 useEffect(()=>{
  if(!gateways||!signedIn||area!=='community')return;
  let cancelled=false;
  setCommunity({status:'loading',data:null,error:null});
  void gateways.community.membership.me().then(async m=>{
    if(cancelled)return;
    setMembership(m.status??null);
    if(m.status!=='ACTIVE'){setCommunity({status:'ready',data:null,error:null});return;}
    const [projects,opportunities]=await Promise.all([gateways.community.projects.list(6,0),gateways.community.serviceOpportunities.list(6,0)]);
    if(!cancelled)setCommunity({status:'ready',data:{projects,opportunities},error:null});
  }).catch(()=>{if(!cancelled)setCommunity({status:'error',data:null,error:errorText});});
  return()=>{cancelled=true;};
 },[gateways,signedIn,area]);

 async function askKs001(message:string){
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{await onContinue(message);setNotice('Continuing with KS001 in the same workspace.');}
  catch{setError('The request was not confirmed. Check KS001 Chat before retrying.');}
  finally{setBusy(false);}
 }
 // A selected Store offer remains a cited proposal, never an Agreement fact or purchase.
 // Refresh the exact published offer before passing its source identity to KS001.
 const [takingOffer,setTakingOffer]=useState<string|null>(null);
 async function takeOfferToKs001(ownerKs:string,offerId:string){
  if(!gateways||busy||takingOffer)return;
  setTakingOffer(offerId);setError('');setNotice('');
  try{
   const record=await gateways.stores.offer(ownerKs,offerId);
   if(record.canonicalKsNumber!==ownerKs||record.offer.id!==offerId)throw new Error('Offer reference changed');
   const offer=record.offer;
   const information=[
    'I selected this real SecurePay Store '+offer.kind.toLowerCase()+' to work on with KS001.',
    'Source Store KS Number: '+record.canonicalKsNumber+'.',
    'Source Offer ID: '+offer.id+'.',
    'Store: '+record.displayName.slice(0,100)+'.',
    'Offer: '+offer.title.slice(0,160)+'.',
    'Listed price: '+price(offer.priceMinor,offer.currency)+'.',
    'Reported availability: '+titleCase(offer.availabilityState)+'.',
    offer.description?'Description: '+offer.description.slice(0,180)+'.':'',
    record.profile.locationLabel?'Store location label: '+record.profile.locationLabel.slice(0,100)+'.':'',
    'Keep the source reference with this work. Ask whether I want to compare it, request a quotation or propose it in my draft Agreement.',
    'Do not order, reserve, contact the seller, commit Agreement terms or move money without further authorised action.',
   ].filter(Boolean).join('\n');
   await onContinue(information);
  }catch{
   setError('Could not take this offer to KS001. Check the listing and your conversation, then try again.');
  }finally{setTakingOffer(null);}
 }
 async function inspectOffer(item:PublicSearchResultView,action:'discuss'|'quote'){
  await askKs001(['I am considering a real SecurePay Store offer.',
    'Store KS Number: '+item.canonicalKsNumber+'. Offer ID: '+item.offer.id+'.',
    'Offer: '+item.offer.title+'. Price as listed: '+price(item.offer.priceMinor,item.offer.currency)+'.',
    action==='quote'?'Help me request a quotation and clarify scope, availability and delivery.':'Help me compare this offer with my needs and decide whether to start a draft Agreement.',
    'Do not claim stock is reserved, a quotation is issued, a seller is contacted or terms agreed.'].join('\n'));
 }
 async function saveDraftOffer(){
  if(!gateways||!signedIn||offerBusy||!offerTitle.trim()||offerTitle.length>120)return;
  const amount=offerPrice.trim()?Number(offerPrice):null;
  if(amount!==null&&(!Number.isFinite(amount)||amount<0||!Number.isSafeInteger(Math.round(amount*100)))){setError('Please enter a valid price.');return;}
  setOfferBusy(true);setError('');setNotice('');
  try{
   const saved=await gateways.stores.createOffer({kind:offerKind,title:offerTitle.trim(),description:offerDescription.trim()||null,
    priceMinor:amount===null?null:Math.round(amount*100),quantityAvailable:null,
    availabilityState:offerKind==='PRODUCT'?'AVAILABLE':'TAKING_WORK',published:false,mediaRefs:[]});
   if(!saved.id||saved.published)throw new Error('Unexpected save result');
   setNotice('Draft offer saved. It is not publicly visible until you publish it in Store management.');
   setOfferForm(false);setOfferTitle('');setOfferDescription('');setOfferPrice('');
   setRevision(v=>v+1);
  }catch{setError('The offer save was not confirmed. Check My Store before trying again.');}
  finally{setOfferBusy(false);}
 }
 const currentOffer=selectedStore.data;
 const communityReady=area==='community';
 return <section aria-label="Store marketplace and workspace" className="space-y-3 text-sm">
   <div className="flex items-center justify-between gap-2">
     <div><p className="text-xs text-sand-600">SecurePay Stores</p><p className="text-lg font-semibold">{area==='buyer'?'Discover good work':area==='seller'?'My Store':'Together'}</p></div>
     {area==='seller'&&signedIn&&<button onClick={()=>setRevision(v=>v+1)} aria-label="Refresh my Store" className="rounded-full border border-cream-200 p-2"><RefreshCw size={16}/></button>}
   </div>
   <div role="group" aria-label="Store view" className="grid grid-cols-3 gap-1 rounded-xl bg-cream-100 p-1">
    {([{id:'buyer',label:'Buy'},{id:'seller',label:'Sell'},{id:'community',label:'Together'}] as const).map(tab=><button key={tab.id} type="button" onClick={()=>{setArea(tab.id);setError('');setNotice('');}}
      className={area===tab.id?'min-h-10 rounded-lg bg-white px-2 text-xs font-semibold shadow-sm':'min-h-10 rounded-lg px-2 text-xs text-sand-600'}>{tab.label}</button>)}
   </div>
   {area==='buyer'&&<>
     {!currentOffer&&<>
       <div className="flex flex-wrap gap-2">{(['PRODUCT','SERVICE','CAPACITY'] as OfferKind[]).map(value=><button key={value} onClick={()=>setKind(value)}
         className={kind===value?'rounded-full bg-forest-800 px-3 py-2 text-xs text-white':'rounded-full border border-cream-200 bg-white px-3 py-2 text-xs'}>{value==='CAPACITY'?'Capacity':titleCase(value)}</button>)}</div>
       <label className="block text-xs">What are you looking for?
        <input value={query} onChange={e=>setQuery(e.target.value)} maxLength={120} placeholder="Tiles, delivery, a carpenter…" className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm"/>
       </label>
       <label className="block text-xs">Where? (optional)
        <input value={location} onChange={e=>setLocation(e.target.value)} maxLength={120} placeholder="Place or service area" className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-sm"/>
       </label>
       <button onClick={()=>void findOffers()} disabled={!gateways||search.status==='loading'} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white disabled:opacity-50"><Search size={16}/> {search.status==='loading'?'Looking…':'Find real offers'}</button>
       {agreementNeeds.length>0&&<div className="flex flex-wrap gap-2" aria-label="From your Agreement">{agreementNeeds.slice(0,3).map((need,i)=><button key={i} onClick={()=>{setQuery(need.slice(0,120));}} className="rounded-full border border-cream-200 px-3 py-2 text-xs">{need.slice(0,48)}</button>)}</div>}
       {search.status==='error'&&<Status text={search.error||errorText}/>}
       {search.status==='ready'&&<div className="space-y-2" aria-label="Real Store offers">
        <p className="text-xs text-sand-600">{search.data.length?'Published offers':'No matching published offers found'}</p>
        <div className="grid grid-cols-2 gap-2">{search.data.map(result=><article key={result.canonicalKsNumber+'-'+result.offer.id} className="space-y-2 rounded-xl border border-cream-200 bg-white p-2">
          <OfferPhoto refs={result.offer.mediaRefs} title={result.offer.title}/>
          <p className="line-clamp-2 font-semibold">{result.offer.title}</p>
          <p className="text-xs text-sand-600">{result.displayName}</p>
          <p className="text-xs font-semibold">{price(result.offer.priceMinor,result.offer.currency)}</p>
          <button type="button" onClick={()=>void takeOfferToKs001(result.canonicalKsNumber,result.offer.id)} disabled={!!takingOffer||busy}
            aria-label={'Take '+result.offer.title+' to KS001'} className="min-h-11 w-full rounded-lg bg-forest-800 px-2 text-xs font-semibold text-white disabled:opacity-40">
            {takingOffer===result.offer.id?'Opening KS001…':'Take to KS001'}
          </button>
          <button onClick={()=>void openStore(result.canonicalKsNumber)} className="min-h-9 w-full rounded-lg bg-cream-100 px-2 text-xs">View Store</button>
          <button onClick={()=>void inspectOffer(result,'quote')} className="min-h-9 w-full rounded-lg border border-cream-200 px-2 text-xs">Ask for quote</button>
        </article>)}</div>
       </div>}
     </>}
     {selectedStore.status==='loading'&&<Status text="Opening this Store…"/>}
     {selectedStore.status==='error'&&<Status text={selectedStore.error||errorText}/>}
     {currentOffer&&<div className="space-y-3">
       <button className="inline-flex min-h-10 items-center gap-1 text-xs" onClick={()=>setSelectedStore(initial(null))}><ArrowLeft size={14}/> All offers</button>
       <div className="rounded-xl border border-cream-200 p-3"><p className="text-lg font-semibold">{currentOffer.displayName}</p>
         {currentOffer.profile.tagline&&<p className="text-xs text-sand-600">{currentOffer.profile.tagline}</p>}
         {currentOffer.profile.locationLabel&&<p className="mt-2 flex items-center gap-1 text-xs text-sand-600"><MapPin size={13}/>{currentOffer.profile.locationLabel}</p>}
       </div>
       <div className="grid grid-cols-2 gap-2">{currentOffer.offers.map(offer=><article key={offer.id} className="space-y-2 rounded-xl border border-cream-200 p-2">
         <OfferPhoto refs={offer.mediaRefs} title={offer.title}/>
         <p className="font-semibold">{offer.title}</p><p className="text-xs">{price(offer.priceMinor,offer.currency)}</p>
         <button type="button" onClick={()=>void takeOfferToKs001(currentOffer.canonicalKsNumber,offer.id)} disabled={!!takingOffer||busy}
           aria-label={'Take '+offer.title+' to KS001'} className="min-h-11 w-full rounded-lg bg-forest-800 px-2 text-xs font-semibold text-white disabled:opacity-40">
           {takingOffer===offer.id?'Opening KS001…':'Take to KS001'}
         </button>
         <button onClick={()=>void askKs001('Help me explore offer '+offer.id+' from SecurePay Store '+currentOffer.canonicalKsNumber+'. Discuss its suitability and propose an Agreement only after I review it. Do not reserve or buy anything.')} className="min-h-10 w-full rounded-lg bg-cream-100 text-xs">Discuss with KS001</button>
       </article>)}</div>
     </div>}
   </>}
   {area==='seller'&&<>
     {!signedIn?<Status text="Sign in to see and manage the Store connected to your SecurePay identity. No Store is created just by opening this tool."/>:
      <>
       {seller.status==='loading'&&<Status text="Reading your Store…"/>}
       {seller.status==='error'&&<Status text={seller.error||errorText}/>}
       {seller.data&&<div className="space-y-3">
         <div className="rounded-xl border border-cream-200 bg-cream-50 p-3">
           <div className="flex items-center justify-between"><div><p className="text-xs text-sand-600">My Store</p><p className="font-semibold">{seller.data.profile.heroHeadline||seller.data.profile.tagline||'Show what you do'}</p></div><Store size={20}/></div>
           {seller.data.profile.locationLabel&&<p className="mt-1 text-xs text-sand-600">{seller.data.profile.locationLabel}</p>}
           <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Your published offers">
             {seller.data.offers.filter(o=>o.published).slice(0,6).map(offer=><button key={offer.id} onClick={()=>setSellerAction('offers')} className="text-left">
                <OfferPhoto refs={offer.mediaRefs} title={offer.title}/><span className="mt-1 block truncate text-xs">{offer.title}</span></button>)}
             {seller.data.offers.filter(o=>o.published).length===0&&<div className="col-span-3 rounded-xl border border-dashed border-cream-200 bg-white p-3 text-center text-xs">Your gallery starts with your first published offer.</div>}
           </div>
         </div>
         {inbox.status==='ready'&&inbox.data.length>0&&<button onClick={()=>setSellerAction('decisions')} className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs"><span><strong>{inbox.data.length} actions</strong> in your Agreement inbox</span><ChevronRight size={16}/></button>}
         <div className="grid grid-cols-2 gap-2" aria-label="Manage your Store">
          {actions.map(a=><button key={a.id} type="button" onClick={()=>{setSellerAction(a.id);setOfferForm(false);}}
            className={sellerAction===a.id?'flex min-h-14 items-center gap-2 rounded-xl bg-forest-800 p-3 text-left text-xs font-semibold text-white':'flex min-h-14 items-center gap-2 rounded-xl border border-cream-200 bg-white p-3 text-left text-xs font-semibold'}>
             <a.icon size={17} className="shrink-0"/>{a.label}</button>)}
         </div>
         {sellerAction==='offers'&&<div className="space-y-2 rounded-xl bg-cream-50 p-3">
           <div className="flex items-center justify-between"><p className="text-xs font-semibold">Your offers ({seller.data.offers.length})</p>
             <button onClick={()=>setOfferForm(v=>!v)} className="rounded-full bg-white px-3 py-2 text-xs font-semibold">{offerForm?'Cancel':'+ New offer'}</button></div>
           {offerForm?<div className="space-y-2">
             <div className="flex flex-wrap gap-1">{(['PRODUCT','SERVICE','CAPACITY'] as const).map(value=><button key={value} onClick={()=>setOfferKind(value)} className={offerKind===value?'rounded-full bg-forest-800 px-3 py-2 text-xs text-white':'rounded-full bg-white px-3 py-2 text-xs'}>{titleCase(value)}</button>)}</div>
             <label className="block text-xs">Offer name<input value={offerTitle} onChange={e=>setOfferTitle(e.target.value)} maxLength={120} className="mt-1 min-h-10 w-full rounded-lg border border-cream-200 p-2"/></label>
             <label className="block text-xs">Price in KES (optional)<input inputMode="decimal" value={offerPrice} onChange={e=>setOfferPrice(e.target.value)} placeholder="Ask for quote" className="mt-1 min-h-10 w-full rounded-lg border border-cream-200 p-2"/></label>
             <label className="block text-xs">What is included?<textarea rows={2} value={offerDescription} onChange={e=>setOfferDescription(e.target.value)} maxLength={1200} className="mt-1 w-full rounded-lg border border-cream-200 p-2"/></label>
             <button disabled={offerBusy||!offerTitle.trim()} onClick={()=>void saveDraftOffer()} className="min-h-11 w-full rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white disabled:opacity-40">{offerBusy?'Saving…':'Save private draft'}</button>
           </div>:seller.data.offers.length===0?<p className="text-xs text-sand-600">No offers yet.</p>:seller.data.offers.slice(0,8).map(offer=><div key={offer.id} className="flex items-center justify-between gap-2 border-b border-cream-200 py-2 text-xs"><span>{offer.title}<br/><span className="text-sand-600">{offer.published?'Public':'Draft'} · {price(offer.priceMinor,offer.currency)}</span></span><CheckCircle2 size={15} className="text-sand-500"/></div>)}
         </div>}
         {sellerAction==='gallery'&&<div className="space-y-2 rounded-xl bg-cream-50 p-3">
           <p className="font-semibold">Completed work</p><p className="text-xs text-sand-600">Private completed-job portfolio isn't exposed by the current Store API. You can add photos to KS001, then choose what to share publicly when that permissioned gallery is connected.</p>
           <button disabled={!onOpenPhoto} onClick={onOpenPhoto} className="min-h-11 rounded-full bg-white px-3 text-xs font-semibold disabled:opacity-50"><Camera size={15} className="mr-1 inline"/> Add photos</button>
         </div>}
         {(sellerAction==='decisions'||sellerAction==='agreements')&&<div className="space-y-2 rounded-xl bg-cream-50 p-3">
           <p className="font-semibold">Your Agreement inbox</p>
           <p className="text-xs text-sand-600">These are your personal Agreement actions. SecurePay does not yet mark which belong to this Store.</p>
           {inbox.status==='loading'&&<p className="text-xs">Loading…</p>}
           {inbox.status==='error'&&<p className="text-xs">{inbox.error}</p>}
           {inbox.status==='ready'&&inbox.data.length===0&&<p className="text-xs">No actions needing attention.</p>}
           {inbox.data.map((item,index)=><div key={item.agreementId+'-'+index} className="rounded-lg border border-cream-200 bg-white p-3 text-xs">
             <strong>{item.agreementTitle}</strong><span className="mt-1 block text-sand-600">{item.reason}</span>
             <div className="mt-2 flex flex-wrap gap-2">
               <button onClick={()=>{storeAgreementEntry(item.agreementId);window.location.hash='#/';}} className="min-h-10 rounded-full bg-forest-800 px-3 text-white">Open Agreement</button>
               <button onClick={()=>void askKs001('Help me review my real Agreement action '+item.actionCode+' for Agreement '+item.agreementReference+'. Explain my options, do not execute any approval.')} className="min-h-10 rounded-full border border-cream-200 px-3">Ask KS001</button>
             </div></div>)}
         </div>}
         {(['quote','contract','saver','calendar'] as SellerAction[]).includes(sellerAction||'offers')&&sellerAction&&<div className="space-y-2 rounded-xl bg-cream-50 p-3">
           <p className="font-semibold">{actions.find(a=>a.id===sellerAction)?.label}</p>
           {sellerAction==='saver'&&<p className="text-xs">A Plug must coordinate. Buyer, seller and Plug must all see genuine, verified economic benefit and consent to the terms.</p>}
           {sellerAction==='calendar'&&<p className="text-xs">Protect your personal time as well as work commitments. Nothing will be booked automatically.</p>}
           <textarea rows={2} value={note} onChange={e=>setNote(e.target.value)} maxLength={400} placeholder="Tell KS001 what you need…" className="w-full rounded-lg border border-cream-200 bg-white p-2 text-sm"/>
           <button disabled={busy} onClick={()=>void askKs001('Help me prepare '+sellerAction+' for my Store. '+note+'. Respect Store and Agreement permissions. Do not claim that a quote, contract, savings arrangement or booking has been created. '+(sellerAction==='saver'?'A Plug must be involved; verify buyer seller and Plug savings, consent and evidence.':''))} className="min-h-11 w-full rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white">Continue with KS001</button>
         </div>}
       </div>}
      </>}
   </>}
   {communityReady&&<div className="space-y-3">
     <div className="rounded-xl border border-cream-200 bg-cream-50 p-3">
       <div className="flex items-center gap-2"><Users size={19}/><p className="font-semibold">Good work happens together</p></div>
       <p className="mt-2 text-xs text-sand-600">Find shared work, pool genuine opportunities and meet people through useful contributions. Private Store data stays private.</p>
     </div>
     {!signedIn&&<Status text="Sign in to explore your Trust Project membership and Community opportunities."/>}
     {signedIn&&community.status==='loading'&&<Status text="Checking your Community access…"/>}
     {signedIn&&community.status==='error'&&<Status text={community.error||errorText}/>}
     {signedIn&&membership&&membership!=='ACTIVE'&&<Status text="Trust Project membership must be active before viewing member-only opportunities. Joining requires your explicit choice."/>}
     {community.data&&<div className="space-y-2">
       {community.data.projects.length>0&&<p className="text-xs font-semibold">Community projects</p>}
       {community.data.projects.slice(0,4).map((project,index)=><div key={index} className="rounded-lg border border-cream-200 bg-white p-3 text-sm">{project.title}</div>)}
       {community.data.opportunities.length>0&&<p className="text-xs font-semibold">Ways to contribute</p>}
       {community.data.opportunities.slice(0,4).map((opportunity,index)=><div key={index} className="rounded-lg border border-cream-200 bg-white p-3 text-sm">{opportunity.title}</div>)}
       {!community.data.projects.length&&!community.data.opportunities.length&&<p className="text-xs">No published opportunities returned right now.</p>}
     </div>}
     <button onClick={()=>{window.location.hash='#/community';}} className="min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-xs font-semibold">Open Community</button>
     <button disabled={busy} onClick={()=>void askKs001('Help me explore a Community Saver involving my Store and an authorised Plug. Identify real mutual savings for buyer seller and Plug, necessary evidence, permissions and informed consent. Do not promise savings, calculate payouts from invented numbers, or execute any action.')} className="min-h-11 w-full rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white">Explore Community Saver with KS001</button>
   </div>}
   {notice&&<p role="status" className="rounded-xl bg-cream-50 p-3 text-xs">{notice}</p>}
   {error&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
   <p className="text-xs text-sand-600">{area==='buyer'?'Only real SecurePay listings are shown. Looking is not buying or agreeing.':area==='seller'?'Your private decisions and drafts are never shown on the public Store.':'Community access follows membership, consent and privacy. A Saver requires a Plug.'}</p>
 </section>;
}
