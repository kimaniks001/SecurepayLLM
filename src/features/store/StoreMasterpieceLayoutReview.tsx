import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, MessageCircle, Plus, Store, X } from 'lucide-react';
import type { StoreOffer } from '../../types';
import { StoreHome } from '../../components/StoreHome';
import { ShopOfferCard, ShopOfferCover } from '../../components/ShopOfferCard';
import { StoreCollectionPanel } from '../../components/StoreCollectionPanel';
import type { SelectionItem, StoreDestination } from './shopSelection.mjs';
import { collectOffer, removeSelected, updateSelectedQuantity, updateSelectedBuyerNote, selectionToKs001 } from './shopSelection.mjs';
import { demoStores, getOfferById, getOffersByStore, getStoreById, searchOffers } from '../../storeData';
import type { StoreBrowserTarget } from '../living-workspace/CompactStoreBrowser';

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
const demoPublished=(offers:StoreOffer[])=>offers.filter(offer=>offer.lifecycle==='published');

function nextHelpfulQuestion(offer:StoreOffer) {
  const title=offer.title.toLowerCase();
  if(/survey|land/.test(title))return 'Where is the land, and which survey do you need?';
  if(/paint|install|construction/.test(title))return 'Where will the work take place?';
  if(offer.offerType==='service')return 'Where do you need the service?';
  return 'Where should the item be delivered or collected?';
}

function itemCheck(offer:StoreOffer) {
  if(/survey|land/.test(offer.title.toLowerCase()))return ['What sort of survey is required?','Which documents must the surveyor provide?','What date can the site work begin?'];
  if(offer.offerType==='service'||offer.offerType==='package')return ['What work is included and excluded?','Where and when will the work be done?','What confirms that the work is complete?'];
  return ['What is the exact item, quantity and condition?','Is it currently available?','How will it be delivered or collected?'];
}

export function StoreMasterpieceLayoutReview({shopFocused=true,onSelectionChange,workspaceSelection,onOpenKs001Preview,externalNavigation}:{shopFocused?:boolean;onSelectionChange?:(items:SelectionItem[])=>void;workspaceSelection?:SelectionItem[];onOpenKs001Preview?:()=>void;externalNavigation?:StoreBrowserTarget|null}) {
  const [page,setPage] = useState<Page>('shop');
  useEffect(()=>{
    if(!externalNavigation)return;
    if(externalNavigation.kind==='store' && externalNavigation.storeKs){
      setStoreId(externalNavigation.storeKs);setPage('store');
    }else if(externalNavigation.kind==='item' && externalNavigation.offerId){
      setOfferId(externalNavigation.offerId);setPage('offer');
    }else if(externalNavigation.kind==='marketplace'){
      setPage('shop');
    }
  },[externalNavigation?.requestId]);
  const [quickShopOffer,setQuickShopOffer] = useState<string|null>(null);
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
  const [nextQuestion,setNextQuestion] = useState('');
  const [answer,setAnswer] = useState('');
  const [prepared,setPrepared] = useState(false);
  const [selection,setSelection] = useState<SelectionItem[]>([]);
  const selectionRef=useRef<SelectionItem[]>([]);
  const [collectionNotice,setCollectionNotice] = useState('');
  const [selectionDraft,setSelectionDraft] = useState('');
  useEffect(()=>{
    if(workspaceSelection && workspaceSelection!==selectionRef.current){selectionRef.current=workspaceSelection;setSelection(workspaceSelection);setSelectionDraft('');}
  },[workspaceSelection]);
  const collect=(offer:StoreOffer,destination:StoreDestination)=>{
    try{
      const next=collectOffer(selectionRef.current,offer,destination,true);
      selectionRef.current=next;setSelection(next);onSelectionChange?.(next);
      setCollectionNotice((destination==='vision'?'Vision':'Agreement')+': added '+offer.title+'. Keep browsing.');
      setSelectionDraft('');
    }catch(error){setCollectionNotice(error instanceof Error?error.message:'Could not add that offer.');}
  };
  const quickAsk=(offer:StoreOffer)=>{
    try{
      // Asking about an already selected item must not silently add another unit.
      const existing=selectionRef.current.find(item=>item.offerId===offer.id && item.sellerKsNumber===offer.storeId && item.destination==='agreement');
      const next=existing ? selectionRef.current : collectOffer(selectionRef.current,offer,'agreement',true);
      selectionRef.current=next;setSelection(next);onSelectionChange?.(next);
      setSelectionDraft(selectionToKs001(next,'agreement'));
      setCollectionNotice('Your example KS001 discussion is open. No live message has been sent.');
      onOpenKs001Preview?.();
    }catch(error){setCollectionNotice(error instanceof Error?error.message:'Could not prepare KS001 question.');}
  };
  const stage=(destination:StoreDestination)=>{
    try{
      const proposal=selectionToKs001(selectionRef.current,destination);
      setSelectionDraft(proposal);
      setCollectionNotice(destination==='vision'
        ? 'Example Vision draft prepared here for review only. Nothing has been saved to Vision.'
        : 'Example agreement enquiry ready. You can discuss it in the guided KS001 preview.');
      if(destination==='agreement')onOpenKs001Preview?.();
    }catch(error){setCollectionNotice(error instanceof Error?error.message:'Could not prepare that selection.');}
  };
  const visible = demoPublished(searchOffers(query));
  const selectedOffer = offerId ? getOfferById(offerId) : null;
  const selectedShop = storeId ? getStoreById(storeId) : null;
  const back = () => {setPage('shop');setNotice('');};
  const shopOffers = selectedShop ? demoPublished(getOffersByStore(selectedShop.id)) : [];
  const startEnquiry = (offer:StoreOffer) => {
    setQuestion('I am interested in '+offer.title+' from '+offer.storeName+
      '. Help me clarify what is included, confirm availability and terms, and prepare a fair-trade enquiry.');
    setNextQuestion(nextHelpfulQuestion(offer));setAnswer('');setPrepared(false);
    quickAsk(offer);
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
  const basketPane=<StoreCollectionPanel
    items={selection}
    onQuantity={(key,value)=>{const next=updateSelectedQuantity(selectionRef.current,key,value);selectionRef.current=next;setSelection(next);onSelectionChange?.(next);setSelectionDraft('');}}
    onRemove={key=>{const next=removeSelected(selectionRef.current,key);selectionRef.current=next;setSelection(next);onSelectionChange?.(next);setSelectionDraft('');}}
    onNote={(key,note)=>{const next=updateSelectedBuyerNote(selectionRef.current,key,note);selectionRef.current=next;setSelection(next);onSelectionChange?.(next);setSelectionDraft('');}}
    onContinue={stage}
    notice={collectionNotice}
    draftPreview={selectionDraft}
    example
  />;
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
          shoppingWide={shopFocused}
          selection={selection}
          onCollect={collect}
          onQuickKs001={quickAsk}
          selectionPanel={shopFocused ? basketPane : undefined}
          searchStatus="ready"
          onOpenOffer={id=>{setOfferId(id);setNotice('');setPage('offer');}}
          onOpenStore={id=>{setStoreId(id);setNotice('');setPage('store');}}
          onCreateOffer={()=>{setNotice('');setPage('create');}}
          onManageStore={()=>{setNotice('');setPage('manage');}}
          onStartConversation={()=>onOpenKs001Preview?.()}
          onAskKs001={()=>onOpenKs001Preview?.()}
        />
      }

      {page==='offer'&&selectedOffer&&<div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row" data-store-offer-basket-continuity>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-5" aria-label="Sample offer details">
        <article className="rounded-2xl border border-cream-200 bg-white p-4 sm:p-5">
          <div className="overflow-hidden rounded-xl"><ShopOfferCover offer={selectedOffer} large/></div>
          <p className="mt-2 text-xs text-sand-600">Example presentation, not a verified seller photo or live offer.</p>
          <p className="sp-kicker mt-4">Example {selectedOffer.offerType.replace(/_/g,' ').toLowerCase()} offer</p>
          <h2 className="sp-type-display mt-1 text-2xl text-forest-900">{selectedOffer.title}</h2>
          <p className="mt-1 text-sm text-sand-600">{selectedOffer.storeName} · {selectedOffer.serviceArea}</p>
          <p className="mt-3 font-display text-2xl font-semibold text-forest-800">{selectedOffer.price}</p>
          <p className="mt-1 text-xs text-sand-600">Sample price only · Provider must confirm availability and terms.</p>
          <p className="mt-4 text-sm leading-6 text-sand-700">{selectedOffer.description}</p>
          <div className="mt-4 rounded-xl border border-cream-200 bg-cream-50 p-3 text-xs text-sand-700">
            <strong className="text-forest-900">Before you agree</strong>
            <ul className="mt-2 space-y-1.5">{itemCheck(selectedOffer).map(item=><li key={item}>• {item}</li>)}</ul>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={()=>collect(selectedOffer,'vision')}
              className="min-h-11 rounded-xl border border-forest-200 bg-white px-3 text-sm font-semibold text-forest-800">+ Add to Vision</button>
            <button type="button" onClick={()=>collect(selectedOffer,'agreement')}
              className="min-h-11 rounded-xl bg-forest-800 px-3 text-sm font-semibold text-white">+ Add to collection</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={()=>startEnquiry(selectedOffer)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white"><MessageCircle size={16}/> Ask KS001 about this</button>
            <button type="button" onClick={()=>{setStoreId(selectedOffer.storeId);setPage('store');}}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-forest-200 px-4 text-sm font-semibold text-forest-800"><Store size={16}/> Visit sample shop</button>
          </div>
          <p className="mt-3 text-xs text-sand-500">Demo actions don't contact sellers, place orders, create Agreements or move money.</p>
        </article>
        </div>
        {shopFocused && <div className="min-h-0 w-full shrink-0 overflow-y-auto px-3 pb-3 lg:w-[320px]">{basketPane}</div>}
      </div>}

      {page==='store'&&selectedShop&&<div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row" data-store-store-basket-continuity>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-5" aria-label="Example trader shop">
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
          :<div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shopOffers.map(offer=><ShopOfferCard key={offer.id} offer={offer}
              onOpen={()=>{setOfferId(offer.id);setPage('offer');}}
              onOpenStore={()=>{setStoreId(offer.storeId);}}
              onCollect={collect}
              onQuickKs001={quickAsk}
              quickOpen={quickShopOffer===offer.id}
              onToggleQuick={()=>setQuickShopOffer(current=>current===offer.id?null:offer.id)}
              onCloseQuick={()=>setQuickShopOffer(null)}
              selectedCounts={{
                vision:selection.find(item=>item.offerId===offer.id && item.sellerKsNumber===offer.storeId && item.destination==='vision')?.quantity||0,
                agreement:selection.find(item=>item.offerId===offer.id && item.sellerKsNumber===offer.storeId && item.destination==='agreement')?.quantity||0,
              }}/>)}
          </div>}
        </div>
        {shopFocused && <div className="min-h-0 w-full shrink-0 overflow-y-auto px-3 pb-3 lg:w-[320px]">{basketPane}</div>}
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

      {page==='ask'&&<div className="flex-1 overflow-y-auto p-4 sm:p-5" aria-label="KS001 example Store conversation">
        <section className="mx-auto max-w-2xl rounded-2xl border border-cream-200 bg-white p-4 sm:p-6">
          <p className="sp-kicker">KS001 · Shopping companion · Guided example</p>
          <h2 className="sp-type-display mt-1 text-2xl text-forest-900">A question worth asking.</h2>
          <p className="mt-2 text-xs leading-5 text-sand-600">The live Store hands the real offer to the same KS001 conversation. This review uses a guided example only; no message is sent.</p>
          <div className="mt-4 rounded-xl bg-cream-50 p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-sand-500">Your interest</p>
            <p className="mt-2 text-sm leading-6 text-forest-900">{question}</p>
          </div>
          <div className="mt-4 rounded-xl border border-forest-100 bg-forest-50 p-4">
            <div className="flex items-center gap-2"><MessageCircle size={16} className="text-forest-700"/><strong className="text-sm text-forest-800">KS001 would ask</strong></div>
            <p className="mt-2 text-[0.95rem] leading-6 text-forest-900">{nextQuestion||'What are you hoping to achieve?'}</p>
            <label className="mt-4 block text-xs font-semibold text-forest-800">Your answer (demo)
              <input type="text" value={answer} maxLength={280} onChange={e=>{setAnswer(e.target.value);setPrepared(false);}}
                placeholder="Tell KS001 in your own words…"
                className="mt-2 min-h-11 w-full rounded-lg border border-forest-200 bg-white px-3 text-sm font-normal text-forest-900"/>
            </label>
            <button type="button" disabled={!answer.trim()} onClick={()=>setPrepared(true)}
              className="mt-3 min-h-11 rounded-lg bg-forest-800 px-4 text-sm font-semibold text-white disabled:opacity-40">Preview what KS001 would remember</button>
          </div>
          {prepared&&<div className="mt-4 rounded-xl border border-cream-200 p-4" role="status">
            <p className="text-xs font-bold uppercase tracking-wider text-sand-600">Your enquiry taking shape · Demo only</p>
            <p className="mt-2 text-sm text-forest-900"><strong>Offer:</strong> {selectedOffer?.title||'Goods or service enquiry'}</p>
            <p className="mt-1 text-sm text-forest-900"><strong>Seller:</strong> {selectedOffer?.storeName||'To be confirmed'}</p>
            <p className="mt-1 text-sm text-forest-900"><strong>Your detail:</strong> {answer.trim()}</p>
            <p className="mt-3 text-xs leading-5 text-sand-600">The actual availability, price, obligations and next steps must be agreed with the trader. No offer was accepted and no Agreement was created.</p>
          </div>}
          <button type="button" onClick={()=>{setNotice('This was a guided example only. Your offer is still available in the sample catalogue.');setPage('shop');}}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-forest-200 bg-white px-4 text-sm font-semibold text-forest-800"><ArrowLeft size={16}/> Back to shopping</button>
        </section>
      </div>}
    </div>
  );
}
