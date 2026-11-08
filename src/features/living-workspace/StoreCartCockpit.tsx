import { useState } from 'react';
import { ArrowRight, ChevronDown, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import type { SelectionItem } from '../store/shopSelection.mjs';
import {
  collectionTotals, formatListedMoney, removeSelected,
  updateSelectedBuyerNote, updateSelectedQuantity,
} from '../store/shopSelection.mjs';

type Props = {
  selections: SelectionItem[];
  onSelectionChange: (update: (current: SelectionItem[]) => SelectionItem[]) => void;
  onDiscussCart: () => Promise<void>;
  onBrowse: () => void;
  onViewItem: (sellerKs: string, offerId: string) => void;
};

/** Glance-first presentation of the SAME parent-owned Store selections.
 * This is a working cart, not a checkout, Agreement, order, or second source of truth.
 * All authorisation and seller validation remain in the existing Store/KS001 flow.
 */
export function StoreCartCockpit({
  selections, onSelectionChange, onDiscussCart, onBrowse, onViewItem,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const totals = collectionTotals(selections);
  const cart = totals.destinations.agreement;
  const ideas = totals.destinations.vision;
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const stores = new Set(cart.map(item => item.sellerKsNumber)).size;
  const listed = Object.entries(totals.byDestination.agreement.subtotal);
  const unpriced = totals.byDestination.agreement.unpriced;
  const singleTotal = listed.length === 1 && unpriced === 0;
  const update = (fn: (items: SelectionItem[]) => SelectionItem[]) => onSelectionChange(fn);

  const discuss = async () => {
    if (!count || busy) return;
    setError('');
    setBusy(true);
    try { await onDiscussCart(); }
    catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not open KS001. Your cart is unchanged.');
    } finally { setBusy(false); }
  };

  const selectedRow = (entry: SelectionItem, area: 'cart' | 'vision') => (
    <article key={entry.key} data-store-summary-edit-row className="border-b border-cream-200/80 py-3 last:border-b-0">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <button type="button" onClick={() => onViewItem(entry.sellerKsNumber, entry.offerId)}
          className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
          aria-label={'View ' + entry.title + ' from ' + entry.sellerName}>
          <span className="block line-clamp-2 text-[0.86rem] font-semibold leading-5 text-forest-900">{entry.title}</span>
          <span className="mt-0.5 block truncate text-[0.71rem] text-sand-600">{entry.sellerName}</span>
        </button>
        <button type="button" aria-label={'Remove ' + entry.title + ' from ' + area}
          onClick={() => update(current => removeSelected(current, entry.key))}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-sand-500 transition-colors hover:bg-cream-100 hover:text-ember-700 focus-visible:outline-2 focus-visible:outline-forest-500">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="text-[0.82rem] font-semibold tabular-nums text-forest-900">
          {entry.unitMinor === null
            ? 'Price to confirm'
            : Number.isSafeInteger(entry.unitMinor * entry.quantity)
              ? formatListedMoney(entry.unitMinor * entry.quantity, entry.currency)
              : entry.priceLabel}
        </span>
        <div role="group" aria-label={'Quantity for ' + entry.title}
          className="inline-flex items-center gap-0.5 rounded-xl border border-cream-200 bg-white">
          <button type="button" aria-label={'Decrease quantity of ' + entry.title} disabled={entry.quantity <= 1}
            onClick={() => update(current => updateSelectedQuantity(current, entry.key, entry.quantity - 1))}
            className="flex min-h-11 min-w-10 items-center justify-center rounded-l-xl text-forest-700 transition-colors hover:bg-cream-100 disabled:opacity-30"><Minus size={14}/></button>
          <span className="min-w-5 text-center text-xs font-semibold tabular-nums" aria-live="polite">{entry.quantity}</span>
          <button type="button" aria-label={'Increase quantity of ' + entry.title} disabled={entry.quantity >= 99}
            onClick={() => update(current => updateSelectedQuantity(current, entry.key, entry.quantity + 1))}
            className="flex min-h-11 min-w-10 items-center justify-center rounded-r-xl text-forest-700 transition-colors hover:bg-cream-100 disabled:opacity-30"><Plus size={15}/></button>
        </div>
      </div>
      <details className="group/requirements mt-1 text-[0.72rem] text-sand-600">
        <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-md px-0.5 text-forest-700 focus-visible:outline-2 focus-visible:outline-forest-500">
          {entry.buyerNote ? 'Edit requirements' : 'Add requirements'} <ChevronDown size={13} className="transition-transform group-open/requirements:rotate-180"/>
        </summary>
        <label className="mt-1 block text-[0.7rem] text-sand-700">
          {entry.offerType === 'product' ? 'Size, colour, delivery or specifications' : 'Scope, location or preferred date'}
          <input type="text" maxLength={240} value={entry.buyerNote}
            onChange={event => update(current => updateSelectedBuyerNote(current, entry.key, event.target.value))}
            placeholder="Optional, for your discussion with KS001"
            className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 bg-white px-3 text-xs text-forest-900 focus-visible:border-forest-500 focus-visible:outline-2 focus-visible:outline-forest-200"/>
        </label>
        <p className="mt-1 text-[0.68rem] text-sand-500">Seller-listed · locked price and scope. Your note does not change the offer.</p>
      </details>
    </article>
  );

  return <section data-store-selection-parent-summary data-store-cart-cockpit aria-label="KSCart and next action"
    className="mb-4 rounded-2xl border border-forest-200/80 bg-white p-4 shadow-[0_3px_16px_rgba(22,54,41,0.045)] sm:p-5">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-forest-900">
        <ShoppingBag size={18} strokeWidth={1.7}/>
        <h2 className="font-display text-lg font-semibold tracking-tight">KSCart</h2>
      </div>
      <span className="text-[0.72rem] tabular-nums text-sand-600">{count} {count===1?'item':'items'} · {stores} {stores===1?'Store':'Stores'}</span>
    </div>
    {cart.length ? <>
      <div className="mt-3" data-store-cart-totals>
        {singleTotal
          ? <strong className="font-display text-[1.7rem] font-semibold leading-tight tracking-tight tabular-nums text-forest-900">
              {formatListedMoney(listed[0][1], listed[0][0])}
            </strong>
          : listed.length
            ? <div className="space-y-1">{listed.map(([currency,minor])=>
                <strong key={currency} className="block text-[1.12rem] font-semibold tabular-nums text-forest-900">
                  {formatListedMoney(minor,currency)}
                </strong>)}</div>
            : <strong className="font-display text-lg font-medium text-forest-900">Prices to confirm</strong>}
        <p className="mt-1 text-[0.7rem] text-sand-600">
          {unpriced ? unpriced + ' unpriced · ' : ''}Seller-listed · No agreement yet
        </p>
      </div>
      <div className="mt-2 border-t border-cream-200" data-store-cart-rows>
        {cart.map(entry => selectedRow(entry, 'cart'))}
      </div>
      <button type="button" disabled={busy} onClick={() => { void discuss(); }}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-4 text-[0.84rem] font-semibold text-white shadow-[0_2px_7px_rgba(22,54,41,0.11)] transition-all hover:bg-forest-900 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 disabled:opacity-50">
        {busy ? 'Preparing KS001…' : 'Discuss Cart with KS001'} <ArrowRight size={16}/>
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-ember-700">{error}</p>}
      <button type="button" onClick={onBrowse}
        className="mt-1 flex min-h-10 w-full items-center justify-center rounded-xl text-xs font-medium text-forest-700 hover:bg-cream-50 focus-visible:outline-2 focus-visible:outline-forest-500">
        Continue shopping
      </button>
    </> : <div className="mt-4">
      <p className="text-sm text-sand-600">Nothing in your cart yet.</p>
      <button type="button" onClick={onBrowse}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-forest-900 focus-visible:outline-2 focus-visible:outline-forest-500">
        Browse Stores <ArrowRight size={16}/>
      </button>
    </div>}
    {ideas.length > 0 && <details className="mt-3 border-t border-cream-200 pt-2" data-store-vision-ideas-preserved>
      <summary className="flex min-h-11 cursor-pointer items-center justify-between text-xs font-semibold text-forest-800">
        Vision ideas <span className="font-normal tabular-nums text-sand-600">{ideas.length} saved for review</span>
      </summary>
      <div>{ideas.map(entry=>selectedRow(entry, 'vision'))}</div>
      <p className="text-[0.7rem] text-sand-600">These selections are not a saved Vision Dream.</p>
    </details>}
    <details className="mt-2 border-t border-cream-200 pt-1 text-sand-600" data-store-cart-explanation>
      <summary className="flex min-h-10 cursor-pointer items-center gap-1 text-[0.72rem] font-medium text-forest-700">
        <ChevronDown size={14}/> What does this mean?
      </summary>
      <p className="pb-1 text-xs leading-5">
        Provisional listed amounts, not a provider quote, saved Vision Dream, binding Agreement or payment.
        KS001 must recheck each Store, actual seller, availability, price and your requirements before any agreement.
        Different sellers may require separate consent and agreements.
      </p>
    </details>
  </section>;
}
