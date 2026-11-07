import { useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, MessageCircle, Plus, Store, X } from 'lucide-react';
import type { StoreOffer } from '../../types';
import { StoreHome } from '../../components/StoreHome';
import { demoOffers, demoStores, getOfferById, getOffersByStore, getStoreById, searchOffers } from '../../storeData';

/**
 * An actual, interactive SHOPFRONT review of the SAME StoreHome component used
 * for real published offers. Sample inventory and trader identities are
 * deliberately sourced from the existing Store demo fixtures.
 *
 * This is never selected for a signed-in live StoreIntegration, does NOT touch
 * Store gateways, offer publication, contacts, KS identity, Agreements or Money.
 * The entire KS001 three-panel masterpiece stays mounted around this view.
 */
type Page = 'shop'|'offer'|'store'|'manage'|'create'|'ask';
const PHOTO: Record<string, string> = {
  'offer-cctv': 'https://images.unsplash.com/photo-1558002038-1055907df827?w=900&auto=format&fit=crop&q=78',
  'offer-painting': 'https://images.unsplash.com/photo-1567016507665-356928ac6679?w=900&auto=format&fit=crop&q=78',
  'offer-iphone': 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=900&auto=format&fit=crop&q=78',
  'offer-survey': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=78',
  'offer-external': 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=900&auto=format&fit=crop&q=78',
};
const demoPublished = (offers: StoreOffer[]): StoreOffer[] => offers
  .filter(offer => offer.lifecycle === 'published')
  .map(offer => ({
    ...offer,
    media: PHOTO[offer.id]
      ? [{ id:'example-photo-'+offer.id, url:PHOTO[offer.id], caption:'Illustrative image, not a verified seller photograph', isExample:true }]
      : offer.media,
  }));

export function StoreMasterpieceLayoutReview() {
  const [page,setPage] = useState<Page>('shop');
  const [query,setQuery] = useState('');
  const [offerId,setOfferId] = useState<string | null>(null);
  const [storeId,setStoreId] = useState<string | null>(null);
  const [notice,setNotice] = useState('');
  const [drafts,setDrafts] = useState<{id:number;title:string;shop:string;kind:string;price:string}[]>([]);
  const [shopName,setShopName] = useState('');
  const [offerTitle,setOfferTitle] = useState('');
  const [offerKind,setOfferKind] = useState('Goods');
  const [price,setPrice] = useState('');
  const [question,setQuestion] = useState('');
  const visible = demoPublished(searchOffers(query));
  const selectedOffer = offerId ? getOfferById(offerId) : null;
  const selectedShop = storeId ? getStoreById(storeId) : null;
  const back = () => {setPage('shop');setNotice('');};
  const shopOffers = selectedShop ? demoPublished(getOffersByStore(selectedShop.id)) : [];
  const startEnquiry = (offer:StoreOffer) => {
    setQuestion('I am interested in '+offer.title+' from '+offer.storeName+
      '. Help me check what is included, the actual price, availability and delivery or collection terms before I agree.');
    setPage('ask');
    setNotice('');
  };
  const startDraft = (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if(!shopName.trim()||!offerTitle.trim()){setNotice('Enter a Store name and what you will offer.');return;}
    const draft={id:Date.now(),shop:shopName.trim(),title:offerTitle.trim(),kind:offerKind,price:price.trim()};
    setDrafts(current=>[draft,...current]);
    setNotice('Sample offer drafted in this preview only. It is not published, searchable, sent to anyone or linked to a KS Number.');
    setPage('manage');
    setOfferTitle('');setPrice('');
  };
  return (
    <div data-store-shopfront-review data-p0-layout-review-only className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-cream-50">
      <div role="status" className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-cream-200 bg-white px-4 py-2 text-[0.72rem] text-sand-700">
        <span><strong className="text-forest-800">Shopfront preview</strong> · Example shops, offers and photos. Not live trader listings.</span>
        {page!=='shop'&&<button type="button" onClick={back} className="inline-flex items-center gap-1 font-semibold text-forest-700"><ArrowLeft size={14}/> Back to shop</button>}
      </div>
      {notice&&<div role="status" className="shrink-0 border-b border-forest-100 bg-forest-50 px-4 py-2 text-xs text-forest-800">{notice}</div>}

      {page==='shop'&&
        <StoreHome embedded
          query={query} onQueryChange={setQuery}
          offers={visible}
          stores={demoStores.map(store=>({...store,verified:false}))}
          searchStatus="ready"
          onOpenOffer={id=>{setOfferId(id);setNotice('');setPage('offer');}}
          onOpenStore={id=>{setStoreId(id);setNotice('');setPage('store');}}
          onCreateOffer={()=>{setNotice('');setPage('create');}}
          onManageStore={()=>{setNotice('');setPage('manage');}}
          onStartConversation={()=>{setQuestion('I need help finding a reliable seller or service for what I want. What is the most useful thing to check next?');setPage('ask');}}
          onAskKs001={()=>{setQuestion('Can you help me compare offers and understand the agreement before I buy?');setPage('ask');}}
        />
      }

      {page==='offer'&&selectedOffer&&<div className="flex-1 overflow-y-auto p-4 sm:p-5" aria-label="Sample offer details">
        <article className="rounded-2xl border border-cream-200 bg-white p-4 sm:p-5">
          {PHOTO[selectedOffer.id]&&
            <div className="overflow-hidden rounded-xl bg-cream-100">
              <img loading="lazy" src={PHOTO[selectedOffer.id]} alt="Illustrative item photograph, not seller evidence" className="h-48 w-full object-cover"/>
              <p className="px-3 py-1.5 text-[0.68rem] text-sand-600">Illustration only. Not an actual trader's product photograph.</p>
            </div>}
          <p className="sp-kicker mt-4">Example listing · {selectedOffer.offerType}</p>
          <h2 className="sp-type-display mt-1 text-2xl text-forest-900">{selectedOffer.title}</h2>
          <p className="mt-1 text-sm text-sand-600">{selectedOffer.storeName} · {selectedOffer.serviceArea}</p>
          <p className="mt-3 font-display text-2xl font-semibold text-forest-800">{selectedOffer.price}</p>
          <p className="mt-1 text-xs text-sand-600">Sample price only · Provider must confirm availability and terms.</p>
          <p className="mt-4 text-sm leading-6 text-sand-700">{selectedOffer.description}</p>
          <div className="mt-4 rounded-xl border border-cream-200 bg-cream-50 p-3 text-xs text-sand-700">
            <strong className="text-forest-900">Before you agree</strong>
            <div className="mt-2 space-y-1">
              <p>• What is included and excluded?</p>
              <p>• Does the seller still have it or have time to deliver?</p>
              <p>• How and when will you receive it?</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={()=>startEnquiry(selectedOffer)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white"><MessageCircle size={16}/> Ask KS001 about this</button>
            <button type="button" onClick={()=>{setStoreId(selectedOffer.storeId);setPage('store');}}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-forest-200 px-4 text-sm font-semibold text-forest-800"><Store size={16}/> Visit sample shop</button>
          </div>
          <p className="mt-3 text-xs text-sand-500">Demo actions don't contact sellers, place orders, create Agreements or move money.</p>
        </article>
      </div>}

      {page==='store'&&selectedShop&&<div className="flex-1 overflow-y-auto p-4 sm:p-5" aria-label="Example trader shop">
        <section className="rounded-2xl border border-cream-200 bg-white p-5">
          <div className="flex items-start justify-between gap-2">
            <div><p className="sp-kicker">Digital Store · Example shop</p><h2 className="sp-type-display mt-1 text-2xl text-forest-900">{selectedShop.name}</h2></div>
            <Store size={25} className="text-forest-700"/>
          </div>
          <p className="mt-2 text-sm leading-6 text-sand-600">{selectedShop.description}</p>
          <p className="mt-2 text-xs text-sand-600">Serves: {selectedShop.serviceAreas.join(' · ')}</p>
          <p className="mt-2 text-xs text-amber-800">Preview identity only. The original demo's seller information is not independently verified.</p>
        </section>
        <h3 className="mt-5 font-display text-lg text-forest-900">What this shop offers</h3>
        {shopOffers.length===0?<p className="mt-3 text-sm text-sand-600">No example offers are published for this sample shop.</p>
          :<div className="mt-3 grid gap-3 sm:grid-cols-2">
            {shopOffers.map(offer=><button type="button" key={offer.id} onClick={()=>{setOfferId(offer.id);setPage('offer');}}
              className="overflow-hidden rounded-xl border border-cream-200 bg-white text-left">
              {PHOTO[offer.id]&&<img src={PHOTO[offer.id]} alt="Illustrative product or service" loading="lazy" className="h-28 w-full object-cover"/>}
              <span className="block p-3"><strong className="block text-sm text-forest-800">{offer.title}</strong><span className="mt-1 block text-xs text-sand-600">{offer.price}</span><span className="mt-2 inline-block text-xs font-semibold text-forest-700">See offer →</span></span>
            </button>)}
          </div>}
      </div>}

      {page==='create'&&<div className="flex-1 overflow-y-auto p-4 sm:p-5" aria-label="Create sample offer">
        <form onSubmit={startDraft} className="space-y-4 rounded-2xl border border-cream-200 bg-white p-5">
          <p className="sp-kicker">Start selling</p>
          <h2 className="sp-type-display text-2xl text-forest-900">What would you like to offer?</h2>
          <p className="text-sm leading-6 text-sand-600">Show customers what you have or what you can do. In the real Store, KS001 helps turn a genuine offer into an agreement when someone is interested.</p>
          <label className="block text-xs font-semibold text-forest-800">Name of your Store
            <input required maxLength={90} value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="e.g. Mary’s Hardware"
              className="mt-1 min-h-11 w-full rounded-lg border border-cream-300 px-3 text-sm font-normal"/>
          </label>
          <label className="block text-xs font-semibold text-forest-800">Goods or service?
            <select value={offerKind} onChange={e=>setOfferKind(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-cream-300 px-3 text-sm font-normal">
              <option>Goods</option><option>Services</option><option>Capacity</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-forest-800">What are you offering?
            <input required maxLength={140} value={offerTitle} onChange={e=>setOfferTitle(e.target.value)} placeholder="e.g. 50 kg cement bags, room painting"
              className="mt-1 min-h-11 w-full rounded-lg border border-cream-300 px-3 text-sm font-normal"/>
          </label>
          <label className="block text-xs font-semibold text-forest-800">Example price (optional)
            <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="e.g. KSh 850 per bag"
              className="mt-1 min-h-11 w-full rounded-lg border border-cream-300 px-3 text-sm font-normal"/>
          </label>
          <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white"><Plus size={16}/> Save a sample offer draft</button>
          <p className="text-xs text-sand-500">Demo draft lives only in this preview until you leave. No real Store created, no offer published, and no KS Number issued.</p>
        </form>
      </div>}

      {page==='manage'&&<div className="flex-1 overflow-y-auto p-4 sm:p-5" aria-label="Manage Store sample">
        <div className="rounded-2xl border border-cream-200 bg-white p-5">
          <p className="sp-kicker">Your Digital Store</p>
          <h2 className="sp-type-display mt-1 text-2xl text-forest-900">A shop you can actually manage.</h2>
          <p className="mt-2 text-sm text-sand-600">A real seller adds a Store address, photographs and publishes offers, receives enquiries and replies, and can ask KS001 to help with an agreement.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-forest-50 px-3 py-3"><strong className="block text-lg text-forest-800">{drafts.length}</strong>Demo drafts</div>
            <div className="rounded-xl bg-cream-50 px-3 py-3"><strong className="block text-lg text-forest-800">0</strong>Live published offers</div>
          </div>
          {drafts.length>0&&<section className="mt-4"><h3 className="font-semibold text-forest-900">Sample drafts</h3>
            <div className="mt-2 space-y-2">{drafts.map(draft=><div key={draft.id} className="rounded-xl border border-cream-200 bg-white px-3 py-3">
              <div className="flex items-start justify-between gap-3"><div><strong className="text-sm text-forest-800">{draft.title}</strong><p className="text-xs text-sand-600">{draft.shop} · {draft.kind}{draft.price ? ' · '+draft.price:''}</p></div>
                <button type="button" aria-label={'Delete draft '+draft.title} onClick={()=>setDrafts(current=>current.filter(d=>d.id!==draft.id))}><X size={16}/></button>
              </div><p className="mt-2 text-xs text-sand-500">Preview draft · Not sent or published.</p>
            </div>)}</div>
          </section>}
          <button type="button" onClick={()=>{setPage('create');setNotice('');}} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white"><Plus size={16}/> Add an offer</button>
          <section className="mt-5 border-t border-cream-200 pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-forest-900"><CheckCircle2 size={16}/> Serve your community too</h3>
            <p className="mt-1 text-xs leading-5 text-sand-600">The real Digital Store signup also offers an optional application for ShortStays, My Ride or Storage. Joining requires a separate consent and later verification by that service.</p>
          </section>
        </div>
      </div>}

      {page==='ask'&&<div className="flex-1 overflow-y-auto p-4 sm:p-5" aria-label="Ask KS001 about Store sample">
        <section className="rounded-2xl border border-cream-200 bg-white p-5">
          <p className="sp-kicker">Ask KS001 · Store enquiry</p>
          <h2 className="sp-type-display mt-1 text-2xl text-forest-900">Turn interest into a clear agreement.</h2>
          <p className="mt-2 text-sm text-sand-600">This is the example request that the real Store can hand to the same KS001 conversation after the person chooses an actual published offer.</p>
          <div className="mt-4 rounded-xl bg-forest-50 p-4 text-sm leading-6 text-forest-900">{question}</div>
          <button type="button" onClick={()=>{setNotice('This is a visual preview. Nothing was sent to KS001, a seller, or SecurePay.');setPage('shop');}}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-forest-200 bg-white px-4 text-sm font-semibold text-forest-800"><MessageCircle size={16}/> Return to the shop</button>
          <p className="mt-3 text-xs text-sand-600">A verified backend and human action are required for real offers, messages, agreements or payments.</p>
        </section>
      </div>}
    </div>
  );
}
