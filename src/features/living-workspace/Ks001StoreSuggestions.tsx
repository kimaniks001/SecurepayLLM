import { useEffect, useState } from 'react';
import { ArrowRight, Search, Store } from 'lucide-react';
import type { StoreGateway } from '../../api/securepay/store';
import type { PublicSearchResultView } from '../../api/securepay/store/dto';

/**
 * A deliberate, low-disclosure shopping-intent recogniser. It operates only on
 * a customer's own latest sent words, never an agreement, hidden conversation
 * context, inferred age, private address or model-generated Store claim.
 * If we cannot identify a short specific item/service, show no suggestions.
 */
export function suggestedStoreSearchTerm(message: string): string | null {
  if (typeof message !== 'string' || message.length > 900) return null;
  const clean = message.trim().toLowerCase();
  const triggers = [
    /^(?:hi[,. ]+)?(?:where (?:can|could|may|do) i (?:buy|find|get)|where (?:can|could) we (?:buy|find|get)|where to (?:buy|find)|i (?:want|need|would like) to (?:buy|find|get|order)|(?:i am|i'm) looking for|looking for|find me|find (?:a|some) (?:store|shop) (?:for|selling)|show me (?:stores|shops) (?:for|selling)|(?:buy|purchase) (?:me )?)/i,
    /^(?:any (?:stores|shops) (?:with|selling)|(?:stores|shops) (?:nearby|around|selling|for))/i,
  ];
  let remainder: string | null = null;
  for (const match of triggers) {
    const found = clean.match(match);
    if (found) { remainder = clean.slice(found[0].length); break; }
  }
  if (!remainder) return null;
  let product = remainder
    .replace(/^(?:me |a |an |some |the |a shop (?:selling|for) |a store (?:selling|for) )+/,'')
    .replace(/^\d+\s*(?:bags?|pieces?|packets?|kilograms?|kg|litres?|tons?|crates?|units?)\s+(?:of\s+)?/, '')
    .replace(/\s+(?:near|around|in|at|from|for delivery to)\s+[a-z0-9, .'-]+$/,'')
    .replace(/\s+(?:today|tomorrow|this week|please|right now)[?.!]*$/,'')
    .replace(/[?.!,]+$/,'').trim();
  product = product.split(/\s+/).slice(0,4).join(' ').slice(0,65).trim();
  if (!product || product.length < 2 || /\b(?:someone|anything|something|anything else|help|advice|money)\b/.test(product)) return null;
  // No personal contacts, coordinates, URLs, payment identifiers or prose sent to public search.
  if (/\d{5,}|[@:/\\]|\b(?:ks\d{3,}|pin|otp|password|account|phone)\b/.test(product)) return null;
  return product;
}

type PublicRead = Pick<StoreGateway,'search'>;
type Result = {status:'idle'|'loading'|'ready'|'error'; items:PublicSearchResultView[]};

/** Optional in-chat Store source cards; actual Store and cart remain in the original workspace. */
export function Ks001StoreSuggestions({searchTerm, gateway, onViewStore, onBrowseStores}:{
  searchTerm:string;
  gateway?:PublicRead;
  onViewStore:(ksNumber:string)=>void;
  onBrowseStores:(query:string)=>void;
}) {
  const [result,setResult]=useState<Result>({status:'idle',items:[]});
  useEffect(()=>{
    if (!searchTerm || !gateway) {
      setResult({status:'idle',items:[]}); return;
    }
    let active = true;
    setResult({status:'loading',items:[]});
    void Promise.all([
      gateway.search({kind:'PRODUCT',category:searchTerm,limit:3}),
      gateway.search({kind:'SERVICE',category:searchTerm,limit:3}),
    ]).then(pages=>{
      if (!active) return;
      const chosen = new Set<string>();
      const items = pages.flat().filter(entry=>{
        if (!entry || !/^KS\d{3,12}$/.test(entry.canonicalKsNumber) ||
            typeof entry.displayName !== 'string' || !entry.offer ||
            typeof entry.offer.title !== 'string' || typeof entry.offer.id !== 'string') return false;
        const key = entry.canonicalKsNumber; // a small number of distinct Stores, no promotion slots
        if (chosen.has(key)) return false;
        chosen.add(key); return true;
      }).slice(0,3);
      setResult({status:'ready',items});
    }).catch(()=>{if(active)setResult({status:'error',items:[]});});
    return ()=>{active=false;};
  },[searchTerm,gateway]);

  if (!searchTerm || !gateway) return null;
  const amount = (minor:number|null,currency:string)=> minor === null ? 'Price to confirm' :
    currency+' '+(minor/100).toLocaleString('en-KE',{maximumFractionDigits:2});
  return <section aria-label="Published Store suggestions" data-ks001-store-suggestions
    className="space-y-2 rounded-xl border border-cream-200 bg-white p-3 text-sm">
    <div className="flex items-center gap-2 text-xs font-semibold text-forest-800"><Store size={15}/>
      Stores matching “{searchTerm}”
    </div>
    {result.status==='loading' && <p role="status" className="text-xs text-sand-600">Checking published Store offers…</p>}
    {result.status==='error' && <p role="status" className="text-xs text-sand-600">Store listings are unavailable right now. No results have been verified.</p>}
    {result.status==='ready' && result.items.length===0 && <p className="text-xs text-sand-600">No matching published Store offers found.</p>}
    {result.items.map(item=><article className="space-y-1 rounded-lg border border-cream-100 bg-cream-50 p-2.5"
      key={item.canonicalKsNumber+':'+item.offer.id}>
      <strong className="block text-xs">{item.displayName}</strong>
      <p className="text-xs">{item.offer.title} · {amount(item.offer.priceMinor,item.offer.currency)}</p>
      <p className="text-[11px] text-sand-600">{item.locationLabel || 'Location not published'} · Stock and terms need seller confirmation</p>
      <button type="button" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-forest-200 bg-white px-3 text-xs font-semibold text-forest-800"
        onClick={()=>onViewStore(item.canonicalKsNumber)}>View Store<ArrowRight size={14}/></button>
    </article>)}
    {result.status==='ready' && <button type="button"
      className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-forest-800"
      onClick={()=>onBrowseStores(searchTerm)}><Search size={14}/>Search more Stores</button>}
    <p className="text-[11px] text-sand-600">Published offers, not recommendations, guaranteed stock, accepted Agreements or advertisements.</p>
  </section>;
}
