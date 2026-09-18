import type { MoneyByCurrencyItem } from '../types';

interface AgreementMoneyByCurrencySummaryProps {
  items: MoneyByCurrencyItem[];
}

/**
 * Final Phase 3 correction (Section 9) — Agreement Money by currency, real backend Phase-2 Money
 * truth from GET /api/v1/me/agreements/home. Locked doctrine: money is ALWAYS shown per currency,
 * never summed across currencies (e.g. never KES + USD) — each currency renders as its own row.
 */
export function AgreementMoneyByCurrencySummary({ items }: AgreementMoneyByCurrencySummaryProps) {
  if (items.length === 0) return null;

  return (
    <div className="animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">
        Agreement Money
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.currency}
            className="rounded-xl border border-cream-200 bg-cream-50/50 px-4 py-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">{item.currency}</span>
              <span className="text-[0.72rem] text-sand-400">{item.positionCount} position{item.positionCount === 1 ? '' : 's'}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-[0.78rem] text-sand-600">Protected</span>
              <span className="text-[0.875rem] font-medium text-forest-800">{item.remainingFundedLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
