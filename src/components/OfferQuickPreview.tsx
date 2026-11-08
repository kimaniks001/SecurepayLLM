import { ArrowLeft, MessageCircle, Store } from 'lucide-react';
import type { StoreOffer } from '../types';
import type { StoreDestination } from '../features/store/shopSelection.mjs';

export function OfferQuickPreview({ offer, onBack, backLabel = 'Results', sourceLabel, onUseThis, onAskKs001, onOpenStore, onOpenFull, onCollect }: {
  offer: StoreOffer;
  onBack: () => void;
  backLabel?: string;
  sourceLabel?: string | null;
  onUseThis: () => void;
  onAskKs001: () => void;
  onOpenStore: () => void;
  onOpenFull: () => void;
  onCollect?: (offer:StoreOffer,destination:StoreDestination)=>void;
}) {
  const unavailable = offer.lifecycle === 'unavailable';
  return (
    <div className="sp-life-canvas flex-1 overflow-y-auto scrollbar-thin pb-24 md:pb-0" data-store-offer-preview>
      <div className="mx-auto w-full max-w-2xl px-4 py-5 md:px-6 md:py-7">
        <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-sand-600 hover:text-forest-700">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </button>

        <section className="sp-hero mt-2 px-5 py-5 md:px-7 md:py-6">
          <div className="sp-kicker">Offer preview</div>
          {sourceLabel && <p className="mt-2 text-xs font-medium text-forest-700">{sourceLabel}</p>}
          <h1 className="sp-display mt-2 text-3xl text-forest-900 md:text-4xl">{offer.title}</h1>
          <button type="button" onClick={onOpenStore} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm text-forest-700">
            <Store className="h-4 w-4" />
            {offer.storeName}
          </button>
          {offer.description && <p className="mt-3 text-sm leading-6 text-sand-600">{offer.description}</p>}
        </section>

        <section aria-label="Offer at a glance" className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sp-section px-4 py-4">
            <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">What does it cost?</div>
            <div className="mt-1 font-display text-xl text-forest-900">{offer.price}</div>
            {offer.priceType === 'unlisted' && <p className="mt-1 text-xs text-sand-500">SecurePay does not have an established price for this offer.</p>}
          </div>
          <div className="sp-section px-4 py-4">
            <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">Is it available?</div>
            <div className="mt-1 text-sm font-medium text-forest-900">{offer.availability}</div>
            <p className="mt-1 text-xs text-sand-500">{unavailable ? 'This offer cannot be used right now.' : 'Seller-listed availability. Confirm with the trader before agreeing.'}</p>
          </div>
          <div className="sp-section px-4 py-4 sm:col-span-2">
            <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">Where?</div>
            <div className="mt-1 text-sm font-medium text-forest-900">{offer.serviceArea || 'Service area not established'}</div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-forest-200 bg-white/85 p-4 md:p-5">
          <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">What can I do next?</div>
          {unavailable ? (
            <p className="mt-2 text-sm text-sand-600">This offer is currently unavailable. You can still inspect the Store, ask KS001, or read the full offer.</p>
          ) : (
            <p className="mt-2 text-sm text-sand-600">Interested? Ask KS001 what matters, visit the trader's shop or work out the agreement details. Viewing an offer never reserves or pays for it.</p>
          )}
          {onCollect && <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={()=>onCollect(offer,'vision')}
              className="min-h-11 rounded-xl border border-forest-200 bg-forest-50 px-4 text-sm font-semibold text-forest-800">+ Add to Vision</button>
            {!unavailable && <button type="button" onClick={()=>onCollect(offer,'agreement')}
              aria-label={'Add '+offer.title+' to KS Cart'}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white shadow-[0_2px_7px_rgba(21,58,40,0.11)] transition-colors hover:bg-forest-900 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500">Add to Cart</button>}
          </div>}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={onAskKs001} className="sp-primary-action inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm font-semibold">
              <MessageCircle className="h-4 w-4" /> Ask KS001 about this
            </button>
            <button type="button" onClick={onOpenStore} className="min-h-11 rounded-xl border border-forest-200 bg-white px-4 text-sm font-medium text-forest-700">Visit this shop</button>
            {!unavailable && <button type="button" onClick={onUseThis} className="min-h-11 rounded-xl border border-cream-200 bg-white px-4 text-sm font-medium text-forest-700">Work out an agreement</button>}
            <button type="button" onClick={onOpenFull} className="min-h-11 rounded-xl px-4 text-sm font-medium text-sand-600 underline">See full offer</button>
          </div>
        </section>
      </div>
    </div>
  );
}
