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
import { MiniSampleMoneyJourney } from './MiniSampleMoneyJourney';
import { MiniFairTradeExaminationPreview } from './MiniFairTradeExaminationPreview';
import type {MiniSamplePurchase} from './miniSampleLivingPurchases.mjs';
import {miniBasketQuestions,miniBasketAnswersForOffer} from './miniBasketQuestions.mjs';
import {miniDeliveryContracts,miniDeliveryContractSummary,SAMPLE_DELIVERY_WINDOWS} from './miniDeliveryContract.mjs';
import {readSampleBasketDraft,saveSampleBasketDraft} from './miniSampleBasketDraft.mjs';
import {miniBasketQuietPreflight,miniSampleProviderReply,miniProviderReplyMatchesSource,
 type MiniSampleProviderReply} from './miniBasketQuietFairTrade.mjs';

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
export function MiniBuyStore({ language, onBack, initialQuery = '', storeGateway, onDiscuss, playground = false, fairTradeShowcase=false, onSampleFunded, onViewSampleAgreements }: {
  language:MiniLanguage; onBack:()=>void; initialQuery?:string;
  /** Existing public StoreGateway, optionally on the same isolated API as KS001. */
  storeGateway?:Pick<StoreGateway,'search'|'store'|'offer'>;
  /** Only after a fresh Store offer check, never on Add to cart alone. */
  onDiscuss?:(lines:MiniStorePlanLine[], fulfilment:MiniBasketFulfilment | null,
    buyerAnswers:Array<{sellerKsNumber:string;offerId:string;offerUpdatedAt:string;question:string;proposedAnswer:string}>)=>void;
  /** Isolated preview host only; never live offers or financial authority. */
  playground?:boolean;
  /** Explicit opt-in preview-host example; never seeds a real customer's basket. */
  fairTradeShowcase?:boolean;
  onSampleFunded?:(purchase:MiniSamplePurchase)=>void;
  onViewSampleAgreements?:()=>void;
}) {
  const client=storeGateway??stores;
  const sw = language === 'sw';
  const savedDraft=useRef(playground&&typeof window!=='undefined'?
    readSampleBasketDraft(window.sessionStorage):null).current;
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
  const [cart, setCart] = useState<MiniStorePlanLine[]>(savedDraft?.lines??[]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [fulfilmentChoice, setFulfilmentChoice] = useState<MiniBasketFulfilment | null>(savedDraft?.fulfilmentChoice??null);
  const [basketAnswers,setBasketAnswers]=useState<Record<string,string>>(savedDraft?.answers??{});
  const [draftAnswer,setDraftAnswer]=useState('');
  const [savedNotice,setSavedNotice]=useState(!!savedDraft);
  const basketQuestions=miniBasketQuestions(cart,basketAnswers);
  const nextBasketQuestion=basketQuestions.nextQuestion;
  const [proposalOpen, setProposalOpen] = useState(false);
  const readiness = miniBasketReadiness(cart,{sourcesFresh:reviewed,fulfilmentChoice});
  const [checking, setChecking] = useState(false);
  const [freshnessError,setFreshnessError] = useState('');
  const [sampleRequests,setSampleRequests] = useState(false);
  const [sampleResponses,setSampleResponses] = useState<Record<string,'accepted'|'declined'>>({});
  const [moneyOpen,setMoneyOpen] = useState(false);
  const [deliveryArea,setDeliveryArea] = useState(savedDraft?.deliveryArea??'');
  const [deliveryWindow,setDeliveryWindow]=useState<'next'|'arrange'|null>(null);
  const [deliveryContractConfirmed,setDeliveryContractConfirmed]=useState(false);
  const [deliveryQuoteSelected,setDeliveryQuoteSelected] = useState(savedDraft?.deliveryQuoteSelected??false);
  const [quoteAccepted,setQuoteAccepted] = useState<Record<string,number>>(savedDraft?.quoteAccepted??{});
  // Ephemeral sample only: real provider replies must come from authorised
  // participant SecureLinks and exact accepted canonical Agreement versions.
  const [providerReplies,setProviderReplies]=useState<Record<string,MiniSampleProviderReply>>({});
  const preflight=miniBasketQuietPreflight(cart,{
    answers:basketAnswers,fulfilmentChoice,deliveryArea,sourceFresh:reviewed,
    providerReplies,
  });
  const sampleSellers=[...new Set(cart.map(line=>line.sellerKsNumber))];
  const allSampleAccepted=sampleRequests&&sampleSellers.length>0&&
    sampleSellers.every(id=>sampleResponses[id]==='accepted');
  const resetSample=()=>{
    setSampleRequests(false);setSampleResponses({});setProviderReplies({});
    setMoneyOpen(false);
  };
  const invalidateDelivery=()=>{setDeliveryQuoteSelected(false);setDeliveryWindow(null);setDeliveryContractConfirmed(false);};
  const generation = useRef(0);
  const showcaseSeeded=useRef(false);
  useEffect(()=>{
    if(!playground||!fairTradeShowcase||showcaseSeeded.current)return;
    showcaseSeeded.current=true;
    let alive=true;
    // Owner-preview-only example: pump + an uncertain 12-month service.
    // The source values come from the same sample StoreGateway as ordinary
    // browsing, with no third-party source/Agreement/payment claims.
    void Promise.all([client.store('KS90002'),client.store('KS90003')]).then(([pumpStore,careStore])=>{
      if(!alive)return;
      const pump=pumpStore.offers.find(o=>o.title==='Solar irrigation water pump');
      const service=careStore.offers.find(o=>o.title==='Water pump maintenance · 12 months');
      if(!pump||!service)return;
      setCart([{
        sellerKsNumber:pumpStore.canonicalKsNumber,sellerName:pumpStore.displayName,
        offerId:pump.id,title:pump.title,kind:pump.kind as MiniStorePlanLine['kind'],
        quantity:1,description:pump.description,mediaRefs:pump.mediaRefs,
        priceMinor:pump.priceMinor,currency:pump.currency,
        offerUpdatedAt:pump.updatedAt,availabilityState:pump.availabilityState,
      },{
        sellerKsNumber:careStore.canonicalKsNumber,sellerName:careStore.displayName,
        offerId:service.id,title:service.title,kind:service.kind as MiniStorePlanLine['kind'],
        quantity:1,description:service.description,mediaRefs:service.mediaRefs,
        priceMinor:service.priceMinor,currency:service.currency,
        offerUpdatedAt:service.updatedAt,availabilityState:service.availabilityState,
      }]);
      setFulfilmentChoice('collect');
      setBasketAnswers({});
      setProviderReplies({});
      setProposalOpen(false);
      setReviewed(false);
      setView('plan');
    }).catch(()=>{/* Isolated sample missing: do not invent an offer. */});
    return()=>{alive=false};
  },[client,playground,fairTradeShowcase]);

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
    setSavedNotice(false);
    invalidateDelivery();
    resetSample();
    setFreshnessError('');
    setError('');
  };
  const changeQuantity=(line:MiniStorePlanLine,next:number)=>{
    setCart(old=>old.map(item=>item===line?{...item,quantity:Math.min(20,Math.max(1,next))}:item));
    setReviewed(false);setProposalOpen(false);setSavedNotice(false);invalidateDelivery();resetSample();
    setFreshnessError('');
  };
  const removeLine=(line:MiniStorePlanLine)=>{
    setCart(old=>old.filter(item=>item!==line));
    setReviewed(false);setProposalOpen(false);setSavedNotice(false);invalidateDelivery();resetSample();
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
      onDiscuss(cart.map(line=>({...line})),fulfilmentChoice,
        miniBasketAnswersForOffer(cart,basketAnswers));
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

  const saveForLater=()=>{
    if(!playground)return;
    const saved=saveSampleBasketDraft(window.sessionStorage,{
      lines:cart,fulfilmentChoice,answers:basketAnswers,deliveryArea,
      deliveryQuoteSelected,quoteAccepted,
    });
    if(saved){setSavedNotice(true);setProposalOpen(false);}
    else setError('Could not save this sample basket in this browser.');
  };
  const itemCount=cart.reduce((count,line)=>count+line.quantity,0);
  const cartQuantity=(offerId:string)=>cart.find(line=>line.offerId===offerId)?.quantity||0;
  const deliveryContracts=miniDeliveryContracts({choice:fulfilmentChoice,lines:cart,
    destination:deliveryArea,window:deliveryWindow,deliveryQuoteSelected});
  const deliveryContractState=miniDeliveryContractSummary(deliveryContracts);
  const deliveryNeedsQuote=readiness.goods&&fulfilmentChoice!=='collect';
  const deliveryComplete=!deliveryNeedsQuote||
    (playground&&deliveryContractConfirmed&&deliveryContractState.ready);
  const goodsSellers=[...new Set(cart.filter(line=>line.kind==='PRODUCT')
    .map(line=>line.sellerKsNumber))];
  const deliveryFeeMinor=playground&&deliveryQuoteSelected?
    (fulfilmentChoice==='explore_combined'?45000:
      fulfilmentChoice==='ask_sellers'?25000*goodsSellers.length:0):0;
  const unpriced=cart.filter(line=>line.priceMinor===null);
  const allPricesResolved=unpriced.every(line=>quoteAccepted[line.sellerKsNumber+':'+line.offerId]>0);
  const quotedMinor=cart.reduce((sum,line)=>sum+
    (line.priceMinor??quoteAccepted[line.sellerKsNumber+':'+line.offerId]??0)*line.quantity,0);
  const sampleTotalMinor=quotedMinor+deliveryFeeMinor;
  const confirmedSellers=[...sampleSellers,
    ...(fulfilmentChoice==='explore_combined'&&deliveryQuoteSelected?['KS90004']:[])];
  const sampleMoneyReady=playground&&reviewed&&!checking&&!freshnessError&&
    readiness.readyToReview&&basketQuestions.complete&&sampleRequests&&allSampleAccepted&&
    preflight.pendingProviderRequests.length===0&&preflight.provenanceComplete&&
    deliveryComplete&&allPricesResolved&&
    (!deliveryNeedsQuote||deliveryContractState.feeMinor===deliveryFeeMinor)&&
    Number.isSafeInteger(sampleTotalMinor);
  // A displayed total is illustrative: it is not a seller quote or provider amount.
  const total=readiness.totalMinor!==null&&readiness.currency==='KES'
    ? money(readiness.totalMinor,'KES'):null;
  const ready=readiness.readyToReview&&basketQuestions.complete&&!checking&&!freshnessError&&
    (!playground||deliveryComplete)&&(!playground||allPricesResolved);
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
    {view==='plan'&&moneyOpen&&playground&&sampleMoneyReady&&
      <MiniSampleMoneyJourney lines={cart.map(line=>({
        ...line,priceMinor:line.priceMinor??quoteAccepted[line.sellerKsNumber+':'+line.offerId]??null,
      }))} amountMinor={sampleTotalMinor}
        delivery={fulfilmentChoice==='collect'?'I will collect':(deliveryArea||'Delivery to confirm')}
        deliveryFeeMinor={deliveryFeeMinor}
        deliveryContracts={deliveryContracts.map(c=>({...c,customerApproved:deliveryContractConfirmed,providerAccepted:sampleRequests&&
          (c.providerKsNumber==='KS90004'||sampleResponses[c.providerKsNumber]==='accepted')}))}
        deliveryProvider={fulfilmentChoice==='explore_combined'?'KS90004':
          fulfilmentChoice==='ask_sellers'?'SELLERS':null}
        onBack={()=>setMoneyOpen(false)}
        onConfirmed={purchase=>onSampleFunded?.(purchase)}
        onViewAgreements={()=>onViewSampleAgreements?.()}/>}
    {view==='plan'&&!moneyOpen&&<>
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
        {savedNotice&&<p className="spm-shop-ready-note" role="status"><CheckCircle2 size={15}/> Your saved basket is here.</p>}
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
          <small>{playground&&deliveryQuoteSelected?
            'Sample delivery: '+money(deliveryFeeMinor,'KES')+
            ' · Example total: '+money(sampleTotalMinor,'KES'):
            total?'Items subtotal · Delivery and any fees not included':
            'Some offers require a seller quotation'}</small>
        </div>
        {playground&&<MiniFairTradeExaminationPreview
          key={fairTradeShowcase?'owner-fair-examination':'ordinary-basket-inspection'}
          preflight={preflight} cart={cart} fulfilmentChoice={fulfilmentChoice}
          buyerQuestions={basketQuestions.outstanding} showcase={fairTradeShowcase}/>}
        {!proposalOpen&&<div className="spm-shop-next" aria-live="polite">
          {nextBasketQuestion&&<>
            <small>ONE DETAIL TO CONFIRM</small>
            <h2>{nextBasketQuestion.title}</h2>
            <p className="spm-shop-question-hint">{nextBasketQuestion.hint}</p>
            {nextBasketQuestion.type==='choice'?
              <div className="spm-shop-next-choices">
                {nextBasketQuestion.choices?.map(([value,label])=><button type="button" key={value}
                  onClick={()=>{setBasketAnswers(old=>({...old,[nextBasketQuestion.id]:value}));
                    setDraftAnswer('');setSavedNotice(false);setProposalOpen(false);resetSample();}}>
                  {label}<ArrowRight size={16}/></button>)}
              </div>:
              <div className="spm-shop-question-input">
                <input aria-label={nextBasketQuestion.title}
                  maxLength={nextBasketQuestion.maxLength||240}
                  placeholder={nextBasketQuestion.placeholder||'Your answer'}
                  value={draftAnswer} onChange={e=>setDraftAnswer(e.target.value)}/>
                <button className="spm-secondary" type="button" disabled={!draftAnswer.trim()}
                  onClick={()=>{setBasketAnswers(old=>({...old,[nextBasketQuestion.id]:draftAnswer.trim()}));
                    setDraftAnswer('');setSavedNotice(false);setProposalOpen(false);resetSample();}}>
                  Continue <ArrowRight size={16}/></button>
              </div>}
          </>}
          {!nextBasketQuestion&&readiness.goods&&!fulfilmentChoice&&<>
            <small>ONE QUICK QUESTION</small>
            <h2>How would you like to receive your items?</h2>
            <div className="spm-shop-next-choices">
              {([
                ['collect','I’ll collect'],
                ['ask_sellers','Each Store can deliver'],
                ['explore_combined','One delivery for everything'],
              ] as const).map(([value,label])=>
                <button type="button" key={value} onClick={()=>{
                    setFulfilmentChoice(value);setDeliveryArea('');invalidateDelivery();
                    setProposalOpen(false);setSavedNotice(false);resetSample();
                  }}>{label}<ArrowRight size={16}/></button>)}
            </div>
          </>}
          {!nextBasketQuestion&&(!readiness.goods||!!fulfilmentChoice)&&<>
            {readiness.goods&&<div className="spm-shop-choice-line">
              <span>Receiving items: {fulfilmentChoice==='collect'?'I’ll collect':
                fulfilmentChoice==='ask_sellers'?'Ask Stores about delivery':'Explore combined delivery'}</span>
              <button type="button" onClick={()=>{setFulfilmentChoice(null);setDeliveryArea('');
                invalidateDelivery();setProposalOpen(false);setSavedNotice(false);resetSample();}}>
                Change</button>
            </div>}
            {playground&&deliveryNeedsQuote&&<>
              <div className="spm-shop-delivery-choices">
                <strong>Where should the items go?</strong>
                <div className="spm-shop-next-choices">
                  {['Varsityville, Ruiru','Kamakis, Ruiru'].map(area=>
                    <button type="button" key={area} className={deliveryArea===area?'selected':''}
                      onClick={()=>{setDeliveryArea(area);invalidateDelivery();
                        setProposalOpen(false);setSavedNotice(false);resetSample();}}>
                      {area}{deliveryArea===area?<CheckCircle2 size={16}/>:<ArrowRight size={16}/>}
                    </button>)}
                </div>
                {deliveryArea&&<div className="spm-shop-illustrative-quote">
                  <span><strong>{fulfilmentChoice==='explore_combined'?'Kamakis Transport':'Your Stores'}</strong>
                    <small>{fulfilmentChoice==='explore_combined'?
                      'One example trip to '+deliveryArea:
                      'Example delivery by each Store to '+deliveryArea}</small></span>
                  <b>{money(fulfilmentChoice==='explore_combined'?45000:25000*goodsSellers.length,'KES')}</b>
                  <button type="button" className="spm-secondary" disabled={deliveryQuoteSelected}
                    onClick={()=>{setDeliveryQuoteSelected(true);setDeliveryContractConfirmed(false);
                      setSavedNotice(false);resetSample();}}>
                    {deliveryQuoteSelected?'Quote selected':'See the quick delivery Agreement'}
                  </button>
                  <small>Fictional quote only. Delivery will have its own mini Agreement.</small>
                </div>}
                {deliveryQuoteSelected&&<div className="spm-shop-mini-contract">
                  <div className="spm-shop-mini-contract-heading"><ShieldCheck size={18}/>
                    <span><strong>Quick delivery Agreement</strong>
                    <small>Separate from your purchase · Sample</small></span>
                  </div>
                  <p>Who: {fulfilmentChoice==='explore_combined'?'Kamakis Transport':
                    'Each Store delivers its own goods'}</p>
                  <p>What: {cart.filter(x=>x.kind==='PRODUCT').map(x=>x.quantity+' × '+x.title).join(', ')}</p>
                  <p>From: {goodsSellers.map(seller=>cart.find(x=>x.sellerKsNumber===seller)?.sellerName).filter(Boolean).join(', ')}</p>
                  <p>To: {deliveryArea}</p>
                  <p>Fee: {money(fulfilmentChoice==='explore_combined'?45000:
                    25000*new Set(cart.filter(x=>x.kind==='PRODUCT').map(x=>x.sellerKsNumber)).size,'KES')}</p>
                  <strong>When should delivery be arranged?</strong>
                  <div className="spm-shop-next-choices">
                    {(Object.entries(SAMPLE_DELIVERY_WINDOWS) as Array<['next'|'arrange',string]>)
                      .map(([value,label])=><button type="button" key={value}
                        className={deliveryWindow===value?'selected':''}
                        onClick={()=>{setDeliveryWindow(value);setDeliveryContractConfirmed(false);
                          setSavedNotice(false);resetSample();}}>
                        {label}{deliveryWindow===value?<CheckCircle2 size={16}/>:<ArrowRight size={16}/>}
                      </button>)}
                  </div>
                  {deliveryWindow&&<button type="button" className="spm-secondary"
                    disabled={deliveryContractConfirmed} onClick={()=>{
                      setDeliveryContractConfirmed(true);setSavedNotice(false);resetSample();
                    }}>{deliveryContractConfirmed?'Delivery mini Agreement ready for review':
                      'Add this delivery Agreement'}</button>}
                  {deliveryContractConfirmed&&<p className="spm-shop-ready-note">
                    <CheckCircle2 size={15}/> {deliveryContracts.length} separate delivery mini
                    Agreement{deliveryContracts.length===1?'':'s'} linked to this purchase.
                    The provider must still confirm.</p>}
                  <small>This is a proposed mini contract, not the carrier's acceptance.</small>
                </div>}
              </div>
            </>}
            {playground&&unpriced.length>0&&<div className="spm-shop-delivery-choices">
              <strong>{unpriced.length===1?'One item needs a price':'Some items need a price'}</strong>
              {unpriced.map(line=>{
                const key=line.sellerKsNumber+':'+line.offerId;
                return <div className="spm-shop-illustrative-quote" key={key}>
                  <span><strong>{line.title}</strong><small>{line.sellerName}</small></span>
                  <b>{money(quoteAccepted[key]??45000,'KES')}</b>
                  <button type="button" className="spm-secondary"
                    disabled={!!quoteAccepted[key]} onClick={()=>{
                      setQuoteAccepted(old=>({...old,[key]:45000}));resetSample();
                    }}>{quoteAccepted[key]?'Sample quote added':'Use a sample quotation'}</button>
                  <small>Example quote only. Real price needs its seller's accepted offer.</small>
                </div>;
              })}
            </div>}
            {checking&&<p className="spm-shop-quiet-check" role="status">
              <RefreshCcw size={16}/> Checking the latest Store details…</p>}
            {freshnessError&&<div className="spm-shop-check-problem" role="alert">
              <p>{freshnessError}</p>
              <button type="button" className="spm-secondary" onClick={()=>void verify()}>Check again</button>
            </div>}
            {!checking&&!freshnessError&&ready&&<div className="spm-shop-ready-note">
              <CheckCircle2 size={18}/><span>Your choices are ready to review.</span></div>}
            {!checking&&!freshnessError&&!ready&&!deliveryNeedsQuote&&
              <p className="spm-shop-quiet-check">We’ll check the latest Store details before you continue.</p>}
          </>}
        </div>}
        {!proposalOpen&&<button type="button" className="spm-shop-proceed" disabled={!ready}
          onClick={()=>setProposalOpen(true)}>
          <span>{ready?'Ready to continue? Review your choices':'Continue to review'}</span>
          <ArrowRight size={19}/></button>}
        {proposalOpen&&<div className="spm-shop-agreement-next">
          <div className="spm-shop-agreement-heading">
            <ShieldCheck size={22}/><span><small>NEXT · MAKE AN AGREEMENT</small>
            <strong>Ready to go ahead?</strong></span>
          </div>
          <p>Here's your choice. Every Store confirms only what it has agreed to supply.</p>
          <div className="spm-shop-review-summary">
            <div><span>Items and services</span><strong>{money(quotedMinor,'KES')}</strong></div>
            {deliveryFeeMinor>0&&<div><span>Delivery</span><strong>{money(deliveryFeeMinor,'KES')}</strong></div>}
            <div className="spm-shop-review-total"><span>Example total</span>
              <strong>{money(sampleTotalMinor,'KES')}</strong></div>
            {readiness.goods&&<small>{fulfilmentChoice==='collect'?'You will collect':
              'Delivery to '+deliveryArea}</small>}
            {miniBasketAnswersForOffer(cart,basketAnswers).map((a,i)=>
              <small key={a.sellerKsNumber+a.offerId+i}>{a.question} — {a.proposedAnswer}</small>)}
            {preflight.providerRequests.length>0&&<small>
              {preflight.providerRequests.length===1?'One provider needs':'Some providers need'} to
              clarify the agreed service terms before you can confirm the Agreement.
              Mini will include those questions when sending it for review.
            </small>}
            {deliveryContracts.map((c,i)=><div key={c.id}>
              <span>{i===0?'Separate delivery mini Agreement':'Additional delivery mini Agreement'}</span>
              <strong>{c.providerName.replace(/\s*·\s*Sample$/,'')} · {money(c.feeMinor,'KES')}</strong>
            </div>)}
          </div>
          {!sampleRequests&&playground&&<button type="button" className="spm-shop-proceed"
            onClick={()=>{
              // Sample-only: independent fictional provider responses.
              // A seller with material service terms cannot be marked accepted
              // until the buyer has explicitly reviewed the changed terms.
              const requests=preflight.providerRequests;
              const needClarifying=new Set(requests.map(r=>r.source.sellerKsNumber));
              setProviderReplies(Object.fromEntries(requests.map(req=>[
                req.id,miniSampleProviderReply(req),
              ]).filter((pair):pair is [string,MiniSampleProviderReply]=>!!pair[1])));
              setSampleResponses(Object.fromEntries(
                sampleSellers.filter(id=>!needClarifying.has(id))
                  .map(id=>[id,'accepted' as const])));
              setSampleRequests(true);setMoneyOpen(false);
            }}>
            <span>Send SecureLink · sample review</span><ArrowRight size={19}/>
          </button>}
          {!playground&&<button type="button" disabled className="spm-shop-proceed">
            <span>Send SecureLink for review</span><ArrowRight size={19}/>
          </button>}
          {!playground&&<p className="spm-shop-gentle-note">
            Sharing will open once seller-specific SecureLinks are connected. Nothing has been sent.</p>}
          {sampleRequests&&playground&&<div className="spm-shop-seller-replies">
            <div className="spm-shop-replies-heading"><CheckCircle2 size={18}/>
              <span><strong>Example replies received</strong>
                <small>Fictional sellers, not real messages or Agreements</small></span>
            </div>
            {preflight.providerRequests.map(req=>{
              const reply=providerReplies[req.id];
              if(!miniProviderReplyMatchesSource(req,reply))return null;
              return <div className="spm-shop-seller spm-shop-provider-clarification"
                key={req.id} data-provider-source={req.source.offerId}>
                <strong>{req.supplierLabel.replace(/\s*·\s*Sample$/,'')}</strong>
                <small>Proposed terms for {req.title}</small>
                {reply.terms.map(term=><p key={term.code}>{term.value}</p>)}
                <small>Sample response linked to this exact Store offer and its published version.
                  The provider has not sent a real SecureLink.</small>
                {!reply.buyerApproved&&<button type="button" className="spm-secondary"
                  onClick={()=>{
                    const current=preflight.providerRequests.find(x=>x.id===req.id);
                    if(!current||!miniProviderReplyMatchesSource(current,reply))return;
                    const replies={...providerReplies,[req.id]:{...reply,buyerApproved:true}};
                    setProviderReplies(replies);
                    const allForSeller=preflight.providerRequests
                      .filter(x=>x.source.sellerKsNumber===req.source.sellerKsNumber)
                      .every(x=>miniProviderReplyMatchesSource(x,replies[x.id])&&
                        replies[x.id].buyerApproved===true);
                    if(allForSeller)setSampleResponses(prev=>({
                      ...prev,[req.source.sellerKsNumber]:'accepted'
                    }));
                  }}>Include these terms in my sample Agreement</button>}
                {reply.buyerApproved&&<span className="spm-shop-seller-state">
                  <CheckCircle2 size={14}/> Proposed terms reviewed by you · sample</span>}
              </div>;
            })}
            {sampleSellers.map(seller=><div className="spm-shop-seller" key={seller}>
              <strong>{cart.find(line=>line.sellerKsNumber===seller)?.sellerName.replace(/\s*·\s*Sample$/,'')}</strong>
              <small>{cart.filter(line=>line.sellerKsNumber===seller)
                .map(line=>line.quantity+' × '+line.title).join(', ')}</small>
              <span className="spm-shop-seller-state">
                {sampleResponses[seller]==='accepted'?
                  <><CheckCircle2 size={14}/> Confirmed in this sample</>:
                  'Waiting for you to review the provider’s proposed terms'}
              </span>
            </div>)}
            {fulfilmentChoice==='explore_combined'&&deliveryQuoteSelected&&
              <div className="spm-shop-seller">
                <strong>Kamakis Transport</strong>
                <small>One sample delivery to {deliveryArea}</small>
                <span className="spm-shop-seller-state"><CheckCircle2 size={14}/> Example quote accepted</span>
              </div>}
            {fulfilmentChoice==='ask_sellers'&&deliveryQuoteSelected&&
              <div className="spm-shop-seller">
                <strong>Each Store's delivery</strong>
                <small>Example separate deliveries to {deliveryArea}</small>
                <span className="spm-shop-seller-state"><CheckCircle2 size={14}/> Example quotes accepted</span>
              </div>}
          </div>}
          {playground&&<button type="button" className="spm-shop-money-next"
            disabled={!sampleMoneyReady} onClick={()=>setMoneyOpen(true)}>
            <ShieldCheck size={17}/> Connect to Money <ArrowRight size={17}/>
          </button>}
          {playground&&!sampleMoneyReady&&<p className="spm-shop-gentle-note">
            Money becomes available only after the sample seller and delivery Agreements are confirmed.</p>}
          {!playground&&<button type="button" disabled className="spm-shop-money-next">
            <ShieldCheck size={17}/> Connect to Money <ArrowRight size={17}/>
          </button>}
          <button type="button" className="spm-shop-save" disabled={!playground}
            onClick={saveForLater}>Save for later</button>
          {playground&&<p className="spm-shop-gentle-note">
            In this rehearsal, separate sample seller confirmations unlock the rail choices.
            No real SecureLink, Money instruction or binding acceptance exists.</p>}
          <button type="button" className="spm-shop-continue" onClick={()=>{
            setProposalOpen(false);setSampleRequests(false);setSampleResponses({});setMoneyOpen(false);
          }}><ArrowLeft size={17}/> Back to basket</button>
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
