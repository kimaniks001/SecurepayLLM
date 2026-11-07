import { Search, ShoppingBag, Store, Plus, MessageCircle, Package, Wrench, ChevronRight } from 'lucide-react';
import type { StoreIdentity, StoreOffer } from '../types';
import type { SelectionItem, StoreDestination } from '../features/store/shopSelection.mjs';
import { ShopOfferCard } from './ShopOfferCard';
import { Ks001SurfaceGuide } from '../features/experience/Ks001SurfaceGuide';
import type { AppView } from '../types';

interface StoreHomeProps {
  /** The Living Workspace already owns KS001, Tools and SecurePay Check. */
  embedded?: boolean;
  onOpenOffer: (id: string) => void;
  onOpenStore: (id: string) => void;
  onManageStore: () => void;
  onCreateOffer: () => void;
  onStartConversation: () => void;
  offers: StoreOffer[];
  stores: StoreIdentity[];
  /** Distinct REAL published sellers found in the Store search response. */
  storeLinks?: { ksNumber: string; displayName: string; locationLabel: string | null }[];
  query: string;
  onQueryChange: (query: string) => void;
  searchStatus?: 'idle' | 'loading' | 'ready' | 'error';
  searchErrorText?: string | null;
  onJourneyNavigate?: (view: AppView) => void;
  onAskKs001?: () => void;
  contextLabel?: string | null;
  connectionsPanel?: React.ReactNode;
  /** Optional quick collecting without changing Store route or KS001 controller. */
  onCollect?: (offer: StoreOffer, destination: StoreDestination) => void;
  onQuickKs001?: (offer: StoreOffer) => void;
  selection?: SelectionItem[];
  selectionPanel?: React.ReactNode;
  shoppingWide?: boolean;
}

/**
 * Fully props-driven (no storeData.ts import): the fixture caller (App.tsx) computes
 * `searchOffers(query)`/`demoStores` itself and passes the result down, exactly as StoreExperience
 * passes real Store search results down. This keeps storeData.ts's fixtures out of any bundle that
 * merely reaches this component — the same "move the fixture call to the fixture caller" fix Golden
 * Spine E applied to AgreementDetail/moneyData.ts. There is no backend "list all stores" endpoint, so
 * real mode always passes `stores={[]}` and that section is hidden rather than fabricated.
 */
export function StoreHome({ onOpenOffer, onOpenStore, onManageStore, onCreateOffer, onStartConversation, offers, stores, storeLinks = [], query, onQueryChange, searchStatus, searchErrorText, onAskKs001, contextLabel, connectionsPanel, onCollect, onQuickKs001, selection = [], selectionPanel, shoppingWide = false, embedded = false }: StoreHomeProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className={shoppingWide && selectionPanel ? 'mx-auto w-full max-w-[1530px] px-3 py-4 sm:px-5' : embedded ? 'mx-auto w-full max-w-3xl px-3 py-4 sm:px-5' : 'max-w-2xl mx-auto px-4 md:px-6 py-6'}>
        <div className={shoppingWide && selectionPanel ? 'grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(275px,340px)]' : 'min-w-0'}>
          <div className="min-w-0">
        <section aria-label="Digital Store entrance" className={embedded ? 'mb-3 rounded-2xl border border-cream-200 bg-white px-4 py-3 sm:px-5' : 'sp-hero mb-3 px-5 py-4 md:px-7 md:py-5'}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="sp-kicker">{contextLabel ? `Finding things for ${contextLabel}` : 'Digital Stores · Goods and services'}</span>
            <span className="rounded-full border border-forest-100 bg-forest-50 px-2.5 py-1 text-[0.65rem] font-semibold text-forest-700">Buy safe · Build smart</span>
          </div>
          <h1 className={embedded ? 'sp-type-display mt-1.5 text-2xl leading-tight text-forest-900' : 'sp-display mt-1.5 text-3xl text-forest-900 md:text-4xl'}>
            {contextLabel ? `Find what ${contextLabel} needs` : 'Good things. Good people. Clear agreements.'}
          </h1>
          <p className="mt-1 max-w-2xl text-[0.81rem] leading-5 text-sand-600">
            Find something useful, meet the trader behind it, and ask before you agree. Your own Digital Store is just as welcome.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Choose what to do in Digital Stores">
            <button type="button" onClick={()=>document.getElementById("store-search")?.scrollIntoView({behavior:"smooth",block:"start"})} className="flex min-h-[65px] flex-col justify-center rounded-xl border border-forest-300 bg-forest-50 px-3 py-3 text-left text-forest-800">
              <span className="flex items-center gap-1.5 text-[0.84rem] font-semibold"><ShoppingBag size={15}/> Shop</span>
              <span className="mt-1 text-[0.7rem] text-sand-600">Find goods and services</span>
            </button>
            <button type="button" onClick={onCreateOffer} className="min-h-[65px] rounded-xl border border-cream-200 bg-white px-3 py-2 text-left hover:border-forest-300">
              <span className="flex items-center gap-1.5 text-[0.84rem] font-semibold text-forest-800"><Plus size={15}/> Sell something</span>
              <span className="mt-1 block text-[0.7rem] text-sand-600">Make your first offer</span>
            </button>
            <button type="button" onClick={onManageStore} className="min-h-[65px] rounded-xl border border-cream-200 bg-white px-3 py-2 text-left hover:border-forest-300">
              <span className="flex items-center gap-1.5 text-[0.84rem] font-semibold text-forest-800"><Store size={15}/> My Store</span>
              <span className="mt-1 block text-[0.7rem] text-sand-600">Manage offers and enquiries</span>
            </button>
          </div>
        </section>

        {connectionsPanel && <div className="mb-4">{connectionsPanel}</div>}

        <section id="store-search" aria-label="Shop for goods and services" className="mb-3 scroll-mt-8 rounded-2xl border border-cream-200 bg-white px-3 py-3 sm:px-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-base text-forest-900">What would you like to find today?</h2>
            <span className="hidden text-[0.68rem] text-sand-500 sm:inline">Goods · Services · Capacity</span>
          </div>
          <label className="relative block">
            <span className="sr-only">Search Digital Stores</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sand-500"/>
            <input
              type="search"
              value={query}
              onChange={event => onQueryChange(event.target.value)}
              placeholder="Search goods, skills, services or a shop…"
              aria-label="Search Digital Stores"
              className="min-h-12 w-full rounded-xl border border-cream-300 bg-cream-50 pl-10 pr-4 text-sm text-forest-800 placeholder:text-sand-500 focus:border-forest-400 focus:outline-none"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick searches">
            {[
              {label:'All offers',query:'',Icon:ShoppingBag},
              {label:'Phones',query:'phone',Icon:Package},
              {label:'CCTV',query:'CCTV',Icon:Package},
              {label:'Painting',query:'painting',Icon:Wrench},
              {label:'Survey',query:'survey',Icon:Wrench},
            ].map(item=><button key={item.label} type="button" onClick={()=>onQueryChange(item.query)}
              aria-pressed={query.toLowerCase()===item.query.toLowerCase()}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${query.toLowerCase()===item.query.toLowerCase()?'border-forest-300 bg-forest-50 text-forest-800':'border-cream-200 bg-white text-sand-600 hover:border-forest-300'}`}>
              <item.Icon size={13}/>{item.label}
            </button>)}
          </div>
        </section>

        {/* Offers */}
        <div className="mb-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="font-display text-xl font-semibold text-forest-900">Explore the shelves</h2><p className="mt-1 text-xs text-sand-600">Discover goods and services offered by traders.</p></div>{searchStatus==="ready" && <span role="status" className="text-xs text-sand-600">{offers.length} {offers.length===1?"offer":"offers"}</span>}</div>
          {searchStatus === 'loading' ? (
            <p role="status" className="text-[0.825rem] text-sand-500 text-center py-8">Searching…</p>
          ) : searchStatus === 'error' ? (
            <div className="rounded-2xl border border-ember-200 bg-ember-50 px-5 py-6 text-center">
              <p className="text-[0.875rem] text-ember-700">{searchErrorText ?? 'SecurePay could not search the Store.'}</p>
              <p className="mt-1 text-[0.76rem] text-sand-600">You can still tell KS001 what you need while Store search recovers.</p>
              <button onClick={onStartConversation} className="mt-3 min-h-11 rounded-full border border-forest-200 bg-white px-4 text-[0.8rem] font-medium text-forest-700">
                Tell KS001 what you need
              </button>
            </div>
          ) : offers.length === 0 ? (
            <div className="rounded-2xl border border-cream-200 bg-white px-5 py-8 text-center">
              <p role="status" className="text-[0.9rem] leading-relaxed text-sand-700">{query.trim() ? `Nothing matching “${query.trim()}” is published on SecurePay yet.` : 'Nothing is published on SecurePay right now.'}</p>
              {query.trim() && <p className="mt-1 text-[0.78rem] text-sand-500">Search looks for these words in an offer’s title or description, or in the seller’s place. One plain word works best.</p>}
              <button onClick={onStartConversation} className="mt-2 text-[0.825rem] font-medium text-forest-600 hover:text-forest-700">
                Tell SecurePay what you need
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-label="Published Store offers">
              {offers.map((offer: StoreOffer) => (
                <ShopOfferCard key={offer.id} offer={offer}
                  onOpen={() => onOpenOffer(offer.id)}
                  onOpenStore={() => onOpenStore(offer.storeId)}
                  onCollect={onCollect}
                  onQuickKs001={onQuickKs001}
                  selectedCounts={{
                    vision:selection.find(item=>item.offerId===offer.id&&item.sellerKsNumber===offer.storeId&&item.destination==='vision')?.quantity||0,
                    agreement:selection.find(item=>item.offerId===offer.id&&item.sellerKsNumber===offer.storeId&&item.destination==='agreement')?.quantity||0,
                  }}/>
              ))}
            </div>
          )}
        </div>

        {/* Real published sellers; the backend searches offers, not all registered
            businesses. Do not fabricate a Store directory from demo fixtures. */}
        {storeLinks.length > 0 && <div className="mb-5">
          <div className="mb-2 text-[0.7rem] font-medium uppercase tracking-wide text-sand-600">Stores with published offers</div>
          <div className="flex flex-wrap gap-2">
            {storeLinks.map(seller => <button key={seller.ksNumber} type="button"
              onClick={() => onOpenStore(seller.ksNumber)}
              className="min-h-11 rounded-xl border border-cream-200 bg-white px-4 py-2 text-left hover:border-forest-300">
              <span className="block text-sm font-medium text-forest-800">{seller.displayName}</span>
              {seller.locationLabel && <span className="text-xs text-sand-600">{seller.locationLabel}</span>}
            </button>)}
          </div>
        </div>}
        {/* Legacy fixture-only StoreIdentity list, for the separate fixture app. */}
        {stores.length > 0 && (
          <div className="mb-5">
            <div className="text-[0.7rem] font-medium text-sand-600 uppercase tracking-wide mb-2">Stores</div>
            <div className="space-y-2">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => onOpenStore(store.id)}
                  className="w-full text-left rounded-xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-all flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-cream-100 flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4 text-sand-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[0.875rem] font-medium text-forest-800">{store.name}</div>
                    <div className="text-[0.72rem] text-sand-500">{store.serviceAreas.join(' · ')}</div>
                  </div>
                  {store.verified && <span className="text-[0.6rem] font-medium text-forest-600 bg-forest-50 rounded-full px-2 py-0.5">Verified</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <details className="mb-4 rounded-2xl border border-cream-200 bg-white/70">
          <summary className="min-h-11 cursor-pointer list-none px-4 py-3 text-sm font-medium text-forest-800">More ways to sell <ChevronRight size={14} className="ml-1 inline"/></summary>
          <div className="border-t border-cream-200 p-4">
            <div className="flex flex-col gap-2">
              <button
                onClick={onCreateOffer}
                className="flex min-h-11 items-center gap-2 rounded-lg bg-forest-50 px-3 text-[0.825rem] font-medium text-forest-700 hover:bg-forest-100"
              >
                <Plus className="w-3.5 h-3.5" />
                Create an offer
              </button>
              <button
                onClick={onManageStore}
                className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-[0.825rem] font-medium text-sand-600 hover:text-forest-600"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Manage my Store
              </button>
            </div>
          </div>
        </details>

        <details className="mb-4 rounded-2xl border border-cream-200 bg-white/70">
          <summary className="min-h-11 cursor-pointer list-none px-4 py-3 text-sm font-medium text-forest-800">Ask KS001 about what you need</summary>
          <div className="border-t border-cream-200 p-4">
            <Ks001SurfaceGuide surface="store" onAsk={onAskKs001} />
          </div>
        </details>

                {/* Agent */}
        <button
          onClick={onStartConversation}
          className="w-full mt-4 rounded-xl border border-cream-200 bg-cream-50/50 px-4 py-3 text-left hover:bg-cream-50 transition-colors"
        >
          <span className="flex items-center gap-1.5 text-[0.825rem] text-forest-600 font-medium">
            <MessageCircle className="w-3.5 h-3.5" />
            Tell KS001 what you need
          </span>
          <p className="text-[0.72rem] text-sand-600 mt-0.5">Describe what you need and SecurePay will search for matching offers</p>
        </button>
          </div>
          {selectionPanel && <div className="min-w-0" data-store-selection-right>{selectionPanel}</div>}
        </div>
      </div>
    </div>
  );
}
