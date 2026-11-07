import { ArrowUpRight, Check, Minus, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { SelectionItem, StoreDestination } from '../features/store/shopSelection.mjs';
import { collectionTotals, formatListedMoney, groupSelectionBySeller } from '../features/store/shopSelection.mjs';

/**
 * Right-hand shopping companion: editable, persistent while the Store remains
 * mounted, and entirely provisional. No stock reservation, signed Agreement,
 * saved Dream, provider approval or Money execution follows a local selection.
 */
export function StoreCollectionPanel({items,onQuantity,onRemove,onNote,onContinue,notice,draftPreview,busy=false,example=false}:{
  items:SelectionItem[];
  onQuantity:(key:string,quantity:number)=>void;
  onRemove:(key:string)=>void;
  onNote?:(key:string,note:string)=>void;
  onContinue:(destination:StoreDestination)=>void;
  notice?:string|null;
  draftPreview?:string|null;
  busy?:boolean;
  example?:boolean;
}) {
  const totals=collectionTotals(items);
  const count=totals.quantityCount;
  const sellerGroups=groupSelectionBySeller(totals.destinations.agreement);

  return <aside data-store-selection-summary aria-label="Your shopping selections" className="min-w-0 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm lg:sticky lg:top-3">
    <div className="flex items-start gap-2">
      <span className="rounded-xl bg-forest-50 p-2 text-forest-700"><Sparkles size={17}/></span>
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-sand-600">Your shopping collection</p>
        <h2 className="mt-1 font-display text-lg font-semibold text-forest-900">{count ? count+' selected' : 'Make it yours'}</h2>
        {sellerGroups.length>1 && <p className="mt-1 text-xs text-forest-700">One collection · {sellerGroups.length} different shops</p>}
      </div>
    </div>
    {!items.length && <div className="mt-4 rounded-xl bg-cream-50 p-3 text-xs leading-5 text-sand-600">
      Explore the offers. Hover for a quick look, or tap <strong>Quick look</strong> on mobile. Add what interests you to Vision or Agreement without leaving the shelves.
    </div>}
    {(['vision','agreement'] as const).map(destination=>{
      const selected=totals.destinations[destination];
      return <section key={destination} className="mt-4 border-t border-cream-200 pt-3" aria-label={destination==='vision'?'Vision selections':'Agreement selections'}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-forest-800">{destination==='vision'?'My Vision':'For an agreement'}</h3>
          <span className="rounded-full bg-cream-50 px-2 py-0.5 text-xs text-sand-700">{selected.length}</span>
        </div>
        {!selected.length?<p className="text-xs text-sand-500">{destination==='vision'?'Collect ideas or possibilities here.':'Collect offers to discuss with KS001.'}</p>
          : <div className="space-y-2">
            {selected.map(item=><div key={item.key} className="rounded-xl border border-cream-200 bg-cream-50/60 p-2.5">
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-semibold text-forest-900">{item.title}</p>
                  <p className="mt-0.5 truncate text-[0.7rem] text-sand-600">{item.sellerName}</p>
                </div>
                <button type="button" aria-label={'Remove '+item.title+' from '+destination} onClick={()=>onRemove(item.key)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sand-500 hover:bg-white hover:text-ember-600"><Trash2 size={15}/></button>
              </div>
              {onNote && <label className="mt-2 block text-[0.7rem] font-semibold text-forest-800">
                {/(shoe|sneaker|footwear|boot)/i.test(item.title)
                  ? 'Your size, colour and collection preference'
                  : item.offerType==='product' ? 'Your specifications or delivery details'
                  : 'Your project location, scope or preferred date'}
                <input type="text" maxLength={240} value={item.buyerNote} onChange={event=>onNote(item.key,event.target.value)}
                  placeholder={item.offerType==='product'?'e.g. Size 42, black, collect in Ruiru':'e.g. Site in Ruiru, inspect next Friday'}
                  className="mt-1 min-h-10 w-full rounded-lg border border-cream-300 bg-white px-2 text-xs font-normal text-forest-900"
                  aria-label={'Your requirements for '+item.title}/>
              </label>}
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="inline-flex items-center rounded-lg border border-cream-200 bg-white">
                  <button type="button" aria-label={'Reduce quantity of '+item.title} disabled={item.quantity<=1} onClick={()=>onQuantity(item.key,item.quantity-1)}
                    className="flex size-8 items-center justify-center disabled:opacity-30"><Minus size={13}/></button>
                  <span aria-label={'Quantity '+item.quantity} className="min-w-6 text-center text-xs tabular-nums">{item.quantity}</span>
                  <button type="button" aria-label={'Increase quantity of '+item.title} disabled={item.quantity>=99} onClick={()=>onQuantity(item.key,item.quantity+1)}
                    className="flex size-8 items-center justify-center disabled:opacity-30"><Plus size={13}/></button>
                </div>
                <span className="text-right text-[0.7rem] text-forest-800">{item.unitMinor===null?'Price to confirm':item.priceLabel}{item.unitLabel?' '+item.unitLabel:''}</span>
              </div>
            </div>)}
            <button type="button" disabled={busy} onClick={()=>onContinue(destination)}
              className="flex min-h-10 w-full items-center justify-between rounded-xl border border-forest-200 bg-forest-50 px-3 text-xs font-semibold text-forest-800 disabled:opacity-50">
              {destination==='vision'?'Review in Vision':'Prepare with KS001'}<ArrowUpRight size={16}/>
            </button>
          </div>}
      </section>;
    })}
    {items.length>0 && <section className="mt-4 rounded-xl border border-forest-100 bg-forest-50 p-3" aria-label="Listed price summary">
      <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-forest-700">Listed-price summary</p>
      {(['vision','agreement'] as const).map(destination=> {
        const group=totals.byDestination[destination];
        const priceLines=Object.entries(group.subtotal).filter(([,minor])=>minor>0);
        if(!totals.destinations[destination].length)return null;
        return <div key={destination} className="mt-2 border-t border-forest-100 pt-2">
          <p className="text-xs font-semibold text-forest-800">{destination==='vision'?'Vision ideas':'Agreement candidates'}</p>
          {priceLines.length===0?<p className="mt-1 text-xs text-sand-700">Prices to confirm</p>:
            priceLines.map(([currency,minor])=><div key={currency} className="mt-1 flex justify-between gap-2 text-sm font-semibold text-forest-900">
              <span>{currency}</span><span className="tabular-nums">{formatListedMoney(minor,currency)}</span>
            </div>)}
          {group.unpriced>0 && <p className="mt-1 text-xs text-sand-700">{group.unpriced} not priced yet</p>}
        </div>;
      })}

      <p className="mt-2 text-[0.7rem] leading-5 text-sand-700">
        One collection, not one checkout. Amounts are seller-listed and provisional; delivery or service costs may change.
        Each different trader may need a separate agreement after KS001 verifies them.
      </p>
    </section>}
    {notice&&<p role="status" className="mt-3 rounded-lg bg-cream-50 p-3 text-xs leading-5 text-forest-800"><Check size={14} className="mr-1 inline"/>{notice}</p>}
    {draftPreview&&<details open className="mt-3 rounded-xl border border-forest-100 bg-cream-50 p-3"><summary className="cursor-pointer text-xs font-semibold text-forest-800">Review the selected-items draft</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-sand-700">{draftPreview}</p></details>}
    {example&&<p className="mt-3 text-[0.7rem] leading-5 text-sand-500">Sample selection only. Nothing is saved to an account, sent to a trader, or created as an Agreement or Vision Dream.</p>}
  </aside>;
}
