import { useState } from 'react';
import type { StoreGateway } from '../../api/securepay/store';
import type { OfferKind, PublicSearchResultView } from '../../api/securepay/store/dto';

export function VisionStorePicker({stores,onAdd,onClose}:{
  stores:Pick<StoreGateway,'search'|'offer'>;
  onAdd:(proposal:string)=>void;
  onClose:()=>void;
}) {
  const [kind,setKind]=useState<OfferKind>('PRODUCT');
  const [category,setCategory]=useState('');
  const [location,setLocation]=useState('');
  const [results,setResults]=useState<PublicSearchResultView[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [chosen,setChosen]=useState<string|null>(null);
  const search=async()=>{
    setBusy(true);setError(null);setResults([]);
    try {setResults(await stores.search({
      kind,category:category.trim().slice(0,120)||undefined,
      location:location.trim().slice(0,120)||undefined,limit:10,
    }));}catch{setError('SecurePay could not confirm current Store offers. Try again.');}
    finally{setBusy(false);}
  };
  const select=async(item:PublicSearchResultView)=>{
    setBusy(true);setError(null);setChosen(item.offer.id);
    try {
      // Re-read the exact Store and published offer, never use search-card text
      // alone as authoritative provenance or an executable purchasing quote.
      const detail=await stores.offer(item.canonicalKsNumber,item.offer.id);
      if(detail.canonicalKsNumber!==item.canonicalKsNumber || detail.offer.id!==item.offer.id ||
        detail.status!=='ACTIVE')throw Error('SecurePay did not confirm this active Store offer.');
      const offer=detail.offer;
      const quotedPrice=offer.priceMinor===null?'Price requires a quotation':
        'Indicative listed price: '+offer.currency+' '+(offer.priceMinor/100).toFixed(2)+' per listed unit';
      const proposal=[
        'Store option for Vision planning — NOT an accepted quotation, order or Agreement.',
        'Store: '+detail.displayName+' ('+detail.canonicalKsNumber+')',
        'Offer: '+offer.title+' (source offer '+offer.id+')',
        'Type: '+offer.kind+' · Proposed quantity: 1',
        quotedPrice,
        'Current availability claim: '+offer.availabilityState+' (confirmation required)',
        'Specifications to review: '+(offer.description?.slice(0,600)||'Not supplied by Store'),
        'Delivery place, date, conditions and total charges: not yet agreed.',
        'Store source updated: '+offer.updatedAt,
      ].join('\\n').slice(0,1900);
      onAdd(proposal);
    }catch(cause){setError(cause instanceof Error?cause.message:'The Store offer could not be verified.');}
    finally{setBusy(false);setChosen(null);}
  };
  return <section data-phase5-vision-stores aria-label="Explore Store options for this Dream"
    className="space-y-3 rounded-xl border border-cream-200 bg-white p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-display text-lg">Explore real Store options</h3>
      <button type="button" onClick={onClose} disabled={busy}
        className="min-h-11 rounded-xl border border-cream-200 px-3 text-xs">Close</button>
    </div>
    <p className="text-xs text-sand-600">Bring one source-attributed option into your private board. Confirm prices,
      quantities, availability and delivery separately before agreeing to buy.</p>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <label className="text-xs">Looking for
        <select value={kind} onChange={e=>setKind(e.target.value as OfferKind)}
          className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 p-2 text-sm">
          <option value="PRODUCT">Goods</option><option value="SERVICE">Services</option>
          <option value="CAPACITY">Available capacity</option>
        </select></label>
      <label className="text-xs">Category (optional)
        <input value={category} onChange={e=>setCategory(e.target.value)} maxLength={120}
          className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 p-2 text-sm"/></label>
      <label className="text-xs">Location (optional)
        <input value={location} onChange={e=>setLocation(e.target.value)} maxLength={120}
          className="mt-1 min-h-11 w-full rounded-lg border border-cream-200 p-2 text-sm"/></label>
    </div>
    <button type="button" onClick={()=>void search()} disabled={busy}
      className="min-h-11 rounded-xl bg-forest-700 px-4 text-xs text-white disabled:opacity-40">
      {busy?'Checking offers…':'Find Store options'}</button>
    {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs">{error}</p>}
    {!busy && results.length===0 && <p className="text-xs text-sand-600">No confirmed search results displayed yet.</p>}
    <div className="grid gap-2 sm:grid-cols-2">
      {results.map(item=><article key={item.canonicalKsNumber+':'+item.offer.id}
        className="rounded-xl border border-cream-200 bg-cream-50 p-3 space-y-2">
        <p className="text-sm font-semibold">{item.offer.title}</p>
        <p className="text-xs text-sand-600">{item.displayName} · {item.canonicalKsNumber}</p>
        <p className="text-xs">{item.offer.priceMinor===null?'Ask Store for price':
          item.offer.currency+' '+(item.offer.priceMinor/100).toFixed(2)+' listed, not confirmed'}</p>
        <button type="button" disabled={busy}
          onClick={()=>void select(item)}
          className="min-h-11 rounded-xl border border-forest-200 bg-white px-3 text-xs disabled:opacity-40">
          {chosen===item.offer.id?'Confirming source…':'Add this possibility'}
        </button>
      </article>)}
    </div>
  </section>;
}
