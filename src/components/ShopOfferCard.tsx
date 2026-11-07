import { ArrowUpRight, Box, Camera, MapPin, Paintbrush, Ruler, Smartphone, Store, Wrench } from 'lucide-react';
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

export function ShopOfferCard({offer,onOpen,onOpenStore}:{
  offer:StoreOffer; onOpen:()=>void; onOpenStore:()=>void;
}) {
  return <article className="group min-w-0 overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-forest-200 hover:shadow-lg">
    <button type="button" onClick={onOpen} aria-label={'View offer: '+offer.title}
      className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest-500">
      <ShopOfferCover offer={offer}/>
      <div className="px-4 pt-4">
        <h3 className="line-clamp-2 min-h-12 font-display text-[1.04rem] font-semibold leading-snug text-forest-900 group-hover:text-forest-700">{offer.title}</h3>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <strong className="font-display text-lg tabular-nums text-forest-900">{offer.priceType==='unlisted'?'Ask for price':offer.price}</strong>
          <ArrowUpRight size={18} className="shrink-0 text-forest-600"/>
        </div>
        {offer.serviceArea && <p className="mt-1 flex items-center gap-1.5 text-xs text-sand-600"><MapPin size={12}/><span className="line-clamp-1">{offer.serviceArea}</span></p>}
        <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-sand-600">{offer.description}</p>
      </div>
    </button>
    <div className="mx-4 mt-3 flex items-center justify-between gap-2 border-t border-cream-200 py-3">
      <button type="button" onClick={onOpenStore} className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-forest-800 underline-offset-2 hover:underline" aria-label={'Visit '+offer.storeName+' shop'}>
        <Store size={14} className="shrink-0"/><span className="truncate">{offer.storeName}</span>
      </button>
      <button type="button" onClick={onOpen} className="shrink-0 text-xs font-semibold text-forest-700 hover:underline">View offer →</button>
    </div>
  </article>;
}
