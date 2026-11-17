import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, MessageCircle, Search, ShoppingBag, CheckCircle2, Minus, Plus, RefreshCcw, ShieldCheck } from 'lucide-react';
import { createHttpClient } from '../api/securepay/http';
import { createStoreGateway, type StoreGateway } from '../api/securepay/store';
import type { PublicSearchResultView, PublicStoreView, PublicOfferView } from '../api/securepay/store/dto';
import type { MiniLanguage } from './miniModel';
import { suggestedStoreSearchTerm } from '../features/living-workspace/suggestedStoreSearchTerm.mjs';
import { miniStoreOfferSnapshotFresh } from './miniStoreOfferFresh.mjs';
import { miniBasketReadiness } from './miniBasketReadiness.mjs';
import { miniTradeSampleSearches } from './miniTradePlayground';
import { MiniShopDiscovery, MiniShopGallery } from './MiniStoreGallery';
import { MiniOfferPhoto } from './MiniStoreVisuals';

/**
 * Public Store read-only transport reuses the existing, server-allowlisted
 * /api/preview-workspace Store GET relay. The browser NEVER chooses an upstream
 * origin, sends an API token, writes stock, creates an Agreement or moves Money.
 * A protected preview without a functioning relay fails closed.
 */
const storeReadFetch: typeof fetch = (input, init) => {
  const target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (target.origin !== 'https://securepay.ke' || !/^\/api\/v1\/stores\/(?:search|KS[0-9]{3,12}(?:\/offers\/[0-9a-fA-F-]{36})?)$/.test(target.pathname) ||
      (init?.method ?? 'GET').toUpperCase() !== 'GET')
    return Promise.reject(new Error('Store read is outside the approved public API'));
  return fetch('/api/preview-workspace?path=' + encodeURIComponent(target.pathname + target.search), {
    ...init, method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
  });
};
const stores = createStoreGateway(createHttpClient('https://securepay.ke', () => null, storeReadFetch));

const activeStates = new Set(['AVAILABLE', 'LOW_AVAILABILITY', 'NEEDS_CONFIRMATION', 'TAKING_WORK', 'LIMITED']);
const money = (amountMinor: number | null, currency: string) =>
  amountMinor === null ? 'Price to confirm' : currency + ' ' +
  (amountMinor / 100).toLocaleString('en-KE', { maximumFractionDigits: 2 });

export type MiniStorePlanLine = {
  sellerKsNumber: string; sellerName: string; offerId: string; title: string;
  kind?: 'PRODUCT' | 'SERVICE'; quantity: number; priceMinor: number | null; currency: string;
  description?:string|null;mediaRefs?:string[];
  offerUpdatedAt: string; availabilityState: string;
};
export type MiniBasketFulfilment = 'collect' | 'ask_sellers' | 'explore_combined';
type View = 'search' | 'store' | 'plan';

/** Never infer seller acceptance or stock reservation from a public Store listing. */
export function MiniBuyStore({ language, onBack, initialQuery = '', storeGateway, onDiscuss, playground = false }: {
  language:MiniLanguage; onBack:()=>void; initialQuery?:string;
  /** Existing public StoreGateway, optionally on the same isolated API as KS001. */
  storeGateway?:Pick<StoreGateway,'search'|'store'|'offer'>;
  /** Only after a fresh Store offer check, never on Add to cart alone. */
  onDiscuss?:(lines:MiniStorePlanLine[], fulfilment:MiniBasketFulfilment | null)=>void;
  /** Isolated preview host only; never live offers or financial authority. */
  playground?:boolean;
}) {
  const client=storeGateway??stores;
  const sw = language === 'sw';
  const [view, setView] = useState<View>('search');
  const asSearchTerm = (phrase: string) => {
    const explicitShopping = suggestedStoreSearchTerm(phrase);
    if (explicitShopping) return explicitShopping;
    // The Buy input is an intentional product search. Do not send a whole
    // unsupported conversation, precise address, account, URL or private data.
    const simple = phrase.trim().replace(/[?.!]+$/, '');
    if (simple.length < 2 || simple.length > 75 ||
      /\b(?:phone number|account|password|otp|pin|my address)\b|[@:/\\]|\d{5,}/i.test(simple))
      return '';
    return simple;
  };
  const [term, setTerm] = useState(() => asSearchTerm(initialQuery));
  useEffect(() => {
    if (initialQuery.trim()) setTerm(asSearchTerm(initialQuery));
  }, [initialQuery]);
  const [kind, setKind] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [results, setResults] = useState<PublicSearchResultView[]>([]);
  const [chosenStore, setChosenStore] = useState<PublicStoreView | null>(null);
  const [cart, setCart] = useState<MiniStorePlanLine[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [fulfilmentChoice, setFulfilmentChoice] = useState<MiniBasketFulfilment | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const readiness = miniBasketReadiness(cart,{sourcesFresh:reviewed,fulfilmentChoice});
  const [checking, setChecking] = useState(false);
  const [freshnessError,setFreshnessError] = useState('');
  const [sampleRequests,setSampleRequests] = useState(false);
  const [sampleResponses,setSampleResponses] = useState<Record<string,'accepted'|'declined'>>({});
  const [samplePaid,setSamplePaid] = useState(false);
  const sampleSellers=[...new Set(cart.map(line=>line.sellerKsNumber))];
  const allSampleAccepted=sampleRequests&&sampleSellers.length>0&&
    sampleSellers.every(id=>sampleResponses[id]==='accepted');
  const resetSample=()=>{setSampleRequests(false);setSampleResponses({});setSamplePaid(false);};
  const generation = useRef(0);

  useEffect(()=>{
    if(!playground)return;
    let mounted=true;
    void client.search({kind:'PRODUCT',limit:10}).then(found=>{
      if(mounted)setResults(found);
    }).catch(()=>{ /* synthetic catalogue is optional even in preview */ });
    return()=>{mounted=false;};
  },[client,playground]);
  const find = async (requestedKind:'PRODUCT'|'SERVICE'=kind,requestedTerm:string=term) => {
    const word = requestedTerm.trim();
    if ((!word&&!playground) || word.length > 100) {
      setError(sw ? 'Andika bidhaa unayotafuta.' : 'Tell me what you are looking for.');
      return;
    }
    const request = ++generation.current;
    setWorking(true); setResults([]); setError(''); setChosenStore(null); setView('search');
    try {
      const found = await client.search({kind:requestedKind, category: word, limit: 10});
      if (request === generation.current) setResults(found.filter(x =>
        /^KS\d{3,12}$/.test(x.canonicalKsNumber) && x.offer?.kind === requestedKind &&
        typeof x.offer.id === 'string' && typeof x.offer.title === 'string'));
    } catch {
      if (request === generation.current) setError(sw
        ? 'Hatukuweza kupata orodha halisi za maduka kwa sasa.'
        : 'Published Store listings could not be loaded. Please try again.');
    } finally { if (request === generation.current) setWorking(false); }
  };

  const openStore = async (ks: string) => {
    if (!/^KS\d{3,12}$/.test(ks)) return;
    const request = ++generation.current;
    setWorking(true); setError(''); setChosenStore(null);
    try {
      const found = await client.store(ks);
      if (request === generation.current && found.canonicalKsNumber === ks &&
          found.status === 'ACTIVE' && Array.isArray(found.offers)) {
        setChosenStore(found); setView('store');
      } else if (request === generation.current) setError('Store details could not be verified.');
    } catch {
      if (request === generation.current) setError(sw
        ? 'Duka halipatikani kwa sasa.' : 'This Store is unavailable right now.');
    } finally { if (request === generation.current) setWorking(false); }
  };

  useEffect(()=>{
    // Reopen a seller's latest Store view if the source changes while Mini is
    // still mounted (for example editing the sample Business in another area).
    if(view!=='store'||!chosenStore)return;
    let active=true;
    void client.store(chosenStore.canonicalKsNumber).then(store=>{
      if(active&&store.status==='ACTIVE')setChosenStore(store);
    }).catch(()=>{/* The basket's own source check remains authoritative. */});
    return()=>{active=false;};
    // The stable KSNumber, view and StoreGateway determine refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[view,chosenStore?.canonicalKsNumber,client]);
  const add = (offer: PublicOfferView,countRequested=1) => {
    if (!chosenStore || !activeStates.has(offer.availabilityState)) return;
    const count = Math.min(20, Math.max(1, countRequested));
    const key = chosenStore.canonicalKsNumber + ':' + offer.id;
    setCart(old => {
      const prior = old.find(line => line.sellerKsNumber + ':' + line.offerId === key);
      if (prior) return old.map(line => line === prior ? {...line, quantity: Math.min(20, line.quantity + count)} : line);
      if (old.length >= 20) return old;
      return [...old, {sellerKsNumber: chosenStore.canonicalKsNumber, sellerName: chosenStore.displayName,
        offerId: offer.id, title: offer.title, kind:offer.kind as MiniStorePlanLine['kind'],
        description:offer.description,mediaRefs:offer.mediaRefs,quantity: count,
        priceMinor: offer.priceMinor, currency: offer.currency,
        offerUpdatedAt: offer.updatedAt, availabilityState: offer.availabilityState}];
    });
    setReviewed(false);
    setProposalOpen(false);
    resetSample();
    setFreshnessError('');
    setError('');
  };
  const changeQuantity=(line:MiniStorePlanLine,next:number)=>{
    setCart(old=>old.map(item=>item===line?{...item,quantity:Math.min(20,Math.max(1,next))}:item));
    setReviewed(false);setProposalOpen(false);resetSample();
    setFreshnessError('');
  };
  const removeLine=(line:MiniStorePlanLine)=>{
    setCart(old=>old.filter(item=>item!==line));
    setReviewed(false);setProposalOpen(false);resetSample();
    setFreshnessError('');
  };

  const latestOffersMatch = async () => {
    const fresh=await Promise.all(cart.map(line=>client.offer(line.sellerKsNumber,line.offerId)));
    return miniStoreOfferSnapshotFresh(cart,fresh);
  };

  useEffect(()=>{
    // Automatically re-read the original Store sources before offering review.
    // This browser check is not seller acceptance or Money readiness.
    if(view!=='plan'||!cart.length||(readiness.goods&&!fulfilmentChoice)){
      setReviewed(false);return;
    }
    let active=true;
    setChecking(true);setReviewed(false);setFreshnessError('');
    void Promise.all(cart.map(line=>client.offer(line.sellerKsNumber,line.offerId)))
      .then(fresh=>{
        if(!active)return;
        if(miniStoreOfferSnapshotFresh(cart,fresh))setReviewed(true);
        else setFreshnessError('A Store changed one of your items. Browse that Store again before proceeding.');
      })
      .catch(()=>{if(active)setFreshnessError('We could not check these Store offers. Try again. Nothing has been ordered.');})
      .finally(()=>{if(active)setChecking(false);});
    return()=>{active=false;};
    // The cart, choice and store gateway are the only sources for this check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[view,cart,fulfilmentChoice,client]);
  const verify = async () => {
    if(!cart.length||working||checking)return;
    setChecking(true);setReviewed(false);setProposalOpen(false);resetSample();setError('');setFreshnessError('');
    try{
      if(!await latestOffersMatch()){
        setFreshnessError('A Store changed an item. Browse the Store again to see the latest offer.');
      }else setReviewed(true);
    }catch{
      setFreshnessError('Could not check every item. Nothing was ordered.');
    }finally{setChecking(false);}
  };

  const discussCurrent = async () => {
    if(!onDiscuss||!cart.length||working||checking)return;
    setChecking(true);setError('');
    try{
      // This second read is intentional: the seller may have changed stock or
      // price AFTER the original review, while the buyer was thinking.
      if(!await latestOffersMatch()){
        setReviewed(false);
        setError('This Store offer changed since you checked it. Review the seller’s current listing again; nothing was ordered.');
        return;
      }
      setReviewed(true);
      onDiscuss(cart.map(line=>({...line})),fulfilmentChoice);
    }catch{
      setReviewed(false);
      setError('The latest Store offer could not be verified. No buyer plan was sent to KS001.');
    }finally{setChecking(false);}
  };

  const reviewSingleOffer = async () => {
    if (!reviewed || cart.length !== 1 || working) return;
    const [line] = cart;
    if (line.priceMinor === null || line.priceMinor <= 0 || line.quantity > 20) return;
    setWorking(true); setError('');
    try {
      const response = await fetch('/api/mini-store-offer-preview', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sellerKsNumber: line.sellerKsNumber, offerId: line.offerId, quantity: line.quantity,
        }),
      });
      if (!response.ok) throw new Error('Offer review not enabled or changed');
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object' ||
        !('offerSession' in payload) || typeof payload.offerSession !== 'string' ||
        !/^[A-Za-z0-9_.-]{40,1100}$/.test(payload.offerSession)) throw new Error('Invalid review session');
      window.location.assign('/mini.html?storeOfferSession=' + encodeURIComponent(payload.offerSession));
    } catch {
      setError(sw
        ? 'Uhakiki wa ofa haujawa tayari. Hakuna oda au malipo.'
        : 'Sourced offer review is not available yet. No order or payment was started.');
    } finally { setWorking(false); }
  };

  const itemCount=cart.reduce((count,line)=>count+line.quantity,0);
  const cartQuantity=(offerId:string)=>cart.find(line=>line.offerId===offerId)?.quantity||0;
  const moneyBlocked=readiness.readyToPay===false;
  const sampleMoneyReady=playground&&reviewed&&!checking&&!freshnessError&&
    readiness.readyToReview&&sampleRequests&&allSampleAccepted&&
    !readiness.amountNeedsQuote&&(!readiness.goods||fulfilmentChoice==='collect');
  // A displayed total is illustrative: it is not a seller quote or provider amount.
  const total=readiness.totalMinor!==null&&readiness.currency==='KES'
    ? money(readiness.totalMinor,'KES'):null;
  const ready=readiness.readyToReview&&!checking&&!freshnessError;
  const shopControls=<form className="spm-shop-search-form" onSubmit={e=>{e.preventDefault();void find();}}>
      <label className="spm-label" htmlFor="mini-store-query">What are you looking for?</label>
      <div className="spm-shop-searchbar">
        <Search size={17}/>
        <input id="mini-store-query" maxLength={100} value={term}
          onChange={e=>setTerm(e.target.value)}
          placeholder="Try a pump, solar light or a service"/>
        <button type="submit" disabled={working} aria-label="Search Stores">
          <ArrowRight size={18}/>
        </button>
      </div>
      <div className="spm-shop-chips" aria-label="Shop by category">
        <button type="button" aria-pressed={kind==='PRODUCT'}
          onClick={()=>{setKind('PRODUCT');void find('PRODUCT',term);}}>Goods</button>
        <button type="button" aria-pressed={kind==='SERVICE'}
          onClick={()=>{setKind('SERVICE');void find('SERVICE',term);}}>Services</button>
        {playground&&miniTradeSampleSearches.map(p=><button type="button" key={p.label}
          onClick={()=>{setKind(p.kind);setTerm(p.query);void find(p.kind,p.query);}}>{p.label}</button>)}
      </div>
      {working&&<small className="spm-shop-searching" role="status">Finding Stores…</small>}
    </form>;
  const photoForLine=(line:MiniStorePlanLine):PublicOfferView=>({
    id:line.offerId,kind:line.kind||'PRODUCT',title:line.title,
    description:line.description||null,priceMinor:line.priceMinor,currency:line.currency,
    availabilityState:line.availabilityState,availabilityConfirmedAt:null,
    quantityAvailable:null,mediaRefs:line.mediaRefs||[],updatedAt:line.offerUpdatedAt,
  });
  return <section className="spm-content spm-buy spm-shop-screen"
      data-mini-store-source={playground?'fictional-local-playground':'public-read-only'}>
    {view==='search'&&<MiniShopDiscovery results={results} onOpen={ks=>void openStore(ks)}
      playground={playground} onBack={onBack} label={term?'Stores with '+(term.trim()||'goods'):'Stores to explore'}
      cartCount={itemCount} onBasket={()=>setView('plan')} searchControls={shopControls}/>}
    {view==='store'&&chosenStore&&<MiniShopGallery key={chosenStore.canonicalKsNumber}
      store={chosenStore} playground={playground}
      cartCount={itemCount} cartQty={cartQuantity} onAdd={add}
      onBack={()=>setView('search')} onBasket={()=>setView('plan')}/>}
    {view==='plan'&&<>
      <div className="spm-shop-basket-top">
        <button type="button" className="spm-shop-back" aria-label="Continue shopping"
          onClick={()=>setView(chosenStore?'store':'search')}><ArrowLeft size={18}/></button>
        <span>Your basket</span>
        {cart.length>0&&onDiscuss&&<button type="button" className="spm-shop-ask"
          disabled={working||checking} onClick={()=>void discussCurrent()}>
          <MessageCircle size={15}/> Ask KS001</button>}
      </div>
      <div className="spm-shop-basket-intro">
        <small>{playground?'SAMPLE SHOPPING':'YOUR CHOICES'}</small>
        <h1>Everything you picked.</h1>
        <p>{cart.length>0?'Take a look. We’ll help with only what’s needed to continue.':
          'Your basket is empty. Explore Stores and add something you like.'}</p>
      </div>
      {cart.length===0?<button type="button" className="spm-primary"
        onClick={()=>setView('search')}>Explore Stores <ArrowRight size={17}/></button>:<>
        <div className="spm-shop-basket-list">
          {cart.map(line=><div className="spm-shop-basket-line" key={line.sellerKsNumber+':'+line.offerId}>
            <MiniOfferPhoto offer={photoForLine(line)} playground={playground}/>
            <div className="spm-shop-basket-line-copy">
              <small>{line.sellerName.replace(/\s*·\s*Sample(?: Store)?$/i,'')}</small>
              <strong>{line.title}</strong>
              <b>{money(line.priceMinor,line.currency)}</b>
              <div className="spm-shop-basket-line-controls">
                <div className="spm-shop-stepper" aria-label={'Quantity of '+line.title}>
                  <button type="button" disabled={line.quantity<=1} aria-label={'Decrease '+line.title}
                    onClick={()=>changeQuantity(line,line.quantity-1)}><Minus size={15}/></button>
                  <span>{line.quantity}</span>
                  <button type="button" disabled={line.quantity>=20} aria-label={'Increase '+line.title}
                    onClick={()=>changeQuantity(line,line.quantity+1)}><Plus size={15}/></button>
                </div>
                <button type="button" className="spm-shop-remove"
                  onClick={()=>removeLine(line)}>Remove</button>
              </div>
            </div>
          </div>)}
        </div>
        <button type="button" className="spm-shop-continue" onClick={()=>setView('search')}>
          <Plus size={17}/> Keep browsing
        </button>
        <div className="spm-shop-basket-money">
          <div><span>{itemCount} item{itemCount===1?'':'s'} · {sampleSellers.length} Store{sampleSellers.length===1?'':'s'}</span>
            <strong>{total||'Prices to agree'}</strong></div>
          <small>{total?'Items subtotal · Delivery and any fees not included':
            'Some offers require the seller to confirm a price'}</small>
        </div>
        {!proposalOpen&&<div className="spm-shop-next" aria-live="polite">
          {readiness.goods&&!fulfilmentChoice&&<>
            <small>ONE QUICK QUESTION</small>
            <h2>How would you like to receive your items?</h2>
            <div className="spm-shop-next-choices">
              {([
                ['collect','I’ll collect them'],
                ['ask_sellers','Ask the Stores to deliver'],
                ['explore_combined','Find one delivery option'],
              ] as const).map(([value,label])=>
                <button type="button" key={value} onClick={()=>{
                    setFulfilmentChoice(value);setProposalOpen(false);resetSample();
                  }}>{label}<ArrowRight size={16}/></button>)}
            </div>
          </>}
          {(!readiness.goods||!!fulfilmentChoice)&&<>
            {readiness.goods&&<div className="spm-shop-choice-line">
              <span>Receiving items: {fulfilmentChoice==='collect'?'I’ll collect':
                fulfilmentChoice==='ask_sellers'?'Ask Stores about delivery':'Explore combined delivery'}</span>
              <button type="button" onClick={()=>{setFulfilmentChoice(null);setProposalOpen(false);resetSample();}}>
                Change</button>
            </div>}
            {checking&&<p className="spm-shop-quiet-check" role="status">
              <RefreshCcw size={16}/> Checking the latest Store details…</p>}
            {freshnessError&&<div className="spm-shop-check-problem" role="alert">
              <p>{freshnessError}</p>
              <button type="button" className="spm-secondary" onClick={()=>void verify()}>Check again</button>
            </div>}
            {!checking&&!freshnessError&&ready&&<div className="spm-shop-ready-note">
              <CheckCircle2 size={18}/><span>Your choices are ready to review.</span></div>}
            {!checking&&!freshnessError&&!ready&&<p className="spm-shop-quiet-check">
              We’ll check the latest Store details before you continue.</p>}
          </>}
        </div>}
        {!proposalOpen&&<button type="button" className="spm-shop-proceed" disabled={!ready}
          onClick={()=>setProposalOpen(true)}>
          <span>{ready?'Ready to continue? Review your choices':'Continue to review'}</span>
          <ArrowRight size={19}/></button>}
        {proposalOpen&&<div className="spm-shop-agreement-next">
          <div className="spm-shop-agreement-heading">
            <ShieldCheck size={22}/><span><small>NEXT · YOUR AGREEMENT</small>
            <strong>Shall we go ahead?</strong></span>
          </div>
          <p>Each Store keeps responsibility for its own goods or services. Nothing is agreed until the right people accept.</p>
          {!sampleRequests&&playground&&<button type="button" className="spm-shop-proceed"
            onClick={()=>{setSampleRequests(true);setSampleResponses({});setSamplePaid(false);}}>
            <span>Send sample SecureLinks for review</span><ArrowRight size={19}/>
          </button>}
          {!playground&&<button type="button" disabled className="spm-shop-proceed">
            <span>Send SecureLink for review</span><ArrowRight size={19}/>
          </button>}
          {!playground&&<p className="spm-shop-gentle-note">SecureLink sharing will open when the seller-confirmation connection is ready. Nothing has been sent.</p>}
          {sampleRequests&&playground&&<div className="spm-shop-seller-replies">
            <small>TEST THE RESPONSES · NO REAL MESSAGES</small>
            {sampleSellers.map(seller=><div className="spm-shop-seller" key={seller}>
              <strong>{cart.find(line=>line.sellerKsNumber===seller)?.sellerName}</strong>
              <small>{cart.filter(line=>line.sellerKsNumber===seller)
                .map(line=>line.quantity+' × '+line.title).join(', ')}</small>
              <span className="spm-shop-seller-state">{sampleResponses[seller]==='accepted'?'Accepted in sample':
                sampleResponses[seller]==='declined'?'Declined in sample':'Waiting for response'}</span>
              <div>
                <button type="button" onClick={()=>{
                  setSampleResponses(old=>({...old,[seller]:'accepted'}));setSamplePaid(false);
                }}>Accept</button>
                <button type="button" onClick={()=>{
                  setSampleResponses(old=>({...old,[seller]:'declined'}));setSamplePaid(false);
                }}>Decline</button>
              </div>
            </div>)}
            {Object.values(sampleResponses).includes('declined')&&
              <p>Someone declined. You can remove that item, change your choice or seek another Store. The other responses stay separate.</p>}
          </div>}
          {!samplePaid&&<>
            <button type="button" className="spm-shop-money-next"
              disabled={!sampleMoneyReady||moneyBlocked&&!playground}
              onClick={()=>{if(sampleMoneyReady)setSamplePaid(true);}}>
              <ShieldCheck size={17}/> {playground?'Simulate one payment · no money moves':'Continue to Money'}
              <ArrowRight size={17}/>
            </button>
            {playground&&<p className="spm-shop-gentle-note">{!allSampleAccepted?
              'Money opens only after every sample seller accepts.':
              readiness.amountNeedsQuote?'A Store still needs to quote a price.':
              readiness.goods&&fulfilmentChoice!=='collect'?
                'A delivery provider and price still need confirmation. Collection can be tested now.':
                'Sample only. No live payment or real Agreement will be created.'}</p>}
            {!playground&&<p className="spm-shop-gentle-note">
              Money follows the accepted Agreement and certified payment route—not a button click.</p>}
          </>}
          {samplePaid&&playground&&<div className="spm-shop-living-demo" role="status">
            <span className="spm-shop-living-light"><CheckCircle2 size={20}/></span>
            <h2>Your purchase is in motion</h2>
            <p>Sample Living Purchase · The example funding step is complete.</p>
            {sampleSellers.map(seller=><div key={seller}>
              <strong>{cart.find(line=>line.sellerKsNumber===seller)?.sellerName}</strong>
              <small>Next: fulfil the accepted sample obligation</small>
            </div>)}
            <p>No real money, payment receipt, order or binding Agreement exists.</p>
          </div>}
          <button type="button" className="spm-shop-continue" onClick={()=>setProposalOpen(false)}>
            <ArrowLeft size={17}/> Back to basket</button>
        </div>}
        {cart.length>0&&<div className="spm-shop-basket-assist">
          <MessageCircle size={16}/>
          <span>Something doesn't make sense?</span>
          {onDiscuss?<button type="button" disabled={checking||working} onClick={()=>void discussCurrent()}>
            Ask KS001</button>:<span>Review the details above</span>}
        </div>}
      </>}
    </>}
    {error&&<p className="spm-error" role="alert">{error}</p>}
    <p className="spm-disclaimer">{playground?
      'Fictional sample data · No live SecureLinks, Agreements, deliveries or payments.':
      'Offers remain separate until each party confirms the applicable terms.'}</p>
  </section>;
}
