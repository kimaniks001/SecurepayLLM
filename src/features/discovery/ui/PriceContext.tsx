import type { AgentPriceContext } from '../../../api/securepay/agent/discovery';
import { formatMinor } from '../money';

const date = (iso: string | null) => iso ? new Date(iso).toISOString().slice(0, 10) : null;

/**
 * SecurePay's price CONTEXT: a range computed live from currently published listings -- information, not
 * a quote, not an Agreement amount, not a recommendation. The strength of the evidence is always the
 * headline of the basis line: "Based on 2 current SecurePay listings", never "market price". With 1-2
 * listings the card says plainly that it is too few to call a range.
 */
export function PriceContext({ price }: { price: AgentPriceContext }) {
  const topic = [price.category && `“${price.category}”`, price.location && `in ${price.location}`].filter(Boolean).join(' ') || 'this';
  if (price.sampleSize === 0 || price.sourceType === 'NO_DATA' || price.lowMinor === null || price.highMinor === null) {
    return <section aria-label="Price context" className="rounded-2xl border border-cream-200 bg-white/85 p-4 shadow-soft">
      <h3 className="font-display text-[1.05rem] text-forest-800">Listed prices for {topic}</h3>
      <p className="mt-1 text-[0.9rem] text-sand-600">SecurePay has no priced listings for this yet, so it has nothing to show.</p>
    </section>;
  }
  const low = formatMinor(price.lowMinor, price.currency); const high = formatMinor(price.highMinor, price.currency);
  const median = price.medianMinor === null ? null : formatMinor(price.medianMinor, price.currency);
  const thin = price.sampleSize <= 2;   // a median of one or two prices is not informative, so it is not shown
  const one = price.lowMinor === price.highMinor;
  return <section aria-label="Price context" className="rounded-2xl border border-cream-200 bg-white/85 p-4 shadow-soft">
    <h3 className="font-display text-[1.05rem] text-forest-800">Listed prices for {topic}</h3>
    <p className="mt-2 font-display text-[1.5rem] leading-tight tabular-nums text-forest-800">{one ? low : `${low} – ${high}`}</p>
    {median && !one && !thin && <p className="mt-0.5 text-[0.85rem] text-sand-600">Median {median}</p>}
    <p className="mt-2 text-[0.85rem] text-forest-800">Based on {price.sampleSize} current SecurePay listing{price.sampleSize === 1 ? '' : 's'}.</p>
    {thin && <p className="mt-1 text-[0.85rem] text-ember-700">That’s too few to treat as a range — it only shows what {price.sampleSize === 1 ? 'one seller has' : 'two sellers have'} published.</p>}
    <p className="mt-2 text-[0.75rem] leading-snug text-sand-500">Information only — not a quote, and not an agreed amount.{date(price.asOf) ? ` Calculated ${date(price.asOf)}.` : ''}</p>
  </section>;
}
