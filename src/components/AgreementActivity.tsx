

interface AgreementActivityProps {
  activity: { date: string; text: string }[];
}

export function AgreementActivity({ activity }: AgreementActivityProps) {
  if (activity.length === 0) {
    return (
      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-6 text-center animate-quiet-in">
        <p className="text-[0.85rem] text-sand-500">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Activity timeline</div>
      <div className="relative pl-5">
        <div className="absolute left-1.5 top-1 bottom-1 w-px bg-cream-200" />
        {activity.map((entry, i) => (
          <div key={i} className="relative mb-4 last:mb-0">
            <div className="absolute -left-[14px] top-1 w-2 h-2 rounded-full bg-forest-400 ring-2 ring-cream-50" />
            <div className="text-[0.72rem] text-sand-400 font-medium">{entry.date}</div>
            <div className="text-[0.825rem] text-forest-800 mt-0.5">{entry.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
