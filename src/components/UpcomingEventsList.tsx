import type { CalendarEventView } from '../features/workspace/view';

interface UpcomingEventsListProps {
  items: (CalendarEventView & { agreementId: string; agreementTitle: string })[];
  onOpenAgreement: (id: string) => void;
}

/** KSCalendar, home-scoped: real Agreement events only -- nothing here is fabricated or reordered by guessed urgency. */
export function UpcomingEventsList({ items, onOpenAgreement }: UpcomingEventsListProps) {
  if (items.length === 0) return null;

  return (
    <div className="animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Upcoming</div>
      <div className="space-y-1.5">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onOpenAgreement(item.agreementId)}
            className="w-full text-left flex items-baseline gap-2.5 px-3 py-2 rounded-lg hover:bg-cream-50 transition-colors"
          >
            <span className="w-1 h-1 rounded-full bg-forest-500 shrink-0 mt-2" />
            <span className="text-[0.825rem] text-forest-800 flex-1">
              {item.title} <span className="text-sand-400">— {item.agreementTitle}</span>
            </span>
            <span className="text-[0.72rem] text-sand-400 shrink-0">{item.dateLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
