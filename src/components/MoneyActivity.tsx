import type { MoneyActivityItem } from '../types';

interface MoneyActivityProps {
  items: MoneyActivityItem[];
}

export function MoneyActivity({ items }: MoneyActivityProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Money activity</div>
        <p className="text-[0.85rem] text-sand-500">No recent money activity.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Money activity</div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <span className="text-[0.72rem] text-sand-400 w-12 shrink-0 mt-0.5">{item.date}</span>
            <div className="flex-1">
              <div className="text-[0.825rem] text-forest-800">{item.text}</div>
              {item.amount && (
                <div className="text-[0.72rem] text-sand-500 mt-0.5">{item.amount}</div>
              )}
              {item.rail && (
                <div className="text-[0.68rem] text-sand-400">via {item.rail}</div>
              )}
              {item.reference && (
                <div className="text-[0.68rem] text-sand-400">Ref: {item.reference}</div>
              )}
              <div className="text-[0.68rem] font-medium text-forest-600 mt-0.5">{item.statusLabel}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
