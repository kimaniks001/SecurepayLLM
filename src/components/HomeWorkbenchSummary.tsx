interface HomeWorkbenchSummaryProps {
  needsCount: number;
  waitingCount: number;
  recentCount: number;
  onNavigateAgreements: () => void;
}

export function HomeWorkbenchSummary({ needsCount, waitingCount, recentCount, onNavigateAgreements }: HomeWorkbenchSummaryProps) {
  return (
    <div className="animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Today in SecurePay</div>
      <button onClick={onNavigateAgreements} className="w-full text-left space-y-2.5 hover:bg-cream-50 rounded-xl p-3 -m-3 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[0.85rem] text-sand-600">Needs you</span>
          <span className="text-[1.1rem] font-display font-medium text-forest-700">{needsCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[0.85rem] text-sand-600">Waiting on others</span>
          <span className="text-[1.1rem] font-display font-medium text-sand-500">{waitingCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[0.85rem] text-sand-600">Recent</span>
          <span className="text-[1.1rem] font-display font-medium text-sand-500">{recentCount}</span>
        </div>
      </button>
    </div>
  );
}
