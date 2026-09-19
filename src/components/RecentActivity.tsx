import type { ActivityEntry } from '../types';

interface RecentActivityProps {
  items: ActivityEntry[];
  onOpenAgreement: (id: string) => void;
}

export function RecentActivity({ items, onOpenAgreement }: RecentActivityProps) {
  if (items.length === 0) return null;

  return (
    <div className="animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Recent activity</div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => item.agreementId && onOpenAgreement(item.agreementId)}
            className="w-full text-left flex items-baseline gap-2.5 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors"
          >
            <span className="w-1 h-1 rounded-full bg-sand-400 shrink-0 mt-2" />
            <span className="text-[0.825rem] text-forest-800 flex-1">{item.text}</span>
            <span className="text-[0.72rem] text-sand-400 shrink-0">{item.time}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
