import { MapPin } from 'lucide-react';
import type { ResultOffer } from '../result';

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50';
const DOT: Record<ResultOffer['tone'], string> = { open: 'bg-forest-500', limited: 'bg-ember-400', unconfirmed: 'border border-sand-400 bg-transparent', closed: 'bg-sand-300', unstated: 'border border-sand-300 bg-transparent' };

/**
 * A SecurePay result, designed to read well WITHOUT a photograph: the seller, the title, and the price
 * carry it. Every value is a real backend value. There is deliberately no rating, "verified", badge,
 * discount, stock claim or "recommended" -- and no image unless the offer has real trusted media.
 * Availability is a word plus a neutral dot (never a colour-coded preference), so two cards never look
 * like one is favoured.
 *
 * The whole card opens the offer (title is the one real button, stretched); "Compare" is a separate,
 * always-visible control -- no hover-only actions.
 */
export function ResultCard({ offer, onOpen, compare, actionLabel = 'View details' }: {
  offer: ResultOffer; onOpen: () => void; compare?: { selected: boolean; disabled: boolean; onToggle: () => void }; actionLabel?: string;
}) {
  const closed = offer.tone === 'closed';
  return <article className={`group relative rounded-2xl border border-cream-200 bg-white/85 p-4 shadow-soft transition-colors hover:border-forest-300 ${closed ? 'opacity-90' : ''}`}>
    <div className="flex items-start justify-between gap-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">{offer.kind === 'SERVICE' ? 'Service' : offer.kind === 'PRODUCT' ? 'Product' : 'Listing'}</p>
      {compare && <label className={`relative z-10 -mr-1 -mt-1 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-1.5 text-[0.78rem] text-sand-600 ${compare.disabled && !compare.selected ? 'opacity-50' : ''}`}>
        <input type="checkbox" checked={compare.selected} disabled={compare.disabled && !compare.selected} onChange={compare.onToggle} className="h-4 w-4 rounded border-cream-400 text-forest-600 focus:ring-forest-300" />
        Compare<span className="sr-only">: {offer.title}</span>
      </label>}
    </div>
    <h3 className="mt-0.5 font-display text-[1.08rem] leading-snug text-forest-800">
      <button type="button" onClick={onOpen} className={`text-left after:absolute after:inset-0 after:rounded-2xl ${FOCUS}`} aria-label={`${actionLabel}: ${offer.title}, ${offer.ownerName}`}>{offer.title}</button>
    </h3>
    <p className="mt-0.5 text-[0.82rem] text-sand-600">{offer.ownerName} <span className="text-sand-400">· {offer.ownerKs}</span></p>
    <div className="mt-3 flex items-end justify-between gap-3">
      {offer.priceLabel
        ? <p className="font-display text-[1.3rem] leading-none tabular-nums text-forest-800">{offer.priceLabel}</p>
        : <p className="text-[0.85rem] text-sand-500">No price listed</p>}
      <p className="flex items-center gap-1.5 text-[0.78rem] text-sand-600"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${DOT[offer.tone]}`} />{offer.availabilityLabel}</p>
    </div>
    {offer.place && <p className="mt-2 flex items-center gap-1 text-[0.78rem] text-sand-500"><MapPin className="h-3 w-3" aria-hidden="true" />{offer.place}</p>}
    {offer.mediaUrl && <img src={offer.mediaUrl} alt="" className="mt-3 h-28 w-full rounded-xl object-cover" />}
  </article>;
}
