import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Camera, ChevronRight, MapPin, Search, ShoppingCart, Store, BookmarkPlus, MessageCircle, Maximize2, Package } from 'lucide-react';
import type { StoreOffer } from '../../types';
import type { StoreGateway } from '../../api/securepay/store';
import { storeIdentityView, storeOffersView, searchResultsView, type StoreSearchResult } from '../../api/securepay/store/adapters';
import { demoStores, getOffersByStore, getStoreById, searchOffers } from '../../storeData';
import type { SelectionItem } from '../store/shopSelection.mjs';

export type StoreBrowserState={
  query:string;
  submitted:string;
  location:string;
  tab:'stores'|'items';
  selectedStoreKs:string|null;
};
export type StoreBrowserTarget={
  kind:'marketplace'|'store'|'item'|'manage';
  storeKs?:string;
  offerId?:string;
  /** Increasing sequence to distinguish visits to the same offer. */
  requestId:number;
};
export const initialStoreBrowserState:StoreBrowserState={
  query:'',submitted:'',location:'',tab:'stores',selectedStoreKs:null,
};
type ReadGateway=Pick<StoreGateway,'search'|'store'|'offer'>;
type Props={
  browser:StoreBrowserState;
  onBrowserChange:(next:StoreBrowserState)=>void;
  gateway?:ReadGateway;
  trustedMediaOrigin?:string|null;
  example:boolean;
  selection:SelectionItem[];
  onAddCart:(offer:StoreOffer)=>void;
  onSaveVision:(offer:StoreOffer)=>void;
  onDiscuss:(offer:StoreOffer)=>void;
  onDiscussCart:()=>void;
  onExpand:(target:Omit<StoreBrowserTarget,'requestId'>)=>void;
  onPhotoSearch:()=>void;
  onManage:()=>void;
};

function proximityMatch(area:string,storeArea:string):boolean {
  const clean=area.trim().toLowerCase();
  if(!clean || !storeArea.trim())return false;
  return storeArea.toLowerCase().includes(clean);
}
function joinTitle(offer:StoreOffer){return offer.title+' '+offer.description+' '+offer.storeName;}
function isResultRelevant(offer:StoreOffer,term:string){
  const words=term.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return words.length===0||words.every(word=>joinTitle(offer).toLowerCase().includes(word));
}
function sortAreaFirst<T extends {area:string}>(items:T[],area:string){
  return [...items].sort((a,b)=>Number(proximityMatch(area,b.area))-Number(proximityMatch(area,a.area)));
}

/** A functional left TOOL. It does not own a KS001 conversation, Vision board,
 * Agreement, money rail or competing cart. All those authorities are in the
 * existing Living Workspace. A View operation alone changes the middle display. */
export function CompactStoreBrowser({
  browser,onBrowserChange,gateway,trustedMediaOrigin=null,example,selection,
  onAddCart,onSaveVision,onDiscuss,onDiscussCart,onExpand,onPhotoSearch,onManage,
}:Props) {
  const [results,setResults]=useState<StoreOffer[]>([]);
  const [resultStoreAreas,setResultStoreAreas]=useState<Record<string,string>>({});
  const [status,setStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [storeOffers,setStoreOffers]=useState<StoreOffer[]|null>(null);
  const [storeName,setStoreName]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [working,setWorking]=useState(false);
  const cart=selection.filter(item=>item.destination==='agreement');
  const cartQuantity=cart.reduce((n,item)=>n+item.quantity,0);
  const change=(partial:Partial<StoreBrowserState>)=>onBrowserChange({...browser,...partial});
  useEffect(()=>{
    if(example){
      setStatus('ready');
      const offers=searchOffers(browser.submitted);
      setResults(offers);
      setResultStoreAreas(Object.fromEntries(demoStores.map(store=>[store.id,store.serviceAreas.join(', ')])));
      return;
    }
    if(!gateway){setStatus('error');setError('The SecurePay Store search is not connected.');return;}
    let alive=true;
    setStatus('loading');setError('');
    // The API's category parameter matches offer title OR description. A
    // location filter is applied separately, so it must never remove every
    // eligible nonlocal supplier from discovery by default.
    const kinds=['PRODUCT','SERVICE','CAPACITY'] as const;
    void Promise.all(kinds.map(kind=>gateway.search({
      kind,category:browser.submitted.trim()||undefined,limit:10,
    }))).then(pages=>{
      if(!alive)return;
      const byId=new Map<string,StoreSearchResult>();
      pages.forEach(page=>searchResultsView(page,trustedMediaOrigin).forEach(found=>
        byId.set(found.canonicalKsNumber+':'+found.offer.id,found)));
      const discovered=[...byId.values()].filter(found=>isResultRelevant(found.offer,browser.submitted));
      setResultStoreAreas(Object.fromEntries(discovered.map(found=>[found.canonicalKsNumber,found.locationLabel||''])));
      setResults(discovered.map(found=>found.offer));
      setStatus('ready');
    }).catch(()=>{
      if(alive){setStatus('error');setError('Could not load published Store offers. Please try again.');}
    });
    return()=>{alive=false;};
  },[gateway,trustedMediaOrigin,example,browser.submitted]);
  useEffect(()=>{
    if(!browser.selectedStoreKs){setStoreOffers(null);setStoreName('');return;}
    if(example){
      const store=getStoreById(browser.selectedStoreKs);
      setStoreOffers(store?getOffersByStore(store.id).filter(offer=>offer.lifecycle==='published'):[]);
      setStoreName(store?.name||'Example Store');return;
    }
    if(!gateway)return;
    let alive=true;
    setStoreOffers(null);setError('');
    void gateway.store(browser.selectedStoreKs).then(response=>{
      if(!alive)return;
      setStoreName(storeIdentityView(response).name);
      setStoreOffers(storeOffersView(response,trustedMediaOrigin).filter(offer=>offer.lifecycle==='published'));
    }).catch(()=>{if(alive){setStoreOffers([]);setError('This Store could not be opened. Try another Store.');}});
    return()=>{alive=false;};
  },[browser.selectedStoreKs,example,gateway,trustedMediaOrigin]);

  const sellers=useMemo(()=>{
    if(example) return sortAreaFirst(demoStores.map(store=>({
      id:store.id,name:store.name,area:store.serviceAreas.join(', '),
      count:results.filter(item=>item.storeId===store.id).length,
    })).filter(store=>store.count>0),browser.location);
    const map=new Map<string,{id:string;name:string;area:string;count:number}>();
    for(const item of results){
      const found=map.get(item.storeId);
      if(found)found.count+=1;
      else map.set(item.storeId,{id:item.storeId,name:item.storeName,area:resultStoreAreas[item.storeId]||'',count:1});
    }
    return sortAreaFirst([...map.values()],browser.location);
  },[example,results,resultStoreAreas,browser.location]);

  const shownOffers=browser.selectedStoreKs?(storeOffers||[]):results;
  const sortedOffers=useMemo(()=>sortAreaFirst(shownOffers.map(offer=>({
    offer,area:resultStoreAreas[offer.storeId]||offer.serviceArea||'',
  })),browser.location).map(row=>row.offer),[shownOffers,browser.location,resultStoreAreas]);

  function searchSubmit(event:FormEvent){event.preventDefault();change({submitted:browser.query.trim(),selectedStoreKs:null,tab:browser.query.trim()?'items':'stores'});}
  const action=(fn:()=>void,label:string)=>{
    try{fn();setNotice(label);}catch(e){setNotice(e instanceof Error?e.message:'This action could not be completed.');}
  };
  const view=(kind:'store'|'item'|'marketplace',offer?:StoreOffer)=>{
    onExpand({kind,storeKs:offer?.storeId||browser.selectedStoreKs||undefined,offerId:kind==='item'?offer?.id:undefined});
  };

  return <section data-compact-store-browser aria-label="Compact Store Browser" className="space-y-3 text-sm">
    <form onSubmit={searchSubmit} className="space-y-2" role="search">
      <label htmlFor="compact-store-search" className="block text-xs font-semibold text-forest-800">Find something</label>
      <div className="flex items-center gap-1.5 rounded-xl border border-forest-200 bg-white p-1.5">
        <Search size={16} className="shrink-0 text-forest-600"/>
        <input id="compact-store-search" value={browser.query} onChange={event=>change({query:event.target.value})}
          placeholder="Goods, services or shops" className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none" maxLength={120}/>
        <button type="submit" className="min-h-10 rounded-lg bg-forest-800 px-2.5 text-xs font-semibold text-white">Find</button>
      </div>
    </form>
    <div className="flex gap-1.5">
      <button type="button" onClick={onPhotoSearch} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-lg border border-forest-200 text-xs font-medium"><Camera size={14}/> Photo</button>
      <button type="button" onClick={()=>view('marketplace')} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-lg border border-forest-200 text-xs font-medium"><Maximize2 size={14}/> Full marketplace</button>
    </div>
    <label className="block text-xs text-sand-700"><MapPin size={13} className="mr-1 inline"/>
      Shopping area (optional)
      <input value={browser.location} onChange={event=>change({location:event.target.value})}
        className="mt-1 min-h-10 w-full rounded-lg border border-cream-200 px-2 text-sm"
        placeholder="e.g. Ruiru or Varsityville" maxLength={80}/>
      <span className="mt-1 block text-[0.68rem] text-sand-500">Relevant offers first, then Store service areas matching your chosen place. No unverified distance claims.</span>
    </label>
    {example&&<p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Example catalogue only · No real traders contacted or orders placed.</p>}
    <div role="tablist" aria-label="Browse by item or Store" className="flex gap-1 rounded-lg bg-cream-100 p-1">
      <button type="button" role="tab" aria-selected={browser.tab==='stores'} onClick={()=>change({tab:'stores',selectedStoreKs:null})}
        className={'min-h-10 flex-1 rounded-md text-xs font-semibold '+(browser.tab==='stores'?'bg-white text-forest-900 shadow-sm':'text-sand-700')}>Stores</button>
      <button type="button" role="tab" aria-selected={browser.tab==='items'} onClick={()=>change({tab:'items',selectedStoreKs:null})}
        className={'min-h-10 flex-1 rounded-md text-xs font-semibold '+(browser.tab==='items'?'bg-white text-forest-900 shadow-sm':'text-sand-700')}>Items & services</button>
    </div>

    {browser.selectedStoreKs&&<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-forest-50 p-2" data-compact-store-selected>
      <button type="button" onClick={()=>change({selectedStoreKs:null})} className="flex min-h-10 items-center gap-1 text-xs font-semibold"><ArrowLeft size={15}/> Results</button>
      <span className="max-w-full truncate text-xs font-semibold">{storeName}</span>
      <button type="button" onClick={()=>onExpand({kind:'store',storeKs:browser.selectedStoreKs||undefined})}
        className="min-h-10 rounded-lg border border-forest-200 bg-white px-2 text-xs font-semibold">View Store <ChevronRight size={13} className="inline"/></button>
    </div>}
    {status==='loading'&&<p role="status" className="rounded-lg bg-cream-50 p-3 text-xs">Finding published Stores…</p>}
    {error&&<p role="alert" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{error}</p>}
    {notice&&<p role="status" className="rounded-lg bg-forest-50 p-2 text-xs text-forest-800">{notice}</p>}
    {!browser.selectedStoreKs && browser.tab==='stores' && <div className="space-y-2" aria-label="Stores with published offers">
      <p className="text-xs font-semibold text-forest-800">{sellers.length?sellers.length+' Stores in these results':'Stores'}</p>
      {sellers.map(store=><div key={store.id} className="rounded-xl border border-cream-200 bg-white p-2.5">
        <button type="button" onClick={()=>change({selectedStoreKs:store.id})} className="w-full text-left">
          <span className="flex items-center gap-2 font-semibold"><Store size={15}/>{store.name}</span>
          <span className="mt-1 block text-xs text-sand-600">{store.area||'Service area not published'} · {store.count} matching offer(s)</span>
        </button>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" onClick={()=>change({selectedStoreKs:store.id})} className="min-h-10 flex-1 rounded-lg bg-cream-100 px-2 text-xs font-medium">Browse here</button>
          <button type="button" onClick={()=>onExpand({kind:'store',storeKs:store.id})} className="min-h-10 flex-1 rounded-lg border border-forest-200 px-2 text-xs font-medium">View Store</button>
        </div>
      </div>)}
    </div>}
    {(browser.selectedStoreKs || browser.tab==='items')&&<div className="space-y-2" aria-label="Store item results">
      {storeOffers===null && browser.selectedStoreKs && <p role="status" className="text-xs text-sand-600">Opening Store shelves…</p>}
      {!sortedOffers.length && status==='ready' && (!browser.selectedStoreKs || storeOffers!==null)&&<p role="status" className="rounded-lg bg-cream-50 p-3 text-xs">No matching published items here. Try a different description or Store.</p>}
      {sortedOffers.map(offer=>{
        const inCart=cart.find(item=>item.offerId===offer.id&&item.sellerKsNumber===offer.storeId);
        return <article key={offer.storeId+':'+offer.id} className="rounded-xl border border-cream-200 bg-white p-3" data-compact-offer-card>
          <div className="flex items-start gap-2.5">
            <div className="flex size-[68px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-cream-200 bg-cream-50" aria-label={offer.media.some(media=>media.url&&!media.isExample)?'Trader photo':'Photo not supplied'}>
              {offer.media.find(media=>media.url&&!media.isExample)?.url
                ? <img src={offer.media.find(media=>media.url&&!media.isExample)!.url} alt={'Seller listing for '+offer.title} loading="lazy" className="h-full w-full object-cover"/>
                : <Package size={25} className="text-forest-600"/>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-5 text-forest-900">{offer.title}</p>
              <p className="mt-1 text-xs text-sand-600">{offer.storeName} · {offer.availability}</p>
              <p className="mt-1 text-sm font-semibold text-forest-800">{offer.price}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {offer.lifecycle==='published' && !offer.isExternalReference && <button type="button"
              onClick={()=>action(()=>onAddCart(offer),'Added to KS Cart. KS001 has not been interrupted.')}
              className="min-h-11 flex-1 rounded-lg bg-forest-800 px-2 text-xs font-semibold text-white">
              <ShoppingCart size={14} className="mr-1 inline"/>{inCart?'Add another':'Add to Cart'}
            </button>}
            <button type="button" onClick={()=>view('item',offer)}
              className="min-h-11 flex-1 rounded-lg border border-forest-200 px-2 text-xs font-semibold">View Item</button>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button type="button" onClick={()=>onSaveVision(offer)}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-lg bg-cream-50 px-2 text-xs font-medium"><BookmarkPlus size={13}/> Vision</button>
            <button type="button" onClick={()=>onDiscuss(offer)}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-lg bg-cream-50 px-2 text-xs font-medium"><MessageCircle size={13}/> KS001</button>
          </div>
          {!browser.selectedStoreKs && <button type="button" onClick={()=>change({selectedStoreKs:offer.storeId})}
            className="mt-2 flex min-h-9 items-center gap-1 text-xs text-forest-700 underline"><Store size={13}/> Browse {offer.storeName}</button>}
        </article>;
      })}
    </div>}
    <div className="sticky bottom-0 z-10 rounded-xl border border-forest-200 bg-white p-2 shadow-sm" data-compact-store-cart>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold"><ShoppingCart size={15} className="mr-1 inline"/> KS Cart · {cartQuantity}</span>
        <span className="text-[0.68rem] text-sand-600">{new Set(cart.map(x=>x.sellerKsNumber)).size} Stores</span>
      </div>
      <button type="button" disabled={!cartQuantity || working} onClick={async()=>{
        setWorking(true);try{await onDiscussCart();}catch(e){setNotice(e instanceof Error?e.message:'Could not prepare this cart.');}finally{setWorking(false);}
      }} className="mt-2 min-h-11 w-full rounded-lg bg-forest-800 px-2 text-xs font-semibold text-white disabled:opacity-40">Discuss Cart with KS001</button>
      <p className="mt-1 text-[0.68rem] text-sand-600">Shopping is not a purchase or Agreement. Your chat stays independent until you choose KS001.</p>
      <button type="button" onClick={onManage} className="mt-1 min-h-10 text-xs text-sand-600 underline">Manage my Digital Store</button>
    </div>
  </section>;
}
