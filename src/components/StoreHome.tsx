import { Search, ShoppingBag, Store, Plus, MessageCircle } from 'lucide-react';
import type { StoreIdentity, StoreOffer } from '../types';
import { ResultCard } from '../features/discovery/ui/ResultCard';
import { resultFromStoreOffer } from '../features/discovery/result';

interface StoreHomeProps {
  onOpenOffer: (id: string) => void;
  onOpenStore: (id: string) => void;
  onManageStore: () => void;
  onCreateOffer: () => void;
  onStartConversation: () => void;
  offers: StoreOffer[];
  stores: StoreIdentity[];
  query: string;
  onQueryChange: (query: string) => void;
  searchStatus?: 'idle' | 'loading' | 'ready' | 'error';
  searchErrorText?: string | null;
}

/**
 * Fully props-driven (no storeData.ts import): the fixture caller (App.tsx) computes
 * `searchOffers(query)`/`demoStores` itself and passes the result down, exactly as StoreExperience
 * passes real Store search results down. This keeps storeData.ts's fixtures out of any bundle that
 * merely reaches this component — the same "move the fixture call to the fixture caller" fix Golden
 * Spine E applied to AgreementDetail/moneyData.ts. There is no backend "list all stores" endpoint, so
 * real mode always passes `stores={[]}` and that section is hidden rather than fabricated.
 */
export function StoreHome({ onOpenOffer, onOpenStore, onManageStore, onCreateOffer, onStartConversation, offers, stores, query, onQueryChange, searchStatus, searchErrorText }: StoreHomeProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
        <div className="mb-5">
          <h1 className="font-display text-xl text-forest-800 font-medium">Store</h1>
          <p className="text-[0.85rem] text-sand-500 mt-0.5">What sellers have published on SecurePay. Any offer can become the start of your own agreement.</p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by a word or a place…" aria-label="Search the Store"
            className="w-full rounded-xl border border-cream-200 bg-white pl-10 pr-4 py-2.5 text-[0.875rem] text-forest-800 placeholder:text-sand-400 focus:outline-none focus:border-forest-300"
          />
        </div>

        {/* Stores */}
        {stores.length > 0 && (
          <div className="mb-5">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Stores</div>
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

        {/* Offers */}
        <div className="mb-5">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Offers</div>
          {searchStatus === 'loading' ? (
            <p role="status" className="text-[0.825rem] text-sand-500 text-center py-8">Searching…</p>
          ) : searchStatus === 'error' ? (
            <div className="rounded-2xl border border-ember-200 bg-ember-50 px-5 py-6 text-center">
              <p className="text-[0.875rem] text-ember-700">{searchErrorText ?? 'SecurePay could not search the Store.'}</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {offers.map((offer: StoreOffer) => (
                <ResultCard key={offer.id} offer={resultFromStoreOffer(offer)} onOpen={() => onOpenOffer(offer.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Trader actions */}
        <div className="rounded-2xl border border-cream-200 bg-cream-50/50 px-4 py-3">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">For traders</div>
          <div className="flex flex-col gap-2">
            <button
              onClick={onCreateOffer}
              className="flex items-center gap-2 text-[0.825rem] font-medium text-forest-700 bg-forest-50 hover:bg-forest-100 rounded-lg px-3 py-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create an offer
            </button>
            <button
              onClick={onManageStore}
              className="flex items-center gap-2 text-[0.825rem] font-medium text-sand-600 hover:text-forest-600 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Manage my store
            </button>
          </div>
        </div>

        {/* Agent */}
        <button
          onClick={onStartConversation}
          className="w-full mt-4 rounded-xl border border-cream-200 bg-cream-50/50 px-4 py-3 text-left hover:bg-cream-50 transition-colors"
        >
          <span className="flex items-center gap-1.5 text-[0.825rem] text-forest-600 font-medium">
            <MessageCircle className="w-3.5 h-3.5" />
            Ask SecurePay to find an offer
          </span>
          <p className="text-[0.72rem] text-sand-400 mt-0.5">Describe what you need and SecurePay will search for matching offers</p>
        </button>
      </div>
    </div>
  );
}
