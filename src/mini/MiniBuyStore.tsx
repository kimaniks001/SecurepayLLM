import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, MessageCircle, Search, ShoppingBag, Store, CheckCircle2 } from 'lucide-react';
import { createHttpClient } from '../api/securepay/http';
import { createStoreGateway, type StoreGateway } from '../api/securepay/store';
import type { PublicSearchResultView, PublicStoreView, PublicOfferView } from '../api/securepay/store/dto';
import type { MiniLanguage } from './miniModel';
import { suggestedStoreSearchTerm } from '../features/living-workspace/suggestedStoreSearchTerm.mjs';
import { miniStoreOfferSnapshotFresh } from './miniStoreOfferFresh.mjs';

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
  quantity: number; priceMinor: number | null; currency: string;
  offerUpdatedAt: string; availabilityState: string;
};
type View = 'search' | 'store' | 'plan';

/** Never infer seller acceptance or stock reservation from a public Store listing. */
export function MiniBuyStore({ language, onBack, initialQuery = '', storeGateway, onDiscuss }: {
  language:MiniLanguage; onBack:()=>void; initialQuery?:string;
  /** Existing public StoreGateway, optionally on the same isolated API as KS001. */
  storeGateway?:Pick<StoreGateway,'search'|'store'|'offer'>;
  /** Only after a fresh Store offer check, never on Add to cart alone. */
  onDiscuss?:(lines:MiniStorePlanLine[])=>void;
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
  const [quantity, setQuantity] = useState<Record<string, number>>({});
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [checking, setChecking] = useState(false);
  const generation = useRef(0);

  const find = async () => {
    const word = term.trim();
    if (!word || word.length > 100) {
      setError(sw ? 'Andika bidhaa unayotafuta.' : 'Tell me what you are looking for.');
      return;
    }
    const request = ++generation.current;
    setWorking(true); setResults([]); setError(''); setChosenStore(null); setView('search');
    try {
      const found = await client.search({kind, category: word, limit: 10});
      if (request === generation.current) setResults(found.filter(x =>
        /^KS\d{3,12}$/.test(x.canonicalKsNumber) && x.offer?.kind === kind &&
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

  const add = (offer: PublicOfferView) => {
    if (!chosenStore || !activeStates.has(offer.availabilityState)) return;
    const count = Math.min(20, Math.max(1, quantity[offer.id] ?? 1));
    const key = chosenStore.canonicalKsNumber + ':' + offer.id;
    setCart(old => {
      const prior = old.find(line => line.sellerKsNumber + ':' + line.offerId === key);
      if (prior) return old.map(line => line === prior ? {...line, quantity: Math.min(20, line.quantity + count)} : line);
      if (old.length >= 20) return old;
      return [...old, {sellerKsNumber: chosenStore.canonicalKsNumber, sellerName: chosenStore.displayName,
        offerId: offer.id, title: offer.title, quantity: count,
        priceMinor: offer.priceMinor, currency: offer.currency,
        offerUpdatedAt: offer.updatedAt, availabilityState: offer.availabilityState}];
    });
    setReviewed(false);
    setError('');
  };

  const latestOffersMatch = async () => {
    const fresh=await Promise.all(cart.map(line=>client.offer(line.sellerKsNumber,line.offerId)));
    return miniStoreOfferSnapshotFresh(cart,fresh);
  };

  const verify = async () => {
    if(!cart.length||working||checking)return;
    setChecking(true);setReviewed(false);setError('');
    try{
      if(!await latestOffersMatch()){
        setError('A seller changed a published offer, price, or available quantity. Review the Store again before continuing.');
      }else setReviewed(true);
    }catch{
      setError('Could not refresh every Store offer. No Agreement was created.');
    }finally{setChecking(false);}
  };

  const discussCurrent = async () => {
    if(!onDiscuss||!reviewed||!cart.length||working||checking)return;
    setChecking(true);setError('');
    try{
      // This second read is intentional: the seller may have changed stock or
      // price AFTER the original review, while the buyer was thinking.
      if(!await latestOffersMatch()){
        setReviewed(false);
        setError('This Store offer changed since you checked it. Review the seller’s current listing again; nothing was ordered.');
        return;
      }
      onDiscuss(cart.map(line=>({...line})));
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

  const header = (label: string, back: () => void) => <button className="spm-back" type="button" onClick={back}>
    <ArrowLeft size={17}/>{label}
  </button>;

  const selected = chosenStore?.offers.filter(o => o.kind === kind) ?? [];
  return <section className="spm-content spm-buy" data-mini-store-source="public-read-only">
    {view === 'search' && <>
      {header(sw ? 'Rudi' : 'Back', onBack)}
      <div className="spm-persona"><ShoppingBag size={16}/>{sw ? 'Nunua kitu' : 'Buy something'}</div>
      <h1 className="spm-question">{sw ? 'Unatafuta nini?' : 'What are you looking for?'}</h1>
      <form onSubmit={e => {e.preventDefault(); void find();}}>
        <label className="spm-label" htmlFor="mini-store-query">{sw ? 'Bidhaa au huduma' : 'Goods or services'}</label>
        <input className="spm-field" id="mini-store-query" maxLength={100} value={term}
          onChange={e => setTerm(e.target.value)} placeholder={sw ? 'Mfano: saruji' : 'For example: cement'}/>
        <div className="spm-mini-buy-types">
          <button type="button" aria-pressed={kind === 'PRODUCT'} onClick={() => {setKind('PRODUCT');setResults([]);}}>Goods</button>
          <button type="button" aria-pressed={kind === 'SERVICE'} onClick={() => {setKind('SERVICE');setResults([]);}}>Services</button>
        </div>
        <button type="submit" className="spm-primary" disabled={working}>
          <Search size={17}/>{working ? 'Searching…' : (sw ? 'Tafuta maduka' : 'Find Stores')}
        </button>
      </form>
      {results.length > 0 && <div className="spm-mini-buy-results" aria-label="Published Store matches">
        {results.slice(0, 5).map(record => <article className="spm-mini-buy-result"
          key={record.canonicalKsNumber + ':' + record.offer.id}>
          <strong>{record.displayName}</strong>
          <p>{record.offer.title}</p>
          <small>{record.locationLabel || 'Location not published'} · {money(record.offer.priceMinor, record.offer.currency)}</small>
          <small>Published offer · Stock and terms must be confirmed</small>
          <button type="button" className="spm-secondary" onClick={() => void openStore(record.canonicalKsNumber)}>
            <Store size={15}/>View Store<ArrowRight size={15}/>
          </button>
        </article>)}
      </div>}
      {!working && !error && results.length === 0 && term.trim() && <p className="spm-lead">
        {sw ? 'Tafuta bidhaa kutoka kwa maduka yaliyochapishwa.' :
          'Search published Store offers. Results come from SecurePay, not from sample shops.'}</p>}
      {cart.length > 0 && <button type="button" className="spm-quiet-button" onClick={() => setView('plan')}>
        View buying plan ({cart.length})</button>}
    </>}

    {view === 'store' && chosenStore && <>
      {header(sw ? 'Matokeo' : 'Back to results', () => setView('search'))}
      <div className="spm-persona"><Store size={16}/>Published Digital Store</div>
      <h1 className="spm-question">{chosenStore.displayName}</h1>
      <p className="spm-lead">{chosenStore.profile?.tagline || chosenStore.profile?.about || 'Store products and services'}</p>
      <p className="spm-lead">{chosenStore.profile?.locationLabel || 'Location not published'}</p>
      {selected.map(offer => <article className="spm-mini-buy-result" key={offer.id}>
        <strong>{offer.title}</strong><p>{offer.description || 'No description published'}</p>
        <strong>{money(offer.priceMinor, offer.currency)}</strong>
        <small>{offer.availabilityState.replace(/_/g, ' ')} · Stock and price require seller confirmation</small>
        {activeStates.has(offer.availabilityState) && <>
          <label className="spm-label" htmlFor={'qty-'+offer.id}>Quantity (1–20)</label>
          <input id={'qty-'+offer.id} type="number" className="spm-field" min={1} max={20}
            value={quantity[offer.id] ?? 1} onChange={e => setQuantity(old => ({...old,[offer.id]:
              Math.min(20, Math.max(1, Number(e.target.value) || 1))}))}/>
          <button className="spm-secondary" type="button" onClick={() => add(offer)}>
            Add to buying plan <ArrowRight size={15}/>
          </button>
        </>}
      </article>)}
      <button className="spm-primary" type="button" disabled={!cart.length} onClick={() => setView('plan')}>
        Review buying plan ({cart.length})<ArrowRight size={17}/>
      </button>
    </>}

    {view === 'plan' && <>
      {header(sw ? 'Rudi dukani' : 'Continue shopping', () => setView(chosenStore ? 'store' : 'search'))}
      <div className="spm-persona"><CheckCircle2 size={16}/>Buyer intention · Not an order</div>
      <h1 className="spm-question">{sw ? 'Kagua unachotaka kununua' : 'Review your buying plan'}</h1>
      {cart.map(line => <div className="spm-mini-buy-result" key={line.sellerKsNumber + ':' + line.offerId}>
        <strong>{line.title}</strong>
        <p>{line.sellerName} · {line.sellerKsNumber}</p>
        <small>{line.quantity} × {money(line.priceMinor, line.currency)}</small>
        <button type="button" className="spm-quiet-button" onClick={() => {
          setCart(old => old.filter(x => x !== line)); setReviewed(false);
        }}>Remove</button>
      </div>)}
      <p className="spm-lead">
        {sw
          ? 'Kila muuzaji lazima athibitishe bidhaa, kiasi, bei na masharti. Haya si makubaliano yaliyokubaliwa.'
          : 'Each seller must confirm quantities, prices and delivery terms. Nothing is ordered, agreed or reserved yet.'}
      </p>
      <button type="button" className="spm-primary" disabled={!cart.length || checking}
        onClick={() => void verify()}>
        {checking ? 'Refreshing offers…' : 'Check current Store offers'}<ArrowRight size={17}/>
      </button>
      {reviewed && <div className="spm-mini-buy-result">
        <strong>Published sources checked</strong>
        {onDiscuss && <button type="button" className="spm-primary"
          disabled={working||checking} onClick={()=>void discussCurrent()}>
          <MessageCircle size={16}/>Discuss this buying plan with KS001
          <ArrowRight size={16}/>
        </button>}
        <p>Seller confirmation and a canonical Agreement are still required. This check does not accept an order.</p>
        {cart.length === 1 && cart[0].priceMinor !== null &&
          <button type="button" className="spm-secondary" disabled={working}
            onClick={() => void reviewSingleOffer()}>
            Review sourced offer (simulation)<ArrowRight size={16}/>
          </button>}
        {cart.length !== 1 && <p className="spm-lead">
          Multiple sellers require separate confirmation. A multi-Store Agreement has not been issued from Mini.
        </p>}
      </div>}
    </>}
    {error && <p className="spm-error" role="alert">{error}</p>}
    <p className="spm-disclaimer">Public Store information only · No signed Agreement, stock reservation or payment.</p>
  </section>;
}
