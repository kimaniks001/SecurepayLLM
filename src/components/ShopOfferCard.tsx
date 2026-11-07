import { ArrowUpRight, Box, Camera, Eye, Image as ImageIcon, MapPin, Paintbrush, Plus, Ruler, Smartphone, Store, Wrench, X } from 'lucide-react';
import { useState } from 'react';
import type { StoreDestination } from '../features/store/shopSelection.mjs';
import type { StoreOffer } from '../types';

/**
 * The Digital Store shopping card is not a generic result/action checklist.
 * Seller-owned image only; examples/empty media render a polished category
 * illustration rather than a misleading stock photo pretending to be evidence.
 * Price and availability are seller-listed facts, never platform guarantees.
 */
function offerIdentity(offer: StoreOffer) {
  const words=(offer.title+' '+offer.offerType).toLowerCase();
  if(/paint|renovation|decorat/.test(words)) return { Icon:Paintbrush, label:'Painting & finishing', palette:'from-[#dfe7df] via-[#f1ecdf] to-[#e8d9c7]' };
  if(/survey|land|architect/.test(words)) return { Icon:Ruler, label:'Land & professional services', palette:'from-[#dce5df] via-[#dce8e7] to-[#e5eee5]' };
  if(/camera|cctv|security|surveillance/.test(words)) return { Icon:Camera, label:'Security & systems', palette:'from-[#dae6de] via-[#eef0dd] to-[#d5dfcf]' };
  if(/iphone|phone|laptop|tech|electronic/.test(words)) return { Icon:Smartphone, label:'Electronics', palette:'from-[#e3e5e9] via-[#ebede8] to-[#dfdfd5]' };
  if(offer.offerType==='service') return { Icon:Wrench, label:'Services', palette:'from-[#e8e5dc] via-[#e4eee2] to-[#dfe3dc]' };
  return { Icon:Box, label:offer.offerType==='package'?'Packages':'Goods & offers', palette:'from-[#e9eee3] via-[#f1eee4] to-[#e7e2d7]' };
}

/** One truthful visual across shop cards and detailed offer inspection. */
export function ShopOfferCover({offer,large=false}:{offer:StoreOffer;large?:boolean}) {
  const kind=offerIdentity(offer);
  const Icon=kind.Icon;
  const sellerMedia=offer.media.find(item=>item.url?.trim() && !item.isExample)?.url;
  return <div className={`relative flex ${large?'h-56 sm:h-64':'h-40 sm:h-44'} items-center justify-center overflow-hidden bg-gradient-to-br ${kind.palette}`}>
    {sellerMedia
      ? <img src={sellerMedia} alt={'Listing image for '+offer.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"/>
      : <div className="flex flex-col items-center gap-2 text-forest-700" aria-label="No seller photograph supplied">
          <span className={`flex ${large?'h-24 w-24':'h-16 w-16'} items-center justify-center rounded-[22px] border border-white/70 bg-white/45 shadow-sm`}><Icon size={large?46:31} strokeWidth={1.55}/></span>
          <span className="rounded-full bg-white/55 px-3 py-1 text-[0.68rem] font-semibold">{kind.label}</span>
        </div>}
    <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[0.66rem] font-semibold text-forest-900 shadow-sm">
      {offer.offerType==='product'?'Goods':offer.offerType==='service'?'Service':offer.offerType==='package'?'Package':'Offer'}
    </span>
    {offer.lifecycle==='unavailable' && <span className="absolute right-3 top-3 rounded-full bg-amber-50 px-2.5 py-1 text-[0.65rem] font-semibold text-amber-900">Unavailable</span>}
  </div>;
}

export function ShopOfferCard({offer,onOpen,onOpenStore,onCollect,onQuickKs001,selectedCounts}:{
  offer:StoreOffer;
  onOpen:()=>void;
  onOpenStore:()=>void;
  onCollect?:(offer:StoreOffer,destination:StoreDestination)=>void;
  onQuickKs001?:(offer:StoreOffer)=>void;
  selectedCounts?:{vision:number;agreement:number};
}) {
  const [quickOpen,setQuickOpen]=useState(false);
  const [imageOpen,setImageOpen]=useState(false);
  const photo=offer.media.find(item=>item.url?.trim()&&!item.isExample)?.url;
  const canUseForAgreement=offer.lifecycle==='published';
  const add=(destination:StoreDestination)=>{
    onCollect?.(offer,destination);
    setQuickOpen(false);
  };
  return <article data-shop-quick-card className="group relative min-w-0 overflow-visible rounded-2xl border border-cream-200 bg-white shadow-sm transition-all duration-200 hover:z-30 hover:border-forest-200 hover:shadow-md focus-within:z-30">
    <div className="overflow-hidden rounded-t-2xl">
      <button type="button" onClick={()=>photo?setImageOpen(true):setQuickOpen(true)} aria-label={photo?'View larger image of '+offer.title:'Quick look at '+offer.title}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest-500">
        <ShopOfferCover offer={offer}/>
      </button>
    </div>
    <div className="px-4 pt-3">
      <button type="button" onClick={onOpen} className="line-clamp-2 min-h-11 text-left font-display text-[1.04rem] font-semibold leading-snug text-forest-900 hover:underline" aria-label={'Open full details for '+offer.title}>{offer.title}</button>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <strong className="font-display text-lg tabular-nums text-forest-900">{offer.priceType==='unlisted'?'Ask for price':offer.price}</strong>
        <span className="text-[0.68rem] text-sand-600">Listed price</span>
      </div>
      {offer.serviceArea && <p className="mt-1 flex items-center gap-1.5 text-xs text-sand-600"><MapPin size={12}/><span className="line-clamp-1">{offer.serviceArea}</span></p>}
      <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-sand-600">{offer.description}</p>
      {(selectedCounts?.vision||selectedCounts?.agreement) ? <p role="status" className="mt-1 text-[0.7rem] font-semibold text-forest-700">{(selectedCounts?.vision||0)>0?'Vision ×'+selectedCounts?.vision+'  ':''}{(selectedCounts?.agreement||0)>0?'Agreement ×'+selectedCounts?.agreement:''}</p> : null}
    </div>
    <div className="mx-4 mt-2 flex items-center justify-between gap-2 border-t border-cream-200 py-3">
      <button type="button" onClick={onOpenStore} className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-forest-800 underline-offset-2 hover:underline" aria-label={'Visit '+offer.storeName+' shop'}>
        <Store size={14} className="shrink-0"/><span className="truncate">{offer.storeName}</span>
      </button>
      <button type="button" aria-expanded={quickOpen} aria-label={'Quick look at '+offer.title} onClick={()=>setQuickOpen(open=>!open)}
        className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-forest-200 bg-forest-50 px-3 text-xs font-semibold text-forest-800"><Eye size={14}/> Quick look</button>
    </div>
    <div data-shop-hover-preview className={`absolute inset-x-2 bottom-2 z-20 rounded-xl border border-forest-200 bg-white/98 p-3 shadow-xl backdrop-blur-md ${quickOpen?'block':'hidden group-hover:block group-focus-within:block'}`}>
      <div className="flex items-start justify-between gap-2">
        <div><p className="text-[0.68rem] font-bold uppercase tracking-wider text-forest-700">Quick look</p><p className="mt-1 line-clamp-3 text-xs leading-5 text-sand-700">{offer.description}</p></div>
        <button type="button" aria-label={'Close quick look for '+offer.title} onClick={()=>setQuickOpen(false)} className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-cream-100"><X size={16}/></button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={()=>add('vision')} disabled={!onCollect}
          className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-forest-200 bg-forest-50 px-2 text-xs font-semibold text-forest-800 disabled:opacity-40"><Plus size={14}/> Vision</button>
        <button type="button" onClick={()=>add('agreement')} disabled={!onCollect||!canUseForAgreement}
          className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-forest-800 px-2 text-xs font-semibold text-white disabled:opacity-40"><Plus size={14}/> Agreement</button>
      </div>
      <button type="button" disabled={!onQuickKs001||!canUseForAgreement} onClick={()=>{onQuickKs001?.(offer);setQuickOpen(false);}}
        className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-lg border border-forest-200 bg-white px-2 text-xs font-semibold text-forest-800 disabled:opacity-40"><Plus size={14}/> Add to KS001 question</button>
      <button type="button" onClick={onOpen} className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1 text-xs font-semibold text-forest-700"><ArrowUpRight size={14}/> Open full item details</button>
      {photo && <button type="button" onClick={()=>setImageOpen(true)} className="mt-1 inline-flex min-h-9 w-full items-center justify-center gap-1 text-xs font-semibold text-forest-700"><ImageIcon size={14}/> View full image</button>}
      <p className="mt-1 text-[0.65rem] text-sand-500">Adding keeps you shopping; it does not book or pay.</p>
    </div>
    {imageOpen&&photo&&<div role="dialog" aria-modal="true" aria-label={'Image for '+offer.title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-forest-950/85 p-4" onClick={()=>setImageOpen(false)}>
      <div className="relative max-h-full max-w-5xl" onClick={event=>event.stopPropagation()}>
        <button type="button" onClick={()=>setImageOpen(false)} aria-label="Close full image" className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full bg-white text-forest-900"><X size={19}/></button>
        <img src={photo} alt={'Photograph supplied for '+offer.title} className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain"/>
        <p className="mt-2 text-center text-xs text-white">Seller-provided image · Inspect details before agreeing.</p>
      </div>
    </div>}
  </article>;
}
